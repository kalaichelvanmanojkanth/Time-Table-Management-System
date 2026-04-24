/* ────────────────────────────────────────────────────────────
   AI Scheduling Controller  –  POST /api/ai/run
   ─────────────────────────────────────────────────────────────
   Returns:
   {
     conflicts:   [{ type, severity, message, detail }],
     suggestions: [{ type, severity, message, fix }],
     meta:        { totalConflicts, totalSuggestions, highConflicts, ... }
   }
   All AI logic runs server-side; the frontend renders the result.
──────────────────────────────────────────────────────────── */

/* ── Step 1: Build a round-robin timetable grid ── */
const SLOT_HOURS = Array.from({ length: 8 }, (_, i) => `${8 + i}:00`);

function buildTimetable({ teachers = [], subjects = [], rooms = [], workingDays = [] }) {
  const data = {};
  workingDays.forEach(day => {
    data[day] = {};
    const slotsToFill = Math.min(subjects.length, 4);
    for (let i = 0; i < slotsToFill; i++) {
      data[day][SLOT_HOURS[i]] = {
        subject: subjects[i % subjects.length],
        teacher: teachers[i % teachers.length],
        room:    rooms[i % rooms.length],
      };
    }
  });
  return data;
}

/* ────────────────────────────────────────────────────────────
   STEP 2: Conflict Detection Engine
   Every conflict carries: { type, severity, message, detail }
──────────────────────────────────────────────────────────── */
function detectConflicts(timetable, setup) {
  const { rooms = [], workingDays = [], timeSlots = 6 } = setup;
  const conflicts = [];
  const seen = new Set();

  function push(key, obj) {
    if (seen.has(key)) return;
    seen.add(key);
    conflicts.push(obj);
  }

  /* 1 — Teacher double-booking: same time slot on different days */
  const teacherSlotMap = {};
  Object.entries(timetable).forEach(([day, slots]) => {
    Object.entries(slots).forEach(([slot, cell]) => {
      const k = `${cell.teacher}__${slot}`;
      if (teacherSlotMap[k]) {
        push(`tc_${k}_${day}`, {
          type:     'teacher',
          severity: 'high',
          message:  'Teacher double-booking detected',
          detail:   `${cell.teacher} is scheduled at ${slot} on both ${teacherSlotMap[k]} and ${day}`,
        });
      } else {
        teacherSlotMap[k] = day;
      }
    });
  });

  /* 2 — Room conflict: same room, same day, same slot */
  const roomMap = {};
  Object.entries(timetable).forEach(([day, slots]) => {
    Object.entries(slots).forEach(([slot, cell]) => {
      const k = `${cell.room}__${day}__${slot}`;
      if (roomMap[k]) {
        push(`rc_${k}`, {
          type:     'room',
          severity: 'high',
          message:  'Room double-booked',
          detail:   `${cell.room} is double-booked at ${slot} on ${day}`,
        });
      } else {
        roomMap[k] = true;
      }
    });
  });

  /* 3 — Teacher overload: > 3 classes on a single day */
  Object.entries(timetable).forEach(([day, slots]) => {
    const dayCount = {};
    Object.values(slots).forEach(cell => {
      dayCount[cell.teacher] = (dayCount[cell.teacher] || 0) + 1;
    });
    Object.entries(dayCount).forEach(([teacher, cnt]) => {
      if (cnt > 3) {
        push(`ol_${day}_${teacher}`, {
          type:     'teacher',
          severity: 'high',
          message:  'Teacher overloaded',
          detail:   `${teacher} has ${cnt} classes on ${day} — exceeds the recommended 3 per day`,
        });
      }
    });
  });

  /* 4 — Subject over-scheduled: appears > 4 times per week */
  const subjectCount = {};
  Object.values(timetable).forEach(slots =>
    Object.values(slots).forEach(cell => {
      subjectCount[cell.subject] = (subjectCount[cell.subject] || 0) + 1;
    })
  );
  Object.entries(subjectCount).forEach(([subj, cnt]) => {
    if (cnt > 4) {
      push(`so_${subj}`, {
        type:     'subject',
        severity: 'medium',
        message:  'Subject over-scheduled',
        detail:   `${subj} is scheduled ${cnt} times this week — exceeds the recommended 4 sessions`,
      });
    }
  });

  /* 5 — Consecutive classes: >= 4 consecutive slots in one day */
  Object.entries(timetable).forEach(([day, slots]) => {
    const filledSlots  = Object.keys(slots);
    const slotIndices  = filledSlots
      .map(s => SLOT_HOURS.indexOf(s))
      .filter(i => i >= 0)
      .sort((a, b) => a - b);

    if (slotIndices.length < 4) return;

    let maxStreak = 1;
    let streak    = 1;
    for (let i = 1; i < slotIndices.length; i++) {
      if (slotIndices[i] === slotIndices[i - 1] + 1) {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 1;
      }
    }
    if (maxStreak >= 4) {
      push(`cc_${day}`, {
        type:     'timeslot',
        severity: 'medium',
        message:  'Too many consecutive classes',
        detail:   `${day} has ${maxStreak} back-to-back classes — add a break after every 2–3 sessions`,
      });
    }
  });

  /* 6 — Room underutilisation: used < 30% of available slots */
  const totalSlots = workingDays.length * (Number(timeSlots) || 6);
  const roomUsage  = {};
  Object.values(timetable).forEach(slots =>
    Object.values(slots).forEach(cell => {
      roomUsage[cell.room] = (roomUsage[cell.room] || 0) + 1;
    })
  );
  rooms.forEach(room => {
    const used = roomUsage[room] || 0;
    const pct  = totalSlots > 0 ? (used / totalSlots) * 100 : 0;
    if (pct < 30) {
      push(`ru_${room}`, {
        type:     'room',
        severity: 'low',
        message:  'Room underutilised',
        detail:   `${room} is used only ${Math.round(pct)}% of available slots — consider consolidating classes`,
      });
    }
  });

  /* 7 — Excessive empty slots: > 50% unscheduled */
  const scheduledCount = Object.values(timetable).reduce(
    (sum, slots) => sum + Object.keys(slots).length, 0
  );
  const emptyPct = totalSlots > 0 ? ((totalSlots - scheduledCount) / totalSlots) * 100 : 0;
  if (emptyPct > 50) {
    push('empty_slots', {
      type:     'timeslot',
      severity: 'medium',
      message:  'Too many empty slots',
      detail:   `${Math.round(emptyPct)}% of available time slots are unscheduled — utilisation is very low`,
    });
  }

  return conflicts;
}

