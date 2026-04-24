const mongoose = require('mongoose');

const DAY_MAP = {
  mon: 'Mon', monday: 'Mon',
  tue: 'Tue', tues: 'Tue', tuesday: 'Tue',
  wed: 'Wed', weds: 'Wed', wednesday: 'Wed',
  thu: 'Thu', thur: 'Thu', thurs: 'Thu', thursday: 'Thu',
  fri: 'Fri', friday: 'Fri',
  sat: 'Sat', saturday: 'Sat',
  sun: 'Sun', sunday: 'Sun',
};

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeString(value) {
  if (value == null) return '';
  // Strip non-printable control characters (U+0000-U+001F, U+007F-U+009F)
  // except safe whitespace chars: tab (\t), newline (\n), carriage return (\r)
  // Also replaces common Windows-1252 mojibake sequences
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/[\uFFFD\uFFFE\uFFFF]/g, '') // replacement & non-characters
    .trim();
}

function normalizeText(value) {
  if (value == null) return '';
  return sanitizeString(String(value)).replace(/\s+/g, ' ');
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function pickFirst(obj, keys = []) {
  for (const key of keys) {
    if (obj && obj[key] != null && obj[key] !== '') return obj[key];
  }
  return '';
}

function asIdString(value) {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value instanceof mongoose.Types.ObjectId) return String(value);
  if (typeof value === 'object') {
    if (value._id) return asIdString(value._id);
    if (value.id) return asIdString(value.id);
    if (value.$oid) return asIdString(value.$oid);
  }
  return '';
}

function parseMinutes(timeValue) {
  if (!timeValue || typeof timeValue !== 'string') return 0;
  const m = timeValue.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 0;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return 0;
  return h * 60 + min;
}

function extractTimeFromSlot(slotValue) {
  if (!slotValue) return { startTime: '', endTime: '' };
  const text = String(slotValue);
  const match = text.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!match) return { startTime: '', endTime: '' };
  return { startTime: match[1], endTime: match[2] };
}

function normalizeDay(value) {
  const text = normalizeKey(value);
  if (!text) return '';
  if (DAY_MAP[text]) return DAY_MAP[text];
  const short = text.slice(0, 3);
  return DAY_MAP[short] || '';
}

function resolveCollectionName(model) {
  if (!model || !model.collection || !model.collection.name) return '';
  return model.collection.name;
}

async function readCollection(db, name) {
  if (!db || !name) return [];
  try {
    return await db.collection(name).find({}).toArray();
  } catch (error) {
    console.warn(`[analyticsNormalizer] readCollection failed for ${name}:`, error.message);
    return [];
  }
}

function normalizeTeacher(doc = {}, source = 'teachers') {
  const id = asIdString(doc._id || doc.id);
  const name = normalizeText(
    pickFirst(doc, ['name', 'teacherName', 'fullName', 'lecturerName', 'facultyName'])
  );
  return {
    _id: id || `${source}:${normalizeKey(name)}`,
    name: name || 'Unknown Faculty',
    department: normalizeText(pickFirst(doc, ['department', 'dept', 'facultyDepartment', 'school'])),
    maxWeeklyHours: Number(pickFirst(doc, ['maxWeeklyHours', 'maxHours', 'weeklyLimit'])) || 20,
    sourceCollection: source,
  };
}

function normalizeSubject(doc = {}, source = 'subjects') {
  const id = asIdString(doc._id || doc.id);
  const name = normalizeText(
    pickFirst(doc, ['name', 'subjectName', 'courseName', 'title', 'moduleName'])
  );
  return {
    _id: id || `${source}:${normalizeKey(name)}`,
    name: name || 'Unknown Subject',
    department: normalizeText(pickFirst(doc, ['department', 'dept', 'program', 'school'])),
    weeklyHours: Number(pickFirst(doc, ['weeklyHours', 'hoursPerWeek', 'creditHours'])) || 0,
    sourceCollection: source,
  };
}

function normalizeRoom(doc = {}, source = 'rooms') {
  const id = asIdString(doc._id || doc.id);
  const name = normalizeText(pickFirst(doc, ['name', 'roomName', 'label', 'code']));
  return {
    _id: id || `${source}:${normalizeKey(name)}`,
    name: name || 'Unknown Room',
    type: normalizeText(pickFirst(doc, ['type', 'roomType', 'category'])),
    capacity: Number(pickFirst(doc, ['capacity', 'size', 'seats'])) || 0,
    status: normalizeText(pickFirst(doc, ['status'])) || 'available',
    sourceCollection: source,
  };
}

function createLookup(items = []) {
  const byId = new Map();
  const byName = new Map();
  for (const item of items) {
    const id = asIdString(item._id || item.id);
    const nameKey = normalizeKey(item.name || item.teacherName || item.subjectName || item.roomName);
    if (id) byId.set(id, item);
    if (nameKey) byName.set(nameKey, item);
  }
  return { byId, byName };
}

