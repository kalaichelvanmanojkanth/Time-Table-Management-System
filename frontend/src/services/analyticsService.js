/**
 * analyticsService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source-of-truth for all analytics data fetching and calculation.
 *
 * Architecture:
 *  - Uses centralized API client from services/api.js
 *  - Base URL defaults to http://localhost:5001/api
 *  - Timetable documents store teacherId and roomId as PLAIN STRING ObjectIds.
 *    Backend does NOT populate these references.
 *    All matching is done CLIENT-SIDE by string ID comparison.
 *
 *  ID matching strategy (calcLecturerWorkload / calcRoomUtilization):
 *    1. Extract the raw id string from the timetable field (handles plain string, populated
 *       object, or MongoDB ObjectId-like object with .toString())
 *    2. Compare it against the lecturer/room _id string
 *    3. Fall back to name-string match only if no id is available
 *
 * Every public function is SAFE: always returns an array or usable value.
 * ALL naming is standardized to "lecturer" throughout.
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
 * path must start with '/'  (e.g. '/lecturers', '/analytics/workload').
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

export const fetchLecturers = async () => {
  const rows = await safeFetch('/lecturers');
  return rows.map((l, i) => ({
    ...l,
    _id:            l._id || l.id || `lecturer-${i}`,
    name:           l.name || l.lecturerName || l.teacherName || l.fullName || 'Unknown Faculty',
    department:     l.department || l.dept || '',
    maxWeeklyHours: Number(l.maxWeeklyHours || l.maxHours || 20),
    lecturerId:     l._id || l.id || `lecturer-${i}`,
    lecturerName:   l.name || l.lecturerName || l.fullName || 'Unknown Faculty',
  }));
};

// Backward-compat alias (used by AnalyticsDashboard which still calls fetchTeachers)
export const fetchTeachers = fetchLecturers;

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

/** Live KPI counts: { lecturers, subjects, rooms, timetables } */
export async function fetchAnalyticsSummary() {
  try {
    const res = await api.get('/analytics/summary');
    const d   = res.data?.data || res.data || {};
    console.log('[API] /analytics/summary →', d);
    return {
      lecturers:  Number(d.lecturers  ?? d.teachers  ?? 0),
      subjects:   Number(d.subjects   ?? 0),
      rooms:      Number(d.rooms      ?? 0),
      timetables: Number(d.timetables ?? 0),
    };
  } catch (err) {
    console.error('[API] /analytics/summary FAILED:', err?.response?.data?.message || err.message);
    return { lecturers: 0, subjects: 0, rooms: 0, timetables: 0 };
  }
}

