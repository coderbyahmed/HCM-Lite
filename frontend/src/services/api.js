const API_BASE = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

let authToken = (typeof window !== 'undefined' && window.localStorage) ? localStorage.getItem('hcm_token') : null;

export const setAuthToken = (token) => {
  authToken = token;
  if (typeof window !== 'undefined' && window.localStorage) {
    if (token) {
      localStorage.setItem('hcm_token', token);
    } else {
      localStorage.removeItem('hcm_token');
    }
  }
};

export const getAuthToken = () => authToken;

export const apiRequest = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const config = {
    ...options,
    credentials: options.credentials || 'include',
    headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 204) {
    return null;
  }

  // Handle business file downloads.
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) {
    if (!response.ok) {
      throw new ApiError('File download failed', response.status, null);
    }
    return response.blob();
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(json.message || `Request failed with status ${response.status}`, response.status, json);
  }

  return json;
};

// --- AUTH APIS ---
export const checkSetupStatus = () => apiRequest('/auth/setup/status');
export const setupFirstRun = (data) => apiRequest('/auth/setup/first-run', { method: 'POST', body: JSON.stringify(data) });
export const login = (email, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const logout = () => apiRequest('/auth/logout', { method: 'POST' });
export const getMe = () => apiRequest('/auth/me');
export const changePassword = (oldPassword, newPassword) => apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) });
export const listUsers = () => apiRequest('/auth/users');
export const createHR = (data) => apiRequest('/auth/users/hr', { method: 'POST', body: JSON.stringify(data) });
export const toggleUserStatus = (userId) => apiRequest(`/auth/users/${userId}/toggle-status`, { method: 'PATCH' });

// --- ORGANIZATION APIS ---
export const getCompanyProfile = () => apiRequest('/organization/profile');
export const updateCompanySettings = (settings) => apiRequest('/organization/settings', { method: 'PATCH', body: JSON.stringify(settings) });
export const getDepartments = () => apiRequest('/organization/departments');
export const createDepartment = (data) => apiRequest('/organization/departments', { method: 'POST', body: JSON.stringify(data) });
export const getDesignations = () => apiRequest('/organization/designations');
export const createDesignation = (data) => apiRequest('/organization/designations', { method: 'POST', body: JSON.stringify(data) });

// --- EMPLOYEE APIS ---
export const getEmployees = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/employees?${query}`);
};
export const getEmployee360 = (id) => apiRequest(`/employees/${id}`);
export const createEmployee = (data) => apiRequest('/employees', { method: 'POST', body: JSON.stringify(data) });
export const updateEmployee = (id, data) => apiRequest(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const registerEmployeeFace = (id, descriptors, consentConfirmed) =>
  apiRequest(`/employees/${id}/face-template`, {
    method: 'POST',
    body: JSON.stringify({ descriptors, consentConfirmed }),
  });
export const updateEmployeeFace = (id, descriptors, consentConfirmed) =>
  apiRequest(`/employees/${id}/face-template`, {
    method: 'PUT',
    body: JSON.stringify({ descriptors, consentConfirmed }),
  });
export const deleteEmployeeFace = (id) =>
  apiRequest(`/employees/${id}/face-template`, { method: 'DELETE' });
export const dryRunCsv = (rows) => apiRequest('/employees/import/dry-run', { method: 'POST', body: JSON.stringify({ rows }) });
export const commitCsv = (validRows) => apiRequest('/employees/import/commit', { method: 'POST', body: JSON.stringify({ validRows }) });
export const exportEmployeesCsv = () => apiRequest('/employees/export/csv');

// --- ATTENDANCE APIS ---
export const checkIn = (data = {}) => apiRequest('/attendance/check-in', { method: 'POST', body: JSON.stringify(data) });
export const checkOut = (data = {}) =>
  apiRequest('/attendance/check-out', { method: 'POST', body: JSON.stringify(data) });
export const getDailyBoard = (date) => apiRequest(`/attendance/board?date=${date || ''}`);
export const getMyAttendance = (month) => apiRequest(`/attendance/my-records?month=${month || ''}`);
export const requestCorrection = (data) => apiRequest('/attendance/corrections', { method: 'POST', body: JSON.stringify(data) });
export const listCorrections = (status) => apiRequest(`/attendance/corrections?status=${status || ''}`);
export const reviewCorrection = (id, status, reviewComment) => apiRequest(`/attendance/corrections/${id}/review`, { method: 'PATCH', body: JSON.stringify({ status, reviewComment }) });

// --- LEAVE APIS ---
export const applyLeave = (data) => apiRequest('/leave/apply', { method: 'POST', body: JSON.stringify(data) });
export const cancelLeave = (id) => apiRequest(`/leave/${id}/cancel`, { method: 'PATCH' });
export const getMyLeaveBalance = () => apiRequest('/leave/my-balance');
export const calculateLeaveDaysPreview = (startDate, endDate) => apiRequest(`/leave/calculate-days?startDate=${startDate}&endDate=${endDate}`);
export const listLeaves = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/leave?${query}`);
};
export const reviewLeave = (id, status, reviewComment) => apiRequest(`/leave/${id}/review`, { method: 'PATCH', body: JSON.stringify({ status, reviewComment }) });

// --- PAYROLL APIS ---
export const generatePayrollDraft = (month) => apiRequest('/payroll/generate-draft', { method: 'POST', body: JSON.stringify({ month }) });
export const finalizePayroll = (id) => apiRequest(`/payroll/${id}/finalize`, { method: 'PATCH' });
export const listPayrolls = () => apiRequest('/payroll');
export const getPayrollById = (id) => apiRequest(`/payroll/${id}`);
export const getPayslip = (payrollId, employeeId) => apiRequest(`/payroll/${payrollId}/payslips/${employeeId}`);

// --- ANALYTICS APIS ---
export const getAdminMetrics = () => apiRequest('/analytics/admin');
export const getHrMetrics = () => apiRequest('/analytics/hr');
export const getHrDashboardData = getHrMetrics;
export const getEmployeeMetrics = () => apiRequest('/analytics/employee');
export const getAuditLogs = (page = 1, limit = 50) => apiRequest(`/analytics/audits?page=${page}&limit=${limit}`);

// --- AI ASSISTANT APIS ---
export const sendAiChat = (message, chatHistory = []) => apiRequest('/ai/chat', { method: 'POST', body: JSON.stringify({ message, chatHistory }) });
export const getExecutiveSummary = () => apiRequest('/ai/executive-summary');

// --- COMMUNICATIONS & EXPORT APIS ---
export const getAnnouncements = () => apiRequest('/communication/announcements');
export const createAnnouncement = (data) => apiRequest('/communication/announcements', { method: 'POST', body: JSON.stringify(data) });
export const getNotifications = () => apiRequest('/communication/notifications');
