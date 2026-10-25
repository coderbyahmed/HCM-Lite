import { AuditLog } from '../models/index.js';

export const logAudit = async ({
  userId,
  userEmail,
  userRole,
  action,
  entity,
  entityId = null,
  details = null,
  ip = null,
}) => {
  await AuditLog.create({
    userId: userId || 'SYSTEM',
    userEmail: userEmail || 'system@hcmlite.internal',
    userRole: userRole || 'SYSTEM',
    action,
    entity,
    entityId,
    details,
    ip: ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });
};

export const getAuditLogs = async (limit = 100, page = 1) => {
  const skip = (page - 1) * limit;
  const logs = await AuditLog.find({}).sort({ timestamp: -1 }).skip(skip).limit(limit);
  const total = await AuditLog.countDocuments({});
  return { logs, total, page, totalPages: Math.ceil(total / limit) };
};