/* ────────────────────────────────────────────────────────────
   STEP 3: Optimization Suggestion Engine
   Every suggestion carries: { type, severity, message, fix }
──────────────────────────────────────────────────────────── */
function generateSuggestions(setup) {
  const {
    teachers = [], subjects = [], rooms = [],
    workingDays = [], timeSlots = 6,
  } = setup;
  const ts          = Number(timeSlots) || 0;
  const suggestions = [];

  const subjectPerTeacher = teachers.length ? subjects.length / teachers.length : 0;
  const subjectPerRoom    = rooms.length    ? subjects.length / rooms.length    : 0;
  const totalSlots        = workingDays.length * ts;
  const possibleEvents    = subjects.length * workingDays.length;
  const utilization       = totalSlots > 0
    ? Math.min(100, Math.round((possibleEvents / totalSlots) * 100))
    : 0;

  /* 1 — Balance teacher workload evenly */
  if (subjectPerTeacher > 3) {
    suggestions.push({
      type:     'teacher',
      severity: 'high',
      message:  'Balance faculty workload',
      fix:      `Subject-to-teacher ratio is ${subjectPerTeacher.toFixed(1)} — add ${Math.max(1, Math.ceil(subjects.length / 3) - teachers.length)} more teacher(s) or reduce subjects to bring the ratio to ≤ 3`,
    });
  } else {
    suggestions.push({
      type:     'teacher',
      severity: 'low',
      message:  'Faculty workload is balanced',
      fix:      `${subjectPerTeacher.toFixed(1)} subjects per teacher — distribution is within the acceptable range`,
    });
  }

  /* 2 — Avoid > 3 classes per teacher per day */
  if (teachers.length > 0 && teachers.length < subjects.length) {
    const maxDailyLoad = Math.ceil(subjects.length / teachers.length);
    if (maxDailyLoad > 3) {
      suggestions.push({
        type:     'teacher',
        severity: 'high',
        message:  'Teacher daily class limit at risk',
        fix:      `With ${teachers.length} teacher(s) and ${subjects.length} subjects, some teachers may carry ${maxDailyLoad} classes/day — add more staff to keep daily load ≤ 3`,
      });
    }
  }

  /* 3 — Ensure each subject appears at least once per week */
  if (subjects.length > totalSlots) {
    suggestions.push({
      type:     'schedule',
      severity: 'high',
      message:  'Insufficient slots for full subject coverage',
      fix:      `Only ${totalSlots} total slots for ${subjects.length} subjects — increase time slots or working days so every subject appears at least once per week`,
    });
  } else if (subjects.length > totalSlots * 0.8) {
    suggestions.push({
      type:     'schedule',
      severity: 'medium',
      message:  'Subject coverage is tight',
      fix:      `${subjects.length} subjects vs ${totalSlots} available slots — some subjects may miss weekly appearances; consider adding 1–2 more daily slots`,
    });
  } else {
    suggestions.push({
      type:     'schedule',
      severity: 'low',
      message:  'Subject coverage is adequate',
      fix:      `All ${subjects.length} subjects can be comfortably scheduled across ${totalSlots} available slots`,
    });
  }

  /* 4 — Avoid too many consecutive classes */
  if (ts > 4) {
    suggestions.push({
      type:     'schedule',
      severity: ts > 6 ? 'high' : 'medium',
      message:  'Risk of consecutive class overload',
      fix:      `${ts} slots/day — add a 15-minute break every 2–3 classes; assign no teacher more than 3 back-to-back slots`,
    });
  }

  /* 5a — Room underutilisation */
  if (subjectPerRoom < 0.5 && rooms.length > 1) {
    suggestions.push({
      type:     'room',
      severity: 'low',
      message:  'Rooms underutilised (< 30% threshold)',
      fix:      `${rooms.length} rooms for only ${subjects.length} subjects — consolidate classes into fewer rooms to push utilisation above 30%`,
    });
  }

  /* 5b — Improve room utilisation when demand is high */
  if (subjectPerRoom > 2) {
    suggestions.push({
      type:     'room',
      severity: 'medium',
      message:  'Classroom demand is high',
      fix:      `${rooms.length} room(s) serving ${subjects.length} subjects — add at least ${Math.max(1, Math.ceil(subjects.length / 2) - rooms.length)} more room(s) to ease room pressure`,
    });
  }

  /* 6 — Daily time slot optimality */
  if (ts > 8) {
    suggestions.push({
      type:     'schedule',
      severity: 'medium',
      message:  'Too many daily time slots',
      fix:      'More than 8 slots/day causes cognitive fatigue — cap at 8 and redistribute remaining subjects across working days',
    });
  } else if (ts < 4) {
    suggestions.push({
      type:     'schedule',
      severity: 'medium',
      message:  'Daily time slots too few',
      fix:      'Fewer than 4 slots/day under-utilises resources — increase to 5–6 slots for optimal coverage',
    });
  } else {
    suggestions.push({
      type:     'schedule',
      severity: 'low',
      message:  `Daily time slots (${ts}) are within optimal range`,
      fix:      'No change needed — slot count is within the recommended 4–8 range',
    });
  }

  /* 7 — Working day efficiency */
  if (workingDays.length < 4) {
    suggestions.push({
      type:     'schedule',
      severity: 'medium',
      message:  'Working days below recommended minimum',
      fix:      `Only ${workingDays.length} working day(s) configured — add more days to spread the load and reduce per-day class density`,
    });
  } else {
    suggestions.push({
      type:     'schedule',
      severity: 'low',
      message:  `${workingDays.length} working days provides a good schedule spread`,
      fix:      'No change needed — working day count is adequate',
    });
  }

  /* 8 — Schedule utilization */
  if (utilization < 60) {
    suggestions.push({
      type:     'schedule',
      severity: 'medium',
      message:  `Schedule utilisation is low (${utilization}%)`,
      fix:      'Increase subject allocation to fill available time slots and push resource usage above 70%',
    });
  }

  /* 9 — Core subject priority (always-on best-practice tip) */
  suggestions.push({
    type:     'schedule',
    severity: 'low',
    message:  'Prioritise core subjects in peak hours',
    fix:      'Schedule mandatory subjects (Algorithms, Mathematics) in the first half of the day when student concentration is highest',
  });

  return suggestions;
}

