const JobCard = require('../models/JobCard');
const Part = require('../models/Part');
const ApprovalRequest = require('../models/ApprovalRequest');
const User = require('../models/User');
const audit = require('../utils/audit');
const { notifyAdmins } = require('../utils/notification');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// ── Create Job Card ──────────────────────────────────────
exports.createJobCard = asyncHandler(async (req, res) => {
  const branchId =
    req.user.role === 'superadmin' || req.user.role === 'admin' || req.user.role === 'manager'
      ? req.body.branch
      : req.user.branch;
  if (!branchId) throw new AppError('Branch is required.', 400);

  // sparesUsed comes in as an array of { partId, vendorBatchId, qty }
  // We resolve names/prices here and deduct stock atomically
  let resolvedSpares = [];
  if (Array.isArray(req.body.sparesUsed) && req.body.sparesUsed.length > 0) {
    for (const item of req.body.sparesUsed) {
      if (!item.partId || !item.vendorBatchId) continue;

      const part = await Part.findById(item.partId);
      if (!part) continue;

      const batch = part.vendorBatches.id(item.vendorBatchId);
      if (!batch || !batch.isActive) {
        throw new AppError(`Batch for part "${part.partName}" is no longer active.`, 400);
      }

      const qty = parseInt(item.qty) || 1;
      if (batch.stock < qty) {
        throw new AppError(
          `Not enough stock for "${part.partName}" from vendor "${batch.vendorName}". Available: ${batch.stock}.`,
          400
        );
      }

      // Deduct stock from the specific batch
      batch.stock -= qty;
      part.lastModifiedBy = req.user.id;
      await part.save(); // pre-save recalculates totalStock

      resolvedSpares.push({
        partNumber:   part.partNumber,
        partId: part._id,
        partName: part.partName,
        vendorBatchId: batch._id,
        vendorName: batch.vendorName,
        sellingPrice: batch.sellingPrice,
        qty,
      });
    }
  }

  const createdByValue = req.user.role === 'superadmin' ? null : req.user.id;
  const jobData = {
    ...req.body,
    branch: branchId,
    createdBy: createdByValue,
    sparesUsed: resolvedSpares,
    // sparesCost is recalculated by the pre-save hook from resolvedSpares
  };

  const job = await JobCard.create(jobData);
  await job.populate('branch', 'name code');
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'CREATE_JOB', targetModel: 'JobCard', targetId: job._id, req });
  res.status(201).json({ success: true, message: `Job card ${job.jobNo} created.`, job });
});

// ── Vehicle lookup (auto-fill for returning customers) ────
exports.vehicleLookup = asyncHandler(async (req, res) => {
  const { vehicle } = req.query;
  if (!vehicle) throw new AppError('Vehicle number required.', 400);

  const last = await JobCard.findOne({ vehicleNumber: vehicle.toUpperCase().trim() })
    .sort({ createdAt: -1 })
    .select('vehicleNumber brand model customerName customerPhone mechanic');

  if (!last) return res.json({ success: true, found: false });
  res.json({ success: true, found: true, data: last });
});

// ── Get All Jobs (with filters) ──────────────────────────
exports.getJobs = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.branchFilter) filter.branch = req.branchFilter;
  if (req.query.branch) filter.branch = req.query.branch;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.payment) filter.paymentMode = req.query.payment;
  if (req.query.brand) filter.brand = req.query.brand;
  if (req.query.mechanic) filter.mechanic = new RegExp(req.query.mechanic, 'i');
  if (req.query.vehicle) filter.vehicleNumber = new RegExp(req.query.vehicle.toUpperCase(), 'i');
  if (req.query.phone) filter.customerPhone = req.query.phone;
  if (req.query.dateFrom || req.query.dateTo) {
    filter.serviceInDate = {};
    if (req.query.dateFrom) filter.serviceInDate.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) filter.serviceInDate.$lte = new Date(req.query.dateTo + 'T23:59:59');
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    JobCard.find(filter)
      .populate('branch', 'name code')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    JobCard.countDocuments(filter),
  ]);

  res.json({ success: true, count: jobs.length, total, page, pages: Math.ceil(total / limit), jobs });
});

