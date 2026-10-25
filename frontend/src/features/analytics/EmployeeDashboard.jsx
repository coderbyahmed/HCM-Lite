import React, { useEffect, useState } from 'react';
import { getEmployeeMetrics, checkIn, checkOut } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import {
  Clock,
  CalendarCheck,
  CalendarDays,
  FileText,
  Megaphone,
  CheckCircle2,
  LogIn,
  LogOut,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export const EmployeeDashboard = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await getEmployeeMetrics();
      if (res.success) {
        setData(res);
      } else {
        throw new Error('The employee dashboard response was incomplete.');
      }
    } catch (err) {
      setLoadError(err.message || 'Dashboard data could not be loaded.');
      addToast('Failed to load dashboard metrics: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await checkIn({ method: 'web' });
      addToast('Checked in successfully!', 'success');
      loadMetrics();
    } catch (err) {
      addToast(err.message || 'Check-in failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await checkOut();
      addToast('Checked out successfully!', 'success');
      loadMetrics();
    } catch (err) {
      addToast(err.message || 'Check-out failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading your workspace...</div>;
  }

  if (loadError || !data) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white border border-rose-200">
        <p className="text-sm font-semibold text-rose-700">
          {loadError || 'Dashboard data is unavailable.'}
        </p>
        <button
          type="button"
          onClick={loadMetrics}
          className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const todayAttendance = data?.todayAttendance;
  const hoursThisWeek = data?.hoursWorkedThisWeek || 0;
  const weeklyTarget = data?.weeklyTargetHours;
  const lateCount = data?.lateAttendancesThisMonth || 0;
  const leaveBalance = data?.leaveBalance;
  const latestPayslip = data?.latestPayslip;
  const announcements = data?.announcements || [];
  const attendanceByDay = data?.attendanceByDay || [];
  const attendancePolicy = data?.attendancePolicy;

  const isCheckedIn = !!todayAttendance?.checkIn;
  const isCheckedOut = !!todayAttendance?.checkOut;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Attendance Punch Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Workforce Attendance Desk</h2>
          <p className="text-xs text-indigo-200 max-w-md">
            Server-timestamped attendance. Company start time:{' '}
            {attendancePolicy?.officeStartTime || 'not configured'}; grace period:{' '}
            {attendancePolicy?.gracePeriodMinutes ?? 'not configured'} minutes.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-indigo-100">
            <div>
              Status:{' '}
              <span className="font-bold text-white capitalize">
                {todayAttendance ? todayAttendance.status.replace('_', ' ') : 'Not Checked In'}
              </span>
            </div>
            {todayAttendance?.checkInTime && (
              <div>
                In: <span className="font-bold text-white">{todayAttendance.checkInTime}</span>
              </div>
            )}
            {todayAttendance?.checkOutTime && (
              <div>
                Out: <span className="font-bold text-white">{todayAttendance.checkOutTime}</span>
              </div>
            )}
            {todayAttendance?.totalHours > 0 && (
              <div>
                Logged: <span className="font-bold text-emerald-300">{todayAttendance.totalHours} hrs</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isCheckedIn ? (
            <button
              onClick={handleCheckIn}
              disabled={actionLoading}
              className="flex items-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 text-sm"
            >
              <LogIn className="w-5 h-5" />
              {actionLoading ? 'Recording...' : 'Web Check-In'}
            </button>
          ) : !isCheckedOut ? (
            <button
              onClick={handleCheckOut}
              disabled={actionLoading}
              className="flex items-center gap-2 px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-2xl transition-all shadow-lg shadow-amber-500/30 disabled:opacity-50 text-sm"
            >
              <LogOut className="w-5 h-5" />
              {actionLoading ? 'Recording...' : 'Web Check-Out'}
            </button>
          ) : (
            <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 border border-white/20 text-emerald-300 font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              Completed for Today
            </div>
          )}

          <button
            onClick={() => onNavigate('attendance')}
            className="px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-colors"
          >
            Face-Verified Attendance
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weekly Hours */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Weekly Progress</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {hoursThisWeek}{' '}
            {weeklyTarget > 0 && (
              <span className="text-xs font-normal text-slate-400">/ {weeklyTarget} hrs</span>
            )}
          </div>
          {weeklyTarget > 0 && (
            <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round((hoursThisWeek / weeklyTarget) * 100))}%` }}
              />
            </div>
          )}
          <div className="text-[11px] text-slate-500 mt-2">
            {weeklyTarget > 0
              ? `${Math.round((hoursThisWeek / weeklyTarget) * 100)}% of your configured weekly target`
              : 'Weekly target is not configured.'}
          </div>
        </div>

        <section className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Attendance Hours This Week</h3>
            <p className="text-xs text-slate-500">Recorded hours from your attendance records</p>
          </div>
          <div className="h-56">
            {attendanceByDay.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No attendance hours have been recorded this week.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceByDay} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="h" />
                  <Tooltip formatter={(value) => [`${value} hrs`, 'Recorded']} />
                  <Bar dataKey="hours" fill="#6366f1" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Monthly Late Count */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Late Days (This Month)</span>
            <CalendarCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{lateCount}</div>
          <div className="text-[11px] text-slate-500 mt-2">
            Arrivals past office start time + grace period
          </div>
          <button
            onClick={() => onNavigate('attendance')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 mt-3 inline-block"
          >
            Request Attendance Correction →
          </button>
        </div>

        {/* Leave Balances */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Remaining Leaves</span>
            <CalendarDays className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100 flex-1">
              <div className="text-sm font-bold text-slate-900">{leaveBalance?.remaining?.casual ?? '—'}</div>
              <div className="text-[10px] text-slate-500 font-medium">Casual</div>
            </div>
            <div className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100 flex-1">
              <div className="text-sm font-bold text-slate-900">{leaveBalance?.remaining?.sick ?? '—'}</div>
              <div className="text-[10px] text-slate-500 font-medium">Sick</div>
            </div>
            <div className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100 flex-1">
              <div className="text-sm font-bold text-slate-900">{leaveBalance?.remaining?.annual ?? '—'}</div>
              <div className="text-[10px] text-slate-500 font-medium">Annual</div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('leaves')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 mt-3 inline-block"
          >
            Apply for Time Off →
          </button>
        </div>
      </div>

      {/* Grid: Last Payslip & Company Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Last Payslip Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Latest Finalized Payslip</h3>
            </div>
            {latestPayslip && (
              <button
                onClick={() => onNavigate('payroll')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                View Full Payslip →
              </button>
            )}
          </div>

          {!latestPayslip ? (
            <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs">
              <FileText className="w-8 h-8 text-slate-300 mb-2" />
              <span>No finalized payslips available yet for your account.</span>
              <span className="text-[11px] text-slate-400 mt-1">Payslips appear once payroll is finalized by Admin.</span>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Pay Period</span>
                <span className="font-bold text-slate-900">{latestPayslip.month}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Gross Earnings</span>
                <span className="font-semibold text-slate-900">PKR {latestPayslip.grossSalary.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Attendance Deductions</span>
                <span className="font-semibold text-rose-600">-PKR {latestPayslip.attendanceDeductions.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Income Tax Withholding</span>
                <span className="font-semibold text-rose-600">-PKR {latestPayslip.monthlyTax.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Net Take-Home Pay</span>
                <span className="text-sm font-extrabold text-emerald-600">PKR {latestPayslip.netPay.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Company Announcements */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Company Announcements</h3>
            </div>
            <button
              onClick={() => onNavigate('announcements')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              All Bulletins →
            </button>
          </div>

          {announcements.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400">
              No new organizational notices posted
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.slice(0, 3).map((ann) => (
                <div key={ann._id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">{ann.title}</span>
                    <span className="text-[10px] text-slate-400">{new Date(ann.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{ann.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
