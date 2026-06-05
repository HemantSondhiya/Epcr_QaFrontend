import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import client, { extractErrorMessage } from '../../api/client';

// ── Individual thunks — each fires independently so charts render as
//    soon as their own API responds, not waiting for the slowest one.

export const fetchReportStats = createAsyncThunk('reports/fetchStats', async (_, { rejectWithValue }) => {
  try { return (await client.get('/api/reports/statistics', { hideToast: true })).data; }
  catch (e) { return rejectWithValue(extractErrorMessage(e)); }
});

export const fetchQaPerformance = createAsyncThunk('reports/fetchQaPerf', async (_, { rejectWithValue }) => {
  try { return (await client.get('/api/reports/qa-performance', { hideToast: true })).data; }
  catch (e) { return rejectWithValue(extractErrorMessage(e)); }
});

export const fetchRecordsByStatus = createAsyncThunk('reports/fetchByStatus', async (_, { rejectWithValue }) => {
  try { return (await client.get('/api/reports/records-by-status', { hideToast: true })).data; }
  catch (e) { return rejectWithValue(extractErrorMessage(e)); }
});

// kept for backwards-compat (fires all three, result not used for rendering)
export const fetchAllReports = () => (dispatch) => {
  dispatch(fetchReportStats());
  dispatch(fetchQaPerformance());
  dispatch(fetchRecordsByStatus());
};

export const fetchCustomReport = createAsyncThunk('reports/fetchCustom', async (filters = {}, { rejectWithValue }) => {
  try {
    const { startDate, endDate, incidentType, status, location, minScore, maxScore } = filters;
    const params = {};
    if (startDate)    params.startDate    = new Date(startDate).toISOString();
    if (endDate)      params.endDate      = new Date(endDate).toISOString();
    if (incidentType) params.incidentType = incidentType;
    if (status)       params.status       = status;
    if (location)     params.location     = location;
    if (minScore !== undefined && minScore !== '') params.minScore = Number(minScore);
    if (maxScore !== undefined && maxScore !== '') params.maxScore = Number(maxScore);
    return (await client.get('/api/reports/custom', { params })).data;
  } catch (e) { return rejectWithValue(extractErrorMessage(e)); }
});

export const fetchBuilderStats = createAsyncThunk('reports/fetchBuilderStats', async (filters = {}, { rejectWithValue }) => {
  try {
    const { startDate, endDate, incidentType, status, location, minScore, maxScore } = filters;
    const params = {};
    if (startDate)    params.startDate    = new Date(startDate).toISOString();
    if (endDate)      params.endDate      = new Date(endDate).toISOString();
    if (incidentType) params.incidentType = incidentType;
    if (status)       params.status       = status;
    if (location)     params.location     = location;
    if (minScore !== undefined && minScore !== '') params.minScore = Number(minScore);
    if (maxScore !== undefined && maxScore !== '') params.maxScore = Number(maxScore);
    return (await client.get('/api/reports/custom', { params, hideToast: true })).data;
  } catch (e) { return rejectWithValue(extractErrorMessage(e)); }
});

export const fetchBuilderRecords = createAsyncThunk('reports/fetchBuilderRecords', async (payload = {}, { rejectWithValue }) => {
  try {
    const { page = 0, size = 15, status, incidentType, search, startDate, endDate, paramedicId } = payload;
    const params = { page, size };
    if (paramedicId)  params.paramedicId  = paramedicId;
    if (status)       params.status       = status;
    if (incidentType) params.incidentType = incidentType;
    if (search)       params.search       = search;
    if (startDate)    params.startDate    = startDate;
    if (endDate)      params.endDate      = endDate;
    const res = await client.get('/api/epcr/records', { params, hideToast: true });
    return res.data;
  }
  catch (e) { return rejectWithValue(extractErrorMessage(e)); }
});

// ── Slice ───────────────────────────────────────────────────────────

