const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getMyNotifications = asyncHandler(async (req, res) => {
  // Superadmin doesn't have a real user ID, so no notifications
  if (req.user.id === 'superadmin') {
    return res.json({ success: true, unreadCount: 0, notifications: [] });
  }

  const notifications = await Notification.find({ recipient: req.user.id })
    .sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({ recipient: req.user.id, isRead: false });
  res.json({ success: true, unreadCount, notifications });
});

exports.markRead = asyncHandler(async (req, res) => {
  // Superadmin doesn't have notifications to mark as read
  if (req.user.id === 'superadmin') {
    return res.json({ success: true, message: 'All notifications marked as read.' });
  }

  await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
  res.json({ success: true, message: 'All notifications marked as read.' });
});

exports.markOneRead = asyncHandler(async (req, res) => {
  // Superadmin doesn't have notifications to mark as read
  if (req.user.id === 'superadmin') {
    return res.json({ success: true });
  }

  await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user.id }, { isRead: true });
  res.json({ success: true });
});

// SuperAdmin only
exports.getAuditLogs = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.actor) filter.actor = req.query.actor;
  if (req.query.action) filter.action = new RegExp(req.query.action, 'i');
  if (req.query.severity) filter.severity = req.query.severity;

  const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, count: logs.length, logs });
});
