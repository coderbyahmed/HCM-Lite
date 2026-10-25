import React, { useState, useEffect } from 'react';
import {
  applyLeave,
  cancelLeave,
  getMyLeaveBalance,
  calculateLeaveDaysPreview,
  listLeaves,
  reviewLeave,
} from '../../services/api.js';
import { useAuth } from '../../app/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

export const LeaveManagement = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const isManagement = user?.role === 'Admin' || user?.role === 'HR';

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [leavesList, setLeavesList] = useState([]);

  // Apply Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveType, setLeaveType] = useState('casual');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [previewCalculation, setPreviewCalculation] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Review Comment State
  const [reviewComment, setReviewComment] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const [balRes, listRes] = await Promise.all([
        isManagement ? Promise.resolve(null) : getMyLeaveBalance(),
        listLeaves(),
      ]);

      if (!isManagement && !balRes?.success) {
        throw new Error('Your leave balance could not be loaded.');
      }
      if (balRes?.success) setBalance(balRes.balance);
      if (listRes?.success) setLeavesList(listRes.leaves);
      else throw new Error('Leave request response was incomplete.');
    } catch (err) {
      setLoadError(err.message || 'Leave records could not be loaded.');
      addToast('Failed to load leave records: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update working days preview whenever dates change
  useEffect(() => {
    if (showApplyModal && startDate && endDate && startDate <= endDate) {
      let active = true;
      setPreviewError('');
      calculateLeaveDaysPreview(startDate, endDate)
        .then((res) => {
          if (active && res.success) {
            setPreviewCalculation(res);
          }
        })
        .catch((err) => {
          if (active) {
            setPreviewCalculation(null);
            setPreviewError(err.message || 'Working days could not be calculated.');
          }
        });
      return () => {
        active = false;
      };
    } else {
      setPreviewCalculation(null);
      setPreviewError('');
    }
  }, [startDate, endDate, showApplyModal]);

  const handleApply = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await applyLeave({
        leaveType,
        startDate,
        endDate,
        reason,
      });
      addToast('Leave request submitted successfully.', 'success');
      setShowApplyModal(false);
      setReason('');
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to submit leave', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelLeave(id);
      addToast('Leave request cancelled.', 'success');
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleReview = async (id, status) => {
    try {
      await reviewLeave(id, status, reviewComment);
      addToast(`Leave request ${status}.`, 'success');
      setReviewComment('');
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading leave portal...</div>;
  }

  if (loadError) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white border border-rose-200">
        <p className="text-sm font-semibold text-rose-700">{loadError}</p>
        <button
          type="button"
          onClick={loadData}
          className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const remaining = balance?.remaining || {};
  const quotas = balance?.quotas || {};
  const used = balance?.used || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {isManagement ? 'Leave Governance & Approval Inbox' : 'My Leave Desk'}
          </h2>
          <p className="text-xs text-slate-500">
            Smart working-day calculations with holiday exclusions and balance protection.
          </p>
        </div>

        {!isManagement && (
          <button
            onClick={() => setShowApplyModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Apply for Time Off
          </button>
        )}
      </div>

      {/* Balance Summary Strip (for employee) */}
      {balance && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Casual Leave</div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">{remaining.casual}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Used: {used.casual} / {quotas.casual} days
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Sick Leave</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{remaining.sick}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Used: {used.sick} / {quotas.sick} days
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Annual Leave</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{remaining.annual}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Used: {used.annual} / {quotas.annual} days
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Unpaid Leave</div>
            <div className="text-2xl font-bold text-slate-700 mt-1">Unlimited</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Used: {used.unpaid} days (salary deducted)
            </div>
          </div>
        </div>
      )}

      {/* Leave Requests Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            {isManagement ? 'Submitted Leave Requests' : 'Your Leave Application History'}
          </h3>
          <span className="text-xs text-slate-400">{leavesList.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Working Days</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {leavesList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No leave requests on file
                  </td>
                </tr>
              ) : (
                leavesList.map((req) => (
                  <tr key={req._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{req.employeeName || 'You'}</td>
                    <td className="py-3 px-4 capitalize font-medium">{req.leaveType}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {req.startDate} to {req.endDate}
                    </td>
                    <td className="py-3 px-4 font-bold">{req.daysCount} days</td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600">{req.reason}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                          req.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : req.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : req.status === 'cancelled'
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isManagement && req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleReview(req._id, 'approved')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[11px]"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReview(req._id, 'rejected')}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-[11px]"
                          >
                            Reject
                          </button>
                        </div>
                      ) : req.status === 'pending' ? (
                        <button
                          onClick={() => handleCancel(req._id)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal with Smart Working-Days Calculation */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Apply for Leave</h3>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="casual">Casual Leave ({remaining.casual} remaining)</option>
                  <option value="sick">Sick Leave ({remaining.sick} remaining)</option>
                  <option value="annual">Annual Leave ({remaining.annual} remaining)</option>
                  <option value="unpaid">Unpaid Leave (Unlimited, salary deducted)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Real-time Calculation Badge */}
              {previewCalculation && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between font-bold text-indigo-950">
                    <span>Working Days Count:</span>
                    <span className="text-sm font-extrabold text-indigo-700">
                      {previewCalculation.workingDaysCount} Days
                    </span>
                  </div>
                  {previewCalculation.holidaysEncountered?.length > 0 && (
                    <div className="text-amber-800">
                      Holidays excluded:{' '}
                      {previewCalculation.holidaysEncountered.map((h) => h.name).join(', ')}
                    </div>
                  )}
                  {previewError && (
                    <div role="alert" className="text-rose-700 text-[11px]">
                      Working day preview unavailable: {previewError}
                    </div>
                  )}
                  {leaveType !== 'unpaid' &&
                    previewCalculation.workingDaysCount > (remaining[leaveType] || 0) && (
                      <div className="text-rose-600 font-bold flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Warning: Exceeds your available {leaveType} leave quota (
                        {remaining[leaveType]} remaining).
                      </div>
                    )}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Absence</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide context for HR review"
                  className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (previewCalculation && previewCalculation.workingDaysCount === 0)}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
