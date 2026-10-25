import React, { useState } from 'react';
import { useAuth } from '../app/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { PasswordInput } from '../components/PasswordInput.jsx';
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  Sparkles,
  Megaphone,
  ShieldAlert,
  LogOut,
  KeyRound,
  Bell,
  Clock,
  Menu,
  X,
  UserCheck,
} from 'lucide-react';
import { changePassword } from '../services/api.js';

export const DashboardLayout = ({ currentTab, setCurrentTab, children }) => {
  const { user, employee, company, logout, refreshUser } = useAuth();
  const { addToast } = useToast();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(user?.mustChangePassword || false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Password form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passSubmitting, setPassSubmitting] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('New password and confirmation do not match.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      addToast('Password must be at least 8 characters long.', 'error');
      return;
    }

    setPassSubmitting(true);
    try {
      await changePassword(oldPassword, newPassword);
      addToast('Password updated successfully.', 'success');
      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      refreshUser();
    } catch (err) {
      addToast(err.message || 'Failed to change password', 'error');
    } finally {
      setPassSubmitting(false);
    }
  };

  // Role-scoped navigation menu items
  const getNavItems = () => {
    if (user.role === 'Admin') {
      return [
        { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
        { id: 'organization', label: 'Organization Settings', icon: Building2 },
        { id: 'employees', label: 'Employees Directory', icon: Users },
        { id: 'attendance', label: 'Attendance Board', icon: CalendarCheck },
        { id: 'leaves', label: 'Leave Approvals', icon: CalendarDays },
        { id: 'payroll', label: 'Payroll & Tax Slabs', icon: CreditCard },
        { id: 'announcements', label: 'Announcements', icon: Megaphone },
        { id: 'audit', label: 'Audit Logs', icon: ShieldAlert },
        { id: 'ai', label: 'AI Executive Copilot', icon: Sparkles },
      ];
    } else if (user.role === 'HR') {
      return [
        { id: 'dashboard', label: 'HR Dashboard', icon: LayoutDashboard },
        { id: 'employees', label: 'Employees Directory', icon: Users },
        { id: 'attendance', label: 'Daily Board & Corrections', icon: CalendarCheck },
        { id: 'leaves', label: 'Leave Review Inbox', icon: CalendarDays },
        { id: 'payroll', label: 'Payroll Drafts & Review', icon: CreditCard },
        { id: 'announcements', label: 'Announcements', icon: Megaphone },
        { id: 'ai', label: 'HR AI Assistant', icon: Sparkles },
      ];
    } else {
      // Employee
      return [
        { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
        { id: 'attendance', label: 'Attendance & Check-in', icon: CalendarCheck },
        { id: 'leaves', label: 'Apply / My Leaves', icon: CalendarDays },
        { id: 'payroll', label: 'My Payslips', icon: CreditCard },
        { id: 'profile', label: 'My Profile & Details', icon: UserCheck },
        { id: 'announcements', label: 'Company Announcements', icon: Megaphone },
        { id: 'ai', label: 'Employee AI Copilot', icon: Sparkles },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold tracking-tight shadow-sm shadow-indigo-200">
                H
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 tracking-tight text-base">HCM Lite</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {user?.role}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium truncate max-w-[180px] sm:max-w-xs">
                  {company?.name || 'Enterprise'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* AI Assistant Quick Trigger */}
            <button
              onClick={() => setCurrentTab('ai')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-xs ${
                currentTab === 'ai'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Copilot</span>
            </button>

            {/* User Dropdown / Controls */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                title="Change Password"
              >
                <KeyRound className="w-4 h-4" />
              </button>
              <button
                onClick={logout}
                className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <nav className="sticky top-24 space-y-1.5 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs flex">
            <div className="w-72 bg-white h-full p-4 flex flex-col justify-between shadow-xl animate-in slide-in-from-left duration-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="font-bold text-slate-900">HCM Lite Menu</div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 p-2.5 text-xs font-semibold text-rose-600 bg-rose-50 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Dynamic Content Pane */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Forced / Optional Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {user?.mustChangePassword ? 'First-Login Password Reset' : 'Change Password'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {user?.mustChangePassword
                      ? 'You are using a temporary password. You must set a personal secure password before proceeding.'
                      : 'Update your login credentials securely.'}
                  </p>
                </div>
              </div>
              {!user?.mustChangePassword && (
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                <PasswordInput
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (Min 8 chars)</label>
                <PasswordInput
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <PasswordInput
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                {!user?.mustChangePassword && (
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={passSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50"
                >
                  {passSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
