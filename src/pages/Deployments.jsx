import { useState, useEffect } from 'react';
import { Rocket, RefreshCw, X, Eye, Download, Filter, Search } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import client from '../api/client';
import { selectUser } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import DataTable from '../components/common/DataTable';

const Deployments = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedDeploy, setSelectedDeploy] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchDeployments = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = user?.role === 'MANAGER' && user?.organizationId
        ? `/api/workflows/deployments?organizationId=${user.organizationId}`
        : '/api/workflows/deployments';
      const res = await client.get(endpoint);
      const data = res.data;
      setDeployments(Array.isArray(data) ? data : (data?.content || []));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: 'Failed to load deployments.' }));
      setError('Failed to load deployments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, [user]);

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      IN_PROGRESS: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      SUCCESS: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      APPLIED: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      ROLLED_BACK: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    };
    return colors[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '—';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleDateString();
    } catch {
      return '—';
    }
  };

  const formatTime = (dateValue) => {
    if (!dateValue) return '—';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  const getDeploymentDate = (deployment) => {
    // First try the debug function to log available fields
    const debugResult = getAvailableDateField(deployment);
    if (debugResult) return debugResult;
    
    // Fallback: return null if no date found
    return null;
  };

  const isValidDate = (dateValue) => {
    if (!dateValue) return false;
    const date = new Date(dateValue);
    return !isNaN(date.getTime());
  };

  const getAvailableDateField = (deployment) => {
    // Check which date field exists
    const dateFields = ['deployedAt', 'createdAt', 'timestamp', 'deploymentTime', 'deployment_time', 'created', 'updatedAt', 'date'];
    for (const field of dateFields) {
      if (deployment?.[field]) {
        return deployment[field];
      }
    }
    return null;
  };

  const getConfigTypeIcon = (type) => {
    const icons = {
      WORKFLOW: '⚙️',
      FORM: '📋',
      TEMPLATE: '📄',
      CONFIG: '🔧'
    };
    return icons[type] || '📦';
  };

  const filteredDeployments = (Array.isArray(deployments) ? deployments : []).filter(dep => {
    const searchString = searchTerm.toLowerCase();
    const matchSearch = dep.configId?.toString().toLowerCase().includes(searchString) ||
                       dep.deploymentId?.toString().toLowerCase().includes(searchString) ||
                       dep.targetOrganizationIds?.toString().includes(searchString) ||
                       dep.targetOrganizationNames?.some(name => name.toLowerCase().includes(searchString)) ||
                       (dep.initiatedByName || dep.deployedBy)?.toLowerCase().includes(searchString) ||
                       dep.approvedByName?.toLowerCase().includes(searchString);
    const matchStatus = filterStatus === 'ALL' || dep.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const columns = [
    {
      key: 'configType',
      label: 'Config Type',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <span className="text-lg">{getConfigTypeIcon(val)}</span>
          <span className="text-sm text-slate-300">{val}</span>
        </div>
      )
    },
    {
      key: 'configId',
      label: 'Config ID',
      render: (val) => <span className="text-sm text-slate-400 font-mono">{val}</span>
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => (
        <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${getStatusColor(val)}`}>
          {val}
        </span>
      )
    },
    {
      key: 'targetOrganizationIds',
      label: 'Target Orgs',
      sortable: false,
      render: (val, row) => (
        <div className="text-sm">
          <span className="text-teal-400 font-medium">{(row.targetOrganizationNames || val)?.length || 0}</span>
          <span className="text-slate-500 ml-1">org(s)</span>
        </div>
      )
    },
    {
      key: 'deployedBy',
      label: 'Initiated By',
      render: (val, row) => <span className="text-sm text-slate-400">{row.initiatedByName || row.initiatedByEmail || row.deployedBy || 'System'}</span>
    },
    {
      key: 'deployedAt',
      label: 'Deployed At',
      sortable: true,
      render: (val, row) => {
        const deployDate = getDeploymentDate(row);
        if (!deployDate) {
          return <span className="text-xs text-slate-500">N/A</span>;
        }
        if (!isValidDate(deployDate)) {
          return <span className="text-xs text-slate-500">N/A</span>;
        }
        return (
          <span className="text-sm text-slate-500">
            {formatDate(deployDate)} {formatTime(deployDate)}
          </span>
        );
      }
    }
  ];

  const actions = (row) => (
    <button
      onClick={() => {
        setSelectedDeploy(row);
        setIsDetailOpen(true);
      }}
      className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-teal-400/10 rounded-md transition-colors"
      title="View Details"
    >
      <Eye size={16} />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Deployments</h1>
          <p className="text-slate-400 text-sm mt-1">View and monitor workflow and configuration deployments.</p>
        </div>
        <button
          onClick={fetchDeployments}
          disabled={loading}
          className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg border border-slate-700/50 transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && !isDetailOpen && (
        <div className="p-4 bg-rose-500/10 text-rose-400 text-sm border border-rose-500/20 rounded-lg flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by config ID, org ID, or deployed by..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 pl-9 text-sm text-slate-200 placeholder-slate-500 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="ROLLED_BACK">Rolled Back</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deployments Table */}
      {loading ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-teal-500" />
          <p className="text-slate-400">Loading deployments...</p>
        </div>
      ) : filteredDeployments.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <Rocket className="w-14 h-14 text-slate-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-300">No Deployments</h2>
          <p className="text-slate-500 mt-2 text-sm">
            {deployments.length === 0
              ? 'No deployments yet. Deploy workflows from the Workflows page.'
              : 'No deployments match your search criteria.'}
          </p>
        </div>
      ) : (
        <DataTable 
          columns={columns} 
          data={filteredDeployments}
          searchable={false}
          actions={actions}
        />
      )}

      {/* Detail Modal */}
      {isDetailOpen && selectedDeploy && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Rocket size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Deployment Details</h2>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">ID: {selectedDeploy.deploymentId || selectedDeploy.id}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Config Type</label>
                  <p className="text-sm text-slate-200 flex items-center gap-2">
                    <span className="text-lg">{getConfigTypeIcon(selectedDeploy.configType)}</span>
                    {selectedDeploy.configType}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Config ID</label>
                  <p className="text-sm text-slate-200 font-mono">{selectedDeploy.configId}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Status</label>
                  <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border inline-block ${getStatusColor(selectedDeploy.status)}`}>
                    {selectedDeploy.status}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Config Version</label>
                  <p className="text-sm text-slate-200">v{selectedDeploy.configVersion || 1}</p>
                </div>
              </div>

              {/* Deployment Info */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Initiated At</label>
                    <p className="text-sm text-slate-200">
                      {(() => {
                        const deployDate = getDeploymentDate(selectedDeploy);
                        if (!deployDate || !isValidDate(deployDate)) return 'N/A';
                        return `${formatDate(deployDate)} ${formatTime(deployDate)}`;
                      })()}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Initiated By</label>
                    <div className="text-sm text-slate-200 flex flex-col">
                      <span>{selectedDeploy.initiatedByName || selectedDeploy.deployedBy || 'System'}</span>
                      {selectedDeploy.initiatedByEmail && <span className="text-xs text-slate-400">{selectedDeploy.initiatedByEmail}</span>}
                    </div>
                  </div>
                  {(selectedDeploy.approvedBy || selectedDeploy.approvedByName || selectedDeploy.approvedAt) && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-400">Approved At</label>
                        <p className="text-sm text-slate-200">
                          {selectedDeploy.approvedAt ? `${formatDate(selectedDeploy.approvedAt)} ${formatTime(selectedDeploy.approvedAt)}` : 'N/A'}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-400">Approved By</label>
                        <div className="text-sm text-slate-200 flex flex-col">
                          <span>{selectedDeploy.approvedByName || selectedDeploy.approvedBy || 'N/A'}</span>
                          {selectedDeploy.approvedByEmail && <span className="text-xs text-slate-400">{selectedDeploy.approvedByEmail}</span>}
                        </div>
                      </div>
                    </>
                  )}
                  {selectedDeploy.sourceOrganizationName && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-400">Source Org</label>
                      <p className="text-sm text-slate-200">{selectedDeploy.sourceOrganizationName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Trace Information */}
              {(selectedDeploy.requestId || selectedDeploy.ipAddress) && (
                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Trace Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedDeploy.requestId && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Request ID</label>
                        <p className="text-xs text-slate-300 font-mono">{selectedDeploy.requestId}</p>
                      </div>
                    )}
                    {selectedDeploy.ipAddress && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">IP Address</label>
                        <p className="text-xs text-slate-300 font-mono">{selectedDeploy.ipAddress}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Target Organizations */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <label className="text-xs font-medium text-slate-400">
                  Target Organizations ({(selectedDeploy.targetOrganizationNames || selectedDeploy.targetOrganizationIds)?.length || 0})
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(selectedDeploy.targetOrganizationNames || selectedDeploy.targetOrganizationIds)?.length > 0 ? (
                    (selectedDeploy.targetOrganizationNames || selectedDeploy.targetOrganizationIds).map((orgNameOrId, idx) => (
                      <div key={idx} className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                        <p className={`text-sm ${selectedDeploy.targetOrganizationNames ? 'text-slate-200 font-medium' : 'text-slate-400 font-mono'}`}>
                          {orgNameOrId}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No target organizations</p>
                  )}
                </div>
              </div>

              {/* Deployment Notes */}
              {selectedDeploy.notes && (
                <div className="pt-4 border-t border-slate-800 space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Notes</label>
                  <p className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                    {selectedDeploy.notes}
                  </p>
                </div>
              )}

              {/* Error Details (if failed) */}
              {selectedDeploy.status === 'FAILED' && (selectedDeploy.failureReason || selectedDeploy.errorMessage) && (
                <div className="pt-4 border-t border-rose-500/20 space-y-1.5 bg-rose-500/10 p-4 rounded-lg">
                  <label className="text-xs font-medium text-rose-400">Failure Reason</label>
                  <p className="text-sm text-rose-300 font-mono break-words">{selectedDeploy.failureReason || selectedDeploy.errorMessage}</p>
                </div>
              )}

              {/* Status History */}
              {selectedDeploy.statusHistory?.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <label className="text-xs font-medium text-slate-400">Status History</label>
                  <div className="space-y-2">
                    {selectedDeploy.statusHistory.map((history, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-slate-900/30 rounded border border-slate-800/50">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${getStatusColor(history.status)}`}>
                          {history.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDate(history.timestamp)} {formatTime(history.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // Download or export functionality
                    dispatch(addToast({ type: 'info', message: 'Export feature coming soon' }));
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <Download size={14} />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deployments;
