import { Payroll, Employee, Attendance, LeaveRequest, Company } from '../models/index.js';
import { isWorkingDay } from './organization.service.js';
import { logAudit } from './audit.service.js';

export const calculateAnnualTax = (annualGross) => {
  const g = Math.max(0, Number(annualGross) || 0);

  if (g <= 600000) {
    return 0;
  } else if (g <= 1200000) {
    return (g - 600000) * 0.05;
  } else if (g <= 2400000) {
    return 30000 + (g - 1200000) * 0.15;
  } else if (g <= 3600000) {
    return 210000 + (g - 2400000) * 0.25;
  } else {
    return 510000 + (g - 3600000) * 0.35;
  }
};

export const getWorkingDaysInMonth = (monthStr, settings) => {
  // monthStr: "YYYY-MM"
  const [year, month] = monthStr.split('-').map(Number);
  const totalDays = new Date(year, month, 0).getDate();

  let count = 0;
  for (let d = 1; d <= totalDays; d++) {
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (isWorkingDay(dStr, settings)) {
      count++;
    }
  }
  return Math.max(1, count);
};

export const generateMonthlyPayrollDraft = async (monthStr, actingUser, ip) => {
  const existingFinalized = await Payroll.findOne({ month: monthStr, status: 'finalized' });
  if (existingFinalized) {
    const err = new Error(`Payroll for month ${monthStr} is already finalized and locked against modification.`);
    err.statusCode = 400;
    throw err;
  }

  const company = await Company.findOne({});
  const settings = company?.settings || {};
  const totalWorkingDays = getWorkingDaysInMonth(monthStr, settings);

  const activeEmployees = await Employee.find({ employmentStatus: { $ne: 'Terminated' } });
  const [year, monthNum] = monthStr.split('-').map(Number);
  const monthStart = `${monthStr}-01`;
  const monthEnd = `${monthStr}-${String(new Date(year, monthNum, 0).getDate()).padStart(2, '0')}`;

  const items = [];
  let totalGross = 0;
  let totalDeductions = 0;
  let totalTax = 0;
  let totalNet = 0;

  for (const emp of activeEmployees) {
    const basic = emp.salaryStructure?.basicSalary || 0;
    const hra = emp.salaryStructure?.hraAllowance || Math.round(basic * 0.4);
    const medical = emp.salaryStructure?.medicalAllowance || Math.round(basic * 0.1);
    const gross = emp.salaryStructure?.grossSalary || Math.round(basic * 1.5);

    // Proration for joiners mid-month
    let applicableWorkingDays = totalWorkingDays;
    if (emp.joiningDate && emp.joiningDate > monthStart && emp.joiningDate <= monthEnd) {
      // Calculate working days from joining date to end of month
      let joinedDays = 0;
      const joinD = new Date(emp.joiningDate);
      const endD = new Date(monthEnd);
      for (let curr = new Date(joinD); curr <= endD; curr.setDate(curr.getDate() + 1)) {
        if (isWorkingDay(curr.toISOString().split('T')[0], settings)) joinedDays++;
      }
      applicableWorkingDays = Math.max(1, joinedDays);
    }

    const dailyRate = Math.round((gross / totalWorkingDays) * 100) / 100;

    // Fetch attendances in this month
    const attendances = await Attendance.find({
      employeeId: emp._id,
      date: { $gte: monthStart, $lte: monthEnd },
    });

    // Fetch unpaid leave in this month
    const unpaidLeaves = await LeaveRequest.find({
      employeeId: emp._id,
      leaveType: 'unpaid',
      status: 'approved',
      startDate: { $gte: monthStart },
      endDate: { $lte: monthEnd },
    });

    const unpaidLeaveDays = unpaidLeaves.reduce((sum, l) => sum + l.daysCount, 0);

    // Count half days
    const halfDays = attendances.filter((a) => a.status === 'half_day').length;

    // Paid attendances count
    const attendedDays = attendances.filter((a) => ['present', 'on_time', 'late'].includes(a.status)).length;
    const attendedHalfDays = halfDays * 0.5;

    // Approved paid leaves in this month
    const paidLeaves = await LeaveRequest.find({
      employeeId: emp._id,
      leaveType: { $ne: 'unpaid' },
      status: 'approved',
      startDate: { $gte: monthStart },
      endDate: { $lte: monthEnd },
    });
    const paidLeaveDays = paidLeaves.reduce((sum, l) => sum + l.daysCount, 0);

    // Calculated absent days = applicableWorkingDays - (attendedDays + attendedHalfDays + paidLeaveDays + unpaidLeaveDays)
    const accountedDays = attendedDays + attendedHalfDays + paidLeaveDays + unpaidLeaveDays;
    const absentDays = Math.max(0, applicableWorkingDays - accountedDays);

    // Total deduction days
    const deductionDays = Math.round((absentDays + unpaidLeaveDays + halfDays * 0.5) * 10) / 10;
    const attendanceDeductions = Math.min(gross, Math.round(deductionDays * dailyRate));

    // Annualized tax calculation
    const annualGross = gross * 12;
    const annualTax = calculateAnnualTax(annualGross);
    const monthlyTax = Math.round(annualTax / 12);

    const netPay = Math.max(0, gross - attendanceDeductions - monthlyTax);

    totalGross += gross;
    totalDeductions += attendanceDeductions;
    totalTax += monthlyTax;
    totalNet += netPay;

    items.push({
      employeeId: emp._id,
      employeeCode: emp.employeeCode,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      departmentId: emp.departmentId,
      basicSalary: basic,
      hraAllowance: hra,
      medicalAllowance: medical,
      grossSalary: gross,
      totalWorkingDays,
      applicableWorkingDays,
      dailyRate,
      absentDays,
      halfDays,
      unpaidLeaveDays,
      deductionDays,
      attendanceDeductions,
      annualGross,
      annualTax,
      monthlyTax,
      netPay,
      snapshot: {
        calculatedAt: new Date().toISOString(),
        currency: 'PKR',
      },
    });
  }

  // Remove existing draft for this month if any
  await Payroll.deleteMany({ month: monthStr, status: 'draft' });

  const payroll = await Payroll.create({
    month: monthStr,
    status: 'draft',
    totalEmployees: items.length,
    totalGross,
    totalDeductions,
    totalTax,
    totalNet,
    items,
    createdBy: actingUser._id,
  });

  await logAudit({
    userId: actingUser._id,
    userEmail: actingUser.email,
    userRole: actingUser.role,
    action: 'GENERATE_PAYROLL_DRAFT',
    entity: 'Payroll',
    entityId: payroll._id,
    details: { month: monthStr, totalEmployees: items.length, totalNet },
    ip,
  });

  return payroll;
};

