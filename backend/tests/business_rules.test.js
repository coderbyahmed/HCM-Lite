import test from 'node:test';
import assert from 'node:assert';
import { calculateAnnualTax } from '../src/services/payroll.service.js';
import { calculateSalaryStructure } from '../src/services/employee.service.js';
import { isWorkingDay } from '../src/services/organization.service.js';
import { hashPassword, comparePassword } from '../src/utils/crypto.js';

test('Payroll: Salary structure calculation formula', () => {
  const basic = 100000;
  const res = calculateSalaryStructure(basic);
  assert.strictEqual(res.basicSalary, 100000);
  assert.strictEqual(res.hraAllowance, 40000); // 40%
  assert.strictEqual(res.medicalAllowance, 10000); // 10%
  assert.strictEqual(res.grossSalary, 150000); // 1.5 * basic
});

test('Payroll: Annual tax slabs according to challenge brief', () => {
  // Slab 1: Up to 600,000 -> 0%
  assert.strictEqual(calculateAnnualTax(500000), 0);
  assert.strictEqual(calculateAnnualTax(600000), 0);

  // Slab 2: 600,001 to 1,200,000 -> 5% of excess over 600,000
  // e.g. 1,000,000 -> (1,000,000 - 600,000) * 0.05 = 400,000 * 0.05 = 20,000
  assert.strictEqual(calculateAnnualTax(1000000), 20000);
  assert.strictEqual(calculateAnnualTax(1200000), 30000);

  // Slab 3: 1,200,001 to 2,400,000 -> 30,000 + 15% of excess over 1,200,000
  // e.g. 1,800,000 -> 30,000 + (600,000 * 0.15) = 30,000 + 90,000 = 120,000
  assert.strictEqual(calculateAnnualTax(1800000), 120000);

  // Slab 4: 2,400,001 to 3,600,000 -> 210,000 + 25% of excess over 2,400,000
  // e.g. 3,000,000 -> 210,000 + (600,000 * 0.25) = 210,000 + 150,000 = 360,000
  assert.strictEqual(calculateAnnualTax(3000000), 360000);

  // Slab 5: Above 3,600,000 -> 510,000 + 35% of excess over 3,600,000
  // e.g. 4,600,000 -> 510,000 + (1,000,000 * 0.35) = 510,000 + 350,000 = 860,000
  assert.strictEqual(calculateAnnualTax(4600000), 860000);
});

test('Organization: Working day calendar calculation', () => {
  const settings = {
    weekends: ['Saturday', 'Sunday'],
    holidays: [{ date: '2026-03-23', name: 'Pakistan Day' }],
  };

  // 2026-03-23 is Monday (Pakistan Day holiday) -> should not be working day
  assert.strictEqual(isWorkingDay('2026-03-23', settings), false);

  // 2026-03-22 is Sunday -> should not be working day
  assert.strictEqual(isWorkingDay('2026-03-22', settings), false);

  // 2026-03-24 is Tuesday (regular weekday) -> should be working day
  assert.strictEqual(isWorkingDay('2026-03-24', settings), true);
});

test('Security: Password hashing & verification', async () => {
  const password = 'SuperSecretPassword2026!';
  const hash = await hashPassword(password);
  assert.notStrictEqual(password, hash);
  const isValid = await comparePassword(password, hash);
  assert.strictEqual(isValid, true);
  const isInvalid = await comparePassword('WrongPassword', hash);
  assert.strictEqual(isInvalid, false);
});
