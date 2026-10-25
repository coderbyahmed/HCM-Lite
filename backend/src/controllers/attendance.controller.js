import {
  checkInEmployee,
  checkOutEmployee,
  getDailyAttendanceBoard,
  requestAttendanceCorrection,
  reviewAttendanceCorrection,
} from '../services/attendance.service.js';
import { Attendance, AttendanceCorrection } from '../models/index.js';
import { verifyEmployeeFace } from '../services/face.service.js';

export const checkIn = async (req, res, next) => {
  try {
    const employeeId = req.user.role === 'Employee' ? req.user.employeeId : req.body.employeeId || req.user.employeeId;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'No linked employee ID for this account.' });
    }

    const { latitude, longitude, method = 'web', faceDescriptor } = req.body;
    let faceVerified = false;
    if (method === 'face') {
      if (req.user.role !== 'Employee') {
        return res.status(403).json({ success: false, message: 'Face attendance is available only to the linked employee.' });
      }
      faceVerified = await verifyEmployeeFace(employeeId, faceDescriptor);
    } else if (method !== 'web') {
      return res.status(400).json({ success: false, message: 'Attendance method must be web or face.' });
    }

    const result = await checkInEmployee({
      employeeId,
      latitude,
      longitude,
      faceVerified,
      method,
      ip: req.ip,
    });

    res.status(201).json({ success: true, message: 'Check-in recorded successfully.', attendance: result });
  } catch (err) {
    next(err);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    const employeeId = req.user.role === 'Employee' ? req.user.employeeId : req.body.employeeId || req.user.employeeId;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'No linked employee ID for this account.' });
    }

    const { method = 'web', faceDescriptor } = req.body;
    if (method === 'face') {
      if (req.user.role !== 'Employee') {
        return res.status(403).json({ success: false, message: 'Face attendance is available only to the linked employee.' });
      }
      await verifyEmployeeFace(employeeId, faceDescriptor);
    } else if (method !== 'web') {
      return res.status(400).json({ success: false, message: 'Attendance method must be web or face.' });
    }

    const result = await checkOutEmployee({ employeeId, method, ip: req.ip });
    res.json({ success: true, message: 'Check-out recorded successfully.', attendance: result });
  } catch (err) {
    next(err);
  }
};

export const getBoard = async (req, res, next) => {
  try {
    const { date } = req.query;
    const board = await getDailyAttendanceBoard(date);
    res.json({ success: true, ...board });
  } catch (err) {
    next(err);
  }
};

export const getMyAttendance = async (req, res, next) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'No linked employee record.' });
    }

    const { month } = req.query; // YYYY-MM
    const query = { employeeId };
    if (month) {
      query.date = { $regex: `^${month}` };
    }

    const records = await Attendance.find(query).sort({ date: -1 });
    res.json({ success: true, records });
  } catch (err) {
    next(err);
  }
};

export const createCorrection = async (req, res, next) => {
  try {
    const employeeId = req.user.role === 'Employee' ? req.user.employeeId : req.body.employeeId || req.user.employeeId;
    const { date, requestedCheckIn, requestedCheckOut, reason } = req.body;

    if (!date || !requestedCheckIn || !requestedCheckOut || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Date, requestedCheckIn, requestedCheckOut, and reason are required.',
      });
    }

    const result = await requestAttendanceCorrection({
      employeeId,
      date,
      requestedCheckIn,
      requestedCheckOut,
      reason,
      ip: req.ip,
    });

    res.status(201).json({ success: true, message: 'Correction request submitted to HR.', correction: result });
  } catch (err) {
    next(err);
  }
};

export const listCorrections = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role === 'Employee') {
      query.employeeId = req.user.employeeId;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    const corrections = await AttendanceCorrection.find(query).sort({ createdAt: -1 });
    res.json({ success: true, corrections });
  } catch (err) {
    next(err);
  }
};

export const reviewCorrection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reviewComment } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected.' });
    }

    const result = await reviewAttendanceCorrection({
      correctionId: id,
      status,
      reviewComment,
      reviewerUser: req.user,
      ip: req.ip,
    });

    res.json({ success: true, message: `Correction request ${status}.`, correction: result });
  } catch (err) {
    next(err);
  }
};
