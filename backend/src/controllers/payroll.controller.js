import {
  generateMonthlyPayrollDraft,
  finalizePayroll,
  getEmployeePayslip,
} from '../services/payroll.service.js';
import { Payroll } from '../models/index.js';

export const generateDraft = async (req, res, next) => {
  try {
    const { month } = req.body;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Valid month string (YYYY-MM) is required.' });
    }

    const payroll = await generateMonthlyPayrollDraft(month, req.user, req.ip);
    res.status(201).json({ success: true, message: `Payroll draft generated for ${month}.`, payroll });
  } catch (err) {
    next(err);
  }
};

export const finalize = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payroll = await finalizePayroll(id, req.user, req.ip);
    res.json({ success: true, message: 'Payroll run successfully finalized and locked.', payroll });
  } catch (err) {
    next(err);
  }
};

export const list = async (req, res, next) => {
  try {
    if (req.user.role === 'Employee') {
      if (!req.user.employeeId) {
        return res.status(400).json({ success: false, message: 'No linked employee record.' });
      }
      const finalizedPayrolls = await Payroll.find({ status: 'finalized' }).sort({ month: -1 });
      const payrolls = finalizedPayrolls.flatMap((record) => {
        const payroll = typeof record.toObject === 'function' ? record.toObject() : record;
        const item = (payroll.items || []).find(
          (entry) => String(entry.employeeId) === String(req.user.employeeId)
        );
        if (!item) return [];

        return [{ _id: payroll._id, month: payroll.month, status: payroll.status, items: [item] }];
      });
      return res.json({ success: true, payrolls });
    }

    const payrolls = await Payroll.find({}).sort({ month: -1 });
    res.json({ success: true, payrolls });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payroll = await Payroll.findById(id);
    if (!payroll) return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    res.json({ success: true, payroll });
  } catch (err) {
    next(err);
  }
};

export const getPayslip = async (req, res, next) => {
  try {
    const { payrollId, employeeId } = req.params;
    const payslip = await getEmployeePayslip(payrollId, employeeId, req.user);
    res.json({ success: true, ...payslip });
  } catch (err) {
    next(err);
  }
};
