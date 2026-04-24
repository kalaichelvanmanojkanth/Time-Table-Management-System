import axios from 'axios';
import { toast } from 'react-toastify';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export function isBackendUnavailableError(error) {
  const code = error?.code || '';
  const msg = String(error?.message || '');
  return (
    !error?.response && (
      code === 'ERR_NETWORK' ||
      code === 'ECONNABORTED' ||
      /Network Error|ECONNREFUSED|ENOTFOUND|timeout/i.test(msg)
    )
  );
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json; charset=utf-8',
  },
  timeout: 15000, // 15-second timeout so hanging requests don't block UI
  responseType: 'json',
});

const getNormalizedErrorMessage = (error) => {
  const responseData = error?.response?.data;

  if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
    const formattedErrors = responseData.errors
      .map((item) => item?.msg || item?.message || item)
      .filter(Boolean);

    if (formattedErrors.length > 0) {
      return formattedErrors.join(', ');
    }
  }

  if (Array.isArray(responseData?.message) && responseData.message.length > 0) {
    const formattedMessages = responseData.message
      .map((item) => item?.msg || item?.message || item)
      .filter(Boolean);

    if (formattedMessages.length > 0) {
      return formattedMessages.join(', ');
    }
  }

  if (typeof responseData?.message === 'string' && responseData.message.trim()) {
    return responseData.message;
  }

  if (typeof responseData?.error === 'string' && responseData.error.trim()) {
    return responseData.error;
  }

  if (!error?.response) {
    return 'Unable to reach server. Please check your connection and try again.';
  }

  return error?.message || 'Request failed. Please try again.';
};

/* ── Request interceptor: attach auth token ── */
api.interceptors.request.use(
  (config) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    } catch {
      // malformed user entry — ignore silently
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ── Response interceptor: centralised error handling and encoding verification ── */
api.interceptors.response.use(
  (response) => {
    // Log API response data before it reaches the frontend components
    if (process.env.NODE_ENV !== 'production') {
      const dataPreview = JSON.stringify(response.data)?.slice(0, 200);
      console.log(`[API] Response from ${response.config?.url} (${response.status}):`, dataPreview);
    }
    return response;
  },
  (error) => {
    error.message = getNormalizedErrorMessage(error);
    const status   = error.response?.status;
    const message  = getNormalizedErrorMessage(error);
    const isSilent = error.config?._silent === true; // caller opted out of global toast

    error.message = message;

    if (status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (!isSilent) {
      if (status === 400) {
        toast.error(`Validation error: ${message || 'Bad request'}`, { autoClose: 3500 });
      } else if (status === 404) {
        // 404 is expected on first startup (no setup yet) — log only
        console.info('[API] 404:', error.config?.url);
      } else if (status >= 500) {
        // Deduplicate so rapid retries never stack multiple toasts
        toast.error(`Server error (${status}) — please try again`, {
          toastId:   `server-error-${status}`,
          autoClose: 3500,
        });
      } else if (!status) {
        // Network error / backend offline
        toast.warning('Backend unavailable — working offline', {
          toastId:   'backend-offline',
          autoClose: 3000,
        });
      }
    } else {
      // Silent call — only log to console, never toast
      if (status) {
        console.info(`[API] silent ${status}:`, error.config?.url);
      }
    }

    return Promise.reject(error);
  }
);

/* ════════════════════════════════════════════
   SCHEDULE API
════════════════════════════════════════════ */
/** Fetch all saved schedules */
export const getSchedules = () => api.get('/schedule');

/** Save a schedule configuration to MongoDB (auto-generates entries if empty) */
export const saveSchedule = (schedule) => api.post('/schedule', schedule);

/**
 * POST /api/schedule/generate
 * Generate timetable entries server-side without saving to DB.
 * Returns { success, count, data: [{day, slot, time, teacher, subject, room}] }
 */
export const generateSchedule = (setupData) => api.post('/schedule/generate', setupData);

/** Delete a schedule by ID */
export const deleteSchedule = (id) => api.delete(`/schedule/${id}`);

/* ════════════════════════════════════════════
   AI ENGINE  (conflict detection + optimization)
════════════════════════════════════════════ */
/**
 * POST /api/ai/run
 * Run server-side AI scheduling.
 * Returns { conflicts: [{type, severity, message, detail}],
 *           suggestions: [{type, severity, message, fix}],
 *           meta: { highConflicts, highSuggestions, ... } }
 */
export const runAIScheduling = (setupData) => api.post('/ai/run', setupData);

/* ════════════════════════════════════════════
   AI SETUP  (MongoDB persistence)
════════════════════════════════════════════ */
/**
 * POST /api/ai-setup
 * Save timetable configuration to the AISetup MongoDB collection.
 */
export const saveAISetup = (setupData) => api.post('/ai-setup', setupData);

/**
 * GET /api/ai-setup
 * Fetch the most recently saved AI setup from MongoDB.
 * Returns { success, data: { teachers, subjects, rooms, workingDays, timeSlots, constraints } }
 * Marked _silent so a DB 500 never shows a toast — callers fall back to localStorage.
 */
export const getLatestAISetup = () => api.get('/ai-setup', { _silent: true });

/**
 * GET /api/ai-setup/all
 * Fetch all saved AI setups (newest first, max 20).
 * Marked _silent — callers handle empty results gracefully.
 */
export const getAllAISetups = () => api.get('/ai-setup/all', { _silent: true });

/**
 * DELETE /api/ai-setup/:id
 * Delete a specific saved AI setup.
 */
export const deleteAISetup = (id) => api.delete(`/ai-setup/${id}`);

/* ════════════════════════════════════════════
   RESOURCE API  (Teachers, Subjects, Rooms)
════════════════════════════════════════════ */
/**
 * GET /api/teachers
 * Returns { success, count, data: [{ _id, name, department, ... }] }
 */
export const getTeachers = () => api.get('/teachers', { _silent: true });

/**
 * GET /api/subjects
 * Returns { success, count, data: [{ _id, name, code, ... }] }
 */
export const getSubjects = () => api.get('/subjects', { _silent: true });

/**
 * GET /api/rooms
 * Returns { success, count, data: [{ _id, name, type, capacity, ... }] }
 */
export const getRooms = () => api.get('/rooms', { _silent: true });

/**
 * POST /api/resource/seed-samples
 * Seeds sample teachers, subjects, and rooms (idempotent).
 */
export const seedSampleResources = () => api.post('/resource/seed-samples', {});

/* ════════════════════════════════════════════
   HEALTH CHECK
════════════════════════════════════════════ */
/**
 * GET /api/health
 * Returns API + MongoDB connection status.
 */
export const checkHealth = () => api.get('/health');

/* ════════════════════════════════════════════
   TIMETABLE API  (real MongoDB data)
════════════════════════════════════════════ */
/**
 * GET /api/timetables
 * Fetch full timetable from MongoDB (with optional filters).
 * Returns { success, count, data: [...], grid: {...}, meta: {...} }
 * @param {object} filters - Optional { day, teacher, subject, room }
 */
export const getTimetables = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.day)     params.set('day',     filters.day);
  if (filters.teacher) params.set('teacher', filters.teacher);
  if (filters.subject) params.set('subject', filters.subject);
  if (filters.room)    params.set('room',    filters.room);
  const qs = params.toString();
  return api.get(`/timetables${qs ? `?${qs}` : ''}`, { _silent: true });
};

