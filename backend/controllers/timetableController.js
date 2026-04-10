/* ════════════════════════════════════════════════════════════════
   timetableController.js  —  production-ready
   ────────────────────────────────────────────────────────────────
   Routes handled:
     GET    /api/timetables               → fetch all (filterable)
     POST   /api/timetables               → create one entry
     PUT    /api/timetables/:id           → update one entry
     DELETE /api/timetables/:id           → delete one entry
     GET    /api/timetables/conflicts     → conflict detection
     POST   /api/timetables/optimize      → greedy AI optimizer
     POST   /api/timetables/apply-fixes   → persist optimized data
     POST   /api/timetables/seed          → seed from AISetup (clears first)
     PUT    /api/timetables/approve       → set all → "approved"
     PUT    /api/timetables/publish       → set all → "published" (requires approved)
════════════════════════════════════════════════════════════════ */

const Timetable = require('../models/Timetable');
const AISetup   = require('../models/AISetup');

/* ──────────────────────────────────────────────────────────
   SHARED HELPERS
────────────────────────────────────────────────────────── */

/** Convert "HH:MM" → total minutes */
function toMinutes(t) {
  if (!t) return 0;
  const [h, m] = String(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** True if two [start,end) ranges overlap */
function overlaps(s1, e1, s2, e2) {
  return toMinutes(s1) < toMinutes(e2) && toMinutes(s2) < toMinutes(e1);
}

/** Build a grid { day → { startTime → cell } } from a flat entry array */
function buildGrid(entries) {
  const grid = {};
  for (const e of entries) {
    if (!grid[e.day]) grid[e.day] = {};
    grid[e.day][e.startTime] = {
      _id:       e._id,
      subject:   e.subject,
      teacher:   e.teacher,
      room:      e.room,
      startTime: e.startTime,
      endTime:   e.endTime,
      status:    e.status,
    };
  }
  return grid;
}

/* ──────────────────────────────────────────────────────────
   CONFLICT DETECTION ENGINE
────────────────────────────────────────────────────────── */
function detectConflicts(entries) {
  const conflicts = [];
  const seen      = new Set();
  const n         = entries.length;

  function push(key, obj) {
    if (seen.has(key)) return;
    seen.add(key);
    conflicts.push(obj);
  }

  /* Teacher double-booking & room double-booking */
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = entries[i];
      const b = entries[j];
      if (a.day !== b.day) continue;
      if (!overlaps(a.startTime, a.endTime, b.startTime, b.endTime)) continue;

      if (a.teacher === b.teacher) {
        push(`teacher_${a.day}_${a.teacher}_${i}_${j}`, {
          type: 'teacher', severity: 'high', day: a.day, time: a.startTime,
          message: `Teacher "${a.teacher}" has overlapping classes`,
          detail:  `${a.teacher} is at ${a.startTime}–${a.endTime} AND ${b.startTime}–${b.endTime} on ${a.day}`,
          ids: [a._id, b._id],
        });
      }
      if (a.room === b.room) {
        push(`room_${a.day}_${a.room}_${i}_${j}`, {
          type: 'room', severity: 'high', day: a.day, time: a.startTime,
          message: `Room "${a.room}" is double-booked`,
          detail:  `${a.room} has classes at ${a.startTime} and ${b.startTime} on ${a.day}`,
          ids: [a._id, b._id],
        });
      }
    }
  }

  /* Teacher overload: > 3 sessions/day */
  const tdMap = {};
  for (const e of entries) {
    const k = `${e.teacher}__${e.day}`;
    tdMap[k] = tdMap[k] ? [...tdMap[k], e] : [e];
  }
  for (const [k, list] of Object.entries(tdMap)) {
    if (list.length > 3) {
      const [teacher, day] = k.split('__');
      push(`overload_${day}_${teacher}`, {
        type: 'overload', severity: 'high', day, time: list[0].startTime,
        message: `Teacher "${teacher}" is overloaded`,
        detail:  `${teacher} has ${list.length} sessions on ${day} (max recommended: 3)`,
        ids: list.map(e => e._id),
      });
    }
  }

  /* Subject over-scheduled: > 4 sessions/week */
  const swMap = {};
  for (const e of entries) swMap[e.subject] = (swMap[e.subject] || 0) + 1;
  for (const [subject, cnt] of Object.entries(swMap)) {
    if (cnt > 4) {
      push(`oversubject_${subject}`, {
        type: 'subject', severity: 'medium', day: 'All', time: '-',
        message: `"${subject}" is over-scheduled`,
        detail:  `"${subject}" appears ${cnt} times — recommended max is 4/week`,
        ids: [],
      });
    }
  }

  return conflicts;
}

