import {
  applyForLeave,
  cancelLeaveRequest,
  reviewLeaveRequest,
  getLeaveBalance,
  calculateLeaveDays,
} from '../services/leave.service.js';
import { LeaveRequest, Employee } from '../models/index.js';

export const apply = async (req, res, next) => {
  try {
    const employeeId = req.user.role === 'Employee' ? req.user.employeeId : req.body.employeeId || req.user.employeeId;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'No linked employee ID.' });
    }

    const { leaveType, startDate, endDate, reason } = req.body;
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Leave type, start date, end date, and reason are required.',
      });
    }

    const result = await applyForLeave({
      employeeId,
      leaveType,
      startDate,
      endDate,
      reason,
      ip: req.ip,
    });

    res.status(201).json({ success: true, message: 'Leave application submitted.', leaveRequest: result });
  } catch (err) {
    next(err);
  }
};

export const cancel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employeeId = req.user.employeeId;
    const result = await cancelLeaveRequest(id, employeeId, req.ip);
    res.json({ success: true, message: 'Leave request cancelled.', leaveRequest: result });
  } catch (err) {
    next(err);
  }
};

export const getMyBalance = async (req, res, next) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'No linked employee record.' });
    }

    const balance = await getLeaveBalance(employeeId);
    res.json({ success: true, balance });
  } catch (err) {
    next(err);
  }
};

export const calculateDaysPreview = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate query parameters are required.' });
    }

    const result = await calculateLeaveDays(startDate, endDate);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const list = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role === 'Employee') {
      query.employeeId = req.user.employeeId;
    } else if (req.query.employeeId) {
      query.employeeId = req.query.employeeId;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const leaves = await LeaveRequest.find(query).sort({ createdAt: -1 });

    // Enrich with employee name
    const employees = await Employee.find({});
    const empMap = Object.fromEntries(employees.map((e) => [e._id, `${e.firstName} ${e.lastName} (${e.employeeCode})`]));

    const enriched = leaves.map((l) => {
      const leave = typeof l.toObject === 'function' ? l.toObject() : l;
      return {
        ...leave,
        employeeName: empMap[l.employeeId] || 'Employee',
      };
    });

    res.json({ success: true, leaves: enriched });
  } catch (err) {
    next(err);
  }
};

export const review = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reviewComment } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected.' });
    }

    const result = await reviewLeaveRequest({
      requestId: id,
      status,
      reviewComment,
      reviewerUser: req.user,
      ip: req.ip,
    });

    res.json({ success: true, message: `Leave request ${status}.`, leaveRequest: result });
  } catch (err) {
    next(err);
  }
};
