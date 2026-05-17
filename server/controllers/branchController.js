const Branch = require('../models/Branch');
const Service = require('../models/Service');
const audit = require('../utils/audit');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// ══ BRANCH ══════════════════════════════════
exports.getBranches = asyncHandler(async (req, res) => {
  const filter = req.query.activeOnly === 'true' ? { isActive: true } : {};
  const branches = await Branch.find(filter).sort({ name: 1 });
  res.json({ success: true, count: branches.length, branches });
});

exports.getBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id);
  if (!branch) throw new AppError('Branch not found.', 404);
  res.json({ success: true, branch });
});

exports.createBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.create(req.body);
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'CREATE_BRANCH', targetModel: 'Branch', targetId: branch._id, req, severity: 'medium' });
  res.status(201).json({ success: true, message: 'Branch created.', branch });
});

exports.updateBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!branch) throw new AppError('Branch not found.', 404);
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'UPDATE_BRANCH', targetModel: 'Branch', targetId: branch._id, req });
  res.json({ success: true, message: 'Branch updated.', branch });
});

exports.deactivateBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!branch) throw new AppError('Branch not found.', 404);
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'DEACTIVATE_BRANCH', targetModel: 'Branch', targetId: branch._id, req, severity: 'high' });
  res.json({ success: true, message: 'Branch deactivated.' });
});

exports.activateBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
  if (!branch) throw new AppError('Branch not found.', 404);
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'ACTIVATE_BRANCH', targetModel: 'Branch', targetId: branch._id, req, severity: 'medium' });
  res.json({ success: true, message: 'Branch activated.' });
});

exports.deleteBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findByIdAndDelete(req.params.id);
  if (!branch) throw new AppError('Branch not found.', 404);
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'DELETE_BRANCH', targetModel: 'Branch', targetId: branch._id, req, severity: 'high' });
  res.json({ success: true, message: 'Branch permanently deleted.' });
});


// ══ SERVICES ═════════════════════════════════
exports.getServices = asyncHandler(async (req, res) => {
  const filter = req.query.activeOnly !== 'false' ? { isActive: true } : {};
  const services = await Service.find(filter).sort({ sortOrder: 1, name: 1 });
  res.json({ success: true, count: services.length, services });
});

exports.createService = asyncHandler(async (req, res) => {
  const service = await Service.create(req.body);
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'CREATE_SERVICE', targetModel: 'Service', targetId: service._id, req });
  res.status(201).json({ success: true, message: 'Service added.', service });
});

exports.updateService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!service) throw new AppError('Service not found.', 404);
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'UPDATE_SERVICE', targetModel: 'Service', targetId: service._id, req });
  res.json({ success: true, message: 'Service updated.', service });
});

exports.deactivateService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!service) throw new AppError('Service not found.', 404);
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'DEACTIVATE_SERVICE', targetModel: 'Service', targetId: service._id, req });
  res.json({ success: true, message: 'Service deactivated.' });
});

exports.activateService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
  if (!service) throw new AppError('Service not found.', 404);
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'ACTIVATE_SERVICE', targetModel: 'Service', targetId: service._id, req });
  res.json({ success: true, message: 'Service activated.' });
});

exports.deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndDelete(req.params.id);
  if (!service) throw new AppError('Service not found.', 404);
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'DELETE_SERVICE', targetModel: 'Service', targetId: service._id, req, severity: 'high' });
  res.json({ success: true, message: 'Service permanently deleted.' });
});
