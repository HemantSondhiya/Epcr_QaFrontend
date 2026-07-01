import client from '../api/client';

const DRAFTS_KEY = 'epcr.offline.records.drafts';
const QUEUE_KEY  = 'epcr.offline.records.sync_queue';
const CACHE_KEY  = 'epcr.offline.records.cache';
const DETAILS_CACHE_KEY = 'epcr.offline.records.details_cache';

// ── Read Cache (GET Fallback) ────────────────────────────────────────

export function getCachedRecords() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCachedRecords(records) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(records || []));
  } catch {
    // Ignore storage issues
  }
}

export function getOfflineDetailsCache() {
  try {
    const raw = sessionStorage.getItem(DETAILS_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveOfflineDetailRecord(id, record) {
  try {
    const cache = getOfflineDetailsCache();
    cache[id] = record;
    sessionStorage.setItem(DETAILS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore
  }
}

// ── Offline Drafts (Local CRUD) ──────────────────────────────────────

export function getOfflineDrafts() {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveOfflineDraft(tempId, data) {
  try {
    const drafts = getOfflineDrafts();
    drafts[tempId] = { ...data, id: tempId, status: 'DRAFT_OFFLINE', isOfflineDraft: true };
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // Ignore
  }
}

export function deleteOfflineDraft(tempId) {
  try {
    const drafts = getOfflineDrafts();
    delete drafts[tempId];
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // Ignore
  }
}

// ── Sync Queue (FIFO mutations queue) ───────────────────────────────

export function getOfflineSyncQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineSyncQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue || []));
  } catch {
    // Ignore
  }
}

export function enqueueSyncAction(action) {
  try {
    const queue = getOfflineSyncQueue();
    queue.push(action);
    saveOfflineSyncQueue(queue);
  } catch {
    // Ignore
  }
}

// ── Throttled Sequential Flush ──────────────────────────────────────

/**
 * Replays offline ePCR requests sequentially (FIFO) with a 1-second delay between requests.
 * Updates subsequent queue actions if a tempId is mapped to a real MongoDB ID.
 *
 * @param {function} onProgress - Callback triggered after each item finishes: (syncedCount, totalCount)
 */
export async function syncOfflineRecords(onProgress) {
  let queue = getOfflineSyncQueue();
  if (queue.length === 0) return true;

  const total = queue.length;
  let completed = 0;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];

    // 1-second throttle delay before each sync request (protects DB and server resources)
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      if (item.type === 'CREATE') {
        const config = {
          headers: {
            'Idempotency-Key': `epcr-create-${item.tempId}`
          }
        };

        const res = await client.post('/api/epcr/records', item.data, config);
        const realRecord = res.data;
        const realId = realRecord.id;

        // Delete the temporary local draft
        deleteOfflineDraft(item.tempId);

        // Idempotency Mapping Shift:
        // Update any remaining UPDATE actions in the queue referencing this tempId to the new realId
        for (let j = i + 1; j < queue.length; j++) {
          if (queue[j].recordId === item.tempId) {
            queue[j].recordId = realId;
          }
        }
      } 
      else if (item.type === 'UPDATE') {
        await client.put(`/api/epcr/records/${item.recordId}`, item.data);
      }
      else if (item.type === 'SUBMIT') {
        await client.post(`/api/epcr/records/${item.recordId}/submit`);
      }

      completed++;
      if (typeof onProgress === 'function') {
        onProgress(completed, total);
      }
    } catch (error) {
      // If a request fails with a 400 Bad Request or 403, we skip it so the queue isn't blocked forever,
      // but if it's a 500 or Network Error we stop sync and retry later when connection is more stable.
      const status = error.response?.status;
      if (status && status >= 400 && status < 500) {
        // Skip poisoned/invalid drafts
        completed++;
        if (typeof onProgress === 'function') {
          onProgress(completed, total);
        }
      } else {
        // Network drop or server down: save current state and abort.
        saveOfflineSyncQueue(queue.slice(completed));
        return false;
      }
    }
  }

  // Entire queue cleared successfully
  saveOfflineSyncQueue([]);
  return true;
}
