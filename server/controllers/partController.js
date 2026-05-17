const Part = require('../models/Part');
const Vendor = require('../models/Vendor');
const PurchaseEntry = require('../models/PurchaseEntry');
const Purchase = require('../models/Purchase');
const ApprovalRequest = require('../models/ApprovalRequest');
const User = require('../models/User');
const audit = require('../utils/audit');
const { notifyAdmins } = require('../utils/notification');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// ── Get Parts ────────────────────────────────────────────
exports.getParts = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.branchFilter) filter.branch = req.branchFilter;
  if (req.query.branch) filter.branch = req.query.branch;
  if (req.query.lowStock === 'true') {
    filter.$expr = {
      $and: [
        { $lte: ['$totalStock', '$minStock'] },
        { $gt: ['$minStock', 0] }
      ]
    };
  }

  // Search by partNumber OR partName
  if (req.query.search) {
    const rx = new RegExp(req.query.search, 'i');
    filter.$or = [{ partNumber: rx }, { partName: rx }];
  }

  const parts = await Part.find(filter)
    .populate('branch', 'name code')
    .populate('vendorBatches.vendorId', 'name phone')
    .sort({ partNumber: 1 });   // sort by part number

  res.json({ success: true, count: parts.length, parts });
});

// ── Get Single Part ──────────────────────────────────────
exports.getPart = asyncHandler(async (req, res) => {
  const part = await Part.findById(req.params.id)
    .populate('branch', 'name code')
    .populate('vendorBatches.vendorId', 'name phone paymentDueDays');
  if (!part) throw new AppError('Part not found.', 404);
  res.json({ success: true, part });
});

// ── Create Part ──────────────────────────────────────────
exports.createPart = asyncHandler(async (req, res) => {
  const branchId = req.body.branch || req.user.branch;
  if (!branchId) throw new AppError('Branch required.', 400);
  if (!req.body.partNumber) throw new AppError('Part number is required.', 400);

  // Employee → approval
  if (req.user.role === 'employee') {
    const request = await ApprovalRequest.create({
      type: 'part_add',
      requestedBy: req.user.id,
      branch: req.user.branch,
      targetModel: 'Part',
      targetId: req.user.branch,
      requestedData: { ...req.body, branch: branchId },
      reason: req.body.reason || 'New part request',
    });
    await notifyAdmins(User, {
      type: 'approval_request',
      title: '📦 New Part Request',
      message: `${req.user.name} wants to add part: ${req.body.partNumber} — ${req.body.partName}`,
      link: `/admin/approvals/${request._id}`,
      relatedId: request._id.toString(),
      relatedModel: 'ApprovalRequest',
    });
    return res.status(202).json({ success: true, message: 'Part request submitted for approval.' });
  }

  // Check duplicate part number in same branch
  const existing = await Part.findOne({
    partNumber: req.body.partNumber.toUpperCase().trim(),
    branch: branchId,
  });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: `Part number ${req.body.partNumber} already exists in this branch.`,
      partId: existing._id,
    });
  }

  const part = await Part.create({
    partNumber: req.body.partNumber.toUpperCase().trim(),
    partName: req.body.partName,
    brand: req.body.brand,
    branch: branchId,
    minStock: req.body.minStock,
    createdBy: req.user.id,
    vendorBatches: [],
    totalStock: 0,
  });

  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'CREATE_PART', targetModel: 'Part', targetId: part._id, req });
  res.status(201).json({ success: true, message: 'Part created. Use Record Purchase to add vendor stock.', part });
});

