const { verifyAccessToken, verifySuperAdminToken } = require('../utils/jwt');
const User = require('../models/User');
const audit = require('../utils/audit');

// ── Protect: require valid JWT ──────────────────
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      decoded = verifySuperAdminToken(token);
    }

    // SuperAdmin path — no DB lookup needed
    if (decoded.role === 'superadmin') {
      req.user = { id: 'superadmin', role: 'superadmin', name: 'Super Admin' };
      return next();
    }

    const user = await User.findById(decoded.id).select('+passwordChangedAt');
    if (!user) return res.status(401).json({ success: false, message: 'User no longer exists.' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    if (user.changedPasswordAfter(decoded.iat))
      return res.status(401).json({ success: false, message: 'Password changed. Please log in again.' });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ success: false, message: 'Session expired. Please refresh.' });
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// ── SuperAdmin only ─────────────────────────────
const superAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'superadmin')
    return res.status(403).json({ success: false, message: 'Access restricted to Super Admin.' });
  next();
};

// ── Role-based access ──────────────────────────
const authorize = (...roles) => (req, res, next) => {
  if (req.user?.role === 'superadmin') return next(); // SA bypasses all
  if (!roles.includes(req.user?.role))
    return res.status(403).json({
      success: false,
      message: `Role '${req.user?.role}' is not authorized for this action.`,
    });
  next();
};

// ── Branch filter: employee and manager can only access own branch ──
const branchScope = (req, res, next) => {
  if (req.user?.role === 'superadmin' || req.user?.role === 'admin') return next();
  if (!req.user?.branch)
    return res.status(403).json({ success: false, message: 'No branch assigned to this account.' });
  req.branchFilter = req.user.branch;
  next();
};

module.exports = { protect, superAdminOnly, authorize, branchScope };