// ── Get Single Job ───────────────────────────────────────
exports.getJob = asyncHandler(async (req, res) => {
  const job = await JobCard.findById(req.params.id)
    .populate('branch', 'name code address phone')
    .populate('createdBy', 'name email');
  if (!job) throw new AppError('Job card not found.', 404);
  if (req.branchFilter && job.branch._id.toString() !== req.branchFilter.toString())
    throw new AppError('Access denied.', 403);
  res.json({ success: true, job });
});

// ── Update Job ────────────────────────────────────────────
exports.updateJob = asyncHandler(async (req, res) => {
  const job = await JobCard.findById(req.params.id);
  if (!job) throw new AppError('Job card not found.', 404);
  if (req.branchFilter && job.branch.toString() !== req.branchFilter.toString())
    throw new AppError('Access denied.', 403);

  if (!Array.isArray(job.sparesUsed)) {
    job.sparesUsed = [];
  } else {
    job.sparesUsed = job.sparesUsed.filter(item => (
      item && typeof item === 'object' && item.partId && item.vendorBatchId && Number(item.qty) > 0
    ));
  }

  if (req.user.role === 'employee' && req.body.status === 'Delivered') {
    throw new AppError('Employees may update jobs until Ready only.', 403);
  }

  const allowed = [
    'vehicleNumber', 'brand', 'model', 'customerName', 'customerPhone', 'kmReading',
    'serviceInDate', 'expectedDelivery', 'actualDelivery', 'serviceMode', 'mechanic',
    'complaint', 'engineOil', 'workDone', 'status',
    'labourCharge', 'waterWash', 'discount', 'paymentMode',
    'creditCollected', 'creditCollectedAt', 'creditCollectedMode',
  ];
  allowed.forEach((f) => { if (req.body[f] !== undefined) job[f] = req.body[f]; });

  // ── sparesUsed: full reconciliation ──────────────────────
  // Handles additions, qty increases, qty decreases (stock restore),
  // sellingPrice edits, and removals (items no longer in the payload).
  if (Array.isArray(req.body.sparesUsed)) {
    const existingSpares = Array.isArray(job.sparesUsed)
      ? job.sparesUsed.filter(item => item && typeof item === 'object')
      : [];

    // Build a lookup of incoming items keyed by partId|vendorBatchId
    const incomingMap = new Map();
    for (const item of req.body.sparesUsed) {
      if (!item || !item.partId || !item.vendorBatchId) continue;
      const key = `${item.partId.toString()}|${item.vendorBatchId.toString()}`;
      incomingMap.set(key, item);
    }

    // Track which existing spares are still present in the payload
    const keptKeys = new Set();
    const merged = [];

    // Process incoming items: add new or update existing (qty + sellingPrice)
    for (const [key, item] of incomingMap) {
      const desiredQty = parseInt(item.qty, 10) || 0;
      if (desiredQty < 1) continue;

      const part = await Part.findById(item.partId);
      if (!part) throw new AppError('Part not found.', 404);

      const batch = part.vendorBatches.id(item.vendorBatchId);
      if (!batch || !batch.isActive) {
        throw new AppError(`Selected vendor batch is no longer available for part ${part.partName}.`, 400);
      }

      const matching = existingSpares.find(spare =>
        spare.partId?.toString() === item.partId.toString() &&
        spare.vendorBatchId?.toString() === item.vendorBatchId.toString()
      );
      const currentQty = matching?.qty || 0;
      const delta = desiredQty - currentQty;

      if (delta > 0) {
        // Qty increased — deduct additional stock
        if (batch.stock < delta) {
          throw new AppError(`Not enough stock for ${part.partName}. Available: ${batch.stock}.`, 400);
        }
        batch.stock -= delta;
        part.lastModifiedBy = req.user.id;
        await part.save();
      } else if (delta < 0) {
        // Qty decreased — restore stock difference
        batch.stock += Math.abs(delta);
        part.lastModifiedBy = req.user.id;
        await part.save();
      }

      keptKeys.add(key);

      // Use sellingPrice from the request if provided (allows invoice price edits),
      // otherwise fall back to the batch's current selling price
      const sellingPrice = Number(item.sellingPrice) > 0
        ? Number(item.sellingPrice)
        : (matching?.sellingPrice ?? batch.sellingPrice);

      merged.push({
        partId: part._id,
        partNumber: part.partNumber,
        partName: part.partName,
        vendorBatchId: batch._id,
        vendorName: batch.vendorName,
        sellingPrice,
        qty: desiredQty,
      });
    }

    // Process removals: items in existingSpares but not in the incoming payload
    for (const spare of existingSpares) {
      if (!spare.partId || !spare.vendorBatchId) continue;
      const key = `${spare.partId.toString()}|${spare.vendorBatchId.toString()}`;
      if (keptKeys.has(key)) continue;

      // Restore full stock for removed items
      const part = await Part.findById(spare.partId);
      if (part) {
        const batch = part.vendorBatches.id(spare.vendorBatchId);
        if (batch && batch.isActive) {
          batch.stock += Number(spare.qty) || 0;
          part.lastModifiedBy = req.user.id;
          await part.save();
        }
      }
    }

    job.sparesUsed = merged;
  }

  job.lastModifiedBy = req.user.id;
  await job.save();

  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'UPDATE_JOB', targetModel: 'JobCard', targetId: job._id, req });
  res.json({ success: true, message: 'Job updated.', job });
});

