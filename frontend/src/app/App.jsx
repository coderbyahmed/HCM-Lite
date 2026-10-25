import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import { ToastProvider } from '../components/Toast.jsx';
import { FirstRunSetup } from '../features/setup/FirstRunSetup.jsx';
import { Login } from '../features/auth/Login.jsx';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';

import { AdminDashboard } from '../features/analytics/AdminDashboard.jsx';
import { HrDashboard } from '../features/analytics/HrDashboard.jsx';
import { EmployeeDashboard } from '../features/analytics/EmployeeDashboard.jsx';
import { OrganizationSettings } from '../features/organization/OrganizationSettings.jsx';
import { EmployeesDirectory } from '../features/employees/EmployeesDirectory.jsx';
import { AttendanceBoard } from '../features/attendance/AttendanceBoard.jsx';
import { LeaveManagement } from '../features/leave/LeaveManagement.jsx';
import { PayrollManagement } from '../features/payroll/PayrollManagement.jsx';
import { AiCopilot } from '../features/ai-assistant/AiCopilot.jsx';
import { Announcements } from '../features/communications/Announcements.jsx';
import { AuditLogs } from '../features/audit/AuditLogs.jsx';
import { EmployeeProfile } from '../features/profile/EmployeeProfile.jsx';

function MainApp() {
  const { user, isFirstRun, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100 gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 animate-spin flex items-center justify-center font-bold">
          H
        </div>
        <div className="text-xs font-semibold text-slate-400">Initializing HCM Lite...</div>
      </div>
    );
  }

  // 1. First-Run Setup flow
  if (isFirstRun) {
    return <FirstRunSetup />;
  }

  // 2. Unauthenticated user -> Login
  if (!user) {
    return <Login />;
  }

  // 3. Authenticated workspace layout
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        if (user.role === 'Admin') return <AdminDashboard onNavigate={setCurrentTab} />;
        if (user.role === 'HR') return <HrDashboard onNavigate={setCurrentTab} />;
        return <EmployeeDashboard onNavigate={setCurrentTab} />;

      case 'organization':
        return user.role === 'Admin' ? (
          <OrganizationSettings />
        ) : (
          <AdminDashboard onNavigate={setCurrentTab} />
        );

      case 'employees':
        return <EmployeesDirectory />;

      case 'attendance':
        return <AttendanceBoard />;

      case 'leaves':
        return <LeaveManagement />;

      case 'payroll':
        return <PayrollManagement />;

      case 'announcements':
        return <Announcements />;

      case 'audit':
        return user.role === 'Admin' ? <AuditLogs /> : <AdminDashboard onNavigate={setCurrentTab} />;

      case 'profile':
        return <EmployeeProfile />;

      case 'ai':
        return <AiCopilot />;

      default:
        return <AdminDashboard onNavigate={setCurrentTab} />;
    }
  };

  return (
    <DashboardLayout currentTab={currentTab} setCurrentTab={setCurrentTab}>
      {renderTabContent()}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
