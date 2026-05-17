const User = require('../models/User');
const {
  signAccessToken, signRefreshToken, signSuperAdminToken,
  verifyRefreshToken, setRefreshCookie, clearRefreshCookie,
} = require('../utils/jwt');
const audit = require('../utils/audit');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// ── Staff Login ─────────────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password are required.', 400);

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshToken');
  if (!user) {
    await audit({ actor: 'unknown', actorRole: 'employee', action: 'LOGIN_FAILED', meta: { email }, req, severity: 'medium' });
    throw new AppError('Invalid credentials.', 401);
  }
  if (user.isLocked()) throw new AppError('Account locked due to repeated failed attempts. Try again in 2 hours.', 423);
  if (!user.isActive) throw new AppError('Account is deactivated. Contact admin.', 403);

  const match = await user.comparePassword(password);
  if (!match) {
    await user.incLoginAttempts();
    await audit({ actor: user._id, actorRole: user.role, action: 'LOGIN_FAILED', req, severity: 'medium' });
    throw new AppError('Invalid credentials.', 401);
  }

  await user.resetLoginAttempts();
  user.lastLogin = new Date();

  const accessToken = signAccessToken({ id: user._id, role: user.role, branch: user.branch });
  const refreshToken = signRefreshToken({ id: user._id });
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, refreshToken);
  await audit({ actor: user._id, actorRole: user.role, action: 'LOGIN', req, branch: user.branch });

  res.json({
    success: true,
    accessToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, branch: user.branch },
  });
});

// ── SuperAdmin Login ────────────────────────────────────
exports.superAdminLogin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (
    username !== process.env.SUPERADMIN_USERNAME ||
    password !== process.env.SUPERADMIN_PASSWORD
  ) {
    await audit({ actor: 'unknown', actorRole: 'superadmin', action: 'SUPERADMIN_LOGIN_FAILED', req, severity: 'critical' });
    throw new AppError('Invalid superadmin credentials.', 401);
  }
  const token = signSuperAdminToken({ id: 'superadmin', role: 'superadmin', name: 'Super Admin' });
  await audit({ actor: 'superadmin', actorRole: 'superadmin', action: 'SUPERADMIN_LOGIN', req, severity: 'high' });
  res.json({ success: true, accessToken: token, user: { id: 'superadmin', name: 'Super Admin', role: 'superadmin' } });
});

// ── Refresh Token ───────────────────────────────────────
exports.refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.bms_refresh;
  if (!token) throw new AppError('No refresh token.', 401);
  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    clearRefreshCookie(res);
    throw new AppError('Invalid refresh token.', 401);
  }
  const accessToken = signAccessToken({ id: user._id, role: user.role, branch: user.branch });
  res.json({ success: true, accessToken });
});

// ── Logout ──────────────────────────────────────────────
exports.logout = asyncHandler(async (req, res) => {
  if (req.user?.id !== 'superadmin') {
    await User.findByIdAndUpdate(req.user.id, { refreshToken: null });
  }
  clearRefreshCookie(res);
  await audit({ actor: req.user?.id, actorRole: req.user?.role, action: 'LOGOUT', req });
  res.json({ success: true, message: 'Logged out.' });
});

// ── Get Me ──────────────────────────────────────────────
exports.getMe = asyncHandler(async (req, res) => {
  if (req.user?.role === 'superadmin')
    return res.json({ success: true, user: { id: 'superadmin', name: 'Super Admin', role: 'superadmin' } });
  const user = await User.findById(req.user.id).populate('branch', 'name code');
  res.json({ success: true, user });
});

// ── Change Password ─────────────────────────────────────
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new AppError('Both fields required.', 400);
  if (newPassword.length < 8) throw new AppError('New password must be at least 8 characters.', 400);
  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.comparePassword(currentPassword))) throw new AppError('Current password incorrect.', 400);
  user.password = newPassword;
  await user.save();
  await audit({ actor: user._id, actorRole: user.role, action: 'PASSWORD_CHANGED', req, severity: 'medium' });
  res.json({ success: true, message: 'Password updated.' });
});