/* ──────────────────────────────────────────────────────────
   AI SUGGESTION ENGINE
────────────────────────────────────────────────────────── */
function generateSuggestions(entries, conflicts) {
  const suggestions = [];

  for (const c of conflicts) {
    if (c.type === 'teacher')
      suggestions.push({
        conflictId: `fix_${c.type}_${c.day}_${c.time}`,
        type: 'teacher', severity: 'high',
        message: `Reassign one class for "${c.message.replace(/"/g,'').split(' has')[0]}"`,
        fix: 'Move the second session to a different time slot or assign another available teacher.',
        affectedIds: c.ids,
      });

    if (c.type === 'room')
      suggestions.push({
        conflictId: `fix_room_${c.day}_${c.time}`,
        type: 'room', severity: 'high',
        message: 'Reassign room for one of the conflicting classes',
        fix: 'Find an available room at the same time, or move one class to a different slot.',
        affectedIds: c.ids,
      });

    if (c.type === 'overload')
      suggestions.push({
        conflictId: `fix_overload_${c.day}`,
        type: 'teacher', severity: 'high',
        message: 'Balance teacher workload across the week',
        fix: `Move some of ${c.day}'s sessions to other working days.`,
        affectedIds: c.ids,
      });

    if (c.type === 'subject')
      suggestions.push({
        conflictId: `fix_subject_${c.message}`,
        type: 'schedule', severity: 'medium',
        message: c.message,
        fix: 'Reduce weekly frequency to ≤ 4 sessions by merging or removing recurring entries.',
        affectedIds: [],
      });
  }

  /* Always-on best practices */
  const days = [...new Set(entries.map(e => e.day))];
  if (days.length < 4)
    suggestions.push({
      conflictId: 'bp_working_days',
      type: 'schedule', severity: 'medium',
      message: 'Spread classes over more working days',
      fix: `Only ${days.length} day(s) scheduled — use at least 4 days to spread load evenly.`,
      affectedIds: [],
    });

  suggestions.push({
    conflictId: 'bp_morning_priority',
    type: 'schedule', severity: 'low',
    message: 'Schedule core subjects in morning slots',
    fix: 'Place high-priority subjects (Algorithms, Math) in 08:00–12:00 for best focus.',
    affectedIds: [],
  });

  return suggestions;
}

/* ──────────────────────────────────────────────────────────
   GREEDY AUTO-OPTIMIZER
────────────────────────────────────────────────────────── */
function autoOptimize(entries) {
  const optimized = entries.map(e => ({ ...e }));
  const teacherSlots = new Set(optimized.map(e => `${e.teacher}__${e.day}__${e.startTime}`));
  const roomSlots    = new Set(optimized.map(e => `${e.room}__${e.day}__${e.startTime}`));

  const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00'];
  const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  let resolvedCount = 0;

  for (let i = 0; i < optimized.length; i++) {
    for (let j = i + 1; j < optimized.length; j++) {
      const a = optimized[i], b = optimized[j];
      if (a.day !== b.day) continue;
      const hasTC = a.teacher === b.teacher && overlaps(a.startTime, a.endTime, b.startTime, b.endTime);
      const hasRC = a.room    === b.room    && overlaps(a.startTime, a.endTime, b.startTime, b.endTime);
      if (!hasTC && !hasRC) continue;

      let moved = false;
      outer: for (const day of DAYS) {
        for (const hour of HOURS) {
          const tk = `${b.teacher}__${day}__${hour}`;
          const rk = `${b.room}__${day}__${hour}`;
          if (!teacherSlots.has(tk) && !roomSlots.has(rk)) {
            teacherSlots.delete(`${b.teacher}__${b.day}__${b.startTime}`);
            roomSlots.delete(`${b.room}__${b.day}__${b.startTime}`);
            b.day       = day;
            b.startTime = hour;
            b.endTime   = `${String(Number(hour.split(':')[0]) + 1).padStart(2,'0')}:00`;
            b.status    = 'optimized';
            b._modified = true;
            teacherSlots.add(tk);
            roomSlots.add(rk);
            resolvedCount++;
            moved = true;
            break outer;
          }
        }
      }
    }
  }

  return { optimized, resolvedCount };
}

