/**
 * demoAnalytics.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Realistic university timetable DEMO DATA used as a fallback when the backend
 * API is unreachable (e.g. during viva/demo with no internet or DB access).
 *
 * Data shapes match exactly what calcTeacherWorkload / calcRoomUtilization /
 * calcSubjectDistribution / calcWeeklyTrend expect as input.
 *
 * ⚠  TEMPORARY — This fallback is ONLY activated when all API calls fail.
 *     Real backend data always takes priority.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Teachers ─────────────────────────────────────────────────────────────────
export const DEMO_TEACHERS = [
  { _id: 'dt1', name: 'Dr. Ayesha Malik',    department: 'Computer Science',          maxWeeklyHours: 18 },
  { _id: 'dt2', name: 'Prof. Rajan Kumar',   department: 'Information Technology',    maxWeeklyHours: 20 },
  { _id: 'dt3', name: 'Ms. Nadia Fernandez', department: 'Computer System Networks',  maxWeeklyHours: 16 },
  { _id: 'dt4', name: 'Dr. Imran Sheikh',    department: 'Computer Science',          maxWeeklyHours: 20 },
  { _id: 'dt5', name: 'Mr. Sanjeev Rao',     department: 'Information Technology',    maxWeeklyHours: 14 },
  { _id: 'dt6', name: 'Dr. Priya Nair',      department: 'Computer System Engineering', maxWeeklyHours: 18 },
  { _id: 'dt7', name: 'Mr. Faiz Ahmad',      department: 'Computer System Networks',  maxWeeklyHours: 20 },
  { _id: 'dt8', name: 'Ms. Layla Hassan',    department: 'Computer Science',          maxWeeklyHours: 16 },
];

// ── Subjects ──────────────────────────────────────────────────────────────────
export const DEMO_SUBJECTS = [
  { _id: 'ds1', name: 'Data Structures & Algorithms', department: 'Computer Science',          weeklyHours: 4 },
  { _id: 'ds2', name: 'Operating Systems',             department: 'Computer Science',          weeklyHours: 3 },
  { _id: 'ds3', name: 'Computer Networks',             department: 'Computer System Networks',  weeklyHours: 4 },
  { _id: 'ds4', name: 'Database Management',           department: 'Information Technology',    weeklyHours: 3 },
  { _id: 'ds5', name: 'Software Engineering',          department: 'Information Technology',    weeklyHours: 3 },
  { _id: 'ds6', name: 'Digital Electronics',           department: 'Computer System Engineering', weeklyHours: 4 },
];

// ── Rooms ─────────────────────────────────────────────────────────────────────
export const DEMO_ROOMS = [
  { _id: 'dr1', name: 'A101', type: 'Classroom',    capacity: 60 },
  { _id: 'dr2', name: 'B203', type: 'Computer Lab', capacity: 40 },
  { _id: 'dr3', name: 'C305', type: 'Seminar Hall', capacity: 80 },
  { _id: 'dr4', name: 'D102', type: 'Classroom',    capacity: 60 },
  { _id: 'dr5', name: 'E201', type: 'Physics Lab',  capacity: 35 },
];

// ── Timetable sessions ────────────────────────────────────────────────────────
// Each entry has populated teacherId, roomId, subjectId objects so that
// calcTeacherWorkload / calcRoomUtilization / calcSubjectDistribution can
// match them by ID AND by name (dual-match strategy in analyticsService).
function makeTeacher(id) { return DEMO_TEACHERS.find(t => t._id === id); }
function makeSubject(id) { return DEMO_SUBJECTS.find(s => s._id === id); }
function makeRoom(id)    { return DEMO_ROOMS.find(r => r._id === id); }

function entry(day, start, end, teacherId, subjectId, roomId) {
  const t = makeTeacher(teacherId);
  const s = makeSubject(subjectId);
  const r = makeRoom(roomId);
  return {
    _id:        `${day}-${teacherId}-${subjectId}-${start}`,
    day,
    startTime:  start,
    endTime:    end,
    teacherId:  t,                   // populated object → ID match in calcFns
    subjectId:  s,                   // populated object
    roomId:     r,                   // populated object
    teacherName: t?.name   || '',
    subjectName: s?.name   || '',
    roomName:    r?.name   || '',
  };
}

export const DEMO_SESSIONS = [
  // ── Monday ──────────────────────────────────────────────────────────────────
  entry('Mon', '08:00', '10:00', 'dt1', 'ds1', 'dr1'),  // Ayesha – DSA – A101
  entry('Mon', '10:00', '12:00', 'dt2', 'ds4', 'dr2'),  // Rajan  – DBMS – B203
  entry('Mon', '12:00', '14:00', 'dt3', 'ds3', 'dr4'),  // Nadia  – CN   – D102
  entry('Mon', '14:00', '16:00', 'dt6', 'ds6', 'dr5'),  // Priya  – DE   – E201
  entry('Mon', '09:00', '11:00', 'dt4', 'ds2', 'dr3'),  // Imran  – OS   – C305

  // ── Tuesday ─────────────────────────────────────────────────────────────────
  entry('Tue', '08:00', '10:00', 'dt5', 'ds5', 'dr1'),  // Sanjeev – SE  – A101
  entry('Tue', '10:00', '12:00', 'dt7', 'ds3', 'dr4'),  // Faiz    – CN  – D102
  entry('Tue', '12:00', '14:00', 'dt1', 'ds1', 'dr2'),  // Ayesha  – DSA – B203
  entry('Tue', '14:00', '16:00', 'dt8', 'ds2', 'dr3'),  // Layla   – OS  – C305

  // ── Wednesday ───────────────────────────────────────────────────────────────
  entry('Wed', '08:00', '10:00', 'dt2', 'ds4', 'dr1'),  // Rajan  – DBMS – A101
  entry('Wed', '10:00', '12:00', 'dt6', 'ds6', 'dr5'),  // Priya  – DE   – E201
  entry('Wed', '12:00', '14:00', 'dt4', 'ds2', 'dr3'),  // Imran  – OS   – C305
  entry('Wed', '14:00', '16:00', 'dt3', 'ds3', 'dr2'),  // Nadia  – CN   – B203
  entry('Wed', '09:00', '11:00', 'dt5', 'ds5', 'dr4'),  // Sanjeev – SE  – D102

  // ── Thursday ─────────────────────────────────────────────────────────────────
  entry('Thu', '08:00', '10:00', 'dt7', 'ds3', 'dr1'),  // Faiz   – CN   – A101
  entry('Thu', '10:00', '12:00', 'dt1', 'ds1', 'dr4'),  // Ayesha – DSA  – D102
  entry('Thu', '12:00', '14:00', 'dt2', 'ds4', 'dr2'),  // Rajan  – DBMS – B203
  entry('Thu', '14:00', '16:00', 'dt8', 'ds2', 'dr3'),  // Layla  – OS   – C305

  // ── Friday ───────────────────────────────────────────────────────────────────
  entry('Fri', '08:00', '10:00', 'dt4', 'ds2', 'dr1'),  // Imran  – OS   – A101
  entry('Fri', '10:00', '12:00', 'dt6', 'ds6', 'dr5'),  // Priya  – DE   – E201
  entry('Fri', '12:00', '14:00', 'dt5', 'ds5', 'dr4'),  // Sanjeev – SE  – D102
  entry('Fri', '14:00', '16:00', 'dt7', 'ds3', 'dr2'),  // Faiz   – CN   – B203
  entry('Fri', '09:00', '11:00', 'dt3', 'ds3', 'dr3'),  // Nadia  – CN   – C305

  // ── Saturday (light schedule) ────────────────────────────────────────────────
  entry('Sat', '09:00', '11:00', 'dt8', 'ds1', 'dr1'),  // Layla  – DSA  – A101
];

/**
 * Validate whether real API data is usable for the dashboard.
 * Returns true if we have enough data to render meaningful charts.
 *
 * @param {object} param0 - { teachers, subjects, rooms, sessions }
 */
export function hasUsableData({ teachers = [], subjects = [], rooms = [], sessions = [] } = {}) {
  return (
    teachers.length > 0 ||
    subjects.length > 0 ||
    rooms.length    > 0 ||
    sessions.length > 0
  );
}

/**
 * Returns the full demo dataset ready for injection into AnalyticsDashboard state.
 */
export function getDemoData() {
  return {
    teachers: DEMO_TEACHERS,
    subjects: DEMO_SUBJECTS,
    rooms:    DEMO_ROOMS,
    sessions: DEMO_SESSIONS,   // already normalised — use as `sessions` state directly
    timetable: DEMO_SESSIONS,  // also usable as raw timetable
  };
}