/** Server-computed lecturer workload array */
export async function fetchWorkload() {
  const rows = await safeFetch('/analytics/workload');
  // Normalize: ensure lecturerId/lecturerName fields are set from either naming convention
  return rows.map(r => ({
    ...r,
    lecturerId:   r.lecturerId   || r.teacherId   || '',
    lecturerName: r.lecturerName || r.teacherName || 'Unknown',
  }));
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
   CRUD — Lecturers
═══════════════════════════════════════════════════════════════════════════ */

export const createLecturer = async (data) => {
  console.log('[API] POST /lecturers payload:', data);
  const res = await api.post('/lecturers', data);
  console.log('[API] POST /lecturers response:', res.data);
  const record = res.data?.data ?? res.data;
  if (!record) throw new Error('No data returned from createLecturer');
  return record;
};

export const updateLecturer = async (id, data) => {
  console.log(`[API] PUT /lecturers/${id} payload:`, data);
  const res = await api.put(`/lecturers/${id}`, data);
  console.log(`[API] PUT /lecturers/${id} response:`, res.data);
  return res.data?.data ?? res.data;
};

export const deleteLecturer = (id) => {
  console.log(`[API] DELETE /lecturers/${id}`);
  return api.delete(`/lecturers/${id}`);
};

// Backward-compat aliases — kept to avoid breaking any components that still import old names
export const createTeacher = createLecturer;
export const updateTeacher = updateLecturer;
export const deleteTeacher = deleteLecturer;

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
 * Safely extract a normalised string ID from a timetable field value.
 *
 * Handles all of these shapes:
 *   - Plain string ObjectId:           "64abc1234567890abcdef012"
 *   - Populated Mongoose object:        { _id: "64abc...", name: "..." }
 *   - MongoDB ObjectId-like object:     { $oid: "64abc..." } or obj.toString()
 *   - Numbers, null, undefined
 *
 * Returns a lowercased, trimmed string so comparisons are case-insensitive.
 */
function resolveId(field) {
  if (field == null) return '';
  if (typeof field === 'number') return String(field).trim();
  if (typeof field === 'string') return field.trim().toLowerCase();
  if (typeof field === 'object') {
    // populated Mongoose document or plain object with _id / id
    const id = field._id ?? field.id ?? field.$oid ?? null;
    if (id != null) return resolveId(id); // recurse to handle nested ObjectIds
    // ObjectId instance from mongoose — has .toString()
    if (typeof field.toString === 'function') {
      const s = field.toString().trim();
      // Only use if it looks like a valid 24-hex ObjectId or non-empty string
      if (s && s !== '[object Object]') return s.toLowerCase();
    }
  }
  return '';
}

/**
 * Extract a normalised ID string specifically from a timetable entry reference.
 * Tries multiple field aliases so plain-string and populated-object shapes both work.
 *
 * @param {object} entry   – one raw timetable document
 * @param {string[]} keys  – ordered list of field names to check
 * @returns {string}       – trimmed, lowercased id string, or ''
 */
function extractTimetableId(entry, keys) {
  for (const key of keys) {
    const val = entry[key];
    if (val == null) continue;
    const id = resolveId(val);
    if (id) return id;
  }
  return '';
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
 * Get lecturer name from a timetable entry.
 * Entry.teacherId / entry.lecturerId may be a populated object { _id, name } or a plain string.
 */
export function getLecturerName(entry) {
  if (!entry) return '';
  // populated reference — teacherId field (used by Mongoose)
  if (entry.teacherId && typeof entry.teacherId === 'object' && (entry.teacherId.name || entry.teacherId.lecturerName || entry.teacherId.fullName))
    return entry.teacherId.name || entry.teacherId.lecturerName || entry.teacherId.fullName;
  // populated reference — lecturerId field
  if (entry.lecturerId && typeof entry.lecturerId === 'object' && (entry.lecturerId.name || entry.lecturerId.lecturerName || entry.lecturerId.fullName))
    return entry.lecturerId.name || entry.lecturerId.lecturerName || entry.lecturerId.fullName;
  // flat fields (both naming conventions supported)
  return entry.lecturerName || entry.teacherName || entry.teacher || entry.fullName || entry.faculty || entry.lecturer || '';
}

// Backward-compat alias
export const getTeacherName = getLecturerName;

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
   calcLecturerWorkload
   ─────────────────────────────────────────────────────────────────────────
   Timetable collections store teacherId as a PLAIN STRING ObjectId.
   Backend does NOT populate — matching is done client-side.

   ID extraction from a timetable entry (same pattern that works for subjects):
     String(entry.teacherId?._id || entry.teacherId || entry.teacher || entry.lecturerId || '')

   vs lecturer id:
     String(lecturer._id || lecturer.id || '')
═══════════════════════════════════════════════════════════════════════════ */
export function calcLecturerWorkload(lecturers, timetable) {
  if (!Array.isArray(lecturers) || lecturers.length === 0) return [];

  const entries = Array.isArray(timetable) ? timetable : [];

  // Debug: show the first timetable entry so we can see what fields are present
  if (entries.length > 0) {
    const s = entries[0];
    console.log('[calcLecturerWorkload] first entry snapshot =>', {
      _id:        s._id,
      teacherId:  s.teacherId,
      lecturerId: s.lecturerId,
      teacher:    s.teacher,
    });
  }
  // Debug: show first lecturer so we know its _id format
  if (lecturers.length > 0) {
    const l0 = lecturers[0];
    console.log('[calcLecturerWorkload] first lecturer =>', { _id: l0._id, name: l0.name });
  }

  console.log('[calcLecturerWorkload] lecturers:', lecturers.length, '| entries:', entries.length);

  return lecturers.map(lecturer => {
    // Lecturer's own id — plain String(), no lowercase transform
    const lid    = String(lecturer._id || lecturer.id || '');
    const lname  = norm(lecturer.name || lecturer.lecturerName || '');
    const maxHrs = Number(lecturer.maxWeeklyHours) || 20;

    const matched = entries.filter(e => {
      // ── Step 1: ID match — optional-chaining String().trim() ──
      const entryId = String(
        e.teacherId?._id ||
        e.teacherId      ||
        e.lecturerId?._id||
        e.lecturerId     ||
        ''
      ).trim();

      const lecturerId = String(lecturer._id || lecturer.id || '').trim();

      console.log('ENTRY ID:', entryId, 'TARGET ID:', lecturerId);

      if (entryId && lecturerId) {
        if (entryId === lecturerId) return true;
        return false; // id present but no match — skip name fallback
      }

      // ── Step 2: Name fallback (only when entry has NO id at all) ──
      const ename = norm(
        e.lecturerName || e.teacherName || e.teacher ||
        e.faculty || e.lecturer || ''
      );
      return ename && lname && ename === lname;
    });

    const totalMinutes = matched.reduce((sum, e) => sum + slotMinutes(e), 0);
    const totalHours   = +(totalMinutes / 60).toFixed(1);
    const totalClasses = matched.length;

    const status =
      totalHours > maxHrs       ? 'overloaded'  :
      totalHours < maxHrs * 0.5 ? 'underloaded' : 'optimal';

    console.log(
      `[calcLecturerWorkload] "${lname}" (lid=${lid}):`,
      `matched=${matched.length} | hours=${totalHours} | status=${status}`
    );

    return {
      lecturerId:     lid,
      lecturerName:   lecturer.name || lecturer.lecturerName || 'Unknown',
      teacherId:      lid,   // backward-compat alias
      teacherName:    lecturer.name || lecturer.lecturerName || 'Unknown',
      department:     lecturer.department || '',
      totalHours,
      totalMinutes,
      totalClasses,
      maxWeeklyHours: maxHrs,
      status,
    };
  });
}

// Backward-compat alias
export const calcTeacherWorkload = calcLecturerWorkload;

/* ═══════════════════════════════════════════════════════════════════════════
   calcRoomUtilization
   ─────────────────────────────────────────────────────────────────────────
   Timetable collections store roomId as a PLAIN STRING ObjectId.
   Backend does NOT populate — matching is done client-side.

   ID extraction from a timetable entry:
     String(entry.roomId?._id || entry.roomId || entry.room || '')

   vs room id:
     String(room._id || room.id || '')
═══════════════════════════════════════════════════════════════════════════ */
export function calcRoomUtilization(rooms, timetable, weeklyAvailableHours = 40) {
  if (!Array.isArray(rooms) || rooms.length === 0) return [];

  const entries = Array.isArray(timetable) ? timetable : [];
  const avail   = weeklyAvailableHours > 0 ? weeklyAvailableHours : 40;

  // Debug: show the first timetable entry room fields
  if (entries.length > 0) {
    const s = entries[0];
    console.log('[calcRoomUtilization] first entry snapshot =>', {
      _id:       s._id,
      roomId:    s.roomId,
      room:      s.room,
      classroom: s.classroom,
    });
  }
  // Debug: show first room
  if (rooms.length > 0) {
    const r0 = rooms[0];
    console.log('[calcRoomUtilization] first room =>', { _id: r0._id, name: r0.name });
  }

  console.log('[calcRoomUtilization] rooms:', rooms.length, '| entries:', entries.length, '| avail:', avail);

  return rooms.map(room => {
    // Room's own id — plain String(), no lowercase transform
    const rid   = String(room._id || room.id || '');
    const rname = norm(room.name || '');

    const matched = entries.filter(e => {
      // ── Step 1: ID match — optional-chaining String().trim() ──
      const entryId = String(
        e.roomId?._id     ||
        e.roomId          ||
        e.classroomId?._id||
        e.classroomId     ||
        ''
      ).trim();

      const roomId = String(room._id || room.id || '').trim();

      console.log('ENTRY ID:', entryId, 'TARGET ID:', roomId);

      if (entryId && roomId) {
        if (entryId === roomId) return true;
        return false; // id present but no match — skip name fallback
      }

      // ── Step 2: Name fallback (only when entry has NO id at all) ──
      const ename = norm(
        e.roomName || e.room || e.classroom ||
        e.hall || e.venue || ''
      );
      return ename && rname && ename === rname;
    });

    const scheduledMinutes = matched.reduce((sum, e) => sum + slotMinutes(e), 0);
    const scheduledHours   = +(scheduledMinutes / 60).toFixed(1);
    const utilization      = Math.min(Math.round((scheduledHours / avail) * 100), 100);

    const status =
      utilization >= 100 ? 'overbooked' :
      utilization >= 70  ? 'high'       :
      utilization > 0    ? 'normal'     : 'unused';

    console.log(
      `[calcRoomUtilization] "${rname}" (rid=${rid}):`,
      `matched=${matched.length} | hours=${scheduledHours} | util=${utilization}%`
    );

    return {
      roomId:         rid,
      roomName:       room.name || 'Unknown',
      roomType:       room.type || room.roomType || '',
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
export function computeAnalytics(setup = {}, timetableEntries = [], lecturers = [], rooms = [], subjects = []) {
  const workload    = calcLecturerWorkload(lecturers, timetableEntries);
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

  workload.filter(l => l.status === 'overloaded').forEach(l => {
    insights.push({
      type: 'warning', icon: '⚠️',
      title: `${l.lecturerName || l.teacherName} is overloaded`,
      desc:  `${l.totalHours}h/week (${(l.totalHours - l.maxWeeklyHours).toFixed(1)}h above the ${l.maxWeeklyHours}h limit).`,
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
  return raw.map(e => {
    // ─────────────────────────────────────────────────────────────────────
    // CRITICAL: preserve teacherId and roomId EXACTLY as they come from the
    // backend (plain string ObjectIds). Do not transform them — the calc
    // functions read them directly via String() coercion.
    // ─────────────────────────────────────────────────────────────────────

    // Compute raw id aliases without overwriting the original field values
    const rawTeacherId  = e.teacherId  !== undefined ? e.teacherId  : (e.lecturerId ?? e.facultyId ?? e.teacher ?? null);
    const rawLecturerId = e.lecturerId !== undefined ? e.lecturerId : (e.teacherId  ?? e.facultyId ?? e.teacher ?? null);
    const rawRoomId     = e.roomId     !== undefined ? e.roomId     : (e.classroomId ?? e.room     ?? null);
    const rawSubjectId  = e.subjectId  !== undefined ? e.subjectId  : (e.courseId   ?? e.subject  ?? null);

    // Derive flat name strings from populated objects (used only as name-fallback)
    const teacherNameFromId =
      (typeof rawTeacherId  === 'object' && rawTeacherId?.name)  ||
      (typeof rawLecturerId === 'object' && rawLecturerId?.name) || '';

    const roomNameFromId =
      (typeof rawRoomId === 'object' && (rawRoomId?.name || rawRoomId?.roomName)) || '';

    return {
      ...e,
      // Re-emit id fields (plain string preserved or alias applied)
      teacherId:    rawTeacherId,
      lecturerId:   rawLecturerId,
      roomId:       rawRoomId,
      subjectId:    rawSubjectId,
      // Time + day normalisation
      day:       e.day       || getDayName(e) || '',
      startTime: e.startTime || e.start || e.fromTime || e.timeslot?.startTime || parseSlotRange(e.slot || e.timeslot).startTime || '',
      endTime:   e.endTime   || e.end   || e.toTime   || e.timeslot?.endTime   || parseSlotRange(e.slot || e.timeslot).endTime   || '',
      // Flat name fields (safe for name-fallback matching)
      lecturerName: e.lecturerName || e.teacherName || teacherNameFromId || '',
      teacherName:  e.teacherName  || e.lecturerName || teacherNameFromId || '',
      subjectName:  e.subjectName  || getSubjectName(e) || '',
      roomName:     e.roomName     || roomNameFromId || getRoomName(e) || '',
    };
  });
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

function buildVirtualLecturers(raw) {
  return normalizeArray(raw).map((l, i) => {
    const name = typeof l === 'string' ? l : (l.name || l.lecturerName || l.teacherName || l.faculty || `Lecturer ${i + 1}`);
    return {
      _id: name, id: name, name,
      lecturerId:     name,
      lecturerName:   name,
      department:     typeof l === 'object' ? (l.department || '') : '',
      maxWeeklyHours: toNumber(typeof l === 'object' ? l.maxWeeklyHours : undefined, 20),
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

  let rawLecturers = normalizeArray(setup.lecturers || setup.teachers);
  if (!rawLecturers.length) rawLecturers = normalizeArray(sp('lecturers', []));
  if (!rawLecturers.length) rawLecturers = normalizeArray(sp('teachers', []));
  if (!rawLecturers.length) rawLecturers = normalizeArray(analytics.lecturers || analytics.teachers);

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
    lecturers:  buildVirtualLecturers(rawLecturers),
    // backward compat
    teachers:   buildVirtualLecturers(rawLecturers),
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
  const lecturers = buildVirtualLecturers(setup.lecturers || setup.teachers || []);
  const rooms     = buildVirtualRooms(setup.rooms || []);
  const subjects  = buildVirtualSubjects(setup.subjects || []);

  let rawEntries = getTimetableEntries(setup);
  if (!rawEntries.length) rawEntries = getTimetableEntries(analytics);
  if (!rawEntries.length && Array.isArray(analytics.timetable)) rawEntries = analytics.timetable;

  return { lecturers, teachers: lecturers, rooms, subjects, timetable: normaliseEntries(rawEntries) };
}

export function validateAnalyticsData(data = {}) {
  if (!data || typeof data !== 'object') return false;
  return (
    (Array.isArray(data.lecturers) && data.lecturers.length > 0) ||
    (Array.isArray(data.teachers)  && data.teachers.length  > 0) ||
    (Array.isArray(data.rooms)     && data.rooms.length     > 0) ||
    (Array.isArray(data.timetable) && data.timetable.length > 0)
  );
}

/* AI scheduling — client-side fallback */
export async function runAIScheduling(timetableData, lecturers = [], rooms = [], subjects = []) {
  try {
    const res = await api.post('/ai/run', { timetable: timetableData });
    return res.data;
  } catch {
    const conflicts   = detectRoomConflicts(timetableData);
    const workload    = calcLecturerWorkload(lecturers, timetableData);
    const roomUtil    = calcRoomUtilization(rooms, timetableData);
    const subjectDist = calcSubjectDistribution(subjects, timetableData);
    const insights    = generateInsights(workload, roomUtil, conflicts, subjectDist);
    return { conflicts, suggestions: insights };
  }
}