/* ══════════════════════════════════════════════════════════
   CONTROLLERS
══════════════════════════════════════════════════════════ */

/* ── GET /api/timetables ── */
const getTimetables = async (req, res) => {
  try {
    const filter = {};
    if (req.query.day)     filter.day     = req.query.day;
    if (req.query.teacher) filter.teacher = new RegExp(req.query.teacher, 'i');
    if (req.query.subject) filter.subject = new RegExp(req.query.subject, 'i');
    if (req.query.room)    filter.room    = new RegExp(req.query.room,    'i');
    if (req.query.status)  filter.status  = req.query.status;

    const entries = await Timetable.find(filter)
      .sort({ day: 1, startTime: 1 })
      .lean();

    const grid = buildGrid(entries);

    res.json({
      success: true,
      count:   entries.length,
      data:    entries,
      grid,
      meta: {
        days:      [...new Set(entries.map(e => e.day))],
        teachers:  [...new Set(entries.map(e => e.teacher))],
        subjects:  [...new Set(entries.map(e => e.subject))],
        rooms:     [...new Set(entries.map(e => e.room))],
        statuses:  [...new Set(entries.map(e => e.status))],
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[Timetable] getTimetables error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch timetables: ' + err.message });
  }
};

/* ── GET /api/timetables/conflicts ── */
const getConflicts = async (req, res) => {
  try {
    const entries = await Timetable.find().lean();

    if (!entries.length) {
      return res.json({
        success: true, conflicts: [], suggestions: [],
        meta: { totalEntries: 0, totalConflicts: 0, message: 'No timetable entries found — seed the database first' },
      });
    }

    const conflicts   = detectConflicts(entries);
    const suggestions = generateSuggestions(entries, conflicts);

    res.json({
      success: true,
      conflicts,
      suggestions,
      meta: {
        totalEntries:     entries.length,
        totalConflicts:   conflicts.length,
        totalSuggestions: suggestions.length,
        highConflicts:    conflicts.filter(c => c.severity === 'high').length,
        mediumConflicts:  conflicts.filter(c => c.severity === 'medium').length,
        scannedAt:        new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[Timetable] getConflicts error:', err.message);
    res.status(500).json({ success: false, message: 'Conflict detection failed: ' + err.message });
  }
};

/* ── POST /api/timetables/optimize ── */
const optimizeTimetable = async (req, res) => {
  try {
    const entries = await Timetable.find().lean();
    if (!entries.length)
      return res.status(400).json({ success: false, message: 'No timetable entries to optimize — seed first' });

    const conflictsBefore         = detectConflicts(entries);
    const { optimized, resolvedCount } = autoOptimize(entries);
    const conflictsAfter          = detectConflicts(optimized);

    res.json({
      success: true,
      before:  { entries, conflicts: conflictsBefore, grid: buildGrid(entries) },
      after:   { entries: optimized, conflicts: conflictsAfter, grid: buildGrid(optimized) },
      meta: {
        resolvedCount,
        conflictsBefore: conflictsBefore.length,
        conflictsAfter:  conflictsAfter.length,
        improvement:     conflictsBefore.length - conflictsAfter.length,
        optimizedAt:     new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[Timetable] optimizeTimetable error:', err.message);
    res.status(500).json({ success: false, message: 'Optimization failed: ' + err.message });
  }
};

/* ── POST /api/timetables/apply-fixes ── */
const applyFixes = async (req, res) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries) || !entries.length)
      return res.status(400).json({ success: false, message: 'No entries provided' });

    const modified  = entries.filter(e => e._modified);
    if (!modified.length)
      return res.json({ success: true, message: 'No changes to apply', updatedCount: 0 });

    const updates   = await Promise.all(
      modified.map(e =>
        Timetable.findByIdAndUpdate(
          e._id,
          { day: e.day, startTime: e.startTime, endTime: e.endTime, status: 'optimized' },
          { new: true }
        )
      )
    );

    const ok = updates.filter(Boolean);
    res.json({ success: true, message: `${ok.length} entries updated`, updatedCount: ok.length, appliedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[Timetable] applyFixes error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to apply fixes: ' + err.message });
  }
};

/* ── POST /api/timetables/seed ── Clear + re-generate from latest AISetup */
const seedFromSetup = async (req, res) => {
  try {
    /* 1. Get latest AI Setup */
    const setup = await AISetup.findOne().sort({ createdAt: -1 }).lean();
    if (!setup)
      return res.status(404).json({ success: false, message: 'No AI Setup found — save your setup first' });

    const { teachers = [], subjects = [], rooms = [], workingDays = [], timeSlots = 6 } = setup;

    /* 2. Validate */
    if (!teachers.length)    return res.status(400).json({ success: false, message: 'Setup has no teachers' });
    if (!subjects.length)    return res.status(400).json({ success: false, message: 'Setup has no subjects' });
    if (!rooms.length)       return res.status(400).json({ success: false, message: 'Setup has no rooms' });
    if (!workingDays.length) return res.status(400).json({ success: false, message: 'Setup has no working days' });

    const ts = Math.min(Math.max(Number(timeSlots) || 6, 1), 8);
    const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00'];

    /* 3. Generate entries (round-robin) */
    const entries = [];
    let tIdx = 0, sIdx = 0, rIdx = 0;

    for (const day of workingDays) {
      for (let slot = 0; slot < ts; slot++) {
        const startTime = HOURS[slot]     || `${String(8 + slot).padStart(2,'0')}:00`;
        const endTime   = HOURS[slot + 1] || `${String(9 + slot).padStart(2,'0')}:00`;

        entries.push({
          subject:   subjects[sIdx % subjects.length],
          teacher:   teachers[tIdx % teachers.length],
          room:      rooms[rIdx   % rooms.length],
          subjectId: subjects[sIdx % subjects.length],
          teacherId: teachers[tIdx % teachers.length],
          roomId:    rooms[rIdx   % rooms.length],
          day,
          startTime,
          endTime,
          slot:   slot + 1,
          status: 'draft',
        });
        tIdx++; sIdx++; rIdx++;
      }
    }

    /* 4. Drop all existing entries first (prevents E11000) */
    console.log('[Seed] Clearing existing timetable entries…');
    await Timetable.deleteMany({});

    /* 5. Drop any stale indexes that could cause conflicts, then recreate */
    try {
      await Timetable.collection.dropIndexes();
    } catch (_) { /* ignore if no indexes to drop */ }

    /* 6. Insert fresh entries */
    console.log(`[Seed] Inserting ${entries.length} entries…`);
    const inserted = await Timetable.insertMany(entries, { ordered: false });

    console.log(`[Seed] Done — ${inserted.length} entries created`);
    res.status(201).json({
      success: true,
      message: `Timetable seeded with ${inserted.length} entries from latest AI Setup`,
      count:   inserted.length,
      days:    workingDays,
      slotsPerDay: ts,
    });

  } catch (err) {
    // Handle duplicate key gracefully
    if (err.code === 11000) {
      console.error('[Seed] E11000 duplicate key — retrying with deleteMany…');
      try {
        await Timetable.deleteMany({});
        return res.status(409).json({
          success: false,
          message: 'Duplicate key conflict cleared — please click Regenerate again',
        });
      } catch (retryErr) {
        return res.status(500).json({ success: false, message: 'Seed failed: ' + retryErr.message });
      }
    }
    console.error('[Seed] seedFromSetup error:', err.message);
    res.status(500).json({ success: false, message: 'Seed failed: ' + err.message });
  }
};

/* ── PUT /api/timetables/approve ── Mark all entries as "approved" */
const approveTimetable = async (req, res) => {
  try {
    const total = await Timetable.countDocuments();
    if (!total)
      return res.status(400).json({ success: false, message: 'No timetable entries to approve — seed first' });

    /* Check for conflicts before approving */
    const entries   = await Timetable.find().lean();
    const conflicts = detectConflicts(entries);
    if (conflicts.some(c => c.severity === 'high'))
      return res.status(422).json({
        success:        false,
        message:        `Cannot approve — ${conflicts.filter(c => c.severity === 'high').length} high-severity conflict(s) exist`,
        conflictCount:  conflicts.length,
        conflicts:      conflicts.slice(0, 5), // sample for UI
      });

    const result = await Timetable.updateMany({}, { $set: { status: 'approved' } });

    console.log(`[Approve] ${result.modifiedCount} entries set to approved`);
    res.json({
      success:       true,
      message:       `${result.modifiedCount} timetable entries approved`,
      approvedCount: result.modifiedCount,
      approvedAt:    new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Approve] error:', err.message);
    res.status(500).json({ success: false, message: 'Approval failed: ' + err.message });
  }
};

/* ── PUT /api/timetables/publish ── Mark all "approved" entries as "published" */
const publishTimetable = async (req, res) => {
  try {
    const total    = await Timetable.countDocuments();
    if (!total)
      return res.status(400).json({ success: false, message: 'No timetable entries to publish — seed & approve first' });

    /* Require all entries to be approved first */
    const notApproved = await Timetable.countDocuments({ status: { $nin: ['approved', 'published'] } });
    if (notApproved > 0)
      return res.status(422).json({
        success: false,
        message: `${notApproved} entrie(s) are not yet approved — approve the full timetable first`,
      });

    const result = await Timetable.updateMany(
      { status: 'approved' },
      { $set: { status: 'published' } }
    );

    console.log(`[Publish] ${result.modifiedCount} entries published`);
    res.json({
      success:        true,
      message:        `Timetable published — ${result.modifiedCount} entries are now live`,
      publishedCount: result.modifiedCount,
      publishedAt:    new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Publish] error:', err.message);
    res.status(500).json({ success: false, message: 'Publish failed: ' + err.message });
  }
};

/* ── POST /api/timetables ── Create a single entry */
const createTimetable = async (req, res) => {
  try {
    const { subject, teacher, room, day, startTime, endTime } = req.body;
    if (!subject)   return res.status(400).json({ success: false, message: 'subject is required' });
    if (!teacher)   return res.status(400).json({ success: false, message: 'teacher is required' });
    if (!room)      return res.status(400).json({ success: false, message: 'room is required' });
    if (!day)       return res.status(400).json({ success: false, message: 'day is required' });
    if (!startTime) return res.status(400).json({ success: false, message: 'startTime is required' });
    if (!endTime)   return res.status(400).json({ success: false, message: 'endTime is required' });

    const entry = await Timetable.create({ subject, teacher, room, day, startTime, endTime });
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    console.error('[Timetable] createTimetable error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create entry: ' + err.message });
  }
};

/* ── PUT /api/timetables/:id ── Update one entry */
const updateTimetable = async (req, res) => {
  try {
    const entry = await Timetable.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    res.json({ success: true, data: entry });
  } catch (err) {
    console.error('[Timetable] updateTimetable error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update entry: ' + err.message });
  }
};

/* ── DELETE /api/timetables/:id ── Delete one entry */
const deleteTimetable = async (req, res) => {
  try {
    const entry = await Timetable.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    res.json({ success: true, message: 'Entry deleted' });
  } catch (err) {
    console.error('[Timetable] deleteTimetable error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete entry: ' + err.message });
  }
};

module.exports = {
  getTimetables,
  getConflicts,
  optimizeTimetable,
  applyFixes,
  seedFromSetup,
  approveTimetable,
  publishTimetable,
  createTimetable,
  updateTimetable,
  deleteTimetable,
};
