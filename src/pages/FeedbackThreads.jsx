import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MessageSquare, Plus, RefreshCw, X, Send, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import client from '../api/client';
import { selectUser } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';

const STATUS_STYLES = {
  OPEN:     'bg-sky-500/10 text-sky-400 border-sky-500/20',
  CLOSED:   'bg-slate-500/10 text-slate-400 border-slate-500/20',
  RESOLVED: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  PENDING:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
};
const inputCls = 'w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none';

const asList = (data) => Array.isArray(data) ? data : (data?.content || []);

const FeedbackThreads = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [threads, setThreads]           = useState([]);
  const [records, setRecords]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('all');
  const [expandedId, setExpandedId]     = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msgInputs, setMsgInputs]       = useState({});

  const [createForm, setCreateForm] = useState({
    patientCareRecordId: '', subject: '', organizationId: ''
  });

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const endpoint = filter === 'open' ? '/api/feedback/threads/open'
        : filter === 'mine' && (user?.userId || user?.id)
          ? `/api/feedback/threads/user/${user?.userId || user?.id}`
          : '/api/feedback/threads';
      const res = await client.get(endpoint);
      const data = res.data;
      setThreads(Array.isArray(data) ? data : (data?.content || []));
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to load feedback threads.' }));
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchThreads(); }, [filter, user]);

  useEffect(() => {
    const canFetchEpcr = ['ADMIN', 'PARAMEDIC', 'PHYSICIAN', 'QA_REVIEWER'].includes(user?.role);
    if (canFetchEpcr) {
      client.get('/api/epcr/records', { hideToast: true }).then(r => setRecords(asList(r.data))).catch(() => {});
    }
  }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await client.post('/api/feedback/threads', {
        patientCareRecordId: createForm.patientCareRecordId || undefined,
        userId: user?.userId || user?.id,
        subject: createForm.subject,
        messages: [],
        status: 'OPEN'
      });
      dispatch(addToast({ type: 'success', message: 'Thread created successfully' }));
      setIsCreateOpen(false);
      setCreateForm({ patientCareRecordId: '', subject: '', organizationId: '' });
      fetchThreads();
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err.response?.data?.message || 'Failed to create thread.' }));
    } finally { setIsSubmitting(false); }
  };

  const handleAddMessage = async (threadId) => {
    const msg = msgInputs[threadId]?.trim();
    if (!msg) return;
    try {
      const updated = await client.post(`/api/feedback/threads/${threadId}/messages`, {
        senderId: user?.userId || user?.id,
        message: msg
      });
      setThreads(prev => prev.map(t => t.id === threadId ? updated.data : t));
      setMsgInputs(prev => ({ ...prev, [threadId]: '' }));
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to send message.' }));
    }
  };

  const updateStatus = async (threadId, status) => {
    try {
      const updated = await client.put(`/api/feedback/threads/${threadId}/status?status=${status}`);
      setThreads(prev => prev.map(t => t.id === threadId ? updated.data : t));
      dispatch(addToast({ type: 'success', message: `Status updated to ${status}` }));
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to update status.' }));
    }
  };

  const deleteThread = async (threadId) => {
    if (!window.confirm('Delete this feedback thread?')) return;
    try {
      await client.delete(`/api/feedback/threads/${threadId}`);
      setThreads(prev => prev.filter(t => t.id !== threadId));
      if (expandedId === threadId) setExpandedId(null);
      dispatch(addToast({ type: 'success', message: 'Thread deleted.' }));
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to delete thread.' }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Feedback Threads</h1>
          <p className="text-slate-400 text-sm mt-1">Threaded discussions linked to EPCR records.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchThreads} disabled={loading} className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg border border-slate-700/50 transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(45,212,191,0.3)]">
            <Plus size={18} /><span>New Thread</span>
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {['all', 'open', 'mine'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm rounded-lg border capitalize transition-colors ${filter === f ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700/50'}`}>
            {f === 'mine' ? 'My Threads' : f}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-teal-500" />
            <p className="text-slate-400">Loading threads...</p>
          </div>
        ) : (Array.isArray(threads) ? threads : []).length === 0 ? (
          <div className="glass-card rounded-2xl p-16 text-center">
            <MessageSquare className="w-14 h-14 text-slate-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-300">No threads yet</h2>
            <p className="text-slate-500 mt-2 text-sm">Start a discussion by creating a new thread.</p>
          </div>
        ) : (Array.isArray(threads) ? threads : []).map(thread => {
          const isExpanded = expandedId === thread.id;
          const statusStyle = STATUS_STYLES[thread.status?.toUpperCase()] || STATUS_STYLES.OPEN;
          return (
            <div key={thread.id} className="glass-card rounded-2xl overflow-hidden hover-glow transition-all">
              <div className="p-5 flex items-start justify-between gap-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : thread.id)}>
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                    <MessageSquare size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-white">{thread.subject || 'Untitled Thread'}</h3>
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${statusStyle}`}>
                        {thread.status || 'OPEN'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {thread.messages?.length || 0} message{thread.messages?.length !== 1 ? 's' : ''} •{' '}
                      {thread.createdAt ? new Date(thread.createdAt).toLocaleDateString() : ''}
                    </p>
                    {thread.patientCareRecordId && (
                      <p className="text-xs text-slate-600 mt-0.5">Record: {thread.patientCareRecordId.substring(0, 20)}...</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex gap-1">
                    {['OPEN','RESOLVED','CLOSED'].map(s => (
                      <button key={s} onClick={e => { e.stopPropagation(); updateStatus(thread.id, s); }}
                        className={`px-2 py-1 text-[10px] rounded border transition-colors ${thread.status === s ? statusStyle : 'bg-slate-800/50 text-slate-500 border-slate-700/50 hover:bg-slate-700/50'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteThread(thread.id); }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors">
                    <Trash2 size={15} />
                  </button>
                  {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-800">
                  <div className="p-5 space-y-3 max-h-96 overflow-y-auto">
                    {(!thread.messages || thread.messages.length === 0) ? (
                      <p className="text-slate-500 text-sm text-center py-4">No messages yet. Start the conversation.</p>
                    ) : thread.messages.map((msg, i) => {
                      const isMe = msg.senderId === (user?.userId || user?.id);
                      return (
                        <div key={msg.messageId || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${isMe ? 'bg-teal-500/10 border border-teal-500/20' : 'bg-slate-800/70 border border-slate-700/30'}`}>
                            <p className={`text-xs font-medium mb-1 ${isMe ? 'text-teal-400' : 'text-slate-400'}`}>
                              {msg.senderName || (isMe ? 'You' : 'Unknown')}
                            </p>
                            <p className="text-sm text-slate-200">{msg.message}</p>
                            <p className="text-[10px] text-slate-600 mt-1">
                              {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-4 border-t border-slate-800 flex gap-3">
                    <input
                      type="text"
                      value={msgInputs[thread.id] || ''}
                      onChange={e => setMsgInputs(prev => ({ ...prev, [thread.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddMessage(thread.id)}
                      placeholder="Type a message... (Enter to send)"
                      className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none"
                    />
                    <button onClick={() => handleAddMessage(thread.id)}
                      className="p-2.5 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-lg transition-colors shrink-0">
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-xl font-bold text-white">New Feedback Thread</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Subject *</label>
                  <input value={createForm.subject} onChange={e => setCreateForm({ ...createForm, subject: e.target.value })}
                    required className={inputCls} placeholder="Describe the issue..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Linked EPCR Record (optional)</label>
                  <select value={createForm.patientCareRecordId}
                    onChange={e => setCreateForm({ ...createForm, patientCareRecordId: e.target.value })}
                    className={inputCls + ' appearance-none'}>
                    <option value="">No record linked</option>
                    {records.map(r => <option key={r.id} value={r.id}>{r.patientName || r.id}</option>)}
                  </select>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
                    {isSubmitting ? 'Creating...' : 'Create Thread'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackThreads;
