import { LeaveRequest, Company } from '../models/index.js';
import { isWorkingDay } from './organization.service.js';
import { logAudit } from './audit.service.js';

export const calculateLeaveDays = async (startDateStr, endDateStr) => {
  const company = await Company.findOne({});
  const settings = company?.settings || {};

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (start > end) {
    const err = new Error('Start date cannot be after end date.');
    err.statusCode = 422;
    throw err;
  }

  let workingDaysCount = 0;
  const holidaysEncountered = [];
  const current = new Date(start);

  while (current <= end) {
    const dStr = current.toISOString().split('T')[0];
    const isWork = isWorkingDay(dStr, settings);

    if (isWork) {
      workingDaysCount++;
    } else {
      const holiday = (settings.holidays || []).find((h) => h.date === dStr);
      if (holiday) {
        holidaysEncountered.push(holiday);
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    workingDaysCount,
    holidaysEncountered,
  };
};

export const getLeaveBalance = async (employeeId, year = new Date().getFullYear()) => {
  const company = await Company.findOne({});
  const quotas = company?.settings?.leaveQuotas || { casual: 10, sick: 8, annual: 14, unpaid: 999 };

  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  const approvedLeaves = await LeaveRequest.find({
    employeeId,
    status: 'approved',
    startDate: { $gte: startOfYear },
    endDate: { $lte: endOfYear },
  });

  const used = {
    casual: 0,
    sick: 0,
    annual: 0,
    unpaid: 0,
  };

  for (const l of approvedLeaves) {
    if (used[l.leaveType] !== undefined) {
      used[l.leaveType] += l.daysCount;
    }
  }

  return {
    year,
    quotas,
    used,
    remaining: {
      casual: Math.max(0, quotas.casual - used.casual),
      sick: Math.max(0, quotas.sick - used.sick),
      annual: Math.max(0, quotas.annual - used.annual),
      unpaid: 999,
    },
  };
};

export const applyForLeave = async ({
  employeeId,
  leaveType,
  startDate,
  endDate,
  reason,
  ip = '127.0.0.1',
}) => {
  // 1. Calculate working days
  const { workingDaysCount } = await calculateLeaveDays(startDate, endDate);
  if (workingDaysCount <= 0) {
    const err = new Error('The selected date range contains 0 working days (falls entirely on weekends or company holidays).');
    err.statusCode = 422;
    throw err;
  }

  // 2. Overlap check
  const activeLeaves = await LeaveRequest.find({
    employeeId,
    status: { $in: ['pending', 'approved'] },
  });

  const hasOverlap = activeLeaves.some((l) => {
    return !(endDate < l.startDate || startDate > l.endDate);
  });

  if (hasOverlap) {
    const err = new Error('The requested leave dates overlap with an existing pending or approved leave request.');
    err.statusCode = 422;
    throw err;
  }

  // 3. Balance check (for paid leave types)
  if (leaveType !== 'unpaid') {
    const balance = await getLeaveBalance(employeeId);
    const available = balance.remaining[leaveType] || 0;

    if (workingDaysCount > available) {
      const err = new Error(`Insufficient leave balance. Requested ${workingDaysCount} days, but you only have ${available} ${leaveType} days remaining.`);
      err.statusCode = 422;
      throw err;
    }
  }

  // 4. Create request
  const request = await LeaveRequest.create({
    employeeId,
    leaveType,
    startDate,
    endDate,
    daysCount: workingDaysCount,
    reason,
    status: 'pending',
    reviewedBy: null,
    reviewComment: null,
  });

  await logAudit({
    userId: employeeId,
    action: 'APPLY_LEAVE_REQUEST',
    entity: 'LeaveRequest',
    entityId: request._id,
    details: { leaveType, startDate, endDate, daysCount: workingDaysCount },
    ip,
  });

  return request;
};

export const cancelLeaveRequest = async (requestId, employeeId, ip = '127.0.0.1') => {
  const request = await LeaveRequest.findById(requestId);
  if (!request) {
    const err = new Error('Leave request not found.');
    err.statusCode = 404;
    throw err;
  }

  if (String(request.employeeId) !== String(employeeId)) {
    const err = new Error('Unauthorized. You can only cancel your own leave requests.');
    err.statusCode = 403;
    throw err;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (request.status === 'approved' && request.startDate < todayStr) {
    const err = new Error('Past or ongoing approved leave cannot be cancelled by employee.');
    err.statusCode = 400;
    throw err;
  }

  if (request.status === 'rejected' || request.status === 'cancelled') {
    const err = new Error(`Request has already been ${request.status}.`);
    err.statusCode = 400;
    throw err;
  }

  await LeaveRequest.updateOne(
    { _id: requestId },
    {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      },
    }
  );

  await logAudit({
    userId: employeeId,
    action: 'CANCEL_LEAVE_REQUEST',
    entity: 'LeaveRequest',
    entityId: requestId,
    ip,
  });

  return LeaveRequest.findById(requestId);
};

export const reviewLeaveRequest = async ({
  requestId,
  status, // 'approved' or 'rejected'
  reviewComment = '',
  reviewerUser,
  ip = '127.0.0.1',
}) => {
  const request = await LeaveRequest.findById(requestId);
  if (!request) {
    const err = new Error('Leave request not found.');
    err.statusCode = 404;
    throw err;
  }

  if (request.status !== 'pending') {
    const err = new Error(`Request has already been ${request.status}.`);
    err.statusCode = 400;
    throw err;
  }

  await LeaveRequest.updateOne(
    { _id: requestId },
    {
      $set: {
        status,
        reviewComment,
        reviewedBy: reviewerUser._id,
        reviewedAt: new Date().toISOString(),
      },
    }
  );

  await logAudit({
    userId: reviewerUser._id,
    userEmail: reviewerUser.email,
    userRole: reviewerUser.role,
    action: `LEAVE_REQUEST_${status.toUpperCase()}`,
    entity: 'LeaveRequest',
    entityId: requestId,
    details: { status, reviewComment },
    ip,
  });

  return LeaveRequest.findById(requestId);
};
