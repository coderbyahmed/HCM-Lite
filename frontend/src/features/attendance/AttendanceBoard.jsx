import React, { useState, useEffect } from 'react';
import {
  getDailyBoard,
  getMyAttendance,
  checkIn,
  checkOut,
  requestCorrection,
  listCorrections,
  reviewCorrection,
} from '../../services/api.js';
import { useAuth } from '../../app/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import {
  CalendarCheck,
  Clock,
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  Calendar,
  X,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { FaceCaptureModal } from '../../components/FaceCaptureModal.jsx';

export const AttendanceBoard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const isManagement = user?.role === 'Admin' || user?.role === 'HR';

  // Management board state
  const [boardDate, setBoardDate] = useState(new Date().toISOString().split('T')[0]);
  const [boardData, setBoardData] = useState(null);
  const [corrections, setCorrections] = useState([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Employee personal records state
  const [myRecords, setMyRecords] = useState([]);
  const [punchLoading, setPunchLoading] = useState(false);

  // Correction Request Modal
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [corrDate, setCorrDate] = useState(new Date().toISOString().split('T')[0]);
  const [corrIn, setCorrIn] = useState('09:00');
  const [corrOut, setCorrOut] = useState('18:00');
  const [corrReason, setCorrReason] = useState('');

  const [showFaceModal, setShowFaceModal] = useState(false);

  // Review Correction State
  const [reviewId, setReviewId] = useState(null);
  const [reviewComment, setReviewComment] = useState('');

  const loadData = async () => {
    try {
      setBoardLoading(true);
      setLoadError('');
      if (isManagement) {
        const [bRes, cRes] = await Promise.all([
          getDailyBoard(boardDate),
          listCorrections(),
        ]);
        if (!bRes.success || !cRes.success) throw new Error('Attendance response was incomplete.');
        setBoardData(bRes);
        setCorrections(cRes.corrections);
      } else {
        const [attRes, cRes] = await Promise.all([
          getMyAttendance(),
          listCorrections(),
        ]);
        if (!attRes.success || !cRes.success) throw new Error('Attendance response was incomplete.');
        setMyRecords(attRes.records);
        setCorrections(cRes.corrections);
      }
    } catch (err) {
      setLoadError(err.message || 'Attendance records could not be loaded.');
      addToast('Failed to load attendance: ' + err.message, 'error');
    } finally {
      setBoardLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [boardDate]);

  if (loadError && !boardLoading) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white border border-rose-200">
        <p className="text-sm font-semibold text-rose-700">{loadError}</p>
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

  const handleWebCheckIn = async () => {
    setPunchLoading(true);
    try {
      await checkIn({ method: 'web' });
      addToast('Check-in confirmed!', 'success');
      loadData();
    } catch (err) {
      addToast(err.message || 'Check-in failed', 'error');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleWebCheckOut = async () => {
    setPunchLoading(true);
    try {
      await checkOut();
      addToast('Check-out recorded!', 'success');
      loadData();
    } catch (err) {
      addToast(err.message || 'Check-out failed', 'error');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleSubmitCorrection = async (e) => {
    e.preventDefault();
    try {
      await requestCorrection({
        date: corrDate,
        requestedCheckIn: corrIn,
        requestedCheckOut: corrOut,
        reason: corrReason,
      });
      addToast('Attendance correction request submitted to HR.', 'success');
      setShowCorrectionModal(false);
      setCorrReason('');
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to submit correction', 'error');
    }
  };

  const handleReviewCorrection = async (id, status) => {
    try {
      await reviewCorrection(id, status, reviewComment);
      addToast(`Correction request ${status}.`, 'success');
      setReviewId(null);
      setReviewComment('');
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const getCurrentPosition = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Location services are unavailable. Allow location access or use manual attendance.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        (error) => {
          const message =
            error.code === error.PERMISSION_DENIED
              ? 'Location permission was denied. Allow location access or use manual attendance.'
              : error.code === error.TIMEOUT
                ? 'Location lookup timed out. Try again or use manual attendance.'
                : 'Your location could not be determined. Try again or use manual attendance.';
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

  const submitFaceAttendance = async ({ descriptor }) => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = myRecords.find((record) => record.date === today);
    try {
      if (todayRecord?.checkIn && !todayRecord?.checkOut) {
        await checkOut({ method: 'face', faceDescriptor: descriptor });
        addToast('Face verified. Check-out recorded.', 'success');
      } else if (!todayRecord) {
        const coordinates = await getCurrentPosition();
        await checkIn({
          ...coordinates,
          method: 'face',
          faceDescriptor: descriptor,
        });
        addToast('Face verified. Check-in recorded.', 'success');
      } else {
        throw new Error('Attendance is already complete for today.');
      }
      setShowFaceModal(false);
      await loadData();
    } catch (err) {
      addToast(err.message || 'Face attendance could not be recorded.', 'error');
      throw err;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {isManagement ? 'Daily Attendance Control Board' : 'My Attendance & Punch Desk'}
          </h2>
          <p className="text-xs text-slate-500">
            Authoritative time-tracking with grace periods, duplicate prevention, and correction reviews.
          </p>
        </div>

        {!isManagement && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCorrectionModal(true)}
              className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 shadow-xs"
            >
              Request Correction
            </button>
            <button
              onClick={() => setShowFaceModal(true)}
              disabled={myRecords.some(
                (record) =>
                  record.date === new Date().toISOString().split('T')[0] &&
                  record.checkIn &&
                  record.checkOut
              )}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-40"
            >
              <Camera className="w-3.5 h-3.5" />
              Face Check-In / Check-Out
            </button>
          </div>
        )}
      </div>

      {/* Management View: Daily Board */}
      {isManagement ? (
        <div className="space-y-4">
          {/* Date Selector & KPI Strip */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700">Select Date:</span>
              <input
                type="date"
                value={boardDate}
                onChange={(e) => setBoardDate(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
              <div className="px-3 py-1 rounded-xl bg-slate-50 border text-slate-700">
                Total: {boardData?.totalHeadcount || 0}
              </div>
              <div className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                Present: {boardData?.presentCount || 0}
              </div>
              <div className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                Late: {boardData?.lateCount || 0}
              </div>
              <div className="px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800">
                On Leave: {boardData?.onLeaveCount || 0}
              </div>
              <div className="px-3 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                Absent: {boardData?.absentCount || 0}
              </div>
            </div>
          </div>

          {/* Board Table */}
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Check-In</th>
                    <th className="py-3 px-4">Check-Out</th>
                    <th className="py-3 px-4">Worked Hours</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {boardLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Loading daily attendance records...
                      </td>
                    </tr>
                  ) : boardData?.records?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No attendance records found for this date
                      </td>
                    </tr>
                  ) : (
                    boardData?.records?.map((rec) => (
                      <tr key={rec.employeeId} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {rec.employeeName}
                          <span className="text-[10px] text-slate-400 font-mono ml-2">
                            ({rec.employeeCode})
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono">{rec.checkInTime || '-'}</td>
                        <td className="py-2.5 px-4 font-mono">{rec.checkOutTime || '-'}</td>
                        <td className="py-2.5 px-4">{rec.totalHours > 0 ? `${rec.totalHours} hrs` : '-'}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              rec.status === 'on_time' || rec.status === 'present'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : rec.status === 'late'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : rec.status === 'half_day'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : rec.status === 'on_leave'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {rec.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 capitalize">{rec.method || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Employee Personal Attendance Calendar */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="text-xs font-bold text-slate-900">Your Attendance History</div>
            <div className="flex gap-2">
              <button
                onClick={handleWebCheckIn}
                disabled={punchLoading || myRecords.some(
                  (record) => record.date === new Date().toISOString().split('T')[0]
                )}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
              >
                Web Check-In
              </button>
              <button
                onClick={handleWebCheckOut}
                disabled={punchLoading || !myRecords.some(
                  (record) =>
                    record.date === new Date().toISOString().split('T')[0] && record.checkIn && !record.checkOut
                )}
                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700"
              >
                Web Check-Out
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Check-In</th>
                    <th className="py-3 px-4">Check-Out</th>
                    <th className="py-3 px-4">Logged Hours</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No personal attendance records found yet. Use check-in to log your first record.
                      </td>
                    </tr>
                  ) : (
                    myRecords.map((r) => (
                      <tr key={r._id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-mono font-medium">{r.date}</td>
                        <td className="py-2.5 px-4 font-mono">{r.checkInTime || '-'}</td>
                        <td className="py-2.5 px-4 font-mono">{r.checkOutTime || '-'}</td>
                        <td className="py-2.5 px-4">{r.totalHours} hrs</td>
                        <td className="py-2.5 px-4 capitalize font-semibold">{r.status.replace('_', ' ')}</td>
                        <td className="py-2.5 px-4 text-slate-400 capitalize">{r.method}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Corrections Queue (for HR Review or Employee Status Tracking) */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Attendance Correction Requests</h3>
            <p className="text-xs text-slate-500">
              {isManagement ? 'Review employee correction submissions' : 'Your submitted correction requests'}
            </p>
          </div>
        </div>

        {corrections.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">No correction requests pending</div>
        ) : (
          <div className="space-y-3">
            {corrections.map((corr) => (
              <div
                key={corr._id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    Date: {corr.date} · Requested: {corr.requestedCheckIn} to {corr.requestedCheckOut}
                  </div>
                  <div className="text-slate-600 mt-0.5">Reason: "{corr.reason}"</div>
                  {corr.reviewComment && (
                    <div className="text-[11px] text-indigo-700 mt-1">Reviewer Note: {corr.reviewComment}</div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                      corr.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : corr.status === 'rejected'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {corr.status}
                  </span>

                  {isManagement && corr.status === 'pending' && (
                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        onClick={() => handleReviewCorrection(corr._id, 'approved')}
                        className="px-2.5 py-1 bg-emerald-600 text-white font-semibold rounded-lg text-[11px]"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReviewCorrection(corr._id, 'rejected')}
                        className="px-2.5 py-1 bg-rose-600 text-white font-semibold rounded-lg text-[11px]"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showFaceModal && !isManagement && (
        <FaceCaptureModal
          mode="verify"
          employeeName={user?.name || 'Employee'}
          actionLabel="Verify face and record attendance"
          onCancel={() => setShowFaceModal(false)}
          onSubmit={submitFaceAttendance}
        />
      )}

      {/* Correction Request Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Request Attendance Correction</h3>
            <p className="text-xs text-slate-500 mb-4">
              Submit adjusted punch times with justification for HR review.
            </p>
            <form onSubmit={handleSubmitCorrection} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={corrDate}
                  onChange={(e) => setCorrDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Actual Check-In</label>
                  <input
                    type="time"
                    required
                    value={corrIn}
                    onChange={(e) => setCorrIn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Actual Check-Out</label>
                  <input
                    type="time"
                    required
                    value={corrOut}
                    onChange={(e) => setCorrOut(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Justification</label>
                <textarea
                  required
                  rows={3}
                  value={corrReason}
                  onChange={(e) => setCorrReason(e.target.value)}
                  placeholder="e.g. Card scanner glitch / Client site visit"
                  className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-3 py-1.5 text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-xs"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