/**
 * GET /api/conflicts
 * Detect all conflicts from real DB timetable entries.
 * Returns { success, conflicts: [...], suggestions: [...], meta: {...} }
 */
export const getTimetableConflicts = () => api.get('/timetables/conflicts', { _silent: true });

/**
 * POST /api/optimize
 * Run the greedy optimization engine on DB timetable.
 * Returns { success, before: {...}, after: {...}, meta: {...} }
 */
export const optimizeTimetable = () => api.post('/timetables/optimize', {});

/**
 * POST /api/apply-fixes
 * Write optimized timetable entries back to MongoDB.
 * @param {Array} entries - Modified timetable entries from optimize response
 */
export const applyTimetableFixes = (entries) => api.post('/timetables/apply-fixes', { entries });

/**
 * POST /api/timetables
 * Create a new timetable entry in MongoDB.
 */
export const createTimetableEntry = (entry) => api.post('/timetables', entry);

/**
 * PUT /api/timetables/:id
 * Update a timetable entry.
 */
export const updateTimetableEntry = (id, data) => api.put(`/timetables/${id}`, data);

/**
 * DELETE /api/timetables/:id
 * Delete a timetable entry.
 */
export const deleteTimetableEntry = (id) => api.delete(`/timetables/${id}`);

/**
 * POST /api/timetables/seed
 * Admin: Seed the Timetable collection from the latest AISetup.
 * Deletes all existing entries first (no E11000).
 */
export const seedTimetableFromSetup = () => api.post('/timetables/seed', {});

/**
 * PUT /api/timetables/approve
 * Mark all timetable entries as "approved".
 * Blocked if high-severity conflicts exist.
 * Returns { success, approvedCount, approvedAt }
 */
export const approveTimetable = () => api.put('/timetables/approve', {});

/**
 * PUT /api/timetables/publish
 * Mark all "approved" entries as "published".
 * Blocked if any entry is not yet approved.
 * Returns { success, publishedCount, publishedAt }
 */
export const publishTimetable = () => api.put('/timetables/publish', {});

export default api;
