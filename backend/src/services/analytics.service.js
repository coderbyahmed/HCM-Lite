import {
  Employee,
  Attendance,
  LeaveRequest,
  Payroll,
  Department,
  AuditLog,
  Announcement,
  Company,
} from '../models/index.js';
import { getLeaveBalance } from './leave.service.js';

export const getAdminDashboardData = async () => {
  const employees = await Employee.find({});
  const activeEmployees = employees.filter((e) => e.employmentStatus !== 'Terminated');
  const totalHeadcount = activeEmployees.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const attendancesToday = await Attendance.find({ date: todayStr });
  const leavesToday = await LeaveRequest.find({
    status: 'approved',
    startDate: { $lte: todayStr },
    endDate: { $gte: todayStr },
  });

  const presentToday = attendancesToday.filter((a) => ['present', 'on_time', 'half_day'].includes(a.status)).length;
  const lateToday = attendancesToday.filter((a) => a.status === 'late').length;
  const onLeaveToday = leavesToday.length;

  // Payroll figures
  const finalizedPayrolls = await Payroll.find({ status: 'finalized' });
  const latestPayroll = finalizedPayrolls.sort((a, b) => b.month.localeCompare(a.month))[0];
  const totalPayrollCost = latestPayroll ? latestPayroll.totalNet : null;
  const totalGrossSalary = activeEmployees.reduce(
    (sum, employee) => sum + (employee.salaryStructure?.grossSalary || 0),
    0
  );
  const averageSalary = totalHeadcount > 0 ? Math.round(totalGrossSalary / totalHeadcount) : null;

  // Departments aggregation
  const departments = await Department.find({});
  const deptMap = Object.fromEntries(departments.map((d) => [d._id, d.name]));

  const headcountByDept = departments.map((d) => ({
    departmentName: d.name,
    count: activeEmployees.filter((e) => String(e.departmentId) === String(d._id)).length,
  }));

  const payrollCostByDept = departments.map((d) => {
    const deptEmps = activeEmployees.filter((e) => String(e.departmentId) === String(d._id));
    const cost = deptEmps.reduce((sum, e) => sum + (e.salaryStructure?.grossSalary || 0), 0);
    return {
      departmentName: d.name,
      cost,
    };
  });

  // Gender breakdown
  const genderStats = {
    Male: activeEmployees.filter((e) => e.gender === 'Male').length,
    Female: activeEmployees.filter((e) => e.gender === 'Female').length,
    Other: activeEmployees.filter((e) => !['Male', 'Female'].includes(e.gender)).length,
  };

  // Recent audit logs
  const recentAudit = await AuditLog.find({}).sort({ timestamp: -1 }).limit(8);

  return {
    kpis: {
      headcount: totalHeadcount,
      presentToday: presentToday + lateToday,
      lateToday,
      onLeaveToday,
      totalPayrollCost,
      averageSalary,
      latestPayrollMonth: latestPayroll?.month || null,
      attritionYtd: employees.filter((e) => e.employmentStatus === 'Resigned' || e.employmentStatus === 'Terminated').length,
    },
    headcountByDept,
    payrollCostByDept,
    genderStats,
    recentAudit,
  };
};

