const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    issuer: 'bms.balajimotor.in',
  });

const signRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'bms.balajimotor.in',
  });

const signSuperAdminToken = (payload) =>
  jwt.sign(payload, process.env.SUPERADMIN_SECRET_KEY, {
    expiresIn: '4h',
    issuer: 'bms.balajimotor.in',
  });

const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET);

const verifySuperAdminToken = (token) =>
  jwt.verify(token, process.env.SUPERADMIN_SECRET_KEY);

const generateResetToken = () => {
  const raw = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hashed };
};

const setRefreshCookie = (res, token) => {
  res.cookie('bms_refresh', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth/refresh',
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie('bms_refresh', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth/refresh',
  });
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  signSuperAdminToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifySuperAdminToken,
  generateResetToken,
  setRefreshCookie,
  clearRefreshCookie,
};
