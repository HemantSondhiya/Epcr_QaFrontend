import { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, X, Eye, CheckCircle, Trash2, ClipboardList, Star } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import client from '../api/client';
import { selectUser } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';

const STATUS_STYLES = {
  PENDING:      'bg-amber-500/10 text-amber-400 border-amber-500/20',
  QA_PENDING:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  IN_PROGRESS:  'bg-sky-500/10 text-sky-400 border-sky-500/20',
  COMPLETED:    'bg-teal-500/10 text-teal-400 border-teal-500/20',
  QA_COMPLETED: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  APPROVED:     'bg-teal-500/10 text-teal-400 border-teal-500/20',
  REJECTED:     'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const StatusBadge = ({ status }) => (
  <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${STATUS_STYLES[status] || STATUS_STYLES.PENDING}`}>
    {(status || 'PENDING').replace(/_/g, ' ')}
  </span>
);

const inputCls = 'w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none';

const asList = (data) => Array.isArray(data) ? data : (data?.content || []);

const QaReviews = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [reviews, setReviews]         = useState([]);
  const [records, setRecords]         = useState([]);
  const [forms, setForms]             = useState([]);
  const [searchTerm, setSearchTerm]   = useState('');
  const [filterStatus, setFilterStatus] = useState(['ADMIN', 'MANAGER'].includes(user?.role) ? 'all' : 'mine');
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen]   = useState(false);
  const [isViewOpen, setIsViewOpen]       = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [isSubmitting, setIsSubmitting]   = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({ patientCareRecordId: '', qaFormId: '', feedback: '' });

  // Complete review form
  const [completeForm, setCompleteForm] = useState({ score: '', passed: true, feedback: '', responses: [] });

  // ── Fetch ──────────────────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchReviews = async (pageNum = 0, isAppend = false) => {
    if (!isAppend) setLoading(true);
    setError('');
    try {
      const size = 20;
      let endpoint = `/api/qa/reviews?page=${pageNum}&size=${size}`;
      if (filterStatus === 'pending') {
        endpoint = `/api/qa/reviews/pending?page=${pageNum}&size=${size}`;
      } else if (filterStatus === 'mine' && (user?.userId || user?.id)) {
        endpoint = `/api/qa/reviews/reviewer/${user.userId || user.id}?page=${pageNum}&size=${size}`;
      }
      let res;
      try {
        res = await client.get(endpoint);
      } catch (err) {
        if (err.response?.status === 403 && filterStatus === 'all') {
          // If non-system user is forbidden from fetching 'all', fallback to their own
          res = await client.get(`/api/qa/reviews/reviewer/${user?.userId || user?.id}?page=${pageNum}&size=${size}`);
          setFilterStatus('mine');
        } else {
          throw err;
        }
      }
      
      const isPaginated = res.data && res.data.content !== undefined;
      const newReviews = isPaginated ? res.data.content : (res.data || []);
      
      setReviews(prev => isAppend ? [...prev, ...newReviews] : newReviews);
      setHasMore(isPaginated ? !res.data.last : false);
      setPage(pageNum);
    } catch (err) {
      console.error("Fetch reviews error:", err);
      dispatch(addToast({ type: 'error', message: err.response?.data?.message || 'Failed to fetch QA reviews. You may lack permissions.' }));
    } finally {
      setLoading(false);
    }
  };

  const fetchDeps = async () => {
    try {
      const canFetchEpcr = ['ADMIN', 'PARAMEDIC', 'PHYSICIAN', 'QA_REVIEWER'].includes(user?.role);
      const formRequest = user?.organizationId
        ? client.get(`/api/qa/forms/organization/${user.organizationId}`, { hideToast: true }).catch(() => ({ data: [] }))
        : client.get('/api/organizations', { hideToast: true })
          .then(orgRes => Promise.all(
            (orgRes.data || []).map(org =>
              client.get(`/api/qa/forms/organization/${org.id}`, { hideToast: true }).then(res => res.data || []).catch(() => [])
            )
          ))
          .then(formLists => ({ data: formLists.flat() }))
          .catch(() => ({ data: [] }));

      const [recRes, formRes] = await Promise.all([
        canFetchEpcr
          ? client.get('/api/epcr/records', { hideToast: true }).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
        formRequest
      ]);
      setRecords(asList(recRes.data));
      setForms(asList(formRes.data));
    } catch { /* silent */ }
  };

  useEffect(() => { fetchReviews(0, false); }, [filterStatus, user]);
  useEffect(() => { fetchDeps(); }, [user]);

  // ── Create Review ──────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await client.post('/api/qa/reviews', {
        patientCareRecordId: createForm.patientCareRecordId,
        qaFormId: createForm.qaFormId || undefined,
        reviewerId: user?.userId || user?.id,
        feedback: createForm.feedback,
        responses: []
      });
      setIsCreateOpen(false);
      setCreateForm({ patientCareRecordId: '', qaFormId: '', feedback: '' });
      dispatch(addToast({ type: 'success', message: 'QA review created successfully' }));
      fetchReviews();
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err.response?.data?.message || 'Failed to create review.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── View Review ────────────────────────────────────────────────────
  const handleView = async (reviewId) => {
    try {
      const res = await client.get(`/api/qa/reviews/${reviewId}`);
      setSelectedReview(res.data);
      setIsViewOpen(true);
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to load review details.' }));
    }
  };

  // ── Complete Review ────────────────────────────────────────────────
  const openComplete = (review) => {
    setSelectedReview(review);
    setCompleteForm({ score: review.score ?? '', passed: review.passed ?? true, feedback: review.feedback || '', responses: review.responses || [] });
    setIsCompleteOpen(true);
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await client.put(`/api/qa/reviews/${selectedReview.id}/complete`, {
        ...selectedReview,
        reviewerId: user?.userId || user?.id,
        score: parseFloat(completeForm.score) || 0,
        passed: completeForm.passed,
        feedback: completeForm.feedback,
        comments: completeForm.feedback,
        status: 'COMPLETED'
      });
      setIsCompleteOpen(false);
      dispatch(addToast({ type: 'success', message: 'QA review completed successfully' }));
      fetchReviews();
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err.response?.data?.message || 'Failed to complete review.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete Review ──────────────────────────────────────────────────
  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this QA review? This cannot be undone.')) return;
    try {
      await client.delete(`/api/qa/reviews/${reviewId}`);
      dispatch(addToast({ type: 'success', message: 'QA review deleted.' }));
      fetchReviews();
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to delete review.' }));
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────
  const filtered = reviews.filter(r => {
    const rId = r.recordDisplay || r.recordId || r.patientCareRecordId || '';
    const rReviewer = r.reviewerName || r.reviewerId || '';
    const matchSearch = r.id?.toLowerCase().includes(searchTerm.toLowerCase())
      || rId.toLowerCase().includes(searchTerm.toLowerCase())
      || rReviewer.toLowerCase().includes(searchTerm.toLowerCase())
      || r.status?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const FILTER_TABS = ['all', 'pending', 'mine'];

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">QA Reviews</h1>
          <p className="text-slate-400 text-sm mt-1">Quality assurance checks on EPCR records.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchReviews(0, false)} disabled={loading}
            className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg transition-colors border border-slate-700/50">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(45,212,191,0.3)]">
            <Plus size={18} /><span>New Review</span>
          </button>
        </div>
      </div>

      {error && !isCreateOpen && !isCompleteOpen && (
        <div className="p-4 bg-rose-500/10 text-rose-400 text-sm border border-rose-500/20 rounded-lg flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={16} /></button>
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search reviews..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 transition-all" />
          </div>
          <div className="flex gap-2">
            {FILTER_TABS.map(tab => (
              <button key={tab} onClick={() => setFilterStatus(tab)}
                className={`px-3 py-1.5 text-xs rounded-lg border capitalize transition-colors ${filterStatus === tab ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700/50'}`}>
                {tab === 'mine' ? 'My Reviews' : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-[var(--border-color)]">
                <th className="px-6 py-4 font-medium">Review ID</th>
                <th className="px-6 py-4 font-medium">Record ID</th>
                <th className="px-6 py-4 font-medium">Reviewer</th>
                <th className="px-6 py-4 font-medium">Score</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Created</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                  <RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-teal-500" />Loading reviews...
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                  <ClipboardList className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                  <p>No QA reviews found.</p>
                </td></tr>
              ) : filtered.map(review => (
                <tr key={review.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-teal-400 truncate max-w-[120px] block">{review.id?.substring(0, 12)}...</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-300">{review.recordDisplay || ((review.recordId || review.patientCareRecordId || '—')?.substring(0, 12) + (review.recordId ? '...' : ''))}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-200">{review.reviewerName || review.reviewerId?.substring(0, 10) || '—'}</span>
                      {review.reviewerEmail && <span className="text-xs text-slate-500">{review.reviewerEmail}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(review.scoreDisplay && review.scoreDisplay !== '—') || review.score != null ? (
                      <div className="flex items-center gap-1.5">
                        <Star size={14} className={review.score >= 80 ? 'text-teal-400' : review.score >= 50 ? 'text-amber-400' : 'text-rose-400'} />
                        <span className={`text-sm font-semibold ${review.score >= 80 ? 'text-teal-400' : review.score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {review.scoreDisplay && review.scoreDisplay !== '—' ? review.scoreDisplay : `${review.score}%`}
                        </span>
                      </div>
                    ) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={review.status} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleView(review.id)}
                        className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-400/10 rounded-md transition-colors" title="View">
                        <Eye size={16} />
                      </button>
                      {(review.status === 'PENDING' || review.status === 'QA_PENDING' || review.status === 'IN_PROGRESS') && (
                        <button onClick={() => openComplete(review)}
                          className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-teal-400/10 rounded-md transition-colors" title="Complete Review">
                          <CheckCircle size={16} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(review.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex justify-between items-center text-sm text-slate-400">
          <span>Showing {filtered.length} of {reviews.length} reviews</span>
          {hasMore && (
            <button 
              onClick={() => fetchReviews(page + 1, true)}
              disabled={loading}
              className="px-4 py-1.5 text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-lg hover:bg-teal-500/20 transition-colors disabled:opacity-50"
            >
              Load More
            </button>
          )}
        </div>
      </div>

      {/* ── CREATE MODAL ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-xl font-bold text-white">Create QA Review</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6">
              {error && <div className="mb-4 p-3 bg-rose-500/10 text-rose-400 text-sm border border-rose-500/20 rounded-lg">{error}</div>}
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">EPCR Record *</label>
                  <select name="patientCareRecordId" value={createForm.patientCareRecordId}
                    onChange={e => setCreateForm({ ...createForm, patientCareRecordId: e.target.value })}
                    required className={inputCls + ' appearance-none'}>
                    <option value="" disabled>Select record to review</option>
                    {records.map(r => (
                      <option key={r.id} value={r.id}>{r.patientName || r.id} — {r.status || 'DRAFT'}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">QA Form (optional)</label>
                  <select name="qaFormId" value={createForm.qaFormId}
                    onChange={e => setCreateForm({ ...createForm, qaFormId: e.target.value })}
                    className={inputCls + ' appearance-none'}>
                    <option value="">No form / manual review</option>
                    {forms.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Initial Feedback</label>
                  <textarea value={createForm.feedback}
                    onChange={e => setCreateForm({ ...createForm, feedback: e.target.value })}
                    rows="3" className={inputCls + ' resize-none'} placeholder="Initial review notes..." />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
                    {isSubmitting ? 'Creating...' : 'Create Review'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── COMPLETE REVIEW MODAL ── */}
      {isCompleteOpen && selectedReview && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h2 className="text-xl font-bold text-white">Complete Review</h2>
                <p className="text-xs text-slate-500 mt-0.5">Record: {(selectedReview.recordId || selectedReview.patientCareRecordId || '').substring(0, 20)}...</p>
              </div>
              <button onClick={() => setIsCompleteOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6">
              {error && <div className="mb-4 p-3 bg-rose-500/10 text-rose-400 text-sm border border-rose-500/20 rounded-lg">{error}</div>}
              <form onSubmit={handleComplete} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Score (0–100)</label>
                    <input type="number" min="0" max="100" value={completeForm.score}
                      onChange={e => setCompleteForm({ ...completeForm, score: e.target.value })}
                      className={inputCls} placeholder="e.g. 85" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Result</label>
                    <select value={completeForm.passed}
                      onChange={e => setCompleteForm({ ...completeForm, passed: e.target.value === 'true' })}
                      className={inputCls + ' appearance-none'}>
                      <option value="true">Passed ✓</option>
                      <option value="false">Failed ✗</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Feedback / Comments *</label>
                  <textarea value={completeForm.feedback}
                    onChange={e => setCompleteForm({ ...completeForm, feedback: e.target.value })}
                    rows="4" required className={inputCls + ' resize-none'} placeholder="Provide detailed review feedback..." />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsCompleteOpen(false)}
                    className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                    {isSubmitting ? 'Saving...' : 'Complete Review'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW MODAL ── */}
      {isViewOpen && selectedReview && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 sticky top-0">
              <h2 className="text-xl font-bold text-white">Review Details</h2>
              <div className="flex items-center gap-2">
                {(selectedReview.status === 'PENDING' || selectedReview.status === 'QA_PENDING' || selectedReview.status === 'IN_PROGRESS') && (
                  <button onClick={() => { setIsViewOpen(false); openComplete(selectedReview); }}
                    className="px-3 py-1.5 text-sm bg-teal-500 text-slate-900 rounded-lg hover:bg-teal-400 transition-colors flex items-center gap-1.5 font-medium">
                    <CheckCircle size={14} />Complete
                  </button>
                )}
                <button onClick={() => setIsViewOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Review ID', selectedReview.id?.substring(0, 16) + '...'],
                  ['Record ID', (selectedReview.recordId || selectedReview.patientCareRecordId || '—')?.substring(0, 16) + '...'],
                  ['QA Form ID', selectedReview.qaFormId?.substring(0, 16) + '...' || '—'],
                  ['Reviewer', selectedReview.reviewerId?.substring(0, 16) + '...' || '—'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <p className="text-sm text-slate-300 font-mono">{val}</p>
                  </div>
                ))}
                <div>
                  <p className="text-xs text-slate-500 mb-1">Score</p>
                  <p className={`text-2xl font-bold ${selectedReview.score >= 80 ? 'text-teal-400' : selectedReview.score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {selectedReview.score != null ? `${selectedReview.score}%` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Status / Result</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={selectedReview.status} />
                    {selectedReview.passed != null && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedReview.passed ? 'bg-teal-500/10 text-teal-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {selectedReview.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {selectedReview.feedback && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Feedback</p>
                  <p className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-700/30 leading-relaxed">{selectedReview.feedback}</p>
                </div>
              )}
              {selectedReview.responses?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Question Responses ({selectedReview.responses.length})</p>
                  <div className="bg-slate-900/50 rounded-lg border border-slate-700/30 divide-y divide-slate-800 overflow-hidden">
                    {selectedReview.responses.map((r, i) => (
                      <div key={i} className="p-3 flex justify-between text-sm">
                        <span className="text-slate-400">{r.questionId}</span>
                        <span className="text-white font-medium">{r.answer}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-800">
                <span>Created: {selectedReview.createdAt ? new Date(selectedReview.createdAt).toLocaleString() : '—'}</span>
                {selectedReview.completedAt && <span>Completed: {new Date(selectedReview.completedAt).toLocaleString()}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QaReviews;