const reportSlice = createSlice({
  name: 'reports',
  initialState: {
    statistics:            null,  statsLoading:          false,
    qaPerformance:         null,  qaLoading:             false,
    recordsByStatus:       null,  byStatusLoading:       false,
    customReport:          null,  customLoading:         false,
    builderStats:          null,  builderStatsLoading:   false,
    builderRecords:        [],
    builderPagination:     { page: 0, totalPages: 0, totalElements: 0, isLast: true },
    builderRecordsLoading: false,
    error: null,
  },
  reducers: {
    clearReportError: (state) => { state.error = null; },
  },
  extraReducers: (b) => {
    b
      // stats
      .addCase(fetchReportStats.pending,   (s) => { s.statsLoading = true; })
      .addCase(fetchReportStats.fulfilled, (s, a) => { s.statsLoading = false; s.statistics = a.payload; })
      .addCase(fetchReportStats.rejected,  (s) => { s.statsLoading = false; })

      // QA performance
      .addCase(fetchQaPerformance.pending,   (s) => { s.qaLoading = true; })
      .addCase(fetchQaPerformance.fulfilled, (s, a) => { s.qaLoading = false; s.qaPerformance = a.payload; })
      .addCase(fetchQaPerformance.rejected,  (s) => { s.qaLoading = false; })

      // by-status
      .addCase(fetchRecordsByStatus.pending,   (s) => { s.byStatusLoading = true; })
      .addCase(fetchRecordsByStatus.fulfilled, (s, a) => { s.byStatusLoading = false; s.recordsByStatus = a.payload; })
      .addCase(fetchRecordsByStatus.rejected,  (s) => { s.byStatusLoading = false; })

      // custom report
      .addCase(fetchCustomReport.pending,   (s) => { s.customLoading = true; s.error = null; })
      .addCase(fetchCustomReport.fulfilled, (s, a) => { s.customLoading = false; s.customReport = a.payload; })
      .addCase(fetchCustomReport.rejected,  (s, a) => { s.customLoading = false; s.error = a.payload; })

      // builder stats
      .addCase(fetchBuilderStats.pending,   (s) => { s.builderStatsLoading = true; })
      .addCase(fetchBuilderStats.fulfilled, (s, a) => { s.builderStatsLoading = false; s.builderStats = a.payload; })
      .addCase(fetchBuilderStats.rejected,  (s) => { s.builderStatsLoading = false; })

      // builder records
      .addCase(fetchBuilderRecords.pending,   (s) => { s.builderRecordsLoading = true; })
      .addCase(fetchBuilderRecords.fulfilled, (s, a) => {
        s.builderRecordsLoading = false;
        const raw = a.payload;
        const newList = Array.isArray(raw) ? raw : (raw?.content || []);
        s.builderRecords = newList;
        if (raw && !Array.isArray(raw) && (raw.totalElements !== undefined || raw.page !== undefined || raw.content !== undefined)) {
          s.builderPagination = {
            page: raw.page ?? 0,
            totalPages: raw.totalPages === -1 || raw.totalPages === undefined ? 1 : raw.totalPages,
            totalElements: raw.totalElements === -1 || raw.totalElements === undefined ? newList.length : raw.totalElements,
            isLast: raw.last ?? true,
          };
        }
      })
      .addCase(fetchBuilderRecords.rejected,  (s) => { s.builderRecordsLoading = false; });
  },
});

export const { clearReportError } = reportSlice.actions;

// Selectors
export const selectReportStats         = (s) => s.reports.statistics;
export const selectStatsLoading        = (s) => s.reports.statsLoading;
export const selectReportQaPerf        = (s) => s.reports.qaPerformance;
export const selectQaLoading           = (s) => s.reports.qaLoading;
export const selectReportByStatus      = (s) => s.reports.recordsByStatus;
export const selectByStatusLoading     = (s) => s.reports.byStatusLoading;
export const selectCustomReport        = (s) => s.reports.customReport;
export const selectCustomReportLoading = (s) => s.reports.customLoading;
export const selectBuilderStats        = (s) => s.reports.builderStats;
export const selectBuilderStatsLoading = (s) => s.reports.builderStatsLoading;
export const selectBuilderRecords      = (s) => s.reports.builderRecords;
export const selectBuilderPagination   = (s) => s.reports.builderPagination;
export const selectBuilderRecordsLoading = (s) => s.reports.builderRecordsLoading;

// Legacy — still used by loadOverview callback reference
export const selectReportLoading = (s) => s.reports.statsLoading || s.reports.qaLoading || s.reports.byStatusLoading;

export default reportSlice.reducer;
