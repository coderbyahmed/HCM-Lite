import mongoose from 'mongoose';
import { config } from '../config/env.js';

const testStore =
  config.env === 'test' ? await import('../../tests/support/memory-store.js') : null;

let Company;
let User;
let Employee;
let Department;
let Designation;
let Attendance;
let AttendanceCorrection;
let LeaveRequest;
let Payroll;
let Announcement;
let Notification;
let AuditLog;
let FaceTemplate;

if (config.env === 'test') {
  Company = testStore.getModel('Company');
  User = testStore.getModel('User');
  Employee = testStore.getModel('Employee');
  Department = testStore.getModel('Department');
  Designation = testStore.getModel('Designation');
  Attendance = testStore.getModel('Attendance');
  AttendanceCorrection = testStore.getModel('AttendanceCorrection');
  LeaveRequest = testStore.getModel('LeaveRequest');
  Payroll = testStore.getModel('Payroll');
  Announcement = testStore.getModel('Announcement');
  Notification = testStore.getModel('Notification');
  AuditLog = testStore.getModel('AuditLog');
  FaceTemplate = testStore.getModel('FaceTemplate');
} else {
  const { Schema } = mongoose;
  const objectId = Schema.Types.ObjectId;
  const options = { timestamps: true, versionKey: false };
  const salaryStructureSchema = new Schema(
    {
      basicSalary: { type: Number, min: 0, default: 0 },
      hraAllowance: { type: Number, min: 0, default: 0 },
      medicalAllowance: { type: Number, min: 0, default: 0 },
      grossSalary: { type: Number, min: 0, default: 0 },
    },
    { _id: false }
  );
  const payrollItemSchema = new Schema(
    {
      employeeId: { type: objectId, ref: 'Employee', required: true },
      employeeCode: { type: String, required: true },
      employeeName: { type: String, required: true },
      departmentId: { type: objectId, ref: 'Department', default: null },
      basicSalary: { type: Number, min: 0, required: true },
      hraAllowance: { type: Number, min: 0, required: true },
      medicalAllowance: { type: Number, min: 0, required: true },
      grossSalary: { type: Number, min: 0, required: true },
      totalWorkingDays: { type: Number, min: 0, required: true },
      applicableWorkingDays: { type: Number, min: 0, required: true },
      dailyRate: { type: Number, min: 0, required: true },
      absentDays: { type: Number, min: 0, default: 0 },
      halfDays: { type: Number, min: 0, default: 0 },
      unpaidLeaveDays: { type: Number, min: 0, default: 0 },
      deductionDays: { type: Number, min: 0, default: 0 },
      attendanceDeductions: { type: Number, min: 0, default: 0 },
      annualGross: { type: Number, min: 0, default: 0 },
      annualTax: { type: Number, min: 0, default: 0 },
      monthlyTax: { type: Number, min: 0, default: 0 },
      netPay: { type: Number, min: 0, default: 0 },
      snapshot: { type: Schema.Types.Mixed, default: {} },
    },
    { _id: false }
  );

  const schemas = {
    Company: new Schema(
      {
        name: { type: String, required: true, trim: true },
        settings: { type: Schema.Types.Mixed, default: {} },
      },
      options
    ),
    User: new Schema(
      {
        name: { type: String, trim: true, default: '' },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, select: false },
        role: { type: String, enum: ['Admin', 'HR', 'Employee'], required: true },
        employeeId: { type: objectId, ref: 'Employee', default: null },
        companyId: { type: objectId, ref: 'Company', default: null },
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
        mustChangePassword: { type: Boolean, default: false },
      },
      options
    ),
    Employee: new Schema(
      {
        employeeCode: { type: String, required: true, unique: true, trim: true },
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        phone: { type: String, default: '' },
        address: { type: String, default: '' },
        gender: { type: String, default: 'Not Specified' },
        departmentId: { type: objectId, ref: 'Department', default: null },
        designationId: { type: objectId, ref: 'Designation', default: null },
        joiningDate: { type: String, required: true },
        employmentStatus: {
          type: String,
          enum: ['Active', 'On Probation', 'Resigned', 'Terminated'],
          default: 'Active',
        },
        salaryStructure: { type: salaryStructureSchema, default: () => ({}) },
      },
      options
    ),
    Department: new Schema(
      {
        name: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        companyId: { type: objectId, ref: 'Company', default: null },
      },
      options
    ),
    Designation: new Schema(
      {
        title: { type: String, required: true, trim: true },
        departmentId: { type: objectId, ref: 'Department', default: null },
        description: { type: String, default: '' },
        companyId: { type: objectId, ref: 'Company', default: null },
      },
      options
    ),
    Attendance: new Schema(
      {
        employeeId: { type: objectId, ref: 'Employee', required: true, index: true },
        date: { type: String, required: true },
        checkIn: { type: Date, default: null },
        checkOut: { type: Date, default: null },
        checkInTime: { type: String, default: null },
        checkOutTime: { type: String, default: null },
        totalHours: { type: Number, min: 0, default: 0 },
        status: { type: String, enum: ['on_time', 'present', 'late', 'half_day', 'absent', 'on_leave'], required: true },
        method: { type: String, default: 'web' },
        checkInLat: { type: Number, default: null },
        checkInLng: { type: Number, default: null },
        distanceMeters: { type: Number, default: null },
        faceVerified: { type: Boolean, default: false },
      },
      options
    ),
    AttendanceCorrection: new Schema(
      {
        employeeId: { type: objectId, ref: 'Employee', required: true, index: true },
        date: { type: String, required: true },
        requestedCheckIn: { type: String, required: true },
        requestedCheckOut: { type: String, required: true },
        reason: { type: String, required: true },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        reviewedBy: { type: objectId, ref: 'User', default: null },
        reviewComment: { type: String, default: '' },
        reviewedAt: { type: Date, default: null },
      },
      options
    ),
    LeaveRequest: new Schema(
      {
        employeeId: { type: objectId, ref: 'Employee', required: true, index: true },
        leaveType: { type: String, enum: ['casual', 'sick', 'annual', 'unpaid'], required: true },
        startDate: { type: String, required: true },
        endDate: { type: String, required: true },
        daysCount: { type: Number, min: 1, required: true },
        reason: { type: String, required: true },
        status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
        reviewedBy: { type: objectId, ref: 'User', default: null },
        reviewComment: { type: String, default: '' },
        reviewedAt: { type: Date, default: null },
        cancelledAt: { type: Date, default: null },
      },
      options
    ),
    Payroll: new Schema(
      {
        month: { type: String, required: true },
        status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },
        totalEmployees: { type: Number, min: 0, default: 0 },
        totalGross: { type: Number, min: 0, default: 0 },
        totalDeductions: { type: Number, min: 0, default: 0 },
        totalTax: { type: Number, min: 0, default: 0 },
        totalNet: { type: Number, min: 0, default: 0 },
        items: { type: [payrollItemSchema], default: [] },
        createdBy: { type: objectId, ref: 'User', required: true },
        finalizedBy: { type: objectId, ref: 'User', default: null },
        finalizedAt: { type: Date, default: null },
      },
      options
    ),
    Announcement: new Schema(
      {
        title: { type: String, required: true, trim: true },
        content: { type: String, required: true },
        priority: { type: String, enum: ['normal', 'high', 'urgent'], default: 'normal' },
        category: { type: String, default: 'General' },
        authorName: { type: String, required: true },
        createdBy: { type: objectId, ref: 'User', required: true },
      },
      options
    ),
    Notification: new Schema(
      {
        recipientId: { type: objectId, ref: 'User', default: null },
        recipientRole: { type: String, default: 'all' },
        title: { type: String, default: '' },
        message: { type: String, default: '' },
        read: { type: Boolean, default: false },
      },
      options
    ),
    AuditLog: new Schema(
      {
        userId: { type: String, required: true },
        userEmail: { type: String, default: '' },
        userRole: { type: String, default: '' },
        action: { type: String, required: true },
        entity: { type: String, required: true },
        entityId: { type: Schema.Types.Mixed, default: null },
        details: { type: Schema.Types.Mixed, default: null },
        ip: { type: String, default: null },
        timestamp: { type: Date, default: Date.now, index: true },
      },
      options
    ),
    FaceTemplate: new Schema(
      {
        employeeId: { type: objectId, ref: 'Employee', required: true, unique: true, index: true },
        ciphertext: { type: String, required: true, select: false },
        iv: { type: String, required: true, select: false },
        authTag: { type: String, required: true, select: false },
        modelVersion: { type: String, required: true },
        registeredBy: { type: objectId, ref: 'User', required: true },
        consentedAt: { type: Date, required: true },
      },
      options
    ),
  };

  schemas.Attendance.index({ employeeId: 1, date: 1 }, { unique: true });
  schemas.AttendanceCorrection.index(
    { employeeId: 1, date: 1 },
    { unique: true, partialFilterExpression: { status: 'pending' } }
  );
  schemas.Payroll.index({ month: 1, status: 1 });

  const model = (name, collection) =>
    mongoose.models[name] || mongoose.model(name, schemas[name], collection);

  Company = model('Company', 'companies');
  User = model('User', 'users');
  Employee = model('Employee', 'employees');
  Department = model('Department', 'departments');
  Designation = model('Designation', 'designations');
  Attendance = model('Attendance', 'attendances');
  AttendanceCorrection = model('AttendanceCorrection', 'attendance_corrections');
  LeaveRequest = model('LeaveRequest', 'leave_requests');
  Payroll = model('Payroll', 'payrolls');
  Announcement = model('Announcement', 'announcements');
  Notification = model('Notification', 'notifications');
  AuditLog = model('AuditLog', 'audit_logs');
  FaceTemplate = model('FaceTemplate', 'face_templates');
}

export {
  Company,
  User,
  Employee,
  Department,
  Designation,
  Attendance,
  AttendanceCorrection,
  LeaveRequest,
  Payroll,
  Announcement,
  Notification,
  AuditLog,
  FaceTemplate,
};