function resolveFromLookup(value, lookup, entry, fallbackNameKeys = []) {
  const directId = asIdString(value);
  if (directId && lookup.byId.has(directId)) return lookup.byId.get(directId);

  if (value && typeof value === 'object') {
    const valueName = normalizeKey(pickFirst(value, ['name', 'teacherName', 'fullName', 'lecturerName', 'subjectName', 'courseName', 'roomName']));
    if (valueName && lookup.byName.has(valueName)) return lookup.byName.get(valueName);
  }

  const fallbackName = normalizeKey(pickFirst(entry, fallbackNameKeys));
  if (fallbackName && lookup.byName.has(fallbackName)) return lookup.byName.get(fallbackName);

  return null;
}

function normalizeScheduleEntry(entry = {}, ctx = {}) {
  const teacherRef = pickFirst(entry, ['teacherId', 'teacher', 'teacherRef', 'lecturerId', 'lecturer', 'facultyId', 'instructorId', 'teacher_id', 'lecturer_id']);
  const subjectRef = pickFirst(entry, ['subjectId', 'subject', 'subjectRef', 'courseId', 'course', 'course_id', 'moduleId']);
  const roomRef = pickFirst(entry, ['roomId', 'room', 'roomRef', 'classroomId', 'room_id']);
  const timeslotRef = pickFirst(entry, ['timeslotId', 'timeslot', 'slotId', 'slot']);

  const teacherDoc = resolveFromLookup(teacherRef, ctx.teacherLookup, entry, ['teacherName', 'name', 'fullName', 'lecturerName', 'faculty']);
  const subjectDoc = resolveFromLookup(subjectRef, ctx.subjectLookup, entry, ['subjectName', 'courseName', 'name', 'module']);
  const roomDoc = resolveFromLookup(roomRef, ctx.roomLookup, entry, ['roomName', 'name', 'classroom']);
  const timeslotDoc = resolveFromLookup(timeslotRef, ctx.timeslotLookup, entry, ['timeslot', 'slot']);

  let day = normalizeDay(pickFirst(entry, ['day', 'weekday', 'dayOfWeek']));
  if (!day) {
    const dateValue = pickFirst(entry, ['date', 'classDate']);
    if (dateValue) {
      const parsed = new Date(dateValue);
      if (!Number.isNaN(parsed.getTime())) {
        day = normalizeDay(parsed.toLocaleDateString('en-US', { weekday: 'short' }));
      }
    }
  }
  if (!day && timeslotDoc) day = normalizeDay(pickFirst(timeslotDoc, ['day', 'weekday', 'dayOfWeek']));

  let startTime = normalizeText(pickFirst(entry, ['startTime', 'start', 'fromTime']));
  let endTime = normalizeText(pickFirst(entry, ['endTime', 'end', 'toTime']));

  if ((!startTime || !endTime) && timeslotDoc) {
    startTime = startTime || normalizeText(pickFirst(timeslotDoc, ['startTime', 'start', 'fromTime']));
    endTime = endTime || normalizeText(pickFirst(timeslotDoc, ['endTime', 'end', 'toTime']));
  }

  if (!startTime || !endTime) {
    const slotText = pickFirst(entry, ['slot', 'timeslot']) || pickFirst(timeslotDoc || {}, ['label', 'slot']);
    const parsed = extractTimeFromSlot(slotText);
    startTime = startTime || parsed.startTime;
    endTime = endTime || parsed.endTime;
  }

  const teacherName = normalizeText(
    teacherDoc?.name ||
    pickFirst(entry, ['teacherName', 'fullName', 'lecturerName', 'faculty']) ||
    pickFirst(teacherRef || {}, ['name', 'teacherName', 'fullName', 'lecturerName'])
  );

  const subjectName = normalizeText(
    subjectDoc?.name ||
    pickFirst(entry, ['subjectName', 'courseName', 'module']) ||
    pickFirst(subjectRef || {}, ['name', 'subjectName', 'courseName'])
  );

  const roomName = normalizeText(
    roomDoc?.name ||
    pickFirst(entry, ['roomName', 'classroom']) ||
    pickFirst(roomRef || {}, ['name', 'roomName'])
  );

  const teacherId = asIdString(teacherDoc?._id || teacherRef);
  const subjectId = asIdString(subjectDoc?._id || subjectRef);
  const roomId = asIdString(roomDoc?._id || roomRef);

  const normalized = {
    _id: asIdString(entry._id || entry.id) || `${ctx.source}:${Math.random().toString(36).slice(2, 10)}`,
    sourceCollection: ctx.source,
    teacherId: teacherDoc ? { _id: asIdString(teacherDoc._id), name: teacherDoc.name, department: teacherDoc.department, maxWeeklyHours: teacherDoc.maxWeeklyHours } : (teacherId || null),
    subjectId: subjectDoc ? { _id: asIdString(subjectDoc._id), name: subjectDoc.name, department: subjectDoc.department, weeklyHours: subjectDoc.weeklyHours } : (subjectId || null),
    roomId: roomDoc ? { _id: asIdString(roomDoc._id), name: roomDoc.name, type: roomDoc.type, capacity: roomDoc.capacity } : (roomId || null),
    teacherName,
    subjectName,
    roomName,
    day,
    startTime,
    endTime,
  };

  return normalized;
}

