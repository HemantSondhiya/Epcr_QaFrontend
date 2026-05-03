import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BellOff, Check, CheckCheck, Trash2, RefreshCw, X, Info, AlertTriangle, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import client from '../api/client';
import {
  fetchNotifications, markNotificationRead, markAllRead,
  selectNotifications, selectUnreadCount, selectNotifLoading, selectNotifError, selectNotifPagination
} from '../store/slices/notificationSlice';

const TYPE_CONFIG = {
  INFO:    { icon: <Info size={16} />,          color: 'text-sky-400',   bg: 'bg-sky-500/10 border-sky-500/20' },
  WARNING: { icon: <AlertTriangle size={16} />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  SUCCESS: { icon: <CheckCircle size={16} />,   color: 'text-teal-400',  bg: 'bg-teal-500/10 border-teal-500/20' },
  ERROR:   { icon: <XCircle size={16} />,       color: 'text-rose-400',  bg: 'bg-rose-500/10 border-rose-500/20' },
};
const getTypeConfig = (type) => TYPE_CONFIG[type?.toUpperCase()] || TYPE_CONFIG.INFO;

const Notifications = () => {
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const loading = useSelector(selectNotifLoading);
  const loadError = useSelector(selectNotifError);
  const pagination = useSelector(selectNotifPagination);

  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(0);

  const loadNotifications = (page = 0) => {
    setCurrentPage(page);
    dispatch(fetchNotifications(page));
  };

  useEffect(() => { loadNotifications(0); }, [dispatch]);

  const handleMarkAsRead = (id) => dispatch(markNotificationRead(id));
  const handleMarkAllAsRead = () => dispatch(markAllRead());

  const deleteNotification = async (id) => {
    try {
      await client.delete(`/api/notifications/${id}`);
      loadNotifications(0);
    } catch { setError('Failed to delete.'); }
  };

  const filtered = filter === 'read' ? notifications.filter(n => n.read)
    : filter === 'unread' ? notifications.filter(n => !n.read)
      : notifications;

  const hasNextPage = currentPage < pagination.totalPages - 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            Notifications
            {unreadCount > 0 && <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white">{unreadCount}</span>}
          </h1>
          <p className="text-slate-400 text-sm mt-1">System alerts and activity updates.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => loadNotifications(0)} disabled={loading} className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg border border-slate-700/50 transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllAsRead} className="flex items-center gap-2 px-4 py-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 rounded-lg text-sm font-medium transition-colors">
              <CheckCheck size={16} />Mark All Read
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 text-rose-400 text-sm border border-rose-500/20 rounded-lg flex justify-between">
          <span>{error}</span><button onClick={() => setError('')}><X size={16} /></button>
        </div>
      )}

      {loadError && (
        <div className="p-4 bg-amber-500/10 text-amber-400 text-sm border border-amber-500/20 rounded-lg">
          {loadError}
        </div>
      )}

      <div className="flex gap-2">
        {['all', 'unread', 'read'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setCurrentPage(0); }}
            className={`px-4 py-2 text-sm rounded-lg border capitalize transition-colors ${filter === f ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700/50'}`}>
            {f}{f === 'unread' && unreadCount > 0 && <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-rose-500 text-white rounded-full">{unreadCount}</span>}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-teal-500" /><p className="text-slate-400">Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-16 text-center">
            <BellOff className="w-14 h-14 text-slate-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-300">All caught up!</h2>
            <p className="text-slate-500 mt-2 text-sm">No {filter !== 'all' ? filter + ' ' : ''}notifications.</p>
          </div>
        ) : (
          <>
            {filtered.map(notif => {
              const cfg = getTypeConfig(notif.type);
              return (
                <div key={notif.id} className={`glass-card rounded-xl p-5 border transition-all ${notif.read ? 'opacity-60' : 'hover-glow'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.color}`}>{cfg.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-semibold ${notif.read ? 'text-slate-300' : 'text-white'}`}>{notif.title || 'Notification'}</p>
                            {!notif.read && <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />}
                            {notif.type && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color} font-medium uppercase`}>{notif.type}</span>}
                          </div>
                          <p className="text-sm text-slate-400 mt-1">{notif.message}</p>
                          <p className="text-xs text-slate-600 mt-1.5">{notif.createdAt ? new Date(notif.createdAt).toLocaleString() : ''}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!notif.read && (
                            <button onClick={() => handleMarkAsRead(notif.id)} className="p-1.5 text-slate-500 hover:text-teal-400 hover:bg-teal-400/10 rounded-md transition-colors" title="Mark read">
                              <Check size={15} />
                            </button>
                          )}
                          <button onClick={() => deleteNotification(notif.id)} className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors" title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {hasNextPage && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => loadNotifications(currentPage + 1)}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  <ChevronDown size={16} />
                  Load More
                </button>
              </div>
            )}

            {pagination.totalElements > 0 && (
              <div className="text-center text-xs text-slate-500 pt-2">
                Showing {(currentPage * pagination.pageSize) + 1} to {Math.min((currentPage + 1) * pagination.pageSize, pagination.totalElements)} of {pagination.totalElements}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Notifications;