/* ────────────────────────────────────────────────────────────
   Controller: POST /api/ai/run
──────────────────────────────────────────────────────────── */
const runAIScheduling = (req, res) => {
  try {
    const setup = req.body;

    if (!setup || typeof setup !== 'object')
      return res.status(400).json({ success: false, message: 'Invalid request body' });

    const { teachers, subjects, rooms, workingDays } = setup;
    if (!teachers?.length)    return res.status(400).json({ success: false, message: 'No teachers provided' });
    if (!subjects?.length)    return res.status(400).json({ success: false, message: 'No subjects provided' });
    if (!rooms?.length)       return res.status(400).json({ success: false, message: 'No rooms provided' });
    if (!workingDays?.length) return res.status(400).json({ success: false, message: 'No working days provided' });

    const timetable   = buildTimetable(setup);
    const conflicts   = detectConflicts(timetable, setup);
    const suggestions = generateSuggestions(setup);

    res.json({
      success:     true,
      conflicts,
      suggestions,
      meta: {
        totalConflicts:   conflicts.length,
        totalSuggestions: suggestions.length,
        highConflicts:    conflicts.filter(c => c.severity === 'high').length,
        highSuggestions:  suggestions.filter(s => s.severity === 'high').length,
        teachers:         teachers.length,
        subjects:         subjects.length,
        rooms:            rooms.length,
        workingDays:      workingDays.length,
        processedAt:      new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('AI run error:', err);
    res.status(500).json({ success: false, message: 'AI scheduling engine error: ' + err.message });
  }
};

module.exports = { runAIScheduling };