// ── Record Purchase ──────────────────────────────────────
exports.recordPurchase = asyncHandler(async (req, res) => {
  const part = await Part.findById(req.params.id);
  if (!part) throw new AppError('Part not found.', 404);

  const { vendorId, qty, purchasePrice, sellingPrice, notes } = req.body;
  if (!vendorId) throw new AppError('Vendor is required.', 400);
  if (!qty || qty < 1) throw new AppError('Quantity must be at least 1.', 400);
  if (purchasePrice == null || purchasePrice < 0) throw new AppError('Purchase price is required.', 400);
  if (sellingPrice == null || sellingPrice < 0) throw new AppError('Selling price is required.', 400);

  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw new AppError('Vendor not found.', 404);

  part.vendorBatches.push({
    vendorId: vendor._id,
    vendorName: vendor.name,
    purchasePrice,
    sellingPrice,
    stock: qty,
    purchasedAt: new Date(),
    isActive: true,
  });
  part.lastRestockedAt = new Date();
  part.lastModifiedBy = req.user.id;
  await part.save();

  const newBatch = part.vendorBatches[part.vendorBatches.length - 1];

  let paymentDueDate;
  if (vendor.paymentDueDays != null) {
    paymentDueDate = new Date();
    paymentDueDate.setDate(paymentDueDate.getDate() + vendor.paymentDueDays);
  }

  const createdByValue = req.user.role === 'superadmin' ? null : req.user.id;
  const entry = await PurchaseEntry.create({
    vendor: vendor._id,
    part: part._id,
    branch: part.branch,
    qty,
    purchasePrice,
    sellingPrice,
    batchId: newBatch._id,
    paymentDueDate,
    notes,
    createdBy: createdByValue,
  });

  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'RECORD_PURCHASE', targetModel: 'Part', targetId: part._id, req, meta: { vendorId, qty, sellingPrice } });
  res.status(201).json({
    success: true,
    message: `Stock updated. ${qty} units of ${part.partNumber} added from ${vendor.name}.`,
    part,
    purchaseEntry: entry,
  });
});

// ── Update Part metadata ─────────────────────────────────
exports.updatePart = asyncHandler(async (req, res) => {
  const part = await Part.findById(req.params.id);
  if (!part) throw new AppError('Part not found.', 404);

  if (req.user.role === 'employee') {
    const request = await ApprovalRequest.create({
      type: 'part_edit',
      requestedBy: req.user.id,
      branch: req.user.branch,
      targetModel: 'Part',
      targetId: part._id,
      currentData: part.toObject(),
      requestedData: req.body,
      reason: req.body.reason || '',
    });
    await notifyAdmins(User, {
      type: 'approval_request',
      title: '📦 Part Edit Request',
      message: `${req.user.name} requested to edit part: ${part.partNumber} — ${part.partName}`,
      link: `/admin/approvals/${request._id}`,
      relatedId: request._id.toString(),
      relatedModel: 'ApprovalRequest',
    });
    return res.status(202).json({ success: true, message: 'Edit request submitted for admin approval.' });
  }

  const allowed = ['partNumber', 'partName', 'brand', 'minStock', 'isActive'];
  allowed.forEach((f) => { if (req.body[f] !== undefined) part[f] = req.body[f]; });
  if (part.partNumber) part.partNumber = part.partNumber.toUpperCase().trim();
  part.lastModifiedBy = req.user.id;
  await part.save();

  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'UPDATE_PART', targetModel: 'Part', targetId: part._id, req });
  res.json({ success: true, message: 'Part updated.', part });
});

// ── Deactivate batch ─────────────────────────────────────
exports.deactivateBatch = asyncHandler(async (req, res) => {
  const part = await Part.findById(req.params.id);
  if (!part) throw new AppError('Part not found.', 404);
  const batch = part.vendorBatches.id(req.params.batchId);
  if (!batch) throw new AppError('Batch not found.', 404);
  batch.isActive = false;
  part.lastModifiedBy = req.user.id;
  await part.save();
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'DEACTIVATE_BATCH', targetModel: 'Part', targetId: part._id, req });
  res.json({ success: true, message: 'Batch deactivated.', part });
});

