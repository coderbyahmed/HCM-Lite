import React, { useEffect, useState } from 'react';
import { getHrDashboardData } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import {
  Users,
  UserCheck,
  Clock,
  CalendarDays,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899'];

export const HrDashboard = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await getHrDashboardData();
      if (res.success) {
        setData(res);
      } else {
        throw new Error('HR analytics response was incomplete.');
      }
    } catch (err) {
      setLoadError(err.message || 'HR analytics could not be loaded.');
      addToast('Failed to load HR metrics: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading HR metrics...</div>;
  }

  if (loadError || !data) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white border border-rose-200">
        <p className="text-sm font-semibold text-rose-700">
          {loadError || 'HR analytics data is unavailable.'}
        </p>
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

  const kpis = data?.kpis || {};
  const leaveUtil = data?.leaveUtilization || {};
  const topLateComers = data?.topLateComers || [];

  const leaveChartData = [
    { name: 'Casual', value: leaveUtil.casual || 0 },
    { name: 'Sick', value: leaveUtil.sick || 0 },
    { name: 'Annual', value: leaveUtil.annual || 0 },
    { name: 'Unpaid', value: leaveUtil.unpaid || 0 },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Pending Action Alerts */}
      {kpis.pendingApprovals > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-950">
                Action Required: {kpis.pendingApprovals} Pending Requests
              </div>
              <div className="text-xs text-amber-800">
                {kpis.pendingLeaves || 0} leave applications and {kpis.pendingCorrections || 0} attendance correction requests awaiting review.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('leaves')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Review Leaves
            </button>
            <button
              onClick={() => onNavigate('attendance')}
              className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-semibold shadow-xs"
            >
              Review Corrections
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Active Staff</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{kpis.headcount || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Total registered workforce</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Present Today</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{kpis.presentToday || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">{kpis.lateToday || 0} marked late</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">On Leave Today</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{kpis.onLeaveToday || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Approved absences</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Pending Inbox</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{kpis.pendingApprovals || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Requires HR decision</div>
        </div>
      </div>

      {/* Grid: Leave Utilization & Top Late Comers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Utilization Chart */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Leave Utilization by Category</h3>
          <p className="text-xs text-slate-500 mb-4">Total approved leave days taken year-to-date</p>
          <div className="h-64 flex items-center justify-center">
            {leaveChartData.length === 0 ? (
              <div className="text-xs text-slate-400">No leaves utilized yet this period</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leaveChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {leaveChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Late-Comers */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Top Late Arrivals (Current Month)</h3>
          <p className="text-xs text-slate-500 mb-4">Frequent late-check-in employees</p>
          {topLateComers.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400">
              Excellent attendance! No repeat late check-ins recorded this month.
            </div>
          ) : (
            <div className="space-y-3">
              {topLateComers.map((item, idx) => (
                <div
                  key={item.employeeId}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">{item.employeeName}</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    {item.lateCount} Days Late
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
