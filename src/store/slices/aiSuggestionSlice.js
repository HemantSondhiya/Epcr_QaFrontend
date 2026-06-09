import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import client, { extractErrorMessage } from '../../api/client';

// ── Async Thunks ────────────────────────────────────────────────────

/** POST /api/ai/suggestions/{recordId} — generate + store a new suggestion */
export const generateAiSuggestion = createAsyncThunk(
  'aiSuggestion/generate',
  async (recordId, { rejectWithValue }) => {
    try {
      return (await client.post(`/api/ai/suggestions/${recordId}`)).data;
    } catch (e) {
      return rejectWithValue(extractErrorMessage(e));
    }
  }
);

/** GET /api/ai/suggestions/{recordId} — fetch previous suggestions (newest first) */
export const fetchAiSuggestions = createAsyncThunk(
  'aiSuggestion/fetchAll',
  async (recordId, { rejectWithValue }) => {
    try {
      return (await client.get(`/api/ai/suggestions/${recordId}`, { hideToast: true })).data;
    } catch (e) {
      return rejectWithValue(extractErrorMessage(e));
    }
  }
);

// ── Slice ───────────────────────────────────────────────────────────

const aiSuggestionSlice = createSlice({
  name: 'aiSuggestion',
  initialState: {
    /** suggestions keyed by recordId */
    byRecord: {},
    /** recordId currently being generated/fetched */
    loadingGenerate: false,
    loadingFetch: false,
    error: null,
  },
  reducers: {
    clearAiError(state) { state.error = null; },
    clearSuggestionsForRecord(state, { payload: recordId }) {
      delete state.byRecord[recordId];
    },
  },
  extraReducers: (b) => {
    // Generate
    b.addCase(generateAiSuggestion.pending, (s) => { s.loadingGenerate = true; s.error = null; })
     .addCase(generateAiSuggestion.fulfilled, (s, { payload, meta }) => {
       s.loadingGenerate = false;
       // Use payload.recordId first, fall back to the thunk argument (meta.arg)
       const rid = payload?.recordId || meta.arg;
       if (rid) {
         // Prepend new suggestion; avoid duplicates by id
         const existing = s.byRecord[rid] || [];
         const isDuplicate = payload?.id && existing.some(x => x.id === payload.id);
         s.byRecord[rid] = isDuplicate ? existing : [payload, ...existing];
       }
     })
     .addCase(generateAiSuggestion.rejected, (s, a) => { s.loadingGenerate = false; s.error = a.payload; });

    // Fetch all
    b.addCase(fetchAiSuggestions.pending, (s) => { s.loadingFetch = true; s.error = null; })
     .addCase(fetchAiSuggestions.fulfilled, (s, { payload, meta }) => {
       s.loadingFetch = false;
       const rid = meta.arg;
       s.byRecord[rid] = Array.isArray(payload) ? payload : (payload?.content || []);
     })
     .addCase(fetchAiSuggestions.rejected, (s, a) => { s.loadingFetch = false; s.error = a.payload; });
  },
});

export const { clearAiError, clearSuggestionsForRecord } = aiSuggestionSlice.actions;

export const selectSuggestionsForRecord = (recordId) => (state) =>
  state.aiSuggestion.byRecord[recordId] || [];
export const selectAiGenerating  = (state) => state.aiSuggestion.loadingGenerate;
export const selectAiFetching    = (state) => state.aiSuggestion.loadingFetch;
export const selectAiError       = (state) => state.aiSuggestion.error;

export default aiSuggestionSlice.reducer;
