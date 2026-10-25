import React, { useState, useEffect } from 'react';
import {
  listPayrolls,
  generatePayrollDraft,
  finalizePayroll,
  getPayrollById,
  getPayslip,
} from '../../services/api.js';
import { useAuth } from '../../app/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import {
  CreditCard,
  Plus,
  Lock,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Printer,
  DollarSign,
  TrendingDown,
  Building2,
} from 'lucide-react';

export const PayrollManagement = () => {
  const { user, employee, company } = useAuth();
  const { addToast } = useToast();

  const isAdmin = user?.role === 'Admin';
  const isHR = user?.role === 'HR';
  const isEmployee = user?.role === 'Employee';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [payrolls, setPayrolls] = useState([]);
  const [selectedPayroll, setSelectedPayroll] = useState(null);

  // Draft Generator Form
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [draftMonth, setDraftMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [generating, setGenerating] = useState(false);

  // Payslip Modal
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [activePayslip, setActivePayslip] = useState(null);

  const loadPayrolls = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await listPayrolls();
      if (res.success) {
        setPayrolls(res.payrolls);
        if (res.payrolls.length > 0 && !selectedPayroll) {
          setSelectedPayroll(res.payrolls[0]);
        }
      } else {
        throw new Error('Payroll response was incomplete.');
      }
    } catch (err) {
      setLoadError(err.message || 'Payroll records could not be loaded.');
      addToast('Failed to load payroll runs: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayrolls();
  }, []);

  const handleGenerateDraft = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await generatePayrollDraft(draftMonth);
      addToast(`Payroll draft for ${draftMonth} generated successfully!`, 'success');
      setShowGenerateModal(false);
      loadPayrolls();
      setSelectedPayroll(res.payroll);
    } catch (err) {
      addToast(err.message || 'Failed to generate draft', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleFinalize = async (payrollId) => {
    if (!window.confirm('Are you sure you want to finalize and lock this payroll run? This action cannot be reversed.')) {
      return;
    }

    try {
      const res = await finalizePayroll(payrollId);
      addToast('Payroll run finalized and locked successfully.', 'success');
      loadPayrolls();
      setSelectedPayroll(res.payroll);
    } catch (err) {
      addToast(err.message || 'Finalization failed', 'error');
    }
  };

  const handleViewPayslip = async (payrollId, empId) => {
    try {
      const res = await getPayslip(payrollId, empId);
      if (res.success) {
        setActivePayslip(res);
        setShowPayslipModal(true);
      }
    } catch (err) {
      addToast(err.message || 'Could not load payslip', 'error');
    }
  };

  const handlePrintPayslip = () => {
    window.print();
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading payroll ledger...</div>;
  }

  if (loadError) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white border border-rose-200">
        <p className="text-sm font-semibold text-rose-700">{loadError}</p>
        <button
          type="button"
          onClick={loadPayrolls}
          className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Payroll & Compensation Ledger</h2>
          <p className="text-xs text-slate-500">
            5-tier progressive tax brackets, proration, attendance deductions, and locked payslips.
          </p>
        </div>

        {(isAdmin || isHR) && (
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Generate Monthly Draft
          </button>
        )}
      </div>

      {/* If user is an employee, display their personal payslips */}
      {isEmployee ? (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900">
            Your Finalized Payslips
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                <tr>
                  <th className="p-3">Period</th>
                  <th className="p-3">Gross Salary</th>
                  <th className="p-3">Deductions</th>
                  <th className="p-3">Tax Withheld</th>
                  <th className="p-3">Net Take-Home</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrolls
                  .filter((p) => p.status === 'finalized')
                  .map((p) => {
                    const item = (p.items || []).find(
                      (it) => String(it.employeeId) === String(user.employeeId)
                    );
                    if (!item) return null;
                    return (
                      <tr key={p._id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-900">{p.month}</td>
                        <td className="p-3 font-mono">PKR {item.grossSalary.toLocaleString()}</td>
                        <td className="p-3 font-mono text-rose-600">-PKR {item.attendanceDeductions.toLocaleString()}</td>
                        <td className="p-3 font-mono text-rose-600">-PKR {item.monthlyTax.toLocaleString()}</td>
                        <td className="p-3 font-mono font-bold text-emerald-600">
                          PKR {item.netPay.toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleViewPayslip(p._id, user.employeeId)}
                            className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100"
                          >
                            View & Print Payslip
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Management View: Runs list + Selected Run Table */
        <div className="space-y-6">
          {/* Payroll Run Selector Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Payroll Runs:</span>
              <div className="flex flex-wrap gap-2">
                {payrolls.length === 0 ? (
                  <span className="text-xs text-slate-400">No payroll runs generated yet</span>
                ) : (
                  payrolls.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => setSelectedPayroll(p)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                        selectedPayroll?._id === p._id
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p.month} ({p.status})
                    </button>
                  ))
                )}
              </div>
            </div>

            {selectedPayroll && (
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                    selectedPayroll.status === 'finalized'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {selectedPayroll.status}
                </span>

                {isAdmin && selectedPayroll.status === 'draft' && (
                  <button
                    onClick={() => handleFinalize(selectedPayroll._id)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Finalize & Lock Payroll
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Selected Payroll Run Breakdown Table */}
          {selectedPayroll && (
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Payroll Sheet for {selectedPayroll.month}
                  </h3>
                  <div className="text-xs text-slate-500">
                    Total Gross: PKR {selectedPayroll.totalGross.toLocaleString()} · Total Deductions: PKR{' '}
                    {selectedPayroll.totalDeductions.toLocaleString()} · Total Tax: PKR{' '}
                    {selectedPayroll.totalTax.toLocaleString()} · Total Net: PKR{' '}
                    {selectedPayroll.totalNet.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Basic Pay</th>
                      <th className="py-3 px-4">HRA (40%)</th>
                      <th className="py-3 px-4">Medical (10%)</th>
                      <th className="py-3 px-4">Gross (1.5×)</th>
                      <th className="py-3 px-4">Deductions</th>
                      <th className="py-3 px-4">Tax (Monthly)</th>
                      <th className="py-3 px-4 font-bold text-slate-900">Net Payable</th>
                      <th className="py-3 px-4 text-right">Payslip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(selectedPayroll.items || []).map((it) => (
                      <tr key={it.employeeId} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {it.employeeName}
                          <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                            ({it.employeeCode})
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">PKR {it.basicSalary.toLocaleString()}</td>
                        <td className="py-3 px-4 font-mono">PKR {it.hraAllowance.toLocaleString()}</td>
                        <td className="py-3 px-4 font-mono">PKR {it.medicalAllowance.toLocaleString()}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                          PKR {it.grossSalary.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-rose-600">
                          -PKR {it.attendanceDeductions.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-rose-600">
                          -PKR {it.monthlyTax.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                          PKR {it.netPay.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleViewPayslip(selectedPayroll._id, it.employeeId)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            title="View Payslip"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate Draft Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">Generate Monthly Payroll Draft</h3>
            <p className="text-xs text-slate-500 mb-4">
              Select the pay period. The engine will evaluate working days, absent deductions, unpaid leave days, and progressive income tax.
            </p>
            <form onSubmit={handleGenerateDraft} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pay Period (Month)</label>
                <input
                  type="month"
                  required
                  value={draftMonth}
                  onChange={(e) => setDraftMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-xl disabled:opacity-50 shadow-xs"
                >
                  {generating ? 'Processing...' : 'Run Calculations'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip Modal (Printable / Downloadable) */}
      {showPayslipModal && activePayslip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border shadow-2xl space-y-6 print:border-none print:shadow-none print:p-0">
            {/* Payslip Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    H
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {activePayslip.organization?.name || 'HCM Lite'}
                  </h3>
                </div>
                <div className="text-xs text-slate-500 mt-1">Official Confidential Salary Payslip</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900">Period: {activePayslip.payrollPeriod}</div>
                <div className="text-[11px] text-slate-400">
                  Generated: {new Date(activePayslip.finalizedAt || Date.now()).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Employee Particulars */}
            <div className="grid grid-cols-2 gap-4 text-xs p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                Employee Name: <span className="font-bold text-slate-900">{activePayslip.employee.name}</span>
              </div>
              <div>
                Employee ID: <span className="font-mono font-bold text-slate-900">{activePayslip.employee.employeeCode}</span>
              </div>
              <div>
                Email: <span className="text-slate-700">{activePayslip.employee.email}</span>
              </div>
              <div>
                Joining Date: <span className="text-slate-700">{activePayslip.employee.joiningDate}</span>
              </div>
            </div>

            {/* Earnings & Deductions Breakdown */}
            <div className="grid grid-cols-2 gap-6 text-xs">
              {/* Earnings */}
              <div className="space-y-2">
                <div className="font-bold text-slate-900 border-b pb-1">Earnings (PKR)</div>
                <div className="flex justify-between">
                  <span>Basic Salary</span>
                  <span className="font-mono font-medium">{activePayslip.payslip.basicSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>House Rent Allowance (40%)</span>
                  <span className="font-mono font-medium">{activePayslip.payslip.hraAllowance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Medical Allowance (10%)</span>
                  <span className="font-mono font-medium">{activePayslip.payslip.medicalAllowance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t text-slate-900">
                  <span>Gross Total Earnings</span>
                  <span className="font-mono">{activePayslip.payslip.grossSalary.toLocaleString()}</span>
                </div>
              </div>

              {/* Deductions */}
              <div className="space-y-2">
                <div className="font-bold text-slate-900 border-b pb-1">Deductions & Tax (PKR)</div>
                <div className="flex justify-between text-rose-600">
                  <span>Attendance / Absent Deductions</span>
                  <span className="font-mono">-{activePayslip.payslip.attendanceDeductions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Progressive Income Tax Withholding</span>
                  <span className="font-mono">-{activePayslip.payslip.monthlyTax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t text-rose-700">
                  <span>Total Deductions</span>
                  <span className="font-mono">
                    -{(activePayslip.payslip.attendanceDeductions + activePayslip.payslip.monthlyTax).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Payable Highlight */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
              <div>
                <div className="text-[11px] font-semibold text-emerald-800">Net Take-Home Payable Amount</div>
                <div className="text-xs text-emerald-600">Direct Deposit / Bank Transfer Authorized</div>
              </div>
              <div className="text-xl font-extrabold text-emerald-700 font-mono">
                PKR {activePayslip.payslip.netPay.toLocaleString()}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t print:hidden">
              <button
                type="button"
                onClick={handlePrintPayslip}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold"
              >
                <Printer className="w-4 h-4" />
                Print / Save PDF
              </button>
              <button
                type="button"
                onClick={() => setShowPayslipModal(false)}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
