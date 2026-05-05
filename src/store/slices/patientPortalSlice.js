import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import client, { extractErrorMessage } from '../../api/client';

const asList = (data) => Array.isArray(data) ? data : (data?.content || []);

// ── Async Thunks ────────────────────────────────────────────────────

export const fetchPortalData = createAsyncThunk('patientPortal/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const [r, a, rs, d] = await Promise.all([
      client.get('/api/patient-portal/records', { hideToast: true }),
      client.get('/api/patient-portal/amendment-requests', { hideToast: true }),
      client.get('/api/patient-portal/disclosure-restrictions', { hideToast: true }),
      client.get('/api/patient-portal/disclosures', { hideToast: true }),
    ]);
    return {
      records: asList(r.data),
      amendments: asList(a.data),
      restrictions: asList(rs.data),
      disclosures: asList(d.data)
    };
  } catch (e) {
    return rejectWithValue(extractErrorMessage(e));
  }
});

export const createAmendment = createAsyncThunk('patientPortal/createAmendment', async (payload, { rejectWithValue }) => {
  try {
    return (await client.post('/api/patient-portal/amendment-requests', payload)).data;
  } catch (e) {
    return rejectWithValue(extractErrorMessage(e));
  }
});

export const createRestriction = createAsyncThunk('patientPortal/createRestriction', async (payload, { rejectWithValue }) => {
  try {
    return (await client.post('/api/patient-portal/disclosure-restrictions', payload)).data;
  } catch (e) {
    return rejectWithValue(extractErrorMessage(e));
  }
});

// ── Slice ───────────────────────────────────────────────────────────

const patientPortalSlice = createSlice({
  name: 'patientPortal',
  initialState: {
    records: [],
    amendments: [],
    restrictions: [],
    disclosures: [],
    loading: false,
    error: null
  },
  reducers: {
    clearPortalError: (state) => { state.error = null; }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPortalData.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPortalData.fulfilled, (state, action) => {
        state.loading = false;
        state.records = action.payload.records;
        state.amendments = action.payload.amendments;
        state.restrictions = action.payload.restrictions;
        state.disclosures = action.payload.disclosures;
      })
      .addCase(fetchPortalData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      .addCase(createAmendment.fulfilled, (state, action) => {
        state.amendments.unshift(action.payload);
      })
      .addCase(createRestriction.fulfilled, (state, action) => {
        state.restrictions.unshift(action.payload);
      });
  }
});

export const { clearPortalError } = patientPortalSlice.actions;

export const selectPortalRecords = (state) => state.patientPortal.records;
export const selectPortalAmendments = (state) => state.patientPortal.amendments;
export const selectPortalRestrictions = (state) => state.patientPortal.restrictions;
export const selectPortalDisclosures = (state) => state.patientPortal.disclosures;
export const selectPortalLoading = (state) => state.patientPortal.loading;

export default patientPortalSlice.reducer;
