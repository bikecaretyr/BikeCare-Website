const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

const audit = async ({
  actor,
  actorRole,
  action,
  targetModel,
  targetId,
  meta,
  req,
  branch,
  severity = 'low',
}) => {
  try {
    await AuditLog.create({
      actor: actor?.toString() || 'system',
      actorRole,
      action,
      targetModel,
      targetId: targetId?.toString(),
      meta,
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'],
      userAgent: req?.headers?.['user-agent'],
      branch,
      severity,
    });
  } catch (err) {
    logger.error(`Audit log failed: ${err.message}`);
  }
};

module.exports = audit;
