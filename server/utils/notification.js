const Notification = require('../models/Notification');
const logger = require('./logger');

const notify = async ({ recipient, type, title, message, link, relatedId, relatedModel }) => {
  try {
    await Notification.create({ recipient, type, title, message, link, relatedId, relatedModel });
  } catch (err) {
    logger.error(`Notification creation failed: ${err.message}`);
  }
};

// Notify all admins of a new approval request
const notifyAdmins = async (User, { type, title, message, link, relatedId, relatedModel }) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'branch_admin'] }, isActive: true }).select('_id');
    const notifications = admins.map((a) => ({
      recipient: a._id,
      type,
      title,
      message,
      link,
      relatedId,
      relatedModel,
    }));
    await Notification.insertMany(notifications);
  } catch (err) {
    logger.error(`notifyAdmins failed: ${err.message}`);
  }
};

module.exports = { notify, notifyAdmins };