// ── Add Parts / Spares to Existing Job ─────────────────────
exports.addJobSpares = asyncHandler(async (req, res) => {
  const job = await JobCard.findById(req.params.id);
  if (!job) throw new AppError('Job card not found.', 404);
  if (req.branchFilter && job.branch.toString() !== req.branchFilter.toString())
    throw new AppError('Access denied.', 403);
  if (['Delivered', 'Cancelled'].includes(job.status))
    throw new AppError('Cannot add parts to a completed or cancelled job.', 400);

  if (!Array.isArray(req.body.sparesUsed) || req.body.sparesUsed.length === 0) {
    throw new AppError('No parts specified to add.', 400);
  }

  const additions = [];
  for (const item of req.body.sparesUsed) {
    if (!item.partId || !item.vendorBatchId) continue;

    const part = await Part.findById(item.partId);
    if (!part) throw new AppError('Part not found.', 404);

    const batch = part.vendorBatches.id(item.vendorBatchId);
    if (!batch || !batch.isActive) {
      throw new AppError(`Selected vendor batch is no longer available for part ${part.partName}.`, 400);
    }

    const qty = parseInt(item.qty, 10) || 0;
    if (qty < 1) throw new AppError('Quantity must be at least 1.', 400);
    if (batch.stock < qty) {
      throw new AppError(`Not enough stock for ${part.partName}. Available: ${batch.stock}.`, 400);
    }

    batch.stock -= qty;
    part.lastModifiedBy = req.user.id;
    await part.save();

    additions.push({
      partId: part._id,
      partNumber: part.partNumber,
      partName: part.partName,
      vendorBatchId: batch._id,
      vendorName: batch.vendorName,
      sellingPrice: batch.sellingPrice,
      qty,
    });
  }

  const normalizedExisting = Array.isArray(job.sparesUsed)
    ? job.sparesUsed.filter(item => item && typeof item === 'object')
    : [];
  const merged = [...normalizedExisting];
  for (const item of additions) {
    const existingIndex = merged.findIndex(spare =>
      spare.partId?.toString() === item.partId.toString() &&
      spare.vendorBatchId?.toString() === item.vendorBatchId.toString()
    );
    if (existingIndex >= 0) {
      merged[existingIndex].qty += item.qty;
    } else {
      merged.push(item);
    }
  }

  job.sparesUsed = merged;
  job.lastModifiedBy = req.user.id;
  await job.save();

  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'ADD_JOB_SPARES', targetModel: 'JobCard', targetId: job._id, req });
  res.json({ success: true, message: 'Parts added to job.', job });
});

