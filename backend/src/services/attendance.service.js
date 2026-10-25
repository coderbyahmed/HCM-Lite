import { Attendance, AttendanceCorrection, Company, Employee, LeaveRequest } from '../models/index.js';
import { getDistance } from 'geolib';
import { logAudit } from './audit.service.js';

export const checkInEmployee = async ({
  employeeId,
  latitude = null,
  longitude = null,
  faceVerified = false,
  method = 'web',
  ip = '127.0.0.1',
}) => {
  const company = await Company.findOne({});
  const settings = company?.settings || {};
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Duplicate check-in prevention
  const existing = await Attendance.findOne({ employeeId, date: todayStr });
  if (existing) {
    const err = new Error('Already checked in for today. A second check-in is not permitted (HTTP 409). Use correction request if adjustments are needed.');
    err.statusCode = 409;
    throw err;
  }

  if (!['web', 'face'].includes(method)) {
    const err = new Error('Attendance method must be web or face.');
    err.statusCode = 400;
    throw err;
  }

  if (method === 'face' && !faceVerified) {
    const err = new Error('Face verification is required for face attendance.');
    err.statusCode = 422;
    throw err;
  }

  // 2. Face attendance also enforces the configured office geofence.
  let distanceMeters = null;
  if (method === 'face') {
    const latitudeValue = Number(latitude);
    const longitudeValue = Number(longitude);
    if (
      latitude === null ||
      longitude === null ||
      !Number.isFinite(latitudeValue) ||
      !Number.isFinite(longitudeValue) ||
      latitudeValue < -90 ||
      latitudeValue > 90 ||
      longitudeValue < -180 ||
      longitudeValue > 180
    ) {
      const err = new Error('Valid GPS coordinates are required for face attendance.');
      err.statusCode = 400;
      throw err;
    }

    const officeCoords = settings.geofence;
    if (
      !officeCoords ||
      !Number.isFinite(Number(officeCoords.latitude)) ||
      !Number.isFinite(Number(officeCoords.longitude)) ||
      !Number.isFinite(Number(officeCoords.radiusMeters)) ||
      Number(officeCoords.radiusMeters) <= 0
    ) {
      const err = new Error('Office geofence is not configured for face attendance.');
      err.statusCode = 503;
      throw err;
    }
    distanceMeters = getDistance(
      { latitude: latitudeValue, longitude: longitudeValue },
      { latitude: Number(officeCoords.latitude), longitude: Number(officeCoords.longitude) }
    );

    if (distanceMeters > Number(officeCoords.radiusMeters)) {
      const err = new Error(`Location outside allowable office geofence. Distance: ${distanceMeters}m (Max allowable: ${officeCoords.radiusMeters}m).`);
      err.statusCode = 422;
      throw err;
    }
  }

  // 3. Authoritative server timestamp & status determination
  const serverNow = new Date();
  const checkInTime = serverNow.toTimeString().split(' ')[0].slice(0, 5); // "HH:MM"

  // Office start time & grace
  const officeStart = settings.officeStartTime || '09:00';
  const graceMins = settings.gracePeriodMinutes || 15;

  const [startH, startM] = officeStart.split(':').map(Number);
  const cutoffMinutes = startH * 60 + startM + graceMins;

  const currentMinutes = serverNow.getHours() * 60 + serverNow.getMinutes();
  const isLate = currentMinutes > cutoffMinutes;

  const status = isLate ? 'late' : 'on_time';

  const attendance = await Attendance.create({
    employeeId,
    date: todayStr,
    checkIn: serverNow.toISOString(),
    checkOut: null,
    checkInTime,
    checkOutTime: null,
    totalHours: 0,
    status,
    method,
    checkInLat: latitude,
    checkInLng: longitude,
    distanceMeters,
    faceVerified: !!faceVerified,
  });

  await logAudit({
    userId: employeeId,
    action: 'ATTENDANCE_CHECK_IN',
    entity: 'Attendance',
    entityId: attendance._id,
    details: { date: todayStr, checkInTime, status, method, distanceMeters },
    ip,
  });

  return attendance;
};

