/**
 * analyticsService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source-of-truth for all analytics data fetching and calculation.
 *
 * Architecture:
 *  - Uses centralized API client from services/api.js
 *  - Base URL defaults to http://localhost:5001/api
 *  - Backend populates Timetable references: subjectId, teacherId, roomId
 *    so each entry looks like:
 *      { subjectId: { _id, name, department }, teacherId: { _id, name }, ... }
 *
 * Every public function is SAFE: always returns an array or usable value.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import api, { isBackendUnavailableError } from './api';

/* ═══════════════════════════════════════════════════════════════════════════
   REQUEST HELPERS
═══════════════════════════════════════════════════════════════════════════ */

const RETRY_DELAY_MS = 600;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getWithRetry(path, retries = 1) {
  try {
    return await api.get(path);
  } catch (err) {
    if (retries > 0 && isBackendUnavailableError(err)) {
      await wait(RETRY_DELAY_MS);
      return getWithRetry(path, retries - 1);
    }
    throw err;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   INTERNAL HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Extract a plain array from whatever the backend returns.
 * Backend envelope:  { success: true, data: [...] }
 * Also handles raw arrays and { data: [...] }.
 */
function extractArray(responseData) {
  if (Array.isArray(responseData)) return responseData;
  if (responseData && Array.isArray(responseData.data)) return responseData.data;
  return [];
}

/**
 * Safe GET that always resolves to an array.
 * path must start with '/'  (e.g. '/teachers', '/analytics/workload').
 * The axios instance already has baseURL='/api'.
 */
async function safeFetch(path) {
  try {
    console.log(`[API] GET ${path}`);
    const res    = await getWithRetry(path, 1);
    const result = extractArray(res.data);
    console.log(`[API] GET ${path} → ${result.length} items`);
    return result;
  } catch (err) {
    const status = err?.response?.status;
    const msg    = err?.response?.data?.message || err.message;
    console.error(`[API] GET ${path} FAILED (${status ?? 'network'}): ${msg}`);
    throw err; // re-throw so callers distinguish API failure from empty result
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   PUBLIC FETCH FUNCTIONS — Core Collections
═══════════════════════════════════════════════════════════════════════════ */

export const fetchTeachers = async () => {
  const rows = await safeFetch('/teachers');
  return rows.map((t, i) => ({
    ...t,
    _id: t._id || t.id || `teacher-${i}`,
    name: t.name || t.teacherName || t.fullName || t.lecturerName || 'Unknown Faculty',
    department: t.department || t.dept || '',
    maxWeeklyHours: Number(t.maxWeeklyHours || t.maxHours || 20),
  }));
};

export const fetchSubjects = () => safeFetch('/subjects');
export const fetchRooms = () => safeFetch('/rooms');
export const fetchTimetables = async () => {
  const rows = await safeFetch('/timetables');
  return normaliseEntries(rows);
};

/* Schedule aliases (used by other modules) */
export const getSchedules = () => fetchTimetables();
export const saveSchedule = (data) => createTimetable(data);

/* ═══════════════════════════════════════════════════════════════════════════
   PUBLIC FETCH FUNCTIONS — Server-side computed analytics
   These endpoints do the heavy calculation on the backend and return results
   directly — faster and more accurate than client-side computes.
═══════════════════════════════════════════════════════════════════════════ */

/** Live KPI counts: { teachers, subjects, rooms, timetables } */
export async function fetchAnalyticsSummary() {
  try {
    const res = await api.get('/analytics/summary');
    const d   = res.data?.data || res.data || {};
    console.log('[API] /analytics/summary →', d);
    return {
      teachers:   Number(d.teachers   ?? 0),
      subjects:   Number(d.subjects   ?? 0),
      rooms:      Number(d.rooms      ?? 0),
      timetables: Number(d.timetables ?? 0),
    };
  } catch (err) {
    console.error('[API] /analytics/summary FAILED:', err?.response?.data?.message || err.message);
    return { teachers: 0, subjects: 0, rooms: 0, timetables: 0 };
  }
}

/** Server-computed teacher workload array */
export async function fetchWorkload() {
  return safeFetch('/analytics/workload');
}

/** Server-computed room utilization array */
export async function fetchRoomUtilization(weeklyAvailableHours = 40) {
  return safeFetch(`/analytics/room-utilization?weeklyAvailableHours=${weeklyAvailableHours}`);
}

/** Server-computed subject distribution array */
export async function fetchSubjectDistribution() {
  return safeFetch('/analytics/subject-distribution');
}

/** Server-computed weekly trend array */
export async function fetchWeeklyTrend() {
  return safeFetch('/analytics/weekly-trend');
}

/* ═══════════════════════════════════════════════════════════════════════════
   CRUD — Teachers
═══════════════════════════════════════════════════════════════════════════ */

export const createTeacher = async (data) => {
  console.log('[API] POST /teachers payload:', data);
  const res = await api.post('/teachers', data);
  console.log('[API] POST /teachers response:', res.data);
  const record = res.data?.data ?? res.data;
  if (!record) throw new Error('No data returned from createTeacher');
  return record;
};

export const updateTeacher = async (id, data) => {
  console.log(`[API] PUT /teachers/${id} payload:`, data);
  const res = await api.put(`/teachers/${id}`, data);
  console.log(`[API] PUT /teachers/${id} response:`, res.data);
  return res.data?.data ?? res.data;
};

export const deleteTeacher = (id) => {
  console.log(`[API] DELETE /teachers/${id}`);
  return api.delete(`/teachers/${id}`);
};

/* ═══════════════════════════════════════════════════════════════════════════
   CRUD — Subjects
═══════════════════════════════════════════════════════════════════════════ */

export const createSubject = async (data) => {
  console.log('[API] POST /subjects payload:', data);
  const res = await api.post('/subjects', data);
  console.log('[API] POST /subjects response:', res.data);
  const record = res.data?.data ?? res.data;
  if (!record) throw new Error('No data returned from createSubject');
  return record;
};

export const updateSubject = async (id, data) => {
  console.log(`[API] PUT /subjects/${id} payload:`, data);
  const res = await api.put(`/subjects/${id}`, data);
  return res.data?.data ?? res.data;
};

export const deleteSubject = (id) => {
  console.log(`[API] DELETE /subjects/${id}`);
  return api.delete(`/subjects/${id}`);
};

/* ═══════════════════════════════════════════════════════════════════════════
   CRUD — Rooms
═══════════════════════════════════════════════════════════════════════════ */

export const createRoom = async (data) => {
  console.log('[API] POST /rooms payload:', data);
  const res = await api.post('/rooms', data);
  console.log('[API] POST /rooms response:', res.data);
  const record = res.data?.data ?? res.data;
  if (!record) throw new Error('No data returned from createRoom');
  return record;
};

export const updateRoom = async (id, data) => {
  console.log(`[API] PUT /rooms/${id} payload:`, data);
  const res = await api.put(`/rooms/${id}`, data);
  return res.data?.data ?? res.data;
};

export const deleteRoom = (id) => {
  console.log(`[API] DELETE /rooms/${id}`);
  return api.delete(`/rooms/${id}`);
};

/* ═══════════════════════════════════════════════════════════════════════════
   CRUD — Timetables
═══════════════════════════════════════════════════════════════════════════ */

export const createTimetable = async (data) => {
  const res = await api.post('/timetables', data);
  return res.data?.data ?? res.data;
};

export const updateTimetable = async (id, data) => {
  const res = await api.put(`/timetables/${id}`, data);
  return res.data?.data ?? res.data;
};

export const deleteTimetable = (id) => api.delete(`/timetables/${id}`);

/* ═══════════════════════════════════════════════════════════════════════════
   FIELD NORMALIZATION — handles populated Mongoose objects AND plain strings
═══════════════════════════════════════════════════════════════════════════ */

/** Trim + collapse whitespace + lowercase */
function norm(v) {
  if (v == null) return '';
  return String(v).trim().replace(/\s+/g, ' ').toLowerCase();
}

/** "HH:MM" → minutes since midnight */
function toMin(t) {
  if (!t || typeof t !== 'string') return 0;
  const parts = t.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/** Duration of a timetable entry in minutes (default 60) */
function slotMinutes(entry) {
  const diff = toMin(entry.endTime) - toMin(entry.startTime);
  return diff > 0 ? diff : 60;
}

/**
 * Safely extract the string ID from a field that may be:
 *   - a populated Mongoose object:  { _id: "64abc...", name: "..." }
 *   - a raw ObjectId string:         "64abc..."
 *   - null / undefined
 */
function resolveId(field) {
  if (field == null) return '';
  if (typeof field === 'number') return String(field);
  if (typeof field === 'object') {
    const id = field._id ?? field.id;
    return id != null ? String(id) : '';
  }
  return String(field);
}

/**
 * Normalize day string → 3-char title-case abbreviation.
 * Handles: "Monday", "MONDAY", "monday", "Mon", "mon"
 */
export function normalizeDay(day) {
  if (!day || typeof day !== 'string') return '';
  const abbr = norm(day).slice(0, 3);
  const MAP  = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
  return MAP[abbr] || (day.charAt(0).toUpperCase() + day.slice(1, 3).toLowerCase());
}

/* ── Field extractors for timetable entries ── */

/**
 * Get teacher name from a timetable entry.
 * Entry.teacherId may be a populated object { _id, name } or a plain string.
 */
export function getTeacherName(entry) {
  if (!entry) return '';
  // populated reference
  if (entry.teacherId && typeof entry.teacherId === 'object' && (entry.teacherId.name || entry.teacherId.teacherName || entry.teacherId.fullName || entry.teacherId.lecturerName))
    return entry.teacherId.name || entry.teacherId.teacherName || entry.teacherId.fullName || entry.teacherId.lecturerName;
  if (entry.lecturerId && typeof entry.lecturerId === 'object' && (entry.lecturerId.name || entry.lecturerId.lecturerName || entry.lecturerId.fullName))
    return entry.lecturerId.name || entry.lecturerId.lecturerName || entry.lecturerId.fullName;
  // flat fields
  return entry.teacherName || entry.teacher || entry.fullName || entry.lecturerName || entry.faculty || entry.lecturer || '';
}

/**
 * Get room name from a timetable entry.
 */
export function getRoomName(entry) {
  if (!entry) return '';
  if (entry.roomId && typeof entry.roomId === 'object' && (entry.roomId.name || entry.roomId.roomName))
    return entry.roomId.name || entry.roomId.roomName;
  return entry.roomName || entry.room || entry.classroom || entry.name || '';
}

/**
 * Get subject name from a timetable entry.
 */
export function getSubjectName(entry) {
  if (!entry) return '';
  if (entry.subjectId && typeof entry.subjectId === 'object' && (entry.subjectId.name || entry.subjectId.subjectName || entry.subjectId.courseName))
    return entry.subjectId.name || entry.subjectId.subjectName || entry.subjectId.courseName;
  if (entry.courseId && typeof entry.courseId === 'object' && (entry.courseId.name || entry.courseId.courseName || entry.courseId.title))
    return entry.courseId.name || entry.courseId.courseName || entry.courseId.title;
  return entry.subjectName || entry.subject || entry.courseName || entry.module || '';
}

/**
 * Get day string from a timetable entry.
 */
export function getDayName(entry) {
  if (!entry) return '';
  if (entry.day || entry.weekday || entry.dayOfWeek) {
    return entry.day || entry.weekday || entry.dayOfWeek || '';
  }
  if (entry.date) {
    const d = new Date(entry.date);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    }
  }
  return '';
}

function parseSlotRange(slotLike) {
  if (!slotLike) return { startTime: '', endTime: '' };
  const text = String(slotLike);
  const m = text.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!m) return { startTime: '', endTime: '' };
  return { startTime: m[1], endTime: m[2] };
}

/* ═══════════════════════════════════════════════════════════════════════════
   calcTeacherWorkload
   ─────────────────────────────────────────────────────────────────────────
   Matches each teacher to timetable entries using:
     1. ObjectId match   — resolveId(entry.teacherId) === teacher._id
     2. Name match       — norm(getTeacherName(entry)) === norm(teacher.name)

   Returns array of workload objects for each teacher.
═══════════════════════════════════════════════════════════════════════════ */
export function calcTeacherWorkload(teachers, timetable) {
  if (!Array.isArray(teachers) || teachers.length === 0) return [];

  const entries = Array.isArray(timetable) ? timetable : [];
  console.log('[calcTeacherWorkload] teachers:', teachers.length, '| timetable entries:', entries.length);

  return teachers.map(teacher => {
    // Normalize teacher fields — backend uses `name` field
    const tid    = String(teacher._id || teacher.id || '');
    const tname  = norm(teacher.name || teacher.teacherName || '');
    const maxHrs = Number(teacher.maxWeeklyHours) || 20;

    const matched = entries.filter(e => {
      // Try ID match first (most reliable)
      const eid = resolveId(e.teacherId);
      if (eid && tid && eid === tid) return true;
      // Fallback: name match
      const ename = norm(getTeacherName(e));
      return ename && tname && ename === tname;
    });

    const totalMinutes = matched.reduce((sum, e) => sum + slotMinutes(e), 0);
    const totalHours   = +(totalMinutes / 60).toFixed(1);
    const totalClasses = matched.length;

    const status =
      totalHours > maxHrs       ? 'overloaded'  :
      totalHours < maxHrs * 0.5 ? 'underloaded' : 'optimal';

    console.log(`[calcTeacherWorkload] ${tname}: matched=${matched.length}, hours=${totalHours}, status=${status}`);

    return {
      teacherId:      tid,
      teacherName:    teacher.name || teacher.teacherName || 'Unknown',
      department:     teacher.department || '',
      totalHours,
      totalMinutes,
      totalClasses,
      maxWeeklyHours: maxHrs,
      status,
    };
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   calcRoomUtilization
═══════════════════════════════════════════════════════════════════════════ */
export function calcRoomUtilization(rooms, timetable, weeklyAvailableHours = 40) {
  if (!Array.isArray(rooms) || rooms.length === 0) return [];

  const entries = Array.isArray(timetable) ? timetable : [];
  const avail   = weeklyAvailableHours > 0 ? weeklyAvailableHours : 40;
  console.log('[calcRoomUtilization] rooms:', rooms.length, '| entries:', entries.length, '| avail:', avail);

  return rooms.map(room => {
    const rid   = String(room._id || room.id || '');
    const rname = norm(room.name || '');

    const matched = entries.filter(e => {
      const eid = resolveId(e.roomId);
      if (eid && rid && eid === rid) return true;
      const ename = norm(getRoomName(e));
      return ename && rname && ename === rname;
    });

    const scheduledMinutes = matched.reduce((sum, e) => sum + slotMinutes(e), 0);
    const scheduledHours   = +(scheduledMinutes / 60).toFixed(1);
    const utilization      = Math.min(Math.round((scheduledHours / avail) * 100), 100);

    const status =
      utilization >= 100 ? 'overbooked' :
      utilization >= 70  ? 'high'       :
      utilization > 0    ? 'normal'     : 'unused';

    return {
      roomId:         rid,
      roomName:       room.name || 'Unknown',
      roomType:       room.type || '',
      capacity:       Number(room.capacity) || 0,
      scheduledHours,
      availableHours: avail,
      utilization,
      status,
    };
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   calcSubjectDistribution
═══════════════════════════════════════════════════════════════════════════ */
export function calcSubjectDistribution(subjects, timetable) {
  if (!Array.isArray(subjects) || subjects.length === 0) return [];

  const entries = Array.isArray(timetable) ? timetable : [];
  console.log('[calcSubjectDistribution] subjects:', subjects.length, '| entries:', entries.length);

  return subjects.map(subj => {
    const sid   = String(subj._id || subj.id || '');
    const sname = norm(subj.name || '');

    const matched = entries.filter(e => {
      const eid = resolveId(e.subjectId);
      if (eid && sid && eid === sid) return true;
      const ename = norm(getSubjectName(e));
      return ename && sname && ename === sname;
    });

    const scheduledMinutes = matched.reduce((sum, e) => sum + slotMinutes(e), 0);
    const scheduledHours   = +(scheduledMinutes / 60).toFixed(1);

    return {
      subjectId:        sid,
      subjectName:      subj.name || 'Unknown',
      department:       subj.department || '',
      weeklyHours:      Number(subj.weeklyHours) || 0,
      scheduledHours,
      scheduledClasses: matched.length,
    };
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   detectRoomConflicts
   Finds overlapping time-slots for the same room on the same day.
═══════════════════════════════════════════════════════════════════════════ */
export function detectRoomConflicts(timetable) {
  if (!Array.isArray(timetable) || timetable.length === 0) return [];

  const groups = {};
  timetable.forEach(e => {
    const roomId   = resolveId(e.roomId) || norm(getRoomName(e));
    const roomName = getRoomName(e) || roomId;
    const day      = normalizeDay(getDayName(e));
    if (!roomId || !day) return;
    const key = `${roomId}::${day}`;
    if (!groups[key]) groups[key] = { roomId, roomName, day, entries: [] };
    groups[key].entries.push(e);
  });

  const results = [];
  Object.values(groups).forEach(({ roomId, roomName, day, entries }) => {
    const conflicts = [];
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i], b = entries[j];
        const sA = toMin(a.startTime), eA = toMin(a.endTime);
        const sB = toMin(b.startTime), eB = toMin(b.endTime);
        if (eA > 0 && eB > 0 && sA < eB && sB < eA) {
          conflicts.push({ a, b });
        }
      }
    }
    if (conflicts.length) results.push({ roomId, roomName, day, conflicts });
  });

  return results;
}

/* ═══════════════════════════════════════════════════════════════════════════
   calcWeeklyTrend
   Groups timetable entries by day of week (Mon–Sat).
═══════════════════════════════════════════════════════════════════════════ */
export function calcWeeklyTrend(timetable) {
  const DAYS    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const entries = Array.isArray(timetable) ? timetable : [];

  return DAYS.map(day => {
    const matched = entries.filter(e => normalizeDay(getDayName(e)) === day);
    const minutes = matched.reduce((sum, e) => sum + slotMinutes(e), 0);
    return { day, entries: matched.length, hours: +(minutes / 60).toFixed(1) };
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   calcWeeklyTrendFromSource  (localStorage-aware variant)
═══════════════════════════════════════════════════════════════════════════ */
export function calcWeeklyTrendFromSource(workingDays, timetable) {
  const DEFAULT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let dayList = DEFAULT_DAYS;

  if (Array.isArray(workingDays) && workingDays.length > 0) {
    const normalised = workingDays
      .map(d => normalizeDay(typeof d === 'string' ? d : String(d)))
      .filter(Boolean);
    if (normalised.length > 0) dayList = [...new Set(normalised)];
  }

  const entries = Array.isArray(timetable) ? timetable : [];
  return dayList.map(day => {
    const matched = entries.filter(e => normalizeDay(getDayName(e)) === day);
    const minutes = matched.reduce((sum, e) => sum + slotMinutes(e), 0);
    return { day, entries: matched.length, hours: +(minutes / 60).toFixed(1) };
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   computeAnalytics — unified entry-point used by AnalyticsDashboard
═══════════════════════════════════════════════════════════════════════════ */
export function computeAnalytics(setup = {}, timetableEntries = [], teachers = [], rooms = [], subjects = []) {
  const workload    = calcTeacherWorkload(teachers, timetableEntries);
  const roomUtil    = calcRoomUtilization(rooms, timetableEntries, setup.weeklyAvailableHours || 40);
  const subjectDist = calcSubjectDistribution(subjects, timetableEntries);
  const weeklyTrend = calcWeeklyTrend(timetableEntries);
  const conflicts   = detectRoomConflicts(timetableEntries);
  const insights    = generateInsights(workload, roomUtil, conflicts, subjectDist);
  return { workload, roomUtil, subjectDist, weeklyTrend, conflicts, insights };
}

/* ═══════════════════════════════════════════════════════════════════════════
   generateInsights
═══════════════════════════════════════════════════════════════════════════ */
export function generateInsights(workload = [], roomUtil = [], conflicts = [], subjectDist = []) {
  const insights = [];

  workload.filter(t => t.status === 'overloaded').forEach(t => {
    insights.push({
      type: 'warning', icon: '⚠️',
      title: `${t.teacherName} is overloaded`,
      desc:  `${t.totalHours}h/week (${(t.totalHours - t.maxWeeklyHours).toFixed(1)}h above the ${t.maxWeeklyHours}h limit).`,
    });
  });

  roomUtil.filter(r => r.utilization > 0 && r.utilization < 30).forEach(r => {
    insights.push({
      type: 'info', icon: '🏫',
      title: `${r.roomName} is under-utilised (${r.utilization}%)`,
      desc:  `Only ${r.scheduledHours}h scheduled out of ${r.availableHours}h available.`,
    });
  });

  const unused = roomUtil.filter(r => r.status === 'unused');
  if (unused.length) {
    insights.push({
      type: 'info', icon: '🚪',
      title: `${unused.length} room(s) completely unused this week`,
      desc:  `${unused.map(r => r.roomName).join(', ')} have 0 scheduled hours.`,
    });
  }

  conflicts.forEach(c => {
    insights.push({
      type: 'error', icon: '🔴',
      title: `Room conflict: ${c.roomName} on ${c.day}`,
      desc:  `${c.conflicts.length} time-slot overlap(s) detected.`,
    });
  });

  if (subjectDist.length) {
    const top = [...subjectDist].sort((a, b) => b.scheduledHours - a.scheduledHours)[0];
    if (top && top.scheduledHours > 0) {
      insights.push({
        type: 'success', icon: '📚',
        title: `Most scheduled: ${top.subjectName}`,
        desc:  `${top.scheduledHours}h / ${top.scheduledClasses} class(es) — ${top.department} dept.`,
      });
    }
  }

  if (!insights.length) {
    insights.push({
      type: 'success', icon: '✅',
      title: 'All systems balanced',
      desc:  'No workload issues, conflicts, or underutilised resources detected.',
    });
  }

  return insights;
}

/* ═══════════════════════════════════════════════════════════════════════════
   normaliseEntries
   ─────────────────────────────────────────────────────────────────────────
   Flatten a mix of populated/unpopulated timetable entries into a
   consistent shape that all calc functions can consume.
═══════════════════════════════════════════════════════════════════════════ */
export function normaliseEntries(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(e => ({
    ...e,
    // Keep populated objects intact for resolveId / name extraction
    teacherId: e.teacherId ?? e.lecturerId ?? e.facultyId ?? e.teacher ?? null,
    roomId:    e.roomId ?? e.classroomId ?? e.room ?? null,
    subjectId: e.subjectId ?? e.courseId ?? e.subject ?? null,
    day:       e.day       || getDayName(e)     || '',
    startTime: e.startTime || e.start || e.fromTime || e.timeslot?.startTime || parseSlotRange(e.slot || e.timeslot).startTime || '',
    endTime:   e.endTime   || e.end   || e.toTime   || e.timeslot?.endTime   || parseSlotRange(e.slot || e.timeslot).endTime   || '',
    teacherName: e.teacherName || getTeacherName(e) || '',
    subjectName: e.subjectName || getSubjectName(e) || '',
    roomName: e.roomName || getRoomName(e) || '',
  }));
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITY HELPERS (used by AnalyticsDashboard & localStorage paths)
═══════════════════════════════════════════════════════════════════════════ */

export const normalizeArray = (v) => (Array.isArray(v) ? v : []);

export const safeParseJSON = (value, fallback = null) => {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
};

export const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Extract timetable entries from various possible data shapes */
export function getTimetableEntries(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  const keys = ['timetable', 'classes', 'sessions', 'allocations', 'scheduledClasses', 'schedule', 'entries'];
  for (const k of keys) {
    if (Array.isArray(data[k]) && data[k].length > 0) return data[k];
  }
  return [];
}

/* ─────────────────────────────────────────────────────────────────────────
   LocalStorage helpers (kept for backward compat with AnalyticsDashboard)
───────────────────────────────────────────────────────────────────────── */

function buildVirtualTeachers(raw) {
  return normalizeArray(raw).map((t, i) => {
    const name = typeof t === 'string' ? t : (t.name || t.teacherName || t.faculty || `Teacher ${i + 1}`);
    return {
      _id: name, id: name, name,
      department:     typeof t === 'object' ? (t.department || '') : '',
      maxWeeklyHours: toNumber(typeof t === 'object' ? t.maxWeeklyHours : undefined, 20),
    };
  });
}

function buildVirtualRooms(raw) {
  return normalizeArray(raw).map((r, i) => {
    const name = typeof r === 'string' ? r : (r.name || r.roomName || r.classroom || `Room ${i + 1}`);
    return {
      _id: name, id: name, name,
      type:     typeof r === 'object' ? (r.type || '') : '',
      capacity: toNumber(typeof r === 'object' ? r.capacity : undefined, 0),
    };
  });
}

function buildVirtualSubjects(raw) {
  return normalizeArray(raw).map((s, i) => {
    const name = typeof s === 'string' ? s : (s.name || s.subjectName || s.module || `Subject ${i + 1}`);
    return {
      _id: name, id: name, name,
      weeklyHours: toNumber(typeof s === 'object' ? (s.weeklyHours || s.hoursPerWeek) : undefined, 0),
      department:  typeof s === 'object' ? (s.department || '') : '',
    };
  });
}

export function loadAllDataSources() {
  const sp = (key, fallback) => safeParseJSON(localStorage.getItem(key), fallback) || fallback;
  const setup     = sp('ai_scheduling_setup', {});
  const analytics = sp('ai_analytics_data',   {});

  let rawTeachers = normalizeArray(setup.teachers);
  if (!rawTeachers.length) rawTeachers = normalizeArray(sp('teachers', []));
  if (!rawTeachers.length) rawTeachers = normalizeArray(analytics.teachers);

  let rawRooms = normalizeArray(setup.rooms);
  if (!rawRooms.length) rawRooms = normalizeArray(sp('rooms', []));
  if (!rawRooms.length) rawRooms = normalizeArray(analytics.rooms);

  let rawSubjects = normalizeArray(setup.subjects);
  if (!rawSubjects.length) rawSubjects = normalizeArray(sp('subjects', []));
  if (!rawSubjects.length) rawSubjects = normalizeArray(analytics.subjects);

  let rawTimetable = getTimetableEntries(setup);
  if (!rawTimetable.length) rawTimetable = getTimetableEntries(analytics);
  if (!rawTimetable.length) rawTimetable = normalizeArray(sp('timetable',        []));
  if (!rawTimetable.length) rawTimetable = normalizeArray(sp('classes',           []));
  if (!rawTimetable.length) rawTimetable = normalizeArray(sp('scheduledClasses',  []));

  const workingDays = normalizeArray(setup.workingDays || analytics.workingDays || []);

  return {
    teachers:   buildVirtualTeachers(rawTeachers),
    rooms:      buildVirtualRooms(rawRooms),
    subjects:   buildVirtualSubjects(rawSubjects),
    timetable:  normaliseEntries(rawTimetable),
    workingDays,
  };
}

export function loadFromLocalStorage() {
  const setup     = safeParseJSON(localStorage.getItem('ai_scheduling_setup'), {}) || {};
  const analytics = safeParseJSON(localStorage.getItem('ai_analytics_data'),   {}) || {};
  return { setup, analytics };
}

export function generateAnalyticsFromSource(setup = {}, analytics = {}) {
  const teachers = buildVirtualTeachers(setup.teachers || []);
  const rooms    = buildVirtualRooms(setup.rooms || []);
  const subjects = buildVirtualSubjects(setup.subjects || []);

  let rawEntries = getTimetableEntries(setup);
  if (!rawEntries.length) rawEntries = getTimetableEntries(analytics);
  if (!rawEntries.length && Array.isArray(analytics.timetable)) rawEntries = analytics.timetable;

  return { teachers, rooms, subjects, timetable: normaliseEntries(rawEntries) };
}

export function validateAnalyticsData(data = {}) {
  if (!data || typeof data !== 'object') return false;
  return (
    (Array.isArray(data.teachers)  && data.teachers.length  > 0) ||
    (Array.isArray(data.rooms)     && data.rooms.length     > 0) ||
    (Array.isArray(data.timetable) && data.timetable.length > 0)
  );
}

/* AI scheduling — client-side fallback */
export async function runAIScheduling(timetableData, teachers = [], rooms = [], subjects = []) {
  try {
    const res = await api.post('/ai/run', { timetable: timetableData });
    return res.data;
  } catch {
    const conflicts   = detectRoomConflicts(timetableData);
    const workload    = calcTeacherWorkload(teachers, timetableData);
    const roomUtil    = calcRoomUtilization(rooms, timetableData);
    const subjectDist = calcSubjectDistribution(subjects, timetableData);
    const insights    = generateInsights(workload, roomUtil, conflicts, subjectDist);
    return { conflicts, suggestions: insights };
  }
}
