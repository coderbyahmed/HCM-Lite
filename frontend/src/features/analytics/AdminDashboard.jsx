import React, { useEffect, useState } from 'react';
import { getAdminMetrics, getExecutiveSummary } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import {
  Users,
  UserCheck,
  Clock,
  CalendarDays,
  DollarSign,
  TrendingDown,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export const AdminDashboard = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await getAdminMetrics();
      if (res.success) {
        setData(res);
      } else {
        throw new Error('Analytics response was incomplete.');
      }
    } catch (err) {
      setLoadError(err.message || 'Analytics could not be loaded.');
      addToast('Failed to load admin analytics: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAiSummary = async () => {
    try {
      setAiLoading(true);
      const res = await getExecutiveSummary();
      if (res.success) {
        setAiSummary(res.summary);
      }
    } catch (e) {
      setAiSummary(`Executive briefing unavailable: ${e.message || 'service error'}`);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    loadAiSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-xs text-slate-400">
        Loading organizational intelligence...
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white border border-rose-200">
        <p className="text-sm font-semibold text-rose-700">
          {loadError || 'Analytics data is unavailable.'}
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

  const kpis = data?.kpis || {};
  const headcountByDept = data?.headcountByDept || [];
  const payrollCostByDept = data?.payrollCostByDept || [];
  const recentAudit = data?.recentAudit || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / AI Executive Briefing */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-md border border-indigo-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            <Sparkles className="w-5 h-5 text-indigo-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">Executive AI Operational Briefing</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-400/20 text-indigo-200 border border-indigo-300/20">
                Live Analysis
              </span>
            </div>
            <p className="text-xs text-indigo-100/90 mt-1 max-w-2xl leading-relaxed">
              {aiLoading ? 'Generating intelligence briefing with Gemini...' : aiSummary || 'Executive briefing unavailable. Live business metrics are shown below.'}
            </p>
          </div>
        </div>
        <button
          onClick={loadAiSummary}
          disabled={aiLoading}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/20 transition-colors"
        >
          {aiLoading ? 'Refreshing...' : 'Regenerate Brief'}
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Total Personnel</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{kpis.headcount || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Active workforce headcount</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Present Today</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{kpis.presentToday || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {kpis.lateToday || 0} late arrivals recorded
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">On Approved Leave</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{kpis.onLeaveToday || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Employees out of office</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Latest Finalized Payroll (Net)</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {kpis.totalPayrollCost === null
              ? 'No finalized payroll'
              : `PKR ${kpis.totalPayrollCost.toLocaleString()}`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {kpis.latestPayrollMonth
              ? `${kpis.latestPayrollMonth} · Avg gross salary: PKR ${kpis.averageSalary?.toLocaleString() || '—'}`
              : `Average current gross salary: PKR ${kpis.averageSalary?.toLocaleString() || '—'}`}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headcount by Department */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Headcount by Department</h3>
              <p className="text-xs text-slate-500">Active employee distribution</p>
            </div>
          </div>
          <div className="h-64">
            {headcountByDept.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No department records registered
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={headcountByDept} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="departmentName" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payroll Cost by Department */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Payroll Expenditure by Department</h3>
              <p className="text-xs text-slate-500">Monthly gross allocation in PKR</p>
            </div>
          </div>
          <div className="h-64">
            {payrollCostByDept.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No payroll items recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payrollCostByDept} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <XAxis dataKey="departmentName" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip
                    formatter={(val) => [`PKR ${Number(val).toLocaleString()}`, 'Cost']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="cost" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Audit Log Feed */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Recent Immutable Audit Activity</h3>
          </div>
          <button
            onClick={() => onNavigate('audit')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            View Full Audit Trail →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-200/60">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor / Role</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Entity</th>
                <th className="py-2.5 px-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentAudit.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No recent audit events logged
                  </td>
                </tr>
              ) : (
                recentAudit.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900">
                      {log.userEmail || log.userId} ({log.userRole})
                    </td>
                    <td className="py-2 px-3 font-mono font-medium text-indigo-600">
                      {log.action}
                    </td>
                    <td className="py-2 px-3">{log.entity}</td>
                    <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{log.ip}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
