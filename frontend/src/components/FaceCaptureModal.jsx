import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, X } from 'lucide-react';
import { captureFaceDescriptor, loadFaceRecognitionModels } from '../services/faceRecognition.js';

const REQUIRED_CAPTURES = 3;

export const FaceCaptureModal = ({
  mode,
  employeeName,
  actionLabel,
  onCancel,
  onSubmit,
}) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [captureLoading, setCaptureLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [captures, setCaptures] = useState([]);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const startCamera = async () => {
      try {
        await loadFaceRecognitionModels();
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera access requires a supported browser and a secure connection.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (active) setCameraReady(true);
      } catch (cameraError) {
        if (active) {
          const message =
            cameraError.name === 'NotAllowedError'
              ? 'Camera permission was denied. Allow camera access in your browser settings and try again.'
              : cameraError.name === 'NotFoundError'
                ? 'No camera is available on this device.'
                : cameraError.message || 'Camera could not be started.';
          setError(message);
        }
      } finally {
        if (active) setInitializing(false);
      }
    };

    startCamera();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const capture = async () => {
    setCaptureLoading(true);
    setError('');
    try {
      const descriptor = await captureFaceDescriptor(videoRef.current);
      setCaptures((current) =>
        mode === 'enroll' ? [...current, descriptor].slice(0, REQUIRED_CAPTURES) : [descriptor]
      );
    } catch (captureError) {
      setError(captureError.message || 'Face capture failed.');
    } finally {
      setCaptureLoading(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await onSubmit(
        mode === 'enroll'
          ? { descriptors: captures, consentConfirmed }
          : { descriptor: captures[0] }
      );
    } catch (submitError) {
      setError(submitError.message || 'The request could not be completed.');
      setCaptures([]);
    } finally {
      setSaving(false);
    }
  };

  const captureComplete =
    mode === 'enroll' ? captures.length === REQUIRED_CAPTURES : captures.length === 1;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="face-capture-title"
        className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200"
      >
        <header className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 id="face-capture-title" className="text-base font-bold text-slate-900">
              {mode === 'enroll' ? 'Face Registration' : actionLabel}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {mode === 'enroll'
                ? `Registering ${employeeName}'s face. Center one face in the camera, look straight ahead, and use even lighting.`
                : `Confirm your identity as ${employeeName}. Center your face in the camera and use even lighting.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close face capture"
            className="p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover -scale-x-100"
          />
          {initializing && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-white bg-slate-950/70">
              Loading face models and camera…
            </div>
          )}
          {!initializing && !cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-white bg-slate-950/80">
              Camera unavailable. Review the message below and allow camera access before retrying.
            </div>
          )}
          {cameraReady && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-52 max-w-[50%] rounded-[50%] border-2 border-dashed border-indigo-300/90" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 mt-3 text-xs text-slate-600">
          <span>
            {mode === 'enroll'
              ? `${captures.length} of ${REQUIRED_CAPTURES} clear captures`
              : captures.length === 1
                ? 'Face captured. Confirm identity before submitting.'
                : 'No face capture yet.'}
          </span>
          {captureComplete && (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Ready
            </span>
          )}
        </div>

        {mode === 'enroll' && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-[11px] text-amber-950 leading-relaxed">
              Notice: HCM Lite extracts a face embedding for attendance verification. It does not save
              camera images or video. The biometric template is encrypted in the backend database.
              Re-enrollment replaces the prior template; authorized Admin/HR users can delete it.
            </p>
            <label className="mt-2 flex items-start gap-2 text-[11px] text-amber-950">
              <input
                type="checkbox"
                checked={consentConfirmed}
                onChange={(event) => setConsentConfirmed(event.target.checked)}
                className="mt-0.5 accent-indigo-600"
              />
              <span>
                {employeeName} has read this notice and consents to registering their face for
                attendance. Check only after the employee confirms.
              </span>
            </label>
          </div>
        )}

        {error && (
          <div role="alert" className="mt-3 flex items-start gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <footer className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={capture}
            disabled={!cameraReady || captureLoading || saving || captureComplete}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-xl hover:bg-indigo-100 disabled:opacity-40"
          >
            <Camera className="w-4 h-4" />
            {captureLoading ? 'Checking face…' : mode === 'enroll' ? 'Capture face' : 'Capture my face'}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={
              !captureComplete ||
              saving ||
              (mode === 'enroll' && !consentConfirmed)
            }
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-40"
          >
            {saving
              ? 'Verifying…'
              : mode === 'enroll'
                ? 'Save face template'
                : actionLabel}
          </button>
        </footer>
      </section>
    </div>
  );
};