export const finalizePayroll = async (payrollId, actingAdmin, ip) => {
  const payroll = await Payroll.findById(payrollId);
  if (!payroll) {
    const err = new Error('Payroll not found.');
    err.statusCode = 404;
    throw err;
  }

  if (payroll.status === 'finalized') {
    const err = new Error('This payroll run has already been finalized.');
    err.statusCode = 400;
    throw err;
  }

  const finalizedAt = new Date().toISOString();

  await Payroll.updateOne(
    { _id: payrollId },
    {
      $set: {
        status: 'finalized',
        finalizedBy: actingAdmin._id,
        finalizedAt,
      },
    }
  );

  await logAudit({
    userId: actingAdmin._id,
    userEmail: actingAdmin.email,
    userRole: 'Admin',
    action: 'FINALIZE_PAYROLL',
    entity: 'Payroll',
    entityId: payrollId,
    details: { month: payroll.month, totalNet: payroll.totalNet },
    ip,
  });

  return Payroll.findById(payrollId);
};

export const getEmployeePayslip = async (payrollId, employeeId, actingUser) => {
  if (actingUser.role === 'Employee' && String(actingUser.employeeId) !== String(employeeId)) {
    const err = new Error('Unauthorized. You can only view and download your own payslips.');
    err.statusCode = 403;
    throw err;
  }

  const payroll = await Payroll.findById(payrollId);
  if (!payroll) {
    const err = new Error('Payroll not found.');
    err.statusCode = 404;
    throw err;
  }

  if (payroll.status !== 'finalized' && actingUser.role === 'Employee') {
    const err = new Error('Payslips are only accessible after payroll has been finalized by Admin.');
    err.statusCode = 403;
    throw err;
  }

  const item = (payroll.items || []).find((it) => String(it.employeeId) === String(employeeId));
  if (!item) {
    const err = new Error('No payslip record found for this employee in the specified payroll run.');
    err.statusCode = 404;
    throw err;
  }

  const company = await Company.findOne({});
  const employee = await Employee.findById(employeeId);

  return {
    organization: {
      name: company?.name || 'HCM Lite Organization',
      address: 'Corporate Headquarters',
      currency: 'PKR',
    },
    payrollPeriod: payroll.month,
    finalizedAt: payroll.finalizedAt,
    employee: {
      employeeCode: employee?.employeeCode || item.employeeCode,
      name: item.employeeName,
      email: employee?.email,
      joiningDate: employee?.joiningDate,
    },
    payslip: item,
  };
};
