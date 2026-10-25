import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import { ShieldAlert, RefreshCw, Search } from 'lucide-react';

export const AuditLogs = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const loadLogs = async (p = 1) => {
    try {
      setLoading(true);
      const res = await getAuditLogs(p, 50);
      if (res.success) {
        setLogs(res.logs);
        setTotal(res.total);
        setPage(res.page);
      }
    } catch (err) {
      addToast('Failed to load audit logs: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1);
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.entity?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">System Compliance & Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-500">
            Immutable log of administrative, HR, authentication, and payroll state changes.
          </p>
        </div>

        <button
          onClick={() => loadLogs(page)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Log
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter audit actions, email, or entities..."
          className="w-full text-xs outline-none bg-transparent"
        />
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading compliance records...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No matching audit records found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{log.userEmail || log.userId}</td>
                    <td className="py-2.5 px-4 font-semibold text-indigo-700">{log.userRole}</td>
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-900">{log.action}</td>
                    <td className="py-2.5 px-4">{log.entity}</td>
                    <td className="py-2.5 px-4 max-w-xs truncate text-[11px] text-slate-500 font-mono">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">{log.ip}</td>
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