// ── Delete Part (soft) ───────────────────────────────────
exports.deletePart = asyncHandler(async (req, res) => {
  const part = await Part.findById(req.params.id);
  if (!part) throw new AppError('Part not found.', 404);

  if (req.user.role === 'employee') {
    const request = await ApprovalRequest.create({
      type: 'part_delete',
      requestedBy: req.user.id,
      branch: req.user.branch,
      targetModel: 'Part',
      targetId: part._id,
      currentData: part.toObject(),
      reason: req.body.reason || '',
    });
    await notifyAdmins(User, {
      type: 'approval_request',
      title: '🗑 Part Delete Request',
      message: `${req.user.name} requested to delete: ${part.partNumber} — ${part.partName}`,
      link: `/admin/approvals/${request._id}`,
      relatedId: request._id.toString(),
      relatedModel: 'ApprovalRequest',
    });
    return res.status(202).json({ success: true, message: 'Delete request submitted for admin approval.' });
  }

  part.isActive = false;
  await part.save();
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'DELETE_PART', targetModel: 'Part', targetId: part._id, req, severity: 'medium' });
  res.json({ success: true, message: 'Part removed from inventory.' });
});

// ── Vendor CRUD ──────────────────────────────────────────
exports.getVendors = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  const branch = req.user.role === 'admin' || req.user.role === 'superadmin'
    ? req.query.branch || undefined
    : req.user.branch;

  if (branch) {
    filter.$or = [
      { branches: branch },
      { branches: { $size: 0 } },
    ];
  }

  const vendors = await Vendor.find(filter).populate('branches', 'name code').sort({ name: 1 });
  res.json({ success: true, count: vendors.length, vendors });
});

exports.getVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id).populate('branches', 'name code');
  if (!vendor) throw new AppError('Vendor not found.', 404);
  res.json({ success: true, vendor });
});

exports.createVendor = asyncHandler(async (req, res) => {
  const createdByValue = req.user.role === 'superadmin' ? null : req.user.id;
  const vendor = await Vendor.create({ ...req.body, createdBy: createdByValue });
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'CREATE_VENDOR', targetModel: 'Vendor', targetId: vendor._id, req });
  res.status(201).json({ success: true, message: 'Vendor created.', vendor });
});

exports.updateVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) throw new AppError('Vendor not found.', 404);
  const allowed = ['name', 'phone', 'paymentDueDays', 'vehicleModels', 'branches', 'isActive'];
  allowed.forEach((f) => { if (req.body[f] !== undefined) vendor[f] = req.body[f]; });
  await vendor.save();
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'UPDATE_VENDOR', targetModel: 'Vendor', targetId: vendor._id, req });
  res.json({ success: true, message: 'Vendor updated.', vendor });
});

exports.deleteVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) throw new AppError('Vendor not found.', 404);
  vendor.isActive = false;
  await vendor.save();
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'DELETE_VENDOR', targetModel: 'Vendor', targetId: vendor._id, req });
  res.json({ success: true, message: 'Vendor deactivated.' });
});

// ── Purchase History ─────────────────────────────────────
exports.getPurchases = asyncHandler(async (req, res) => {
  const entryFilter = {};
  const purchaseFilter = {};

  if (req.branchFilter) {
    entryFilter.branch = req.branchFilter;
    purchaseFilter.branch = req.branchFilter;
  }
  if (req.query.branch) {
    entryFilter.branch = req.query.branch;
    purchaseFilter.branch = req.query.branch;
  }
  if (req.query.vendor) {
    entryFilter.vendor = req.query.vendor;
    purchaseFilter.vendor = req.query.vendor;
  }
  if (req.query.part) {
    entryFilter.part = req.query.part;
    purchaseFilter['items.partId'] = req.query.part;
  }
  if (req.query.unpaid === 'true') {
    entryFilter.paymentPaid = false;
    purchaseFilter.paymentPaid = false;
  }

  const entries = await PurchaseEntry.find(entryFilter)
    .populate('vendor', 'name phone paymentDueDays')
    .populate('part', 'partNumber partName brand')
    .populate('branch', 'name code')
    .sort({ createdAt: -1 })
    .limit(parseInt(req.query.limit) || 100);

  const purchases = await Purchase.find(purchaseFilter)
    .populate('vendor', 'name phone paymentDueDays')
    .populate('branch', 'name code')
    .populate('items.partId', 'partNumber partName brand')
    .sort({ createdAt: -1 })
    .limit(parseInt(req.query.limit) || 100);

  res.json({ success: true, count: entries.length + purchases.length, entries, purchases });
});