export const checkOutEmployee = async ({ employeeId, method = 'web', ip = '127.0.0.1' }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const attendance = await Attendance.findOne({ employeeId, date: todayStr });

  if (!attendance) {
    const err = new Error('No active check-in record found for today. You must check in before checking out.');
    err.statusCode = 404;
    throw err;
  }

  if (attendance.checkOut) {
    const err = new Error('You have already checked out for today.');
    err.statusCode = 400;
    throw err;
  }

  const company = await Company.findOne({});
  const halfDayThreshold = company?.settings?.halfDayThresholdHours || 5;

  const serverNow = new Date();
  const checkInDate = new Date(attendance.checkIn);
  const diffHours = (serverNow.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
  const totalHours = Math.round(diffHours * 10) / 10;
  const checkOutTime = serverNow.toTimeString().split(' ')[0].slice(0, 5);

  let newStatus = attendance.status;
  if (totalHours < halfDayThreshold) {
    newStatus = 'half_day';
  } else if (attendance.status === 'on_time' || attendance.status === 'present') {
    newStatus = 'present';
  }

  await Attendance.updateOne(
    { _id: attendance._id },
    {
      $set: {
        checkOut: serverNow.toISOString(),
        checkOutTime,
        totalHours,
        status: newStatus,
      },
    }
  );

  await logAudit({
    userId: employeeId,
    action: 'ATTENDANCE_CHECK_OUT',
    entity: 'Attendance',
    entityId: attendance._id,
    details: { totalHours, status: newStatus, method },
    ip,
  });

  return Attendance.findById(attendance._id);
};

export const getDailyAttendanceBoard = async (dateStr) => {
  const queryDate = dateStr || new Date().toISOString().split('T')[0];
  const allEmployees = await Employee.find({ employmentStatus: { $ne: 'Terminated' } });
  const attendances = await Attendance.find({ date: queryDate });
  const leaves = await LeaveRequest.find({
    status: 'approved',
    startDate: { $lte: queryDate },
    endDate: { $gte: queryDate },
  });

  const attMap = Object.fromEntries(attendances.map((a) => [a.employeeId, a]));
  const leaveMap = Object.fromEntries(leaves.map((l) => [l.employeeId, l]));

  const board = allEmployees.map((emp) => {
    const att = attMap[emp._id];
    const leave = leaveMap[emp._id];

    let computedStatus = 'absent';
    if (att) {
      computedStatus = att.status;
    } else if (leave) {
      computedStatus = 'on_leave';
    }

    return {
      employeeId: emp._id,
      employeeCode: emp.employeeCode,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      departmentId: emp.departmentId,
      attendanceId: att?._id || null,
      checkInTime: att?.checkInTime || null,
      checkOutTime: att?.checkOutTime || null,
      totalHours: att?.totalHours || 0,
      status: computedStatus,
      method: att?.method || null,
      leaveType: leave?.leaveType || null,
    };
  });

  return {
    date: queryDate,
    totalHeadcount: allEmployees.length,
    presentCount: board.filter((b) => ['present', 'on_time', 'half_day', 'late'].includes(b.status)).length,
    lateCount: board.filter((b) => b.status === 'late').length,
    onLeaveCount: board.filter((b) => b.status === 'on_leave').length,
    absentCount: board.filter((b) => b.status === 'absent').length,
    records: board,
  };
};

export const requestAttendanceCorrection = async ({
  employeeId,
  date,
  requestedCheckIn,
  requestedCheckOut,
  reason,
  ip = '127.0.0.1',
}) => {
  const existing = await AttendanceCorrection.findOne({
    employeeId,
    date,
    status: 'pending',
  });

  if (existing) {
    const err = new Error('A pending correction request already exists for this date.');
    err.statusCode = 409;
    throw err;
  }

  const correction = await AttendanceCorrection.create({
    employeeId,
    date,
    requestedCheckIn,
    requestedCheckOut,
    reason,
    status: 'pending',
    reviewedBy: null,
    reviewComment: null,
  });

  await logAudit({
    userId: employeeId,
    action: 'REQUEST_ATTENDANCE_CORRECTION',
    entity: 'AttendanceCorrection',
    entityId: correction._id,
    details: { date, reason },
    ip,
  });

  return correction;
};

export const reviewAttendanceCorrection = async ({
  correctionId,
  status, // 'approved' or 'rejected'
  reviewComment = '',
  reviewerUser,
  ip = '127.0.0.1',
}) => {
  const correction = await AttendanceCorrection.findById(correctionId);
  if (!correction) {
    const err = new Error('Correction request not found.');
    err.statusCode = 404;
    throw err;
  }

  if (correction.status !== 'pending') {
    const err = new Error(`Request has already been ${correction.status}.`);
    err.statusCode = 400;
    throw err;
  }

  await AttendanceCorrection.updateOne(
    { _id: correctionId },
    {
      $set: {
        status,
        reviewComment,
        reviewedBy: reviewerUser._id,
        reviewedAt: new Date().toISOString(),
      },
    }
  );

  // If approved, update or create Attendance record
  if (status === 'approved') {
    let attendance = await Attendance.findOne({
      employeeId: correction.employeeId,
      date: correction.date,
    });

    const checkInIso = `${correction.date}T${correction.requestedCheckIn}:00.000Z`;
    const checkOutIso = `${correction.date}T${correction.requestedCheckOut}:00.000Z`;

    const diffHours = (new Date(checkOutIso).getTime() - new Date(checkInIso).getTime()) / (1000 * 60 * 60);
    const totalHours = Math.max(0, Math.round(diffHours * 10) / 10);
    const finalStatus = totalHours < 5 ? 'half_day' : 'present';

    if (attendance) {
      await Attendance.updateOne(
        { _id: attendance._id },
        {
          $set: {
            checkIn: checkInIso,
            checkOut: checkOutIso,
            checkInTime: correction.requestedCheckIn,
            checkOutTime: correction.requestedCheckOut,
            totalHours,
            status: finalStatus,
          },
        }
      );
    } else {
      await Attendance.create({
        employeeId: correction.employeeId,
        date: correction.date,
        checkIn: checkInIso,
        checkOut: checkOutIso,
        checkInTime: correction.requestedCheckIn,
        checkOutTime: correction.requestedCheckOut,
        totalHours,
        status: finalStatus,
        method: 'correction_approved',
      });
    }
  }

  await logAudit({
    userId: reviewerUser._id,
    userEmail: reviewerUser.email,
    userRole: reviewerUser.role,
    action: `ATTENDANCE_CORRECTION_${status.toUpperCase()}`,
    entity: 'AttendanceCorrection',
    entityId: correctionId,
    details: { status, reviewComment },
    ip,
  });

  return AttendanceCorrection.findById(correctionId);
};