function mergeUniqueById(items = []) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const id = asIdString(item._id || item.id);
    const key = id || normalizeKey(item.name || item.teacherName || item.subjectName || item.roomName);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function sortSchedules(entries = []) {
  const dayRank = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return [...entries].sort((a, b) => {
    const dayDiff = (dayRank[a.day] || 99) - (dayRank[b.day] || 99);
    if (dayDiff !== 0) return dayDiff;
    return parseMinutes(a.startTime) - parseMinutes(b.startTime);
  });
}

async function getUnifiedAnalyticsData({ TeacherModel, SubjectModel, RoomModel, TimetableModel }) {
  const db = mongoose.connection?.db;

  const [teachersPrimary, subjectsPrimary, roomsPrimary, timetablesPrimary, lecturersRaw, schedulesRaw, coursesRaw, timeslotsRaw] = await Promise.all([
    TeacherModel.find().lean(),
    SubjectModel.find().lean(),
    RoomModel.find().lean(),
    TimetableModel.find().lean(),
    readCollection(db, 'lecturers'),
    readCollection(db, 'schedules'),
    readCollection(db, 'courses'),
    readCollection(db, 'timeslots'),
  ]);

  const teachers = mergeUniqueById([
    ...toArray(teachersPrimary).map((doc) => normalizeTeacher(doc, resolveCollectionName(TeacherModel) || 'teachers')),
    ...toArray(lecturersRaw).map((doc) => normalizeTeacher(doc, 'lecturers')),
  ]);

  const subjects = mergeUniqueById([
    ...toArray(subjectsPrimary).map((doc) => normalizeSubject(doc, resolveCollectionName(SubjectModel) || 'subjects')),
    ...toArray(coursesRaw).map((doc) => normalizeSubject(doc, 'courses')),
  ]);

  const rooms = mergeUniqueById([
    ...toArray(roomsPrimary).map((doc) => normalizeRoom(doc, resolveCollectionName(RoomModel) || 'rooms')),
  ]);

  const timeslots = toArray(timeslotsRaw).map((doc) => ({
    _id: asIdString(doc._id || doc.id),
    day: normalizeDay(pickFirst(doc, ['day', 'weekday', 'dayOfWeek'])),
    startTime: normalizeText(pickFirst(doc, ['startTime', 'start', 'fromTime'])),
    endTime: normalizeText(pickFirst(doc, ['endTime', 'end', 'toTime'])),
    label: normalizeText(pickFirst(doc, ['label', 'slot', 'timeslot'])),
  }));

  const teacherLookup = createLookup(teachers);
  const subjectLookup = createLookup(subjects);
  const roomLookup = createLookup(rooms);
  const timeslotLookup = createLookup(timeslots);

  const timetablesNormalized = toArray(timetablesPrimary)
    .map((entry) => normalizeScheduleEntry(entry, { source: resolveCollectionName(TimetableModel) || 'timetables', teacherLookup, subjectLookup, roomLookup, timeslotLookup }))
    .filter((entry) => entry.teacherId || entry.subjectId || entry.roomId || entry.day || entry.startTime || entry.endTime);

  const schedulesNormalized = toArray(schedulesRaw)
    .map((entry) => normalizeScheduleEntry(entry, { source: 'schedules', teacherLookup, subjectLookup, roomLookup, timeslotLookup }))
    .filter((entry) => entry.teacherId || entry.subjectId || entry.roomId || entry.day || entry.startTime || entry.endTime);

  const timetableEntries = sortSchedules(mergeUniqueById([...timetablesNormalized, ...schedulesNormalized]));

  return {
    teachers,
    subjects,
    rooms,
    timetableEntries,
    meta: {
      teachers: {
        teachers: toArray(teachersPrimary).length,
        lecturers: toArray(lecturersRaw).length,
        unified: teachers.length,
      },
      subjects: {
        subjects: toArray(subjectsPrimary).length,
        courses: toArray(coursesRaw).length,
        unified: subjects.length,
      },
      rooms: {
        rooms: toArray(roomsPrimary).length,
        unified: rooms.length,
      },
      schedules: {
        timetables: toArray(timetablesPrimary).length,
        schedules: toArray(schedulesRaw).length,
        unified: timetableEntries.length,
      },
    },
  };
}

module.exports = {
  getUnifiedAnalyticsData,
  parseMinutes,
  normalizeDay,
};
