const User = require('../models/User');
const Branch = require('../models/Branch');
const audit = require('../utils/audit');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// ── Create Employee (Admin only) ─────────────────────────
exports.createEmployee = asyncHandler(async (req, res) => {
  const { name, email, password, role, branch, phone } = req.body;
  if (!name || !email || !password) throw new AppError('Name, email and password are required.', 400);
  if (password.length < 8) throw new AppError('Password must be at least 8 characters.', 400);
  
  // SuperAdmin can create: admin, branch_admin, manager, employee
  // Admin can create: manager, employee
  const allowedRoles = req.user.role === 'superadmin' 
    ? ['admin', 'branch_admin', 'manager', 'employee'] 
    : ['manager', 'employee'];
  if (!allowedRoles.includes(role)) throw new AppError(`Cannot assign role '${role}'.`, 403);

  // Manager must be assigned to a branch
  if (role === 'manager' && !branch) {
    throw new AppError('Manager must be assigned to a branch.', 400);
  }

  const createdByValue = req.user.role === 'superadmin' ? null : req.user.id;
  const user = await User.create({ name, email, password, role: role || 'employee', branch: branch || null, phone, createdBy: createdByValue });
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'CREATE_USER', targetModel: 'User', targetId: user._id, meta: { name, email, role }, req, severity: 'medium' });
  res.status(201).json({ success: true, message: 'Employee created.', user: { id: user._id, name: user.name, email: user.email, role: user.role, branch: user.branch } });
});

// ── Get All Employees ────────────────────────────────────
exports.getEmployees = asyncHandler(async (req, res) => {
  const filter = {};
  // SuperAdmin and Admin can see all; Manager sees only their branch employees
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    filter.branch = req.user.branch;
  }
  if (req.query.branch) filter.branch = req.query.branch;
  if (req.query.role) filter.role = req.query.role;
  const users = await User.find(filter).populate('branch', 'name code').select('-refreshToken').sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, users });
});

// ── Get Single Employee ──────────────────────────────────
exports.getEmployee = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('branch', 'name code').select('-refreshToken');
  if (!user) throw new AppError('User not found.', 404);
  res.json({ success: true, user });
});

// ── Update Employee ──────────────────────────────────────
exports.updateEmployee = asyncHandler(async (req, res) => {
  const { name, phone, branch, isActive } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);

  // Prevent role escalation
  if (req.body.role && req.user.role !== 'superadmin') {
    if (req.body.role === 'admin') throw new AppError('Cannot assign admin role.', 403);
  }

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (branch !== undefined) user.branch = branch;
  if (isActive !== undefined) user.isActive = isActive;
  if (req.body.role && req.user.role === 'superadmin') user.role = req.body.role;

  await user.save({ validateBeforeSave: false });
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'UPDATE_USER', targetModel: 'User', targetId: user._id, req, severity: 'low' });
  res.json({ success: true, message: 'Employee updated.', user });
});

// ── Delete / Deactivate Employee ─────────────────────────
exports.deleteEmployee = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  if (user.role === 'admin' && req.user.role !== 'superadmin') throw new AppError('Cannot delete admin.', 403);

  // Soft delete — deactivate
  user.isActive = false;
  await user.save({ validateBeforeSave: false });
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'DEACTIVATE_USER', targetModel: 'User', targetId: user._id, req, severity: 'high' });
  res.json({ success: true, message: 'Employee deactivated.' });
});

// ── Activate Employee ───────────────────────────────────
exports.activateEmployee = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  if (user.role === 'admin' && req.user.role !== 'superadmin') throw new AppError('Cannot activate admin.', 403);

  user.isActive = true;
  await user.save({ validateBeforeSave: false });
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'ACTIVATE_USER', targetModel: 'User', targetId: user._id, req, severity: 'medium' });
  res.json({ success: true, message: 'Employee activated.' });
});

// ── Deactivate Employee ─────────────────────────────────
exports.deactivateEmployee = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  if (user.role === 'admin' && req.user.role !== 'superadmin') throw new AppError('Cannot deactivate admin.', 403);

  user.isActive = false;
  await user.save({ validateBeforeSave: false });
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'DEACTIVATE_USER', targetModel: 'User', targetId: user._id, req, severity: 'high' });
  res.json({ success: true, message: 'Employee deactivated.' });
});

// ── Admin Reset Password ─────────────────────────────────
exports.adminResetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) throw new AppError('Password must be at least 8 characters.', 400);
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  user.password = newPassword;
  await user.save();
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'ADMIN_RESET_PASSWORD', targetModel: 'User', targetId: user._id, req, severity: 'high' });
  res.json({ success: true, message: 'Password reset successfully.' });
});
