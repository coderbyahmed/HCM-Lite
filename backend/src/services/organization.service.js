import { Company, User, Department, Designation } from '../models/index.js';
import { hashPassword } from '../utils/crypto.js';
import { logAudit } from './audit.service.js';

export const isFirstRun = async () => {
  const companyCount = await Company.countDocuments({});
  const adminCount = await User.countDocuments({ role: 'Admin' });
  return companyCount === 0 || adminCount === 0;
};

export const setupFirstRunCompany = async ({
  companyName,
  adminName,
  adminEmail,
  adminPassword,
  officeStartTime = '09:00',
  gracePeriodMinutes = 15,
  workingHoursPerDay = 9,
  halfDayThresholdHours = 5,
  weekends = ['Saturday', 'Sunday'],
  latitude = 24.8607,
  longitude = 67.0011,
  radiusMeters = 200,
  leaveQuotas = {
    casual: 10,
    sick: 8,
    annual: 14,
    unpaid: 999,
  },
  ip = '127.0.0.1',
}) => {
  const needsSetup = await isFirstRun();
  if (!needsSetup) {
    const error = new Error('First-run setup has already been completed.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Create Company
  const company = await Company.create({
    name: companyName,
    settings: {
      officeStartTime,
      gracePeriodMinutes,
      workingHoursPerDay,
      halfDayThresholdHours,
      weekends,
      geofence: {
        latitude: Number(latitude),
        longitude: Number(longitude),
        radiusMeters: Number(radiusMeters),
      },
      leaveQuotas,
      holidays: [
        { date: '2026-03-23', name: 'Pakistan Day' },
        { date: '2026-05-01', name: 'Labor Day' },
        { date: '2026-08-14', name: 'Independence Day' },
        { date: '2026-12-25', name: 'Quaid-e-Azam Day' },
      ],
      policies: {
        overtimeAllowed: true,
        allowWebAttendance: true,
        allowGeofenceCameraAttendance: true,
        requireFaceDetection: true,
        probationMonthsDefault: 3,
      },
    },
  });

  // 2. Create Initial Default Departments & Designations
  const defaultDepts = [
    { name: 'Engineering', description: 'Software Development & IT' },
    { name: 'Human Resources', description: 'Talent Acquisition & Employee Operations' },
    { name: 'Finance & Accounts', description: 'Financial Planning & Payroll' },
    { name: 'Sales & Marketing', description: 'Business Growth & Client Relations' },
  ];

  const createdDepts = [];
  for (const dept of defaultDepts) {
    const d = await Department.create({ ...dept, companyId: company._id });
    createdDepts.push(d);
  }

  const defaultDesignations = [
    { title: 'Software Engineer', departmentId: createdDepts[0]._id },
    { title: 'Tech Lead', departmentId: createdDepts[0]._id },
    { title: 'HR Specialist', departmentId: createdDepts[1]._id },
    { title: 'HR Manager', departmentId: createdDepts[1]._id },
    { title: 'Accountant', departmentId: createdDepts[2]._id },
  ];

  for (const des of defaultDesignations) {
    await Designation.create({ ...des, companyId: company._id });
  }

  // 3. Create Initial Admin Account
  const hashedPassword = await hashPassword(adminPassword);
  const adminUser = await User.create({
    name: adminName,
    email: adminEmail.toLowerCase().trim(),
    password: hashedPassword,
    role: 'Admin',
    status: 'active',
    mustChangePassword: false,
    companyId: company._id,
  });

  await logAudit({
    userId: adminUser._id,
    userEmail: adminUser.email,
    userRole: 'Admin',
    action: 'COMPANY_FIRST_RUN_SETUP',
    entity: 'Company',
    entityId: company._id,
    details: { companyName, adminEmail },
    ip,
  });

  return { company, adminUser };
};

export const getCompanyProfile = async () => {
  const company = await Company.findOne({});
  if (!company) {
    return null;
  }
  return company;
};

export const updateCompanySettings = async (settingsUpdate, user, ip) => {
  const company = await Company.findOne({});
  if (!company) {
    const error = new Error('Company not found.');
    error.statusCode = 404;
    throw error;
  }

  const updatedSettings = {
    ...company.settings,
    ...settingsUpdate,
  };

  await Company.updateOne({ _id: company._id }, { $set: { settings: updatedSettings } });

  await logAudit({
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    action: 'UPDATE_COMPANY_SETTINGS',
    entity: 'Company',
    entityId: company._id,
    details: settingsUpdate,
    ip,
  });

  return getCompanyProfile();
};

export const isWorkingDay = (dateStr, companySettings) => {
  const d = new Date(dateStr);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[d.getUTCDay()];

  const weekends = companySettings?.weekends || ['Saturday', 'Sunday'];
  if (weekends.includes(dayName)) {
    return false;
  }

  const holidays = companySettings?.holidays || [];
  const isHoliday = holidays.some((h) => h.date === dateStr);
  if (isHoliday) {
    return false;
  }

  return true;
};