export const getHrDashboardData = async () => {
  const employees = await Employee.find({ employmentStatus: { $ne: 'Terminated' } });
  const totalHeadcount = employees.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const attendancesToday = await Attendance.find({ date: todayStr });
  const leavesToday = await LeaveRequest.find({
    status: 'approved',
    startDate: { $lte: todayStr },
    endDate: { $gte: todayStr },
  });

  const presentToday = attendancesToday.filter((a) => ['present', 'on_time', 'half_day'].includes(a.status)).length;
  const lateToday = attendancesToday.filter((a) => a.status === 'late').length;
  const onLeaveToday = leavesToday.length;

  // Pending approvals count
  const { AttendanceCorrection } = await import('../models/index.js');
  const pendingCorrections = await AttendanceCorrection.countDocuments({ status: 'pending' });
  const pendingLeaves = await LeaveRequest.countDocuments({ status: 'pending' });

  // Leave utilization by type
  const yearStart = `${todayStr.slice(0, 4)}-01-01`;
  const approvedLeaves = await LeaveRequest.find({
    status: 'approved',
    startDate: { $gte: yearStart, $lte: todayStr },
    endDate: { $lte: todayStr },
  });
  const leaveUtilization = {
    casual: approvedLeaves.filter((l) => l.leaveType === 'casual').reduce((s, l) => s + l.daysCount, 0),
    sick: approvedLeaves.filter((l) => l.leaveType === 'sick').reduce((s, l) => s + l.daysCount, 0),
    annual: approvedLeaves.filter((l) => l.leaveType === 'annual').reduce((s, l) => s + l.daysCount, 0),
    unpaid: approvedLeaves.filter((l) => l.leaveType === 'unpaid').reduce((s, l) => s + l.daysCount, 0),
  };

  // Top late-comers (current month)
  const currentMonthStr = todayStr.slice(0, 7);
  const monthlyLate = await Attendance.find({
    status: 'late',
    date: { $gte: `${currentMonthStr}-01`, $lte: `${currentMonthStr}-31` },
  });

  const lateCounts = {};
  for (const att of monthlyLate) {
    lateCounts[att.employeeId] = (lateCounts[att.employeeId] || 0) + 1;
  }

  const empMap = Object.fromEntries(employees.map((e) => [e._id, `${e.firstName} ${e.lastName}`]));
  const topLateComers = Object.entries(lateCounts)
    .map(([empId, count]) => ({
      employeeId: empId,
      employeeName: empMap[empId] || 'Employee',
      lateCount: count,
    }))
    .sort((a, b) => b.lateCount - a.lateCount)
    .slice(0, 5);

  return {
    kpis: {
      headcount: totalHeadcount,
      presentToday: presentToday + lateToday,
      lateToday,
      onLeaveToday,
      pendingApprovals: pendingCorrections + pendingLeaves,
      pendingCorrections,
      pendingLeaves,
    },
    leaveUtilization,
    topLateComers,
  };
};

export const getEmployeeDashboardData = async (employeeId) => {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    const err = new Error('Employee record not found.');
    err.statusCode = 404;
    throw err;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = await Attendance.findOne({ employeeId, date: todayStr });

  // Weekly hours worked (Mon - Sun of current week)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const mondayStr = monday.toISOString().split('T')[0];

  const weekAttendances = await Attendance.find({
    employeeId,
    date: { $gte: mondayStr, $lte: todayStr },
  });

  const hoursWorkedThisWeek = Math.round(weekAttendances.reduce((sum, a) => sum + (a.totalHours || 0), 0) * 10) / 10;
  const company = await Company.findOne({});
  const settings = company?.settings || {};
  const weeklyTargetHours =
    Number.isFinite(Number(settings.workingHoursPerDay)) && Array.isArray(settings.weekends)
      ? Number(settings.workingHoursPerDay) * (7 - settings.weekends.length)
      : null;

  // Monthly late count
  const currentMonth = todayStr.slice(0, 7);
  const lateAttendancesThisMonth = await Attendance.countDocuments({
    employeeId,
    status: 'late',
    date: { $gte: `${currentMonth}-01`, $lte: `${currentMonth}-31` },
  });

  // Leave balance
  const leaveBalance = await getLeaveBalance(employeeId);

  // Latest finalized payslip
  const finalizedPayrolls = await Payroll.find({ status: 'finalized' });
  let latestPayslip = null;
  for (const p of finalizedPayrolls.sort((a, b) => b.month.localeCompare(a.month))) {
    const item = (p.items || []).find((it) => String(it.employeeId) === String(employeeId));
    if (item) {
      latestPayslip = {
        payrollId: p._id,
        month: p.month,
        finalizedAt: p.finalizedAt,
        ...(typeof item.toObject === 'function' ? item.toObject() : item),
      };
      break;
    }
  }

  // Announcements
  const announcements = await Announcement.find({}).sort({ createdAt: -1 }).limit(5);

  return {
    todayAttendance,
    hoursWorkedThisWeek,
    weeklyTargetHours,
    attendancePolicy: {
      officeStartTime: settings.officeStartTime || null,
      gracePeriodMinutes: Number.isFinite(Number(settings.gracePeriodMinutes))
        ? Number(settings.gracePeriodMinutes)
        : null,
    },
    attendanceByDay: weekAttendances
      .map((attendance) => ({ date: attendance.date, hours: attendance.totalHours || 0 }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    lateAttendancesThisMonth,
    leaveBalance,
    latestPayslip,
    announcements,
  };
};
