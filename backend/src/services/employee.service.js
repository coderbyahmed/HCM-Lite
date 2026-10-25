import {
  Employee,
  User,
  Department,
  Designation,
  Attendance,
  LeaveRequest,
  Payroll,
} from '../models/index.js';
import { hashPassword, generateRandomPassword } from '../utils/crypto.js';
import { logAudit } from './audit.service.js';
import { getFaceRegistrationStatuses } from './face.service.js';

export const calculateSalaryStructure = (basicSalary) => {
  const basic = Number(basicSalary) || 0;
  const hra = Math.round(basic * 0.4);
  const medical = Math.round(basic * 0.1);
  const gross = Math.round(basic * 1.5);
  return {
    basicSalary: basic,
    hraAllowance: hra,
    medicalAllowance: medical,
    grossSalary: gross,
  };
};

const toPlainObject = (record) =>
  typeof record?.toObject === 'function' ? record.toObject() : { ...record };

export const generateNextEmployeeCode = async () => {
  const allEmployees = await Employee.find({});
  let maxNum = 0;
  for (const emp of allEmployees) {
    const match = (emp.employeeCode || '').match(/EMP-?(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  const nextNum = maxNum + 1;
  return `EMP-${String(nextNum).padStart(3, '0')}`;
};

export const createEmployee = async (data, actingUser, ip) => {
  const email = data.email.toLowerCase().trim();

  // Validate unique email in both Employee and User
  const existingEmp = await Employee.findOne({ email });
  if (existingEmp) {
    const err = new Error('An employee with this email already exists.');
    err.statusCode = 409;
    throw err;
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const err = new Error('A user account with this email already exists.');
    err.statusCode = 409;
    throw err;
  }

  let code = data.employeeCode?.trim();
  if (!code) {
    code = await generateNextEmployeeCode();
  } else {
    const existingCode = await Employee.findOne({ employeeCode: code });
    if (existingCode) {
      const err = new Error(`Employee code '${code}' is already assigned.`);
      err.statusCode = 409;
      throw err;
    }
  }

  const salary = calculateSalaryStructure(data.basicSalary);

  const employee = await Employee.create({
    employeeCode: code,
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    email,
    phone: data.phone || '',
    address: data.address || '',
    gender: data.gender || 'Not Specified',
    departmentId: data.departmentId || null,
    designationId: data.designationId || null,
    joiningDate: data.joiningDate || new Date().toISOString().split('T')[0],
    employmentStatus: data.employmentStatus || 'Active',
    salaryStructure: salary,
  });

  // Create login user with temporary password
  const tempPassword = data.temporaryPassword || generateRandomPassword(10);
  const hashedPassword = await hashPassword(tempPassword);

  const user = await User.create({
    name: `${employee.firstName} ${employee.lastName}`,
    email,
    password: hashedPassword,
    role: 'Employee',
    employeeId: employee._id,
    status: 'active',
    mustChangePassword: true,
  });

  await logAudit({
    userId: actingUser._id,
    userEmail: actingUser.email,
    userRole: actingUser.role,
    action: 'CREATE_EMPLOYEE',
    entity: 'Employee',
    entityId: employee._id,
    details: { employeeCode: code, email, name: `${employee.firstName} ${employee.lastName}` },
    ip,
  });

  return {
    employee,
    loginCredentials: {
      email,
      temporaryPassword: tempPassword,
      mustChangePassword: true,
    },
  };
};

export const updateEmployee = async (id, data, actingUser, ip) => {
  const employee = await Employee.findById(id);
  if (!employee) {
    const err = new Error('Employee not found.');
    err.statusCode = 404;
    throw err;
  }

  // Employee role can only update self profile (phone, address)
  if (actingUser.role === 'Employee') {
    if (String(actingUser.employeeId) !== String(id)) {
      const err = new Error('Unauthorized to update another employee profile.');
      err.statusCode = 403;
      throw err;
    }
    const permittedUpdate = {};
    if (data.phone !== undefined) permittedUpdate.phone = data.phone;
    if (data.address !== undefined) permittedUpdate.address = data.address;

    await Employee.updateOne({ _id: id }, { $set: permittedUpdate });

    await logAudit({
      userId: actingUser._id,
      userEmail: actingUser.email,
      userRole: actingUser.role,
      action: 'UPDATE_OWN_PROFILE',
      entity: 'Employee',
      entityId: id,
      details: permittedUpdate,
      ip,
    });

    return Employee.findById(id);
  }

  // Admin/HR can update all fields
  const updatePayload = { ...data };
  delete updatePayload._id;
  delete updatePayload.createdAt;

  if (data.basicSalary) {
    updatePayload.salaryStructure = calculateSalaryStructure(data.basicSalary);
  }

  await Employee.updateOne({ _id: id }, { $set: updatePayload });

  await logAudit({
    userId: actingUser._id,
    userEmail: actingUser.email,
    userRole: actingUser.role,
    action: 'UPDATE_EMPLOYEE',
    entity: 'Employee',
    entityId: id,
    details: { fields: Object.keys(updatePayload) },
    ip,
  });

  return Employee.findById(id);
};

export const getEmployeesList = async ({
  page = 1,
  limit = 10,
  search = '',
  departmentId = '',
  status = '',
  sortBy = 'createdAt',
  sortOrder = 'desc',
  actingUser = null,
}) => {
  const query = {};

  if (departmentId) {
    query.departmentId = departmentId;
  }
  if (status) {
    query.employmentStatus = status;
  }

  let all = await Employee.find(query);

  if (search) {
    const s = search.toLowerCase();
    all = all.filter(
      (e) =>
        e.firstName?.toLowerCase().includes(s) ||
        e.lastName?.toLowerCase().includes(s) ||
        e.email?.toLowerCase().includes(s) ||
        e.employeeCode?.toLowerCase().includes(s)
    );
  }

  // Sort
  all.sort((a, b) => {
    const aVal = a[sortBy] ?? '';
    const bVal = b[sortBy] ?? '';
    if (aVal < bVal) return sortOrder === 'desc' ? 1 : -1;
    if (aVal > bVal) return sortOrder === 'desc' ? -1 : 1;
    return 0;
  });

  const total = all.length;
  const startIndex = (page - 1) * limit;
  const paginated = all.slice(startIndex, startIndex + limit);

  // Hydrate department & designation names
  const departments = await Department.find({});
  const designations = await Designation.find({});
  const canManage = actingUser?.role === 'Admin' || actingUser?.role === 'HR';
  const faceRegisteredIds = canManage
    ? await getFaceRegistrationStatuses(paginated.map((emp) => emp._id))
    : [];
  const deptMap = Object.fromEntries(departments.map((d) => [d._id, d.name]));
  const desMap = Object.fromEntries(designations.map((d) => [d._id, d.title]));

  const enriched = paginated.map((emp) => {
    const isSelf = String(actingUser?.employeeId) === String(emp._id);
    const canSeeSalary = actingUser?.role === 'Admin' || actingUser?.role === 'HR' || isSelf;

    const empObj = toPlainObject(emp);
    if (!canSeeSalary) {
      delete empObj.salaryStructure;
    }

    return {
      ...empObj,
      departmentName: deptMap[emp.departmentId] || 'Unassigned',
      designationTitle: desMap[emp.designationId] || 'Unassigned',
      ...(canManage ? { faceRegistered: faceRegisteredIds.has(String(emp._id)) } : {}),
    };
  });

  return {
    employees: enriched,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit) || 1,
  };
};

export const getEmployee360Profile = async (id, actingUser) => {
  // Authorization boundary: Employee can only see self
  if (actingUser.role === 'Employee' && String(actingUser.employeeId) !== String(id)) {
    const err = new Error('Access denied. You can only view your own profile.');
    err.statusCode = 403;
    throw err;
  }

  const employee = await Employee.findById(id);
  if (!employee) {
    const err = new Error('Employee not found.');
    err.statusCode = 404;
    throw err;
  }

  const department = employee.departmentId ? await Department.findById(employee.departmentId) : null;
  const designation = employee.designationId ? await Designation.findById(employee.designationId) : null;

  // Recent attendance (last 30 records)
  const attendances = await Attendance.find({ employeeId: id }).sort({ date: -1 }).limit(30);

  // Leave history
  const leaves = await LeaveRequest.find({ employeeId: id }).sort({ createdAt: -1 }).limit(20);

  // Payslips from finalized payrolls
  const payrolls = await Payroll.find({ status: 'finalized' });
  const myPayslips = [];
  for (const p of payrolls) {
    const item = (p.items || []).find((it) => String(it.employeeId) === String(id));
    if (item) {
      myPayslips.push({
        payrollId: p._id,
        month: p.month,
        finalizedAt: p.finalizedAt,
        ...toPlainObject(item),
      });
    }
  }

  return {
    employee,
    department,
    designation,
    recentAttendance: attendances,
    leaveHistory: leaves,
    payslips: myPayslips,
  };
};

export const validateCsvImport = async (csvRows) => {
  const departments = await Department.find({});
  const designations = await Designation.find({});
  const existingEmployees = await Employee.find({});
  const existingUsers = await User.find({});

  const existingCodes = new Set(existingEmployees.map((e) => e.employeeCode.toLowerCase()));
  const existingEmails = new Set([
    ...existingEmployees.map((e) => e.email.toLowerCase()),
    ...existingUsers.map((u) => u.email.toLowerCase()),
  ]);

  const seenCodes = new Set();
  const seenEmails = new Set();

  const report = {
    totalRows: csvRows.length,
    validRowsCount: 0,
    invalidRowsCount: 0,
    rows: [],
  };

  for (let i = 0; i < csvRows.length; i++) {
    const row = csvRows[i];
    const rowNum = i + 1;
    const errors = [];

    const firstName = (row.firstName || row.first_name || '').trim();
    const lastName = (row.lastName || row.last_name || '').trim();
    const email = (row.email || '').trim().toLowerCase();
    const code = (row.employeeCode || row.code || '').trim().toUpperCase();
    const departmentName = (row.department || row.departmentName || '').trim();
    const designationTitle = (row.designation || row.designationTitle || '').trim();
    const basicSalary = Number(row.basicSalary || row.salary || 0);
    const joiningDate = (row.joiningDate || row.joining_date || '').trim();

    if (!firstName) errors.push({ field: 'firstName', reason: 'First name is required' });
    if (!lastName) errors.push({ field: 'lastName', reason: 'Last name is required' });
    if (!email) {
      errors.push({ field: 'email', reason: 'Email is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: 'email', reason: 'Invalid email address format' });
    } else if (existingEmails.has(email) || seenEmails.has(email)) {
      errors.push({ field: 'email', reason: 'Duplicate email address' });
    }

    if (code) {
      if (existingCodes.has(code.toLowerCase()) || seenCodes.has(code)) {
        errors.push({ field: 'employeeCode', reason: 'Duplicate employee code' });
      }
    }

    if (isNaN(basicSalary) || basicSalary <= 0) {
      errors.push({ field: 'basicSalary', reason: 'Basic salary must be a positive number' });
    }

    let dept = null;
    if (departmentName) {
      dept = departments.find((d) => d.name.toLowerCase() === departmentName.toLowerCase());
      if (!dept) {
        errors.push({ field: 'department', reason: `Department '${departmentName}' does not exist` });
      }
    }

    let des = null;
    if (designationTitle) {
      des = designations.find((d) => d.title.toLowerCase() === designationTitle.toLowerCase());
    }

    if (joiningDate && isNaN(Date.parse(joiningDate))) {
      errors.push({ field: 'joiningDate', reason: 'Joining date must be in valid YYYY-MM-DD format' });
    }

    if (email) seenEmails.add(email);
    if (code) seenCodes.add(code);

    const isValid = errors.length === 0;
    if (isValid) report.validRowsCount++;
    else report.invalidRowsCount++;

    report.rows.push({
      rowNumber: rowNum,
      isValid,
      data: {
        firstName,
        lastName,
        email,
        employeeCode: code,
        departmentId: dept?._id || null,
        departmentName: dept?.name || departmentName,
        designationId: des?._id || null,
        designationTitle: des?.title || designationTitle,
        basicSalary,
        joiningDate: joiningDate || new Date().toISOString().split('T')[0],
        gender: row.gender || 'Not Specified',
        phone: row.phone || '',
        address: row.address || '',
      },
      errors,
    });
  }

  return report;
};

export const executeCsvImport = async (validRows, actingUser, ip) => {
  const results = [];
  for (const item of validRows) {
    const created = await createEmployee(item, actingUser, ip);
    results.push(created);
  }

  await logAudit({
    userId: actingUser._id,
    userEmail: actingUser.email,
    userRole: actingUser.role,
    action: 'CSV_EMPLOYEES_IMPORTED',
    entity: 'Employee',
    details: { importedCount: results.length },
    ip,
  });

  return results;
};
