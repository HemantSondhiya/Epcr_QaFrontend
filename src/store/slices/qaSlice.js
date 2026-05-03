import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import client from '../../api/client';

const asList = (data) => Array.isArray(data) ? data : (data?.content || []);

// ── QA Forms ────────────────────────────────────────────────────────
export const fetchQaForms = createAsyncThunk('qa/fetchForms', async (orgId, { rejectWithValue }) => {
  try {
    if (orgId) {
      return (await client.get(`/api/qa/forms/organization/${orgId}`, { hideToast: true })).data;
    }

    const orgs = (await client.get('/api/organizations', { hideToast: true })).data || [];
    const forms = await Promise.all(
      orgs.map(org => client.get(`/api/qa/forms/organization/${org.id}`, { hideToast: true }).then(res => res.data || []).catch(() => []))
    );
    return forms.flat();
  } catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed to load QA forms'); }
});

export const createQaForm = createAsyncThunk('qa/createForm', async (data, { rejectWithValue }) => {
  try { return (await client.post('/api/qa/forms', data)).data; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed to create QA form'); }
});

// ── QA Reviews ──────────────────────────────────────────────────────
export const fetchQaReviews = createAsyncThunk('qa/fetchReviews', async (_, { rejectWithValue }) => {
  try { return (await client.get('/api/qa/reviews', { hideToast: true })).data; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed to load reviews'); }
});

export const fetchPendingReviews = createAsyncThunk('qa/fetchPending', async (_, { rejectWithValue }) => {
  try { return (await client.get('/api/qa/reviews/pending', { hideToast: true })).data; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed to load pending'); }
});

export const createQaReview = createAsyncThunk('qa/createReview', async (data, { rejectWithValue }) => {
  try { return (await client.post('/api/qa/reviews', data)).data; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed to create review'); }
});

export const completeQaReview = createAsyncThunk('qa/complete', async ({ id, data }, { rejectWithValue }) => {
  try { return (await client.put(`/api/qa/reviews/${id}/complete`, data)).data; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed to complete review'); }
});

// ── Slice ───────────────────────────────────────────────────────────
const qaSlice = createSlice({
  name: 'qa',
  initialState: {
    forms: [], reviews: [], pendingReviews: [],
    formsLoading: false, reviewsLoading: false, error: null,
  },
  reducers: { clearQaError(state) { state.error = null; } },
  extraReducers: (b) => {
    b.addCase(fetchQaForms.pending,    (s) => { s.formsLoading = true; })
     .addCase(fetchQaForms.fulfilled,  (s, a) => { s.formsLoading = false; s.forms = a.payload; })
     .addCase(fetchQaForms.rejected,   (s, a) => { s.formsLoading = false; s.error = a.payload; })

     .addCase(createQaForm.fulfilled,  (s, a) => { s.forms.unshift(a.payload); })

     .addCase(fetchQaReviews.pending,  (s) => { s.reviewsLoading = true; })
     .addCase(fetchQaReviews.fulfilled,(s, a) => { s.reviewsLoading = false; s.reviews = asList(a.payload); })
     .addCase(fetchQaReviews.rejected, (s, a) => { s.reviewsLoading = false; s.error = a.payload; })

     .addCase(fetchPendingReviews.fulfilled, (s, a) => { s.pendingReviews = a.payload; })

     .addCase(createQaReview.fulfilled,(s, a) => { s.reviews.unshift(a.payload); })
     .addCase(completeQaReview.fulfilled, (s, a) => {
       const idx = s.reviews.findIndex(r => r.id === a.payload.id);
       if (idx !== -1) s.reviews[idx] = a.payload;
     });
  },
});

export const { clearQaError } = qaSlice.actions;
export const selectForms          = (s) => s.qa.forms;
export const selectReviews        = (s) => s.qa.reviews;
export const selectPendingReviews = (s) => s.qa.pendingReviews;
export const selectFormsLoading   = (s) => s.qa.formsLoading;
export const selectReviewsLoading = (s) => s.qa.reviewsLoading;
export default qaSlice.reducer;
