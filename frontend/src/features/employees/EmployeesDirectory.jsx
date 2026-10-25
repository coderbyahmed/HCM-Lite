import React, { useState, useEffect } from 'react';
import {
  getEmployees,
  createEmployee,
  getEmployee360,
  registerEmployeeFace,
  updateEmployeeFace,
  deleteEmployeeFace,
  getDepartments,
  getDesignations,
} from '../../services/api.js';
import { useAuth } from '../../app/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import {
  Users,
  Search,
  Plus,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Building2,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Copy,
  ScanFace,
  Trash2,
} from 'lucide-react';
import { FaceCaptureModal } from '../../components/FaceCaptureModal.jsx';

export const EmployeesDirectory = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [faceEmployee, setFaceEmployee] = useState(null);
  const [isFaceReenrollment, setIsFaceReenrollment] = useState(false);

  // New Employee Form
  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    gender: 'Male',
    departmentId: '',
    designationId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    employmentStatus: 'Active',
    basicSalary: 60000,
  });

  const fetchDirectory = async (page = 1) => {
    try {
      setLoading(true);
      const res = await getEmployees({
        page,
        limit: 10,
        search,
        departmentId,
        status,
      });
      if (res.success) {
        setEmployees(res.employees);
        setPagination({
          page: res.page,
          totalPages: res.totalPages,
          total: res.total,
        });
      }
    } catch (err) {
      addToast('Error loading directory: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMeta = async () => {
    try {
      const [deptRes, desRes] = await Promise.all([getDepartments(), getDesignations()]);
      if (deptRes?.departments) setDepartments(deptRes.departments);
      if (desRes?.designations) setDesignations(desRes.designations);
    } catch (e) {
      console.warn('Meta loading error:', e);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    fetchDirectory(1);
  }, [search, departmentId, status]);

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      const res = await createEmployee(addForm);
      addToast('Employee registered successfully!', 'success');
      setCreatedCredentials(res.data.loginCredentials);
      setShowAddModal(false);
      setAddForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        gender: 'Male',
        departmentId: '',
        designationId: '',
        joiningDate: new Date().toISOString().split('T')[0],
        employmentStatus: 'Active',
        basicSalary: 60000,
      });
      fetchDirectory(pagination.page);
    } catch (err) {
      addToast(err.message || 'Failed to create employee', 'error');
    }
  };

  const handleOpen360 = async (id) => {
    try {
      const res = await getEmployee360(id);
      if (res.success) {
        setProfileData(res);
        setShowProfileDrawer(true);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load employee 360 profile', 'error');
    }
  };

  const handleFaceTemplateSave = async ({ descriptors, consentConfirmed }) => {
    const saveFace = isFaceReenrollment ? updateEmployeeFace : registerEmployeeFace;
    await saveFace(faceEmployee._id, descriptors, consentConfirmed);
    addToast(
      isFaceReenrollment ? 'Employee face template re-enrolled.' : 'Employee face registered.',
      'success'
    );
    setFaceEmployee(null);
    fetchDirectory(pagination.page);
  };

  const handleDeleteFaceTemplate = async (emp) => {
    if (!window.confirm(`Delete the registered face template for ${emp.firstName} ${emp.lastName}?`)) {
      return;
    }
    try {
      await deleteEmployeeFace(emp._id);
      addToast('Employee face template deleted.', 'success');
      fetchDirectory(pagination.page);
    } catch (err) {
      addToast(err.message || 'Could not delete face template.', 'error');
    }
  };

  // Salary calculations preview for Add Form
  const previewBasic = Number(addForm.basicSalary) || 0;
  const previewHra = Math.round(previewBasic * 0.4);
  const previewMedical = Math.round(previewBasic * 0.1);
  const previewGross = Math.round(previewBasic * 1.5);

  const canManage = user?.role === 'Admin' || user?.role === 'HR';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Personnel & Employee Directory</h2>
          <p className="text-xs text-slate-500">
            Search, filter, and manage employee records.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee name, code, email..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Probation">On Probation</option>
            <option value="Resigned">Resigned</option>
            <option value="Terminated">Terminated</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joined Date</th>
                {canManage && <th className="py-3 px-4 text-right">Gross Salary</th>}
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading personnel records...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No employee records found matching current criteria
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {emp.employeeCode} · {emp.email}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{emp.departmentName}</div>
                      <div className="text-[11px] text-slate-500">{emp.designationTitle}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          emp.employmentStatus === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : emp.employmentStatus === 'On Probation'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {emp.employmentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{emp.joiningDate}</td>
                    {canManage && (
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                        PKR {(emp.salaryStructure?.grossSalary || 0).toLocaleString()}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {canManage && (
                          <span
                            className={`hidden xl:inline px-2 py-1 rounded-full text-[10px] font-semibold ${
                              emp.faceRegistered
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {emp.faceRegistered ? 'Face registered' : 'No face template'}
                          </span>
                        )}
                        <button
                          onClick={() => handleOpen360(emp._id)}
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View 360 Profile"
                          aria-label={`View ${emp.firstName} ${emp.lastName} profile`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => {
                                setFaceEmployee(emp);
                                setIsFaceReenrollment(Boolean(emp.faceRegistered));
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50 rounded-lg whitespace-nowrap"
                              title={emp.faceRegistered ? 'Explicitly re-enroll face' : 'Register face with consent'}
                            >
                              <ScanFace className="w-4 h-4" />
                              <span>{emp.faceRegistered ? 'Re-enroll' : 'Register face'}</span>
                            </button>
                            {emp.faceRegistered && (
                              <button
                                onClick={() => handleDeleteFaceTemplate(emp)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                                title="Delete face template"
                                aria-label={`Delete ${emp.firstName} ${emp.lastName}'s face template`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {employees.length} of {pagination.total} personnel
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchDirectory(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 rounded-lg border bg-white disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchDirectory(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-2.5 py-1 rounded-lg border bg-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Newly Created Temporary Credentials Dialog */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border shadow-2xl animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Employee Login Account Created</h3>
            <p className="text-xs text-slate-500 mt-1">
              Share these initial credentials securely with the employee. They will be forced to change this temporary password upon first sign-in.
            </p>
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs space-y-1">
              <div>
                Email: <span className="font-bold text-slate-900">{createdCredentials.email}</span>
              </div>
              <div>
                Temp Password:{' '}
                <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                  {createdCredentials.temporaryPassword}
                </span>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Register New Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={addForm.firstName}
                    onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={addForm.lastName}
                    onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Email</label>
                  <input
                    type="email"
                    required
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="+92 300 1234567"
                    className="w-full px-3 py-2 text-xs rounded-xl border focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={addForm.departmentId}
                    onChange={(e) => setAddForm({ ...addForm, departmentId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                  <select
                    value={addForm.designationId}
                    onChange={(e) => setAddForm({ ...addForm, designationId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Designation</option>
                    {designations.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    required
                    value={addForm.joiningDate}
                    onChange={(e) => setAddForm({ ...addForm, joiningDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Status</label>
                  <select
                    value={addForm.employmentStatus}
                    onChange={(e) => setAddForm({ ...addForm, employmentStatus: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Active">Active</option>
                    <option value="On Probation">On Probation</option>
                    <option value="Resigned">Resigned</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>
              </div>

              {/* Salary Structure Formula Preview */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-900">Salary Structure Calculation</span>
                  <span className="text-[10px] font-semibold text-indigo-600">Standard Formula</span>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Basic Salary (PKR)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={addForm.basicSalary}
                    onChange={(e) => setAddForm({ ...addForm, basicSalary: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                  <div className="p-2 rounded-xl bg-white border border-indigo-100">
                    <div className="text-[10px] text-slate-500">HRA (40%)</div>
                    <div className="font-bold text-slate-900">PKR {previewHra.toLocaleString()}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-indigo-100">
                    <div className="text-[10px] text-slate-500">Medical (10%)</div>
                    <div className="font-bold text-slate-900">PKR {previewMedical.toLocaleString()}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-indigo-100">
                    <div className="text-[10px] text-indigo-600 font-semibold">Gross (1.5×)</div>
                    <div className="font-bold text-indigo-700">PKR {previewGross.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Register & Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee 360 Profile Drawer */}
      {showProfileDrawer && profileData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full p-6 sm:p-8 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {profileData.employee.firstName} {profileData.employee.lastName}
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  {profileData.employee.employeeCode} · {profileData.employee.email}
                </span>
              </div>
              <button onClick={() => setShowProfileDrawer(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 text-xs">
              {/* Job & Compensation */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <h4 className="font-bold text-slate-900 mb-2">Job Details & Salary</h4>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>Department: <span className="font-semibold text-slate-900">{profileData.department?.name || 'Unassigned'}</span></div>
                  <div>Designation: <span className="font-semibold text-slate-900">{profileData.designation?.title || 'Unassigned'}</span></div>
                  <div>Joining Date: <span className="font-semibold text-slate-900">{profileData.employee.joiningDate}</span></div>
                  <div>Status: <span className="font-semibold text-slate-900">{profileData.employee.employmentStatus}</span></div>
                </div>
                {canManage && (
                  <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2">
                    <div>Basic Salary: <span className="font-bold text-slate-900">PKR {profileData.employee.salaryStructure?.basicSalary?.toLocaleString()}</span></div>
                    <div>Gross Salary: <span className="font-bold text-indigo-600">PKR {profileData.employee.salaryStructure?.grossSalary?.toLocaleString()}</span></div>
                  </div>
                )}

                {faceEmployee && (
                  <FaceCaptureModal
                    mode="enroll"
                    employeeName={`${faceEmployee.firstName} ${faceEmployee.lastName}`}
                    onCancel={() => setFaceEmployee(null)}
                    onSubmit={handleFaceTemplateSave}
                  />
                )}
              </div>

              {/* Recent Attendance (30 records) */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Recent Attendance Activity</h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">In</th>
                        <th className="p-2">Out</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(profileData.recentAttendance || []).map((att) => (
                        <tr key={att._id}>
                          <td className="p-2 font-mono">{att.date}</td>
                          <td className="p-2">{att.checkInTime || '-'}</td>
                          <td className="p-2">{att.checkOutTime || '-'}</td>
                          <td className="p-2 capitalize font-semibold">{att.status.replace('_', ' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Leave History */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Leave Request History</h4>
                <div className="space-y-2">
                  {(profileData.leaveHistory || []).map((l) => (
                    <div key={l._id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div>
                        <div className="font-bold capitalize">{l.leaveType} Leave ({l.daysCount} days)</div>
                        <div className="text-[11px] text-slate-500">{l.startDate} to {l.endDate} · {l.reason}</div>
                      </div>
                      <span className="font-semibold capitalize text-indigo-600">{l.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
