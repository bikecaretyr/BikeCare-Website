const ApprovalRequest = require('../models/ApprovalRequest');
const JobCard = require('../models/JobCard');
const Part = require('../models/Part');
const { notify } = require('../utils/notification');
const audit = require('../utils/audit');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

exports.getRequests = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  else filter.status = 'Pending'; // default to pending
  if (req.branchFilter) filter.branch = req.branchFilter;

  const requests = await ApprovalRequest.find(filter)
    .populate('requestedBy', 'name email role')
    .populate('branch', 'name code')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 });

  // Mark all as seen by admin
  await ApprovalRequest.updateMany({ _id: { $in: requests.map(r => r._id) }, adminSeen: false }, { adminSeen: true });

  res.json({ success: true, count: requests.length, requests });
});

exports.getRequest = asyncHandler(async (req, res) => {
  const request = await ApprovalRequest.findById(req.params.id)
    .populate('requestedBy', 'name email role branch')
    .populate('branch', 'name code')
    .populate('reviewedBy', 'name');
  if (!request) throw new AppError('Request not found.', 404);
  res.json({ success: true, request });
});

exports.getPendingCount = asyncHandler(async (req, res) => {
  const filter = { status: 'Pending', adminSeen: false };
  if (req.branchFilter) filter.branch = req.branchFilter;
  const count = await ApprovalRequest.countDocuments(filter);
  res.json({ success: true, count });
});

exports.reviewRequest = asyncHandler(async (req, res) => {
  const { action, note } = req.body; // action: 'approve' | 'reject'
  if (!['approve', 'reject'].includes(action)) throw new AppError('Action must be approve or reject.', 400);

  const request = await ApprovalRequest.findById(req.params.id).populate('requestedBy', 'name _id');
  if (!request) throw new AppError('Request not found.', 404);
  if (request.status !== 'Pending') throw new AppError('Request already reviewed.', 409);

  request.status = action === 'approve' ? 'Approved' : 'Rejected';
  request.reviewedBy = req.user.id;
  request.reviewedAt = new Date();
  request.reviewNote = note || '';
  await request.save();

  // Apply changes if approved
  if (action === 'approve') {
    if (request.type === 'job_edit') {
      const allowed = ['status', 'actualDelivery', 'expectedDelivery', 'mechanic', 'engineOil', 'sparesUsed', 'workDone', 'labourCharge', 'waterWash', 'sparesCost', 'discount', 'paymentMode', 'paymentStatus'];
      const update = {};
      allowed.forEach(f => { if (request.requestedData[f] !== undefined) update[f] = request.requestedData[f]; });
      update.lastModifiedBy = req.user.id;
      await JobCard.findByIdAndUpdate(request.targetId, update);
    }
    if (request.type === 'job_delete') {
      await JobCard.findByIdAndDelete(request.targetId);
    }
    if (request.type === 'part_edit') {
      const allowed = ['partName', 'brand', 'unitPrice', 'stock', 'minStock'];
      const update = {};
      allowed.forEach(f => { if (request.requestedData[f] !== undefined) update[f] = request.requestedData[f]; });
      update.lastModifiedBy = req.user.id;
      await Part.findByIdAndUpdate(request.targetId, update);
    }
    if (request.type === 'part_delete') {
      await Part.findByIdAndUpdate(request.targetId, { isActive: false });
    }
    if (request.type === 'part_add') {
      const d = request.requestedData;
      const existing = await Part.findOne({ partName: new RegExp(`^${d.partName}$`, 'i'), branch: d.branch });
      if (existing) { existing.stock += d.stock || 0; await existing.save(); }
      else await Part.create({ ...d, createdBy: request.requestedBy._id });
    }
  }

  // Notify the employee
  await notify({
    recipient: request.requestedBy._id,
    type: action === 'approve' ? 'approval_approved' : 'approval_rejected',
    title: action === 'approve' ? '✅ Request Approved' : '❌ Request Rejected',
    message: action === 'approve'
      ? `Your ${request.type.replace('_', ' ')} request was approved.`
      : `Your ${request.type.replace('_', ' ')} request was rejected. ${note ? 'Reason: ' + note : ''}`,
    relatedId: request._id.toString(),
    relatedModel: 'ApprovalRequest',
  });

  await audit({ actor: req.user.id, actorRole: req.user.role, action: `${action.toUpperCase()}_REQUEST`, targetModel: 'ApprovalRequest', targetId: request._id, meta: { type: request.type }, req, severity: 'medium' });
  res.json({ success: true, message: `Request ${action}d successfully.` });
});

// Employee: fetch only their own requests
exports.getMyRequests = asyncHandler(async (req, res) => {
  const filter = { requestedBy: req.user.id };
  if (req.query.status) filter.status = req.query.status;
  const requests = await ApprovalRequest.find(filter)
    .populate('branch', 'name code')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: requests.length, requests });
});