// ── Delete Job ───────────────────────────────────────────
exports.deleteJob = asyncHandler(async (req, res) => {
  const job = await JobCard.findById(req.params.id);
  if (!job) throw new AppError('Job card not found.', 404);
  if (req.branchFilter && job.branch.toString() !== req.branchFilter.toString())
    throw new AppError('Access denied.', 403);

  if (req.user.role === 'employee') {
    const request = await ApprovalRequest.create({
      type: 'job_delete',
      requestedBy: req.user.id,
      branch: req.user.branch,
      targetModel: 'JobCard',
      targetId: job._id,
      currentData: job.toObject(),
      reason: req.body.reason || '',
    });
    await notifyAdmins(User, {
      type: 'approval_request',
      title: '🗑 Job Delete Request',
      message: `${req.user.name} requested to delete ${job.jobNo}`,
      link: `/admin/approvals/${request._id}`,
      relatedId: request._id.toString(),
      relatedModel: 'ApprovalRequest',
    });
    return res.status(202).json({ success: true, message: 'Delete request submitted for admin approval.' });
  }

  await JobCard.findByIdAndDelete(req.params.id);
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'DELETE_JOB', targetModel: 'JobCard', targetId: req.params.id, req, severity: 'high' });
  res.json({ success: true, message: 'Job deleted.' });
});

// ── Add Payment ──────────────────────────────────────────
exports.addPayment = asyncHandler(async (req, res) => {
  const job = await JobCard.findById(req.params.id);
  if (!job) throw new AppError('Job card not found.', 404);

  if (req.branchFilter && job.branch.toString() !== req.branchFilter.toString()) {
    throw new AppError('Access denied.', 403);
  }

  const amount = Number(req.body.amount);
  const { mode, note } = req.body;
  const allowedModes = ['Cash', 'UPI', 'Card', 'Credit']

  if (!amount || amount <= 0) {
    throw new AppError('Valid payment amount required.', 400);
  }

  if (!allowedModes.includes(mode)) {
    throw new AppError('Valid collection mode required.', 400);
  }

  if (job.balanceAmount <= 0) {
    throw new AppError('This job is already fully paid.', 400);
  }

  if (amount > job.balanceAmount) {
    throw new AppError(`Amount exceeds balance due (${job.balanceAmount}).`, 400);
  }

  job.paymentHistory.push({
    amount,
    mode,
    note: note || 'Credit balance collected',
    receivedBy: req.user.id,
  });

  job.lastModifiedBy = req.user.id;
  await job.save();

  await audit({
    actor: req.user.id,
    actorRole: req.user.role,
    action: 'ADD_PAYMENT',
    targetModel: 'JobCard',
    targetId: job._id,
    req,
    meta: { amount, mode },
  });

  res.json({
    success: true,
    message: 'Payment collected.',
    job,
  });
});

// ── Public: Track vehicle ─────────────────────────────────
exports.trackVehicle = asyncHandler(async (req, res) => {
  const { vehicle, phone } = req.query;
  if (!vehicle && !phone) throw new AppError('Provide vehicle number or phone number.', 400);

  const filter = { $or: [] };
  if (vehicle) filter.$or.push({ vehicleNumber: vehicle.toUpperCase().trim() });
  if (phone) filter.$or.push({ customerPhone: phone.trim() });

  const jobs = await JobCard.find(filter)
    .populate('branch', 'name address phone')
    .select('jobNo vehicleNumber brand model status serviceInDate expectedDelivery actualDelivery serviceMode mechanic branch paymentStatus')
    .sort({ createdAt: -1 })
    .limit(10);

  if (!jobs.length) throw new AppError('No service records found.', 404);
  res.json({ success: true, count: jobs.length, jobs });
});