const mongoose = require('mongoose');

const approvalRequestSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['job_edit', 'job_delete', 'part_edit', 'part_delete', 'part_add', 'credit_collect'],
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    targetModel: {
      type: String,
      enum: ['JobCard', 'Part'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // Snapshot of what they want to change
    currentData: { type: mongoose.Schema.Types.Mixed },
    requestedData: { type: mongoose.Schema.Types.Mixed },
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    reviewNote: String,
    // For in-app notification tracking
    adminSeen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);
