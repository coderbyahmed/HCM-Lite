import React, { useState, useEffect } from 'react';
import { getAnnouncements, createAnnouncement } from '../../services/api.js';
import { useAuth } from '../../app/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Megaphone, Plus, Calendar, AlertCircle, X } from 'lucide-react';

export const Announcements = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const isManagement = user?.role === 'Admin' || user?.role === 'HR';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [category, setCategory] = useState('General');
  const [submitting, setSubmitting] = useState(false);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await getAnnouncements();
      if (res.success) {
        setAnnouncements(res.announcements);
      } else {
        throw new Error('Announcement response was incomplete.');
      }
    } catch (err) {
      setLoadError(err.message || 'Announcements could not be loaded.');
      addToast('Failed to load announcements: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAnnouncement({ title, content, priority, category });
      addToast('Announcement published successfully.', 'success');
      setShowModal(false);
      setTitle('');
      setContent('');
      loadAnnouncements();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading company bulletins...</div>;
  }

  if (loadError) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white border border-rose-200">
        <p className="text-sm font-semibold text-rose-700">{loadError}</p>
        <button
          type="button"
          onClick={loadAnnouncements}
          className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Company Announcements & Bulletins</h2>
          <p className="text-xs text-slate-500">Official workplace notices, policy updates, and holidays.</p>
        </div>

        {isManagement && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Post Announcement
          </button>
        )}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 text-xs text-slate-400">
            <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No bulletins published yet
          </div>
        ) : (
          announcements.map((ann) => (
            <div
              key={ann._id}
              className={`p-5 rounded-2xl border transition-all ${
                ann.priority === 'urgent'
                  ? 'bg-rose-50/50 border-rose-200 shadow-xs'
                  : 'bg-white border-slate-200/80 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      ann.priority === 'urgent'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {ann.category || 'General'}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{ann.title}</h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  {new Date(ann.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{ann.content}</p>
              <div className="mt-3 text-[11px] text-slate-400">Posted by: {ann.authorName || 'Management'}</div>
            </div>
          ))
        )}
      </div>

      {/* Post Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">Post Company Announcement</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Office Holiday Notice / Q2 Town Hall"
                  className="w-full px-3 py-2 rounded-xl border focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="General">General</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Policy">Policy</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notice Content</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write bulletin details..."
                  className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold shadow-xs"
                >
                  {submitting ? 'Publishing...' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