exports.markPurchasePaid = asyncHandler(async (req, res) => {
  const entry = await PurchaseEntry.findById(req.params.id);
  if (entry) {
    entry.paymentPaid = true;
    entry.paymentPaidAt = new Date();
    await entry.save();
    await audit({ actor: req.user.id, actorRole: req.user.role, action: 'MARK_PURCHASE_PAID', targetModel: 'PurchaseEntry', targetId: entry._id, req });
    return res.json({ success: true, message: 'Purchase marked as paid.', entry });
  }

  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) throw new AppError('Purchase not found.', 404);
  purchase.paymentPaid = true;
  purchase.paymentPaidAt = new Date();
  await purchase.save();
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'MARK_PURCHASE_PAID', targetModel: 'Purchase', targetId: purchase._id, req });
  res.json({ success: true, message: 'Purchase marked as paid.', purchase });
});
// ── Create Bulk Purchase ─────────────────────────────────
exports.createPurchase = asyncHandler(async (req, res) => {
  const { vendorId, items, miscCost, totalCost, paymentDueDate, notes } = req.body;
  if (!vendorId) throw new AppError('Vendor is required.', 400);
  if (!Array.isArray(items) || items.length === 0) throw new AppError('At least one item is required.', 400);
  if (totalCost == null || totalCost < 0) throw new AppError('Total cost is required.', 400);

  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw new AppError('Vendor not found.', 404);

  const branchId = req.user.role === 'admin' || req.user.role === 'superadmin'
    ? (req.body.branch || req.user.branch)
    : req.user.branch;
  if (!branchId) throw new AppError('Branch is required.', 400);

  const vendorAllowed = !vendor.branches?.length || vendor.branches.some(b => b.toString() === branchId.toString());
  if (!vendorAllowed) throw new AppError('Vendor is not assigned to this branch.', 400);

  // Validate and process items
  const processedItems = [];
  for (const item of items) {
    if (!item.partId || !item.qty || item.qty < 1) continue;
    if (item.purchaseCost == null || item.purchaseCost < 0) throw new AppError('Purchase cost is required for each item.', 400);
    if (item.sellingPrice == null || item.sellingPrice < 0) throw new AppError('Selling price is required for each item.', 400);

    const part = await Part.findById(item.partId);
    if (!part) throw new AppError(`Part ${item.partId} not found.`, 404);
    if (part.branch.toString() !== branchId.toString()) throw new AppError(`Part ${part.partNumber} is not in this branch.`, 400);

    processedItems.push({
      partId: item.partId,
      qty: item.qty,
      purchaseCost: item.purchaseCost,
      sellingPrice: item.sellingPrice,
    });
  }

  if (processedItems.length === 0) throw new AppError('No valid items to purchase.', 400);

  // Create the purchase record
  const createdByValue = req.user.role === 'superadmin' ? null : req.user.id;
  const purchase = await Purchase.create({
    vendor: vendorId,
    branch: branchId,
    items: processedItems,
    miscCost: miscCost || 0,
    totalCost,
    paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : undefined,
    notes,
    createdBy: createdByValue,
  });

  // Add stock to parts
  for (const item of processedItems) {
    const part = await Part.findById(item.partId);
    part.vendorBatches.push({
      vendorId: vendor._id,
      vendorName: vendor.name,
      purchasePrice: item.purchaseCost,
      sellingPrice: item.sellingPrice,
      stock: item.qty,
      purchasedAt: new Date(),
      isActive: true,
    });
    part.lastRestockedAt = new Date();
    part.lastModifiedBy = req.user.id;
    await part.save();
  }

  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'CREATE_PURCHASE', targetModel: 'Purchase', targetId: purchase._id, req });
  res.status(201).json({ success: true, message: 'Purchase created and stock added.', purchase });
});