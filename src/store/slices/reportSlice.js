import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import client, { extractErrorMessage } from '../../api/client';

// ── Async Thunks ────────────────────────────────────────────────────

export const fetchAllReports = createAsyncThunk('reports/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const [s, q, b] = await Promise.all([
      client.get('/api/reports/statistics'),
      client.get('/api/reports/qa-performance'),
      client.get('/api/reports/records-by-status'),
    ]);
    return {
      statistics: s.data,
      qaPerformance: q.data,
      recordsByStatus: b.data
    };
  } catch (e) {
    return rejectWithValue(extractErrorMessage(e));
  }
});

export const fetchCustomReport = createAsyncThunk('reports/fetchCustom', async ({ startDate, endDate }, { rejectWithValue }) => {
  try {
    const params = {};
    if (startDate) params.startDate = new Date(startDate).toISOString();
    if (endDate) params.endDate = new Date(endDate).toISOString();
    return (await client.get('/api/reports/custom', { params })).data;
  } catch (e) {
    return rejectWithValue(extractErrorMessage(e));
  }
});

// ── Slice ───────────────────────────────────────────────────────────

const reportSlice = createSlice({
  name: 'reports',
  initialState: {
    statistics: null,
    qaPerformance: null,
    recordsByStatus: null,
    customReport: null,
    loading: false,
    customLoading: false,
    error: null
  },
  reducers: {
    clearReportError: (state) => { state.error = null; }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllReports.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAllReports.fulfilled, (state, action) => {
        state.loading = false;
        state.statistics = action.payload.statistics;
        state.qaPerformance = action.payload.qaPerformance;
        state.recordsByStatus = action.payload.recordsByStatus;
      })
      .addCase(fetchAllReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchCustomReport.pending, (state) => { state.customLoading = true; state.error = null; })
      .addCase(fetchCustomReport.fulfilled, (state, action) => {
        state.customLoading = false;
        state.customReport = action.payload;
      })
      .addCase(fetchCustomReport.rejected, (state, action) => {
        state.customLoading = false;
        state.error = action.payload;
      });
  }
});

export const { clearReportError } = reportSlice.actions;

export const selectReportStats = (state) => state.reports.statistics;
export const selectReportQaPerf = (state) => state.reports.qaPerformance;
export const selectReportByStatus = (state) => state.reports.recordsByStatus;
export const selectCustomReport = (state) => state.reports.customReport;
export const selectReportLoading = (state) => state.reports.loading;
export const selectCustomReportLoading = (state) => state.reports.customLoading;

export default reportSlice.reducer;
