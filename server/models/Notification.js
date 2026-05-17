const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'approval_request',
        'approval_approved',
        'approval_rejected',
        'booking_new',
        'booking_confirmed',
        'low_stock',
        'credit_reminder',
        'system',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: String, // e.g. '/admin/approvals/ID'
    isRead: { type: Boolean, default: false },
    relatedId: String,
    relatedModel: String,
  },
  { timestamps: true }
);

// Auto-expire notifications after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

module.exports = mongoose.model('Notification', notificationSchema);
