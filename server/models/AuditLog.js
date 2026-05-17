const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: String, // 'superadmin', userId, or 'system'
      required: true,
    },
    actorRole: {
      type: String,
      enum: ['superadmin', 'admin', 'branch_admin', 'manager', 'employee', 'customer', 'system'],
    },
    action: {
      type: String,
      required: true,
      // e.g. 'LOGIN', 'LOGOUT', 'CREATE_JOB', 'APPROVE_REQUEST', 'DELETE_USER'
    },
    targetModel: String,
    targetId: String,
    meta: { type: mongoose.Schema.Types.Mixed }, // extra context
    ipAddress: String,
    userAgent: String,
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
  },
  { timestamps: true }
);

// Keep logs for 1 year automatically using TTL
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
