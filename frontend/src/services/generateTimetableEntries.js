/**
 * generateTimetableEntries(setupData)
 * ─────────────────────────────────────────────────────────────────
 * Pure function — no side effects, no API calls.
 *
 * @param {Object} setupData
 *   @param {string[]} setupData.teachers    — list of teacher names
 *   @param {string[]} setupData.subjects    — list of subject names
 *   @param {string[]} setupData.rooms       — list of room names
 *   @param {string[]} setupData.workingDays — days of the week
 *   @param {number}   setupData.timeSlots   — periods per day
 *
 * @returns {{day, slot, subject, teacher, room, slotLabel}[]}
 *
 * Algorithm:
 *   • Iterates days × slots (outer product)
 *   • Assigns subject/teacher/room via independent round-robin counters
 *     so each is cycled evenly regardless of the others' list length
 *   • Handles objects with a `.name` property as well as plain strings
 * ─────────────────────────────────────────────────────────────────
 */

/** Normalise an item that may be a string or an object with .name */
function getName(item) {
  if (!item) return '';
  if (typeof item === 'string') return item.trim();
  if (typeof item === 'object' && item.name) return String(item.name).trim();
  return String(item).trim();
}

/**
 * Build human-readable slot labels like "08:00 – 09:00"
 * starting from 08:00 with 1-hour periods.
 */
function buildSlotLabel(slotIndex) {
  const startHour = 8 + slotIndex;          // 08, 09, 10 …
  const endHour   = startHour + 1;
  const fmt = (h) => String(h).padStart(2, '0') + ':00';
  return `${fmt(startHour)} – ${fmt(endHour)}`;
}

/**
 * FALLBACK sample data used when caller passes empty arrays.
 * Guarantees analytics never show 0% on a fresh install.
 */
const FALLBACK = {
  teachers:    ['Dr. Nimal Perera', 'Prof. Anjali Silva', 'Dr. Kasun Fernando'],
  subjects:    ['Algorithms & Problem Solving', 'Data Structures', 'Operating Systems'],
  rooms:       ['A101 - Lecture Hall', 'B201 - Seminar Room', 'Computer Lab 01'],
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  timeSlots:   6,
};

export function generateTimetableEntries(setupData = {}) {
  // ── Resolve inputs ─────────────────────────────────────────────
  const raw = { ...FALLBACK, ...setupData };

  const teachers    = (raw.teachers    || []).map(getName).filter(Boolean);
  const subjects    = (raw.subjects    || []).map(getName).filter(Boolean);
  const rooms       = (raw.rooms       || []).map(getName).filter(Boolean);
  const workingDays = (raw.workingDays || []).map(getName).filter(Boolean);
  const timeSlots   = Math.max(1, Math.min(12, Number(raw.timeSlots) || 6));

  // ── Guard: need at least one of each ──────────────────────────
  const safeTeachers = teachers.length ? teachers : FALLBACK.teachers;
  const safeSubjects = subjects.length ? subjects : FALLBACK.subjects;
  const safeRooms    = rooms.length    ? rooms    : FALLBACK.rooms;
  const safeDays     = workingDays.length ? workingDays : FALLBACK.workingDays;

  const entries = [];
  let tIdx = 0; // teacher round-robin counter
  let sIdx = 0; // subject round-robin counter
  let rIdx = 0; // room round-robin counter

  for (const day of safeDays) {
    for (let slot = 1; slot <= timeSlots; slot++) {
      entries.push({
        day,
        slot,
        slotLabel: buildSlotLabel(slot - 1),
        teacher:   safeTeachers[tIdx % safeTeachers.length],
        subject:   safeSubjects[sIdx % safeSubjects.length],
        room:      safeRooms   [rIdx % safeRooms.length],
      });

      tIdx++;
      sIdx++;
      rIdx++;
    }
  }

  return entries;
}

/**
 * Derive analytics-ready aggregates from entries.
 *
 * @returns {{
 *   teacherStats : { name, slots, days }[],
 *   roomStats    : { name, slots, totalSlots }[],
 *   subjectStats : { name, slots }[],
 *   daySlotMap   : Record<string, {slot, subject, teacher, room, slotLabel}[]>,
 *   totalSlots   : number,
 * }}
 */
export function buildAnalyticsFromEntries(entries = [], setupData = {}) {
  const totalSlots = Math.max(1, entries.length);

  // ── Teacher stats ──────────────────────────────────────────────
  const teacherMap = {};
  for (const e of entries) {
    if (!teacherMap[e.teacher]) teacherMap[e.teacher] = { name: e.teacher, slots: 0, days: new Set() };
    teacherMap[e.teacher].slots++;
    teacherMap[e.teacher].days.add(e.day);
  }
  const teacherStats = Object.values(teacherMap).map(t => ({
    ...t,
    days: t.days.size,
  }));

  // ── Room stats ─────────────────────────────────────────────────
  const slotsPerDay   = Number(setupData.timeSlots) || 6;
  const totalDaySlots = ((setupData.workingDays || []).length || 5) * slotsPerDay;

  const roomMap = {};
  for (const e of entries) {
    if (!roomMap[e.room]) roomMap[e.room] = { name: e.room, slots: 0, totalSlots: totalDaySlots };
    roomMap[e.room].slots++;
  }
  const roomStats = Object.values(roomMap);

  // ── Subject stats ──────────────────────────────────────────────
  const subjectMap = {};
  for (const e of entries) {
    if (!subjectMap[e.subject]) subjectMap[e.subject] = { name: e.subject, slots: 0 };
    subjectMap[e.subject].slots++;
  }
  const subjectStats = Object.values(subjectMap);

  // ── Day → slot list map ────────────────────────────────────────
  const daySlotMap = {};
  for (const e of entries) {
    if (!daySlotMap[e.day]) daySlotMap[e.day] = [];
    daySlotMap[e.day].push(e);
  }

  return { teacherStats, roomStats, subjectStats, daySlotMap, totalSlots };
}

/**
 * Quick validation before generating — mirrors backend validation.
 * Returns an array of error strings (empty = valid).
 */
export function validateSetupForGeneration(setupData = {}) {
  const errors = [];
  if (!setupData.teachers?.length)    errors.push('Add at least one teacher before generating a timetable.');
  if (!setupData.subjects?.length)    errors.push('Add at least one subject before generating a timetable.');
  if (!setupData.rooms?.length)       errors.push('Add at least one classroom before generating a timetable.');
  if (!setupData.workingDays?.length) errors.push('Select at least one working day before generating a timetable.');
  return errors;
}
