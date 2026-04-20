const Lecturer = require('../models/Lecturer');
const Subject = require('../models/Subject');
const Room = require('../models/Room');
const Timetable = require('../models/Timetable');
const { getUnifiedAnalyticsData, parseMinutes } = require('../utils/analyticsNormalizer');

function getDurationMinutes(entry) {
  const diff = parseMinutes(entry.endTime) - parseMinutes(entry.startTime);
  return diff > 0 ? diff : 60;
}

function normalizeId(value) {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }
  return '';
}

function extractName(value, fallback = '') {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return value.name || value.teacherName || value.subjectName || value.roomName || fallback;
}

async function loadUnified() {
  const unified = await getUnifiedAnalyticsData({
    TeacherModel: Lecturer,
    SubjectModel: Subject,
    RoomModel: Room,
    TimetableModel: Timetable,
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('[analyticsController] unified source counts:', unified.meta);
  }

  return unified;
}

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/analytics/summary
   Returns live counts + computed workload / room-utilization / subject-dist.
   The frontend still does its own calc, but this endpoint is available for
   future use or server-side report generation.
───────────────────────────────────────────────────────────────────────────── */
exports.getSummary = async (req, res) => {
  try {
    const unified = await loadUnified();

    const payload = {
      success: true,
      data: {
        lecturers:  unified.teachers.length,
        subjects: unified.subjects.length,
        rooms: unified.rooms.length,
        timetables: unified.timetableEntries.length,
      },
      debug: unified.meta,
    };
    console.log('[API] /analytics/summary → sending payload:', JSON.stringify(payload.data));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json(payload);
  } catch (err) {
    console.error('[analyticsController] getSummary error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ success: false, message: 'Failed to fetch analytics summary', error: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/analytics/workload
   Teacher workload computed on the server: faster, no client calculation needed.
───────────────────────────────────────────────────────────────────────────── */
exports.getWorkload = async (req, res) => {
  try {
    const unified = await loadUnified();
    const { teachers, timetableEntries: entries } = unified;

    const result = teachers.map(teacher => {
      const tid = String(teacher._id);

      const matched = entries.filter(e => {
        const eid = normalizeId(e.teacherId);
        const ename = extractName(e.teacherId, e.teacherName || '');
        return eid === tid || (ename && teacher.name && ename.trim().toLowerCase() === teacher.name.trim().toLowerCase());
      });

      let totalMinutes = 0;
      for (const e of matched) {
        totalMinutes += getDurationMinutes(e);
      }

      const totalHours = +(totalMinutes / 60).toFixed(1);
      const maxHrs = Number(teacher.maxWeeklyHours) || 20;
      const status = totalHours > maxHrs ? 'overloaded' : totalHours < maxHrs * 0.5 ? 'underloaded' : 'optimal';

      return {
        lecturerId:     tid,
        lecturerName:   teacher.name,
        department: teacher.department,
        totalHours,
        totalClasses: matched.length,
        maxWeeklyHours: maxHrs,
        status,
      };
    });

    console.log(`[API] /analytics/workload → sending ${result.length} lecturer workload records`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, data: result, debug: unified.meta });
  } catch (err) {
    console.error('[analyticsController] getWorkload error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ success: false, message: 'Failed to compute workload', error: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/analytics/room-utilization
───────────────────────────────────────────────────────────────────────────── */
exports.getRoomUtilization = async (req, res) => {
  try {
    const weeklyAvailableHours = Number(req.query.weeklyAvailableHours) || 40;
    const unified = await loadUnified();
    const { rooms, timetableEntries: entries } = unified;

    const result = rooms.map(room => {
      const rid = String(room._id);

      const matched = entries.filter(e => {
        const eid = normalizeId(e.roomId);
        const ename = extractName(e.roomId, e.roomName || '');
        return eid === rid || (ename && room.name && ename.trim().toLowerCase() === room.name.trim().toLowerCase());
      });

      let totalMinutes = 0;
      for (const e of matched) {
        totalMinutes += getDurationMinutes(e);
      }

      const scheduledHours = +(totalMinutes / 60).toFixed(1);
      const utilization = Math.min(Math.round((scheduledHours / weeklyAvailableHours) * 100), 100);
      const status = utilization >= 100 ? 'overbooked' : utilization >= 70 ? 'high' : utilization > 0 ? 'normal' : 'unused';

      return {
        roomId: rid,
        roomName: room.name,
        roomType: room.type,
        capacity: Number(room.capacity) || 0,
        status: room.status || 'available',
        scheduledHours,
        availableHours: weeklyAvailableHours,
        utilization,
        utilizationStatus: status,
      };
    });

    console.log(`[API] /analytics/room-utilization → sending ${result.length} room records`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, data: result, debug: unified.meta });
  } catch (err) {
    console.error('[analyticsController] getRoomUtilization error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ success: false, message: 'Failed to compute room utilization', error: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/analytics/subject-distribution
───────────────────────────────────────────────────────────────────────────── */
exports.getSubjectDistribution = async (req, res) => {
  try {
    const unified = await loadUnified();
    const { subjects, timetableEntries: entries } = unified;

    const result = subjects.map(subj => {
      const sid = String(subj._id);

      const matched = entries.filter(e => {
        const eid = normalizeId(e.subjectId);
        const ename = extractName(e.subjectId, e.subjectName || '');
        return eid === sid || (ename && subj.name && ename.trim().toLowerCase() === subj.name.trim().toLowerCase());
      });

      let totalMinutes = 0;
      for (const e of matched) {
        totalMinutes += getDurationMinutes(e);
      }

      const scheduledHours = +(totalMinutes / 60).toFixed(1);

      return {
        subjectId:        sid,
        subjectName:      subj.name,
        department:       subj.department,
        weeklyHours:      Number(subj.weeklyHours) || 0,
        scheduledHours,
        scheduledClasses: matched.length,
      };
    });

    console.log(`[API] /analytics/subject-distribution → sending ${result.length} subject records`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, data: result, debug: unified.meta });
  } catch (err) {
    console.error('[analyticsController] getSubjectDistribution error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ success: false, message: 'Failed to compute subject distribution', error: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/analytics/weekly-trend
───────────────────────────────────────────────────────────────────────────── */
exports.getWeeklyTrend = async (req, res) => {
  try {
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const unified = await loadUnified();
    const entries = unified.timetableEntries;

    const dayMap = {};
    DAYS.forEach(d => { dayMap[d] = { entries: 0, minutes: 0 }; });

    for (const e of entries) {
      if (!e.day) continue;
      const abbr = String(e.day).trim().slice(0, 3);
      const normalized = abbr.charAt(0).toUpperCase() + abbr.slice(1).toLowerCase();
      if (!dayMap[normalized]) continue;
      dayMap[normalized].entries++;
      dayMap[normalized].minutes += getDurationMinutes(e);
    }

    const result = DAYS.map(day => ({
      day,
      entries: dayMap[day].entries,
      hours:   +(dayMap[day].minutes / 60).toFixed(1),
    }));

    console.log(`[API] /analytics/weekly-trend → sending ${result.length} day records`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, data: result, debug: unified.meta });
  } catch (err) {
    console.error('[analyticsController] getWeeklyTrend error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ success: false, message: 'Failed to compute weekly trend', error: err.message });
  }
};
