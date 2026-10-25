import React, { useState, useEffect } from 'react';
import { PasswordInput } from '../../components/PasswordInput.jsx';
import {
  getCompanyProfile,
  updateCompanySettings,
  getDepartments,
  createDepartment,
  getDesignations,
  createDesignation,
  listUsers,
  createHR,
  toggleUserStatus,
} from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import {
  Building2,
  Clock,
  MapPin,
  CalendarDays,
  Plus,
  ShieldCheck,
  UserPlus,
  Check,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export const OrganizationSettings = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [users, setUsers] = useState([]);

  // Modals
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  const [showDesModal, setShowDesModal] = useState(false);
  const [newDesTitle, setNewDesTitle] = useState('');
  const [newDesDeptId, setNewDesDeptId] = useState('');

  const [showHrModal, setShowHrModal] = useState(false);
  const [hrName, setHrName] = useState('');
  const [hrEmail, setHrEmail] = useState('');
  const [hrPassword, setHrPassword] = useState('');

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    officeStartTime: '09:00',
    gracePeriodMinutes: 15,
    workingHoursPerDay: 9,
    halfDayThresholdHours: 5,
    weekends: ['Saturday', 'Sunday'],
    latitude: 24.8607,
    longitude: 67.0011,
    radiusMeters: 200,
  });

  const loadAll = async () => {
    try {
      setLoading(true);
      const [compRes, deptRes, desRes, userRes] = await Promise.all([
        getCompanyProfile(),
        getDepartments(),
        getDesignations(),
        listUsers(),
      ]);

      if (compRes?.company) {
        setCompany(compRes.company);
        const s = compRes.company.settings || {};
        setSettingsForm({
          officeStartTime: s.officeStartTime || '09:00',
          gracePeriodMinutes: s.gracePeriodMinutes ?? 15,
          workingHoursPerDay: s.workingHoursPerDay ?? 9,
          halfDayThresholdHours: s.halfDayThresholdHours ?? 5,
          weekends: s.weekends || ['Saturday', 'Sunday'],
          latitude: s.geofence?.latitude ?? 24.8607,
          longitude: s.geofence?.longitude ?? 67.0011,
          radiusMeters: s.geofence?.radiusMeters ?? 200,
        });
      }
      if (deptRes?.departments) setDepartments(deptRes.departments);
      if (desRes?.designations) setDesignations(desRes.designations);
      if (userRes?.users) setUsers(userRes.users);
    } catch (err) {
      addToast('Failed to load organization settings: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        officeStartTime: settingsForm.officeStartTime,
        gracePeriodMinutes: parseInt(settingsForm.gracePeriodMinutes, 10),
        workingHoursPerDay: parseInt(settingsForm.workingHoursPerDay, 10),
        halfDayThresholdHours: parseInt(settingsForm.halfDayThresholdHours, 10),
        weekends: settingsForm.weekends,
        geofence: {
          latitude: parseFloat(settingsForm.latitude),
          longitude: parseFloat(settingsForm.longitude),
          radiusMeters: parseInt(settingsForm.radiusMeters, 10),
        },
      };

      await updateCompanySettings(payload);
      addToast('Company operational settings saved successfully.', 'success');
      loadAll();
    } catch (err) {
      addToast(err.message || 'Failed to update settings', 'error');
    }
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      await createDepartment({ name: newDeptName, description: newDeptDesc });
      addToast('Department created.', 'success');
      setShowDeptModal(false);
      setNewDeptName('');
      setNewDeptDesc('');
      loadAll();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleCreateDes = async (e) => {
    e.preventDefault();
    try {
      await createDesignation({ title: newDesTitle, departmentId: newDesDeptId || null });
      addToast('Designation created.', 'success');
      setShowDesModal(false);
      setNewDesTitle('');
      setNewDesDeptId('');
      loadAll();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleCreateHR = async (e) => {
    e.preventDefault();
    try {
      await createHR({ name: hrName, email: hrEmail, password: hrPassword });
      addToast('HR account successfully provisioned.', 'success');
      setShowHrModal(false);
      setHrName('');
      setHrEmail('');
      setHrPassword('');
      loadAll();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleToggleUser = async (userId) => {
    try {
      await toggleUserStatus(userId);
      addToast('User status updated.', 'success');
      loadAll();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Organization Profile & Governance</h2>
        <p className="text-xs text-slate-500">
          Configure work schedules, geofences, departments, designations, and administrative logins.
        </p>
      </div>

      {/* Operational Settings Form */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <Clock className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Attendance Policies & Work Schedule</h3>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Office Start Time</label>
              <input
                type="time"
                value={settingsForm.officeStartTime}
                onChange={(e) => setSettingsForm({ ...settingsForm, officeStartTime: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Grace Period (Minutes)</label>
              <input
                type="number"
                min="0"
                max="60"
                value={settingsForm.gracePeriodMinutes}
                onChange={(e) => setSettingsForm({ ...settingsForm, gracePeriodMinutes: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Daily Work Hours</label>
              <input
                type="number"
                min="4"
                max="14"
                value={settingsForm.workingHoursPerDay}
                onChange={(e) => setSettingsForm({ ...settingsForm, workingHoursPerDay: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Half-Day Threshold (Hrs)</label>
              <input
                type="number"
                min="1"
                max="8"
                value={settingsForm.halfDayThresholdHours}
                onChange={(e) => setSettingsForm({ ...settingsForm, halfDayThresholdHours: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-900">Geofence Coordinates & Radius</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={settingsForm.latitude}
                  onChange={(e) => setSettingsForm({ ...settingsForm, latitude: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={settingsForm.longitude}
                  onChange={(e) => setSettingsForm({ ...settingsForm, longitude: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Radius (Meters)</label>
                <input
                  type="number"
                  value={settingsForm.radiusMeters}
                  onChange={(e) => setSettingsForm({ ...settingsForm, radiusMeters: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs"
            >
              <Check className="w-4 h-4" />
              Save Operational Policies
            </button>
          </div>
        </form>
      </div>

      {/* Grid: Departments and Designations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Departments */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Departments</h3>
              <p className="text-xs text-slate-500">{departments.length} units configured</p>
            </div>
            <button
              onClick={() => setShowDeptModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Dept
            </button>
          </div>
          <div className="space-y-2">
            {departments.map((d) => (
              <div key={d._id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">{d.name}</div>
                  <div className="text-[11px] text-slate-500">{d.description || 'General department'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Designations */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Job Designations</h3>
              <p className="text-xs text-slate-500">{designations.length} roles established</p>
            </div>
            <button
              onClick={() => setShowDesModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Designation
            </button>
          </div>
          <div className="space-y-2">
            {designations.map((des) => (
              <div key={des._id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-900">{des.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Authorized Users & HR Management */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">System Logins & HR Officer Accounts</h3>
            <p className="text-xs text-slate-500">Manage login credentials and activate/deactivate accounts</p>
          </div>
          <button
            onClick={() => setShowHrModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Provision HR Account
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-y border-slate-200/60 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{u.name}</td>
                  <td className="py-2.5 px-3">{u.email}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-indigo-700">{u.role}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {u.role !== 'Admin' && (
                      <button
                        onClick={() => handleToggleUser(u._id)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                          u.status === 'active'
                            ? 'text-rose-600 hover:bg-rose-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {u.status === 'active' ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Add Department</h3>
            <form onSubmit={handleCreateDept} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="e.g. Operations"
                  className="w-full px-3 py-2 text-xs rounded-xl border focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  placeholder="Optional brief description"
                  className="w-full px-3 py-2 text-xs rounded-xl border focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Designation Modal */}
      {showDesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Add Designation</h3>
            <form onSubmit={handleCreateDes} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newDesTitle}
                  onChange={(e) => setNewDesTitle(e.target.value)}
                  placeholder="e.g. Project Manager"
                  className="w-full px-3 py-2 text-xs rounded-xl border focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={newDesDeptId}
                  onChange={(e) => setNewDesDeptId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDesModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HR Provisioning Modal */}
      {showHrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Provision HR Login Account</h3>
            <p className="text-xs text-slate-500 mb-4">
              HR users can register employees, review leave requests, and manage payroll drafts.
            </p>
            <form onSubmit={handleCreateHR} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">HR Officer Full Name</label>
                <input
                  type="text"
                  required
                  value={hrName}
                  onChange={(e) => setHrName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full px-3 py-2 text-xs rounded-xl border focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">HR Email Address</label>
                <input
                  type="email"
                  required
                  value={hrEmail}
                  onChange={(e) => setHrEmail(e.target.value)}
                  placeholder="hr@company.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Temporary Password</label>
                <PasswordInput
                  required
                  minLength={8}
                  value={hrPassword}
                  onChange={(e) => setHrPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full px-3 py-2 text-xs rounded-xl border focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHrModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                >
                  Provision Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
