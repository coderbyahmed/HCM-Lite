import React, { useState } from 'react';
import { PasswordInput } from '../../components/PasswordInput.jsx';
import { setupFirstRun } from '../../services/api.js';
import { useAuth } from '../../app/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Building2, ShieldCheck, Clock, MapPin, CalendarDays, ArrowRight, Check } from 'lucide-react';

export const FirstRunSetup = () => {
  const { login } = useAuth();
  const { addToast } = useToast();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    officeStartTime: '09:00',
    gracePeriodMinutes: 15,
    workingHoursPerDay: 9,
    halfDayThresholdHours: 5,
    weekends: ['Saturday', 'Sunday'],
    latitude: 24.8607,
    longitude: 67.0011,
    radiusMeters: 200,
    leaveQuotas: {
      casual: 10,
      sick: 8,
      annual: 14,
      unpaid: 999,
    },
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLeaveQuotaChange = (type, val) => {
    setFormData((prev) => ({
      ...prev,
      leaveQuotas: {
        ...prev.leaveQuotas,
        [type]: parseInt(val, 10) || 0,
      },
    }));
  };

  const toggleWeekend = (day) => {
    setFormData((prev) => {
      const exists = prev.weekends.includes(day);
      return {
        ...prev,
        weekends: exists ? prev.weekends.filter((d) => d !== day) : [...prev.weekends, day],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await setupFirstRun(formData);
      addToast('First-run setup completed! Signing in as Administrator...', 'success');
      // Automatic login
      await login(formData.adminEmail, formData.adminPassword);
    } catch (err) {
      addToast(err.message || 'Setup failed. Please check form parameters.', 'error');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 antialiased text-slate-100">
      <div className="max-w-2xl w-full bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30">
            H
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              HCM Lite System Initialization
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Fresh installation detected. Configure your organization settings and initial root Administrator.
            </p>
          </div>
        </div>

        {/* Stepper Tabs */}
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-4 mb-6">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              step === 1 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            1. Company & Admin
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              step === 2 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            2. Attendance & Geofence
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              step === 3 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            3. Leave Rules
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Organization Name</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Admin Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.adminName}
                    onChange={(e) => handleChange('adminName', e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.adminEmail}
                    onChange={(e) => handleChange('adminEmail', e.target.value)}
                    placeholder="admin@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Password</label>
                  <PasswordInput
                    required
                    minLength={8}
                    value={formData.adminPassword}
                    onChange={(e) => handleChange('adminPassword', e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/30"
                >
                  Continue to Attendance Rules
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Office Start</label>
                  <input
                    type="time"
                    value={formData.officeStartTime}
                    onChange={(e) => handleChange('officeStartTime', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Grace Period (min)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formData.gracePeriodMinutes}
                    onChange={(e) => handleChange('gracePeriodMinutes', parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Daily Work Hours</label>
                  <input
                    type="number"
                    min="4"
                    max="14"
                    value={formData.workingHoursPerDay}
                    onChange={(e) => handleChange('workingHoursPerDay', parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Half-Day Threshold</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={formData.halfDayThresholdHours}
                    onChange={(e) => handleChange('halfDayThresholdHours', parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Configured Weekends</label>
                <div className="flex flex-wrap gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                    const isSelected = formData.weekends.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleWeekend(day)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                            : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Office Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => handleChange('latitude', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Office Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => handleChange('longitude', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Attendance Radius (m)</label>
                  <input
                    type="number"
                    value={formData.radiusMeters}
                    onChange={(e) => handleChange('radiusMeters', parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/30"
                >
                  Continue to Leave Quotas
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Casual Leave (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.leaveQuotas.casual}
                    onChange={(e) => handleLeaveQuotaChange('casual', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sick Leave (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.leaveQuotas.sick}
                    onChange={(e) => handleLeaveQuotaChange('sick', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Annual Leave (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.leaveQuotas.annual}
                    onChange={(e) => handleLeaveQuotaChange('annual', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Unpaid Leave</label>
                  <input
                    type="text"
                    disabled
                    value="Unlimited"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-200 space-y-1">
                <div className="font-semibold text-white">Default Challenge Rules Configured:</div>
                <div>• Office start at {formData.officeStartTime} with {formData.gracePeriodMinutes} mins grace period.</div>
                <div>• Half-day penalty applied if working hours &lt; {formData.halfDayThresholdHours} hrs.</div>
                <div>• Gross salary = 1.5 × Basic salary (HRA 40%, Medical 10%).</div>
                <div>• Progressive 5-tier annual tax slabs and automatic attendance deductions.</div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {submitting ? 'Initializing HCM Lite...' : 'Launch HCM Lite'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
