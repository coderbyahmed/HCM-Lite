import test, { after, before } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/database/db.js';
import { dbStore } from './support/memory-store.js';
import { config } from '../src/config/env.js';
import { executeAiTool } from '../src/services/ai.service.js';
import { FaceTemplate } from '../src/models/index.js';

const usesMongoTestDatabase = config.env !== 'test';

before(async () => {
  if (usesMongoTestDatabase) {
    await connectDatabase();
  }
});

after(async () => {
  if (usesMongoTestDatabase && mongoose.connection.readyState === 1) {
    try {
      const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
      for (const { name } of collections) {
        if (!name.startsWith('system.')) {
          await mongoose.connection.db.collection(name).deleteMany({});
        }
      }
    } finally {
      await mongoose.disconnect();
    }
  }
});

// Clean test database helper
const resetDatabase = () => {
  if (usesMongoTestDatabase) return;
  for (const model of Object.values(dbStore)) {
    model.clear();
  }
};

test('Comprehensive End-to-End Workflow & Authorization Verification', async (t) => {
  resetDatabase();
  const app = createApp();

  // Helper fetch request against Express app directly
  const request = async (method, path, body = null, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const server = app.listen(0);
    const port = server.address().port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    } finally {
      server.close();
    }
  };

  let adminToken = null;
  let hrToken = null;
  let employee1Token = null;
  let employee2Token = null;

  let employee1Id = null;
  let employee2Id = null;
  let employee1TempPass = null;
  let employee2TempPass = null;
  let leaveRequestId = null;
  let payrollId = null;
  let faceDescriptor = null;

  await t.test('1. First-Run Setup: Status should indicate setup is needed', async () => {
    const health = await request('GET', '/api/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.database.connected, true);

    const res = await request('GET', '/api/auth/setup/status');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.isFirstRun, true);
  });

  await t.test('2. First-Run Setup: Initialize company and root Admin', async () => {
    const payload = {
      companyName: 'Apex Innovations Ltd',
      adminName: 'Chief Administrator',
      adminEmail: 'admin@apex.com',
      adminPassword: 'AdminSecurePass2026!',
      officeStartTime: '09:00',
      gracePeriodMinutes: 15,
      workingHoursPerDay: 9,
      halfDayThresholdHours: 5,
      weekends: ['Saturday', 'Sunday'],
      latitude: 24.8607,
      longitude: 67.0011,
      radiusMeters: 200,
      leaveQuotas: {
        casual: 10,
        sick: 8,
        annual: 14,
        unpaid: 999,
      },
    };

    const res = await request('POST', '/api/auth/setup/first-run', payload);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.company.name, 'Apex Innovations Ltd');
    assert.strictEqual(res.data.data.adminUser.email, 'admin@apex.com');
  });

  await t.test('3. First-Run Setup Lock: Attempting second setup must fail', async () => {
    const res = await request('POST', '/api/auth/setup/first-run', {
      companyName: 'Hacker Corp',
      adminName: 'Hacker',
      adminEmail: 'hacker@apex.com',
      adminPassword: 'HackerPass2026!',
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
  });

  await t.test('4. Authentication: Admin Login & Token generation', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'admin@apex.com',
      password: 'AdminSecurePass2026!',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.user.role, 'Admin');
    assert.ok(res.data.data.tokens.accessToken);
    adminToken = res.data.data.tokens.accessToken;
  });

  await t.test('5. HR Provisioning: Admin creates HR user', async () => {
    const res = await request(
      'POST',
      '/api/auth/users/hr',
      {
        name: 'Sarah HR Specialist',
        email: 'sarah.hr@apex.com',
        password: 'HrSecurePass2026!',
      },
      adminToken
    );
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.role, 'HR');
  });

  await t.test('6. Authentication: HR login & Token generation', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'sarah.hr@apex.com',
      password: 'HrSecurePass2026!',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.user.role, 'HR');
    hrToken = res.data.data.tokens.accessToken;
  });

  await t.test('7. Employee Registration: HR registers Employee 1 (Alice) & Employee 2 (Bob)', async () => {
    const deptsRes = await request('GET', '/api/organization/departments', null, hrToken);
    const engDeptId = deptsRes.data.departments[0]?._id;

    // Alice
    const res1 = await request(
      'POST',
      '/api/employees',
      {
        firstName: 'Alice',
        lastName: 'Wong',
        email: 'alice@apex.com',
        basicSalary: 100000,
        departmentId: engDeptId,
        joiningDate: '2026-01-01',
      },
      hrToken
    );
    assert.strictEqual(res1.status, 201);
    assert.strictEqual(res1.data.data.employee.employeeCode, 'EMP-001');
    assert.strictEqual(res1.data.data.employee.salaryStructure.grossSalary, 150000); // 1.5 * 100000
    employee1Id = res1.data.data.employee._id;
    employee1TempPass = res1.data.data.loginCredentials.temporaryPassword;

    // Bob
    const res2 = await request(
      'POST',
      '/api/employees',
      {
        firstName: 'Bob',
        lastName: 'Martin',
        email: 'bob@apex.com',
        basicSalary: 80000,
        departmentId: engDeptId,
        joiningDate: '2026-01-01',
      },
      hrToken
    );
    assert.strictEqual(res2.status, 201);
    assert.strictEqual(res2.data.data.employee.employeeCode, 'EMP-002');
    employee2Id = res2.data.data.employee._id;
    employee2TempPass = res2.data.data.loginCredentials.temporaryPassword;
  });

  await t.test('8. Employee Login: Initial login with temporary password and mustChangePassword flag', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'alice@apex.com',
      password: employee1TempPass,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.user.mustChangePassword, true);
    employee1Token = res.data.data.tokens.accessToken;

    const resBob = await request('POST', '/api/auth/login', {
      email: 'bob@apex.com',
      password: employee2TempPass,
    });
    employee2Token = resBob.data.data.tokens.accessToken;
  });

  await t.test('8a. Organization management and safe user listing', async () => {
    const profile = await request('GET', '/api/organization/profile', null, adminToken);
    assert.strictEqual(profile.status, 200);
    assert.strictEqual(profile.data.company.name, 'Apex Innovations Ltd');

    const settings = await request(
      'PATCH',
      '/api/organization/settings',
      { officeStartTime: '09:00' },
      adminToken
    );
    assert.strictEqual(settings.status, 200);

    const departments = await request('GET', '/api/organization/departments', null, hrToken);
    assert.strictEqual(departments.status, 200);
    assert.ok(departments.data.departments.length >= 4);

    const newDepartment = await request(
      'POST',
      '/api/organization/departments',
      { name: 'Quality Assurance', description: 'Test department' },
      adminToken
    );
    assert.strictEqual(newDepartment.status, 201);

    const newDesignation = await request(
      'POST',
      '/api/organization/designations',
      { title: 'QA Analyst', departmentId: newDepartment.data.department._id },
      adminToken
    );
    assert.strictEqual(newDesignation.status, 201);

    const forbiddenSettings = await request(
      'PATCH',
      '/api/organization/settings',
      { officeStartTime: '08:00' },
      hrToken
    );
    assert.strictEqual(forbiddenSettings.status, 403);

    const users = await request('GET', '/api/auth/users', null, adminToken);
    assert.strictEqual(users.status, 200);
    assert.ok(users.data.users.every((user) => !Object.hasOwn(user, 'password')));

    const forbiddenUsers = await request('GET', '/api/auth/users', null, hrToken);
    assert.strictEqual(forbiddenUsers.status, 403);
  });

  await t.test('9. Forced Password Change: Employee updates password', async () => {
    const res = await request(
      'POST',
      '/api/auth/change-password',
      {
        oldPassword: employee1TempPass,
        newPassword: 'AliceNewStrongPassword2026!',
      },
      employee1Token
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);

    // Verify me endpoint reflects mustChangePassword: false
    const meRes = await request('GET', '/api/auth/me', null, employee1Token);
    assert.strictEqual(meRes.data.user.mustChangePassword, false);
  });

  await t.test('9a. Role dashboards: metrics are database-derived and role-scoped', async () => {
    const adminMetrics = await request('GET', '/api/analytics/admin', null, adminToken);
    assert.strictEqual(adminMetrics.status, 200);
    assert.strictEqual(adminMetrics.data.kpis.headcount, 2);

    const hrMetrics = await request('GET', '/api/analytics/hr', null, hrToken);
    assert.strictEqual(hrMetrics.status, 200);
    assert.strictEqual(hrMetrics.data.kpis.headcount, 2);

    const employeeMetrics = await request('GET', '/api/analytics/employee', null, employee1Token);
    assert.strictEqual(employeeMetrics.status, 200);
    assert.strictEqual(employeeMetrics.data.leaveBalance.remaining.casual, 10);

    const forbiddenAdminMetrics = await request('GET', '/api/analytics/admin', null, employee1Token);
    assert.strictEqual(forbiddenAdminMetrics.status, 403);

    const auditLogs = await request('GET', '/api/analytics/audits?page=1&limit=50', null, adminToken);
    assert.strictEqual(auditLogs.status, 200);
    assert.ok(Array.isArray(auditLogs.data.logs));
    assert.ok(auditLogs.data.logs.length > 0);

    const forbiddenAuditLogs = await request(
      'GET',
      '/api/analytics/audits?page=1&limit=50',
      null,
      hrToken
    );
    assert.strictEqual(forbiddenAuditLogs.status, 403);
  });

  await t.test('9b. HR employee CSV import and export', async () => {
    const dryRun = await request(
      'POST',
      '/api/employees/import/dry-run',
      {
        rows: [
          {
            firstName: 'Charlie',
            lastName: 'Jones',
            email: 'charlie@apex.com',
            basicSalary: 70000,
            department: 'Engineering',
            joiningDate: '2026-02-02',
          },
        ],
      },
      hrToken
    );
    assert.strictEqual(dryRun.status, 200);
    assert.strictEqual(dryRun.data.report.validRowsCount, 1);

    const validRows = dryRun.data.report.rows.filter((row) => row.isValid).map((row) => row.data);
    const imported = await request(
      'POST',
      '/api/employees/import/commit',
      { validRows },
      hrToken
    );
    assert.strictEqual(imported.status, 200);
    assert.strictEqual(imported.data.count, 1);

    const exportResult = await request('GET', '/api/employees/export/csv', null, hrToken);
    assert.strictEqual(exportResult.status, 200);

    const forbiddenImport = await request(
      'POST',
      '/api/employees/import/dry-run',
      { rows: [] },
      employee1Token
    );
    assert.strictEqual(forbiddenImport.status, 403);
  });

  await t.test('9c. Face template enrollment is consented, encrypted, role-scoped, and replaceable', async () => {
    faceDescriptor = Array.from({ length: 128 }, (_, index) => (index === 0 ? 0.12 : 0.01));
    const enrollment = {
      descriptors: [faceDescriptor, [...faceDescriptor], [...faceDescriptor]],
      consentConfirmed: true,
    };

    const deniedConsent = await request(
      'POST',
      `/api/employees/${employee2Id}/face-template`,
      { ...enrollment, consentConfirmed: false },
      hrToken
    );
    assert.strictEqual(deniedConsent.status, 400);

    const invalidDescriptor = await request(
      'POST',
      `/api/employees/${employee2Id}/face-template`,
      { descriptors: [[1, 2, 3]], consentConfirmed: true },
      adminToken
    );
    assert.strictEqual(invalidDescriptor.status, 422);

    const forbiddenEnrollment = await request(
      'POST',
      `/api/employees/${employee1Id}/face-template`,
      enrollment,
      employee1Token
    );
    assert.strictEqual(forbiddenEnrollment.status, 403);

    const registered = await request(
      'POST',
      `/api/employees/${employee1Id}/face-template`,
      enrollment,
      adminToken
    );
    assert.strictEqual(registered.status, 201);
    assert.strictEqual(registered.data.faceRegistered, true);
    assert.strictEqual(Object.hasOwn(registered.data, 'ciphertext'), false);

    const duplicate = await request(
      'POST',
      `/api/employees/${employee1Id}/face-template`,
      enrollment,
      adminToken
    );
    assert.strictEqual(duplicate.status, 409);

    const reEnrolledDescriptor = [...faceDescriptor];
    reEnrolledDescriptor[0] += 0.01;
    const reEnrolled = await request(
      'PUT',
      `/api/employees/${employee1Id}/face-template`,
      {
        descriptors: [reEnrolledDescriptor, [...reEnrolledDescriptor], [...reEnrolledDescriptor]],
        consentConfirmed: true,
      },
      hrToken
    );
    assert.strictEqual(reEnrolled.status, 200);
    faceDescriptor = reEnrolledDescriptor;

    const template = await FaceTemplate.findOne({ employeeId: employee1Id }).select(
      '+ciphertext +iv +authTag'
    );
    assert.ok(template.ciphertext);
    assert.notStrictEqual(template.ciphertext, Buffer.from(JSON.stringify(faceDescriptor)).toString('base64'));

    const adminDirectory = await request('GET', '/api/employees', null, adminToken);
    assert.strictEqual(adminDirectory.status, 200);
    assert.strictEqual(
      adminDirectory.data.employees.find((item) => String(item._id) === String(employee1Id)).faceRegistered,
      true
    );

    const employeeDirectory = await request('GET', '/api/employees', null, employee1Token);
    assert.strictEqual(employeeDirectory.status, 200);
    assert.strictEqual(
      Object.hasOwn(
        employeeDirectory.data.employees.find((item) => String(item._id) === String(employee1Id)),
        'faceRegistered'
      ),
      false
    );

    const bobRegistration = await request(
      'POST',
      `/api/employees/${employee2Id}/face-template`,
      enrollment,
      hrToken
    );
    assert.strictEqual(bobRegistration.status, 201);

    const forbiddenDelete = await request(
      'DELETE',
      `/api/employees/${employee2Id}/face-template`,
      null,
      employee1Token
    );
    assert.strictEqual(forbiddenDelete.status, 403);

    const deleted = await request(
      'DELETE',
      `/api/employees/${employee2Id}/face-template`,
      null,
      adminToken
    );
    assert.strictEqual(deleted.status, 200);
    assert.strictEqual(deleted.data.faceRegistered, false);
  });

  await t.test('10. Security & Authorization: Employee CANNOT view colleague salary or 360 profile', async () => {
    // Alice attempts to view Bob 360 profile
    const res = await request('GET', `/api/employees/${employee2Id}`, null, employee1Token);
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.success, false);

    // Alice views directory list: Bob's salaryStructure must be redacted
    const listRes = await request('GET', '/api/employees', null, employee1Token);
    assert.strictEqual(listRes.status, 200);
    const bobInList = listRes.data.employees.find((e) => e._id === employee2Id);
    assert.ok(bobInList);
    assert.strictEqual(bobInList.salaryStructure, undefined); // Redacted for colleague

    const ownProfile = await request('GET', `/api/employees/${employee1Id}`, null, employee1Token);
    assert.strictEqual(ownProfile.status, 200);
    assert.strictEqual(ownProfile.data.employee._id, employee1Id);
  });

  await t.test('11. Security & Authorization: Employee CANNOT update colleague profile or self salary', async () => {
    // Alice attempts to update Bob
    const resOther = await request('PATCH', `/api/employees/${employee2Id}`, { phone: '123' }, employee1Token);
    assert.strictEqual(resOther.status, 403);

    // Alice attempts to update self salary
    const resSelfSalary = await request('PATCH', `/api/employees/${employee1Id}`, { basicSalary: 500000 }, employee1Token);
    assert.strictEqual(resSelfSalary.status, 200);
    // basicSalary must NOT change because employee role can only update phone/address
    assert.strictEqual(resSelfSalary.data.employee.salaryStructure.basicSalary, 100000);

    const hrCreateEmployee = await request(
      'POST',
      '/api/employees',
      {
        firstName: 'Denied',
        lastName: 'Creation',
        email: 'denied@apex.com',
        basicSalary: 50000,
      },
      employee1Token
    );
    assert.strictEqual(hrCreateEmployee.status, 403);
  });

  await t.test('12. Security & Authorization: Employee CANNOT view attendance board or review requests', async () => {
    // Attendance board
    const boardRes = await request('GET', '/api/attendance/board', null, employee1Token);
    assert.strictEqual(boardRes.status, 403);

    // Audit logs
    const auditRes = await request('GET', '/api/analytics/audits', null, employee1Token);
    assert.strictEqual(auditRes.status, 403);

    const adminAudit = await request('GET', '/api/analytics/audits', null, adminToken);
    assert.strictEqual(adminAudit.status, 200);
    assert.ok(adminAudit.data.logs.length > 0);
  });

  await t.test('13. Attendance Flow: Check-in, duplicate check-in prevention (409), and Check-out', async () => {
    const invalidFace = Array.from({ length: 128 }, () => 0.9);
    const rejectedIn = await request(
      'POST',
      '/api/attendance/check-in',
      {
        method: 'face',
        faceDescriptor: invalidFace,
        latitude: 24.8607,
        longitude: 67.0011,
        employeeId: employee2Id,
      },
      employee1Token
    );
    assert.strictEqual(rejectedIn.status, 422);

    const fakeClientVerification = await request(
      'POST',
      '/api/attendance/check-in',
      { method: 'geofence_camera', faceVerified: true },
      employee1Token
    );
    assert.strictEqual(fakeClientVerification.status, 400);

    // The linked employee JWT controls the record, regardless of a submitted employeeId.
    const inRes = await request(
      'POST',
      '/api/attendance/check-in',
      {
        method: 'face',
        faceDescriptor,
        latitude: 24.8607,
        longitude: 67.0011,
        employeeId: employee2Id,
      },
      employee1Token
    );
    assert.strictEqual(inRes.status, 201);
    assert.ok(inRes.data.attendance.checkIn);
    assert.strictEqual(String(inRes.data.attendance.employeeId), String(employee1Id));
    assert.strictEqual(inRes.data.attendance.faceVerified, true);

    // 2nd Check-in on same day -> must return 409
    const dupRes = await request(
      'POST',
      '/api/attendance/check-in',
      { method: 'face', faceDescriptor, latitude: 24.8607, longitude: 67.0011 },
      employee1Token
    );
    assert.strictEqual(dupRes.status, 409);

    const rejectedOut = await request(
      'POST',
      '/api/attendance/check-out',
      { method: 'face', faceDescriptor: invalidFace },
      employee1Token
    );
    assert.strictEqual(rejectedOut.status, 422);

    const outRes = await request(
      'POST',
      '/api/attendance/check-out',
      { method: 'face', faceDescriptor },
      employee1Token
    );
    assert.strictEqual(outRes.status, 200);
    assert.ok(outRes.data.attendance.checkOut);

    const manualIn = await request(
      'POST',
      '/api/attendance/check-in',
      { method: 'web' },
      employee2Token
    );
    assert.strictEqual(manualIn.status, 201);
    const manualOut = await request(
      'POST',
      '/api/attendance/check-out',
      { method: 'web' },
      employee2Token
    );
    assert.strictEqual(manualOut.status, 200);

    const myRecords = await request('GET', '/api/attendance/my-records', null, employee1Token);
    assert.strictEqual(myRecords.status, 200);
    assert.ok(myRecords.data.records.length > 0);

    const hrBoard = await request('GET', '/api/attendance/board', null, hrToken);
    assert.strictEqual(hrBoard.status, 200);
  });

  await t.test('14. Attendance Correction Flow: Employee requests, HR approves', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const corrRes = await request(
      'POST',
      '/api/attendance/corrections',
      {
        date: todayStr,
        requestedCheckIn: '09:00',
        requestedCheckOut: '18:00',
        reason: 'Office badge machine malfunction',
      },
      employee1Token
    );
    assert.strictEqual(corrRes.status, 201);
    const corrId = corrRes.data.correction._id;

    // HR reviews and approves
    const reviewRes = await request(
      'PATCH',
      `/api/attendance/corrections/${corrId}/review`,
      {
        status: 'approved',
        reviewComment: 'Verified with security desk',
      },
      hrToken
    );
    assert.strictEqual(reviewRes.status, 200);
    assert.strictEqual(reviewRes.data.correction.status, 'approved');

    const corrections = await request('GET', '/api/attendance/corrections', null, hrToken);
    assert.strictEqual(corrections.status, 200);
    assert.ok(corrections.data.corrections.some((item) => item._id === corrId));

    const employeeCorrections = await request(
      'GET',
      '/api/attendance/corrections',
      null,
      employee1Token
    );
    assert.strictEqual(employeeCorrections.status, 200);
  });

  await t.test('15. Leave Flow: Insufficient balance check, overlap check, application & approval', async () => {
    // Attempt 1: Over-quota request (15 casual days when quota is 10)
    const overRes = await request(
      'POST',
      '/api/leave/apply',
      {
        leaveType: 'casual',
        startDate: '2026-06-01',
        endDate: '2026-06-25',
        reason: 'Long vacation',
      },
      employee1Token
    );
    assert.strictEqual(overRes.status, 422);

    // Attempt 2: Valid 2-day casual leave
    const validRes = await request(
      'POST',
      '/api/leave/apply',
      {
        leaveType: 'casual',
        startDate: '2026-06-01', // Monday
        endDate: '2026-06-02',   // Tuesday
        reason: 'Personal urgent errand',
      },
      employee1Token
    );
    assert.strictEqual(validRes.status, 201);
    leaveRequestId = validRes.data.leaveRequest._id;
    assert.strictEqual(validRes.data.leaveRequest.daysCount, 2);

    // Attempt 3: Overlapping request on same dates -> 422
    const overlapRes = await request(
      'POST',
      '/api/leave/apply',
      {
        leaveType: 'sick',
        startDate: '2026-06-01',
        endDate: '2026-06-03',
        reason: 'Sick',
      },
      employee1Token
    );
    assert.strictEqual(overlapRes.status, 422);

    // HR approves the leave
    const approveRes = await request(
      'PATCH',
      `/api/leave/${leaveRequestId}/review`,
      {
        status: 'approved',
        reviewComment: 'Approved by HR',
      },
      hrToken
    );
    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.data.leaveRequest.status, 'approved');

    // Balance check: Remaining casual leave should now be 10 - 2 = 8
    const balRes = await request('GET', '/api/leave/my-balance', null, employee1Token);
    assert.strictEqual(balRes.data.balance.remaining.casual, 8);

    const employeeLeaves = await request('GET', '/api/leave', null, employee1Token);
    assert.strictEqual(employeeLeaves.status, 200);
    assert.ok(
      employeeLeaves.data.leaves.some((item) => String(item._id) === String(leaveRequestId)),
      JSON.stringify({
        requestedLeaveId: leaveRequestId,
        visibleLeaveIds: employeeLeaves.data.leaves.map((item) => item._id),
      })
    );

    const hrLeaves = await request('GET', '/api/leave', null, hrToken);
    assert.strictEqual(hrLeaves.status, 200);
  });

  await t.test('16. Payroll Flow: Draft generation, HR cannot finalize, Admin finalizes, Payslip locked', async () => {
    const monthStr = '2026-05';
    // HR generates draft
    const draftRes = await request('POST', '/api/payroll/generate-draft', { month: monthStr }, hrToken);
    assert.strictEqual(draftRes.status, 201);
    assert.strictEqual(draftRes.data.payroll.status, 'draft');
    payrollId = draftRes.data.payroll._id;

    const payrolls = await request('GET', '/api/payroll', null, hrToken);
    assert.strictEqual(payrolls.status, 200);
    assert.ok(payrolls.data.payrolls.some((item) => item._id === payrollId));

    const payrollRecord = await request('GET', `/api/payroll/${payrollId}`, null, adminToken);
    assert.strictEqual(payrollRecord.status, 200);

    // HR attempts to finalize payroll -> Forbidden (Admin only)
    const hrFinalizeRes = await request('PATCH', `/api/payroll/${payrollId}/finalize`, {}, hrToken);
    assert.strictEqual(hrFinalizeRes.status, 403);

    // Employee attempts to download payslip before finalization -> Forbidden
    const unfinPayslipRes = await request('GET', `/api/payroll/${payrollId}/payslips/${employee1Id}`, null, employee1Token);
    assert.strictEqual(unfinPayslipRes.status, 403);

    // Admin finalizes payroll
    const adminFinalizeRes = await request('PATCH', `/api/payroll/${payrollId}/finalize`, {}, adminToken);
    assert.strictEqual(adminFinalizeRes.status, 200);
    assert.strictEqual(adminFinalizeRes.data.payroll.status, 'finalized');

    // Attempting to re-finalize or modify finalized payroll -> must fail
    const reFinalizeRes = await request('PATCH', `/api/payroll/${payrollId}/finalize`, {}, adminToken);
    assert.strictEqual(reFinalizeRes.status, 400);

    // Employee 1 downloads own finalized payslip -> Success
    const ownPayslipRes = await request('GET', `/api/payroll/${payrollId}/payslips/${employee1Id}`, null, employee1Token);
    assert.strictEqual(ownPayslipRes.status, 200);
    assert.strictEqual(ownPayslipRes.data.employee.employeeCode, 'EMP-001');

    const employeePayrollList = await request('GET', '/api/payroll', null, employee1Token);
    assert.strictEqual(employeePayrollList.status, 200);
    assert.strictEqual(employeePayrollList.data.payrolls.length, 1);
    assert.deepStrictEqual(
      employeePayrollList.data.payrolls[0].items.map((item) => String(item.employeeId)),
      [String(employee1Id)]
    );

    const employeeDashboard = await request(
      'GET',
      '/api/analytics/employee',
      null,
      employee1Token
    );
    assert.strictEqual(employeeDashboard.status, 200);
    assert.strictEqual(employeeDashboard.data.latestPayslip.month, monthStr);

    // Employee 1 attempts to download Bob (Employee 2) payslip -> Forbidden 403
    const otherPayslipRes = await request('GET', `/api/payroll/${payrollId}/payslips/${employee2Id}`, null, employee1Token);
    assert.strictEqual(otherPayslipRes.status, 403);
  });

  await t.test('16a. Announcements and notifications are role-accessible', async () => {
    const created = await request(
      'POST',
      '/api/communication/announcements',
      { title: 'Test announcement', content: 'Test content', priority: 'normal' },
      hrToken
    );
    assert.strictEqual(created.status, 201);

    const announcements = await request(
      'GET',
      '/api/communication/announcements',
      null,
      employee1Token
    );
    assert.strictEqual(announcements.status, 200);
    assert.ok(announcements.data.announcements.some((item) => item.title === 'Test announcement'));

    const notifications = await request(
      'GET',
      '/api/communication/notifications',
      null,
      employee1Token
    );
    assert.strictEqual(notifications.status, 200);
    assert.ok(Array.isArray(notifications.data.notifications));
  });

  await t.test('17. AI Tool Execution & Scoping: Policy check, leave balance, colleague salary redaction', async () => {
    const userEmployee = {
      _id: 'user_alice',
      name: 'Alice Wong',
      role: 'Employee',
      employeeId: employee1Id,
    };

    const userAdmin = {
      _id: 'user_admin',
      name: 'Chief Admin',
      role: 'Admin',
      employeeId: null,
    };

    // 1. Tool getCompanyPolicies
    const policyResult = await executeAiTool('getCompanyPolicies', {}, userEmployee);
    assert.strictEqual(policyResult.officeStartTime, '09:00');
    assert.strictEqual(policyResult.gracePeriodMinutes, 15);
    assert.ok(policyResult.taxSlabs.length >= 5);

    // 2. Tool getLeaveBalance for employee
    const balResult = await executeAiTool('getLeaveBalance', {}, userEmployee);
    assert.strictEqual(balResult.remaining.casual, 8);

    // 3. Tool getEmployeeDirectory as Employee: Bob's salary must be redacted!
    const dirResultEmp = await executeAiTool('getEmployeeDirectory', {}, userEmployee);
    const bobEmpEntry = dirResultEmp.find((e) => e.employeeCode === 'EMP-002');
    assert.ok(bobEmpEntry);
    assert.strictEqual(bobEmpEntry.salaryStructure, '[REDACTED - Confidential]');

    // 4. Tool getEmployeeDirectory as Admin: Bob's salary is visible
    const dirResultAdmin = await executeAiTool('getEmployeeDirectory', {}, userAdmin);
    const bobAdminEntry = dirResultAdmin.find((e) => e.employeeCode === 'EMP-002');
    assert.notStrictEqual(bobAdminEntry.salaryStructure, '[REDACTED - Confidential]');
    assert.strictEqual(bobAdminEntry.salaryStructure.basicSalary, 80000);
  });

  await t.test('18. Project source ZIP endpoint is unavailable to every role', async () => {
    const anonymous = await request('GET', '/api/communication/download-zip');
    assert.strictEqual(anonymous.status, 404);

    const employee = await request('GET', '/api/communication/download-zip', null, employee1Token);
    assert.strictEqual(employee.status, 404);

    const admin = await request('GET', '/api/communication/download-zip', null, adminToken);
    assert.strictEqual(admin.status, 404);

    const hr = await request('GET', '/api/communication/download-zip', null, hrToken);
    assert.strictEqual(hr.status, 404);
  });
});
