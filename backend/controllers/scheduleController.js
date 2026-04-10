const Schedule = require('../models/Schedule');

/* ─────────────────────────────────────────────────────────────
   Pure utility: generate entries from setup data
   Round-robin assignment: teacher, subject, room are cycled
   independently so distributions are always even.
───────────────────────────────────────────────────────────── */
function generateEntries({ teachers, subjects, rooms, workingDays, timeSlots }) {
  const ts = Math.max(1, Math.min(12, Number(timeSlots) || 6));
  const entries = [];
  let tIdx = 0, sIdx = 0, rIdx = 0;

  for (const day of workingDays) {
    for (let slot = 1; slot <= ts; slot++) {
      const startHour = 8 + (slot - 1);
      const endHour   = startHour + 1;
      const time      = `${String(startHour).padStart(2,'0')}:00 – ${String(endHour).padStart(2,'0')}:00`;

      entries.push({
        day,
        slot,
        time,
        teacher: teachers[tIdx % teachers.length],
        subject: subjects[sIdx % subjects.length],
        room:    rooms   [rIdx % rooms.length],
      });

      tIdx++; sIdx++; rIdx++;
    }
  }
  return entries;
}

/* ── GET /api/schedule ── */
const getSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: schedules });
  } catch (err) {
    console.error('[Schedule] getSchedules error:', err.stack || err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch schedules: ' + err.message });
  }
};

/* ── POST /api/schedule ── */
const saveSchedule = async (req, res) => {
  try {
    const { name, teachers, subjects, rooms, workingDays, timeSlots, constraints, entries } = req.body;

    if (!teachers?.length)    return res.status(400).json({ success: false, message: 'At least one teacher is required' });
    if (!subjects?.length)    return res.status(400).json({ success: false, message: 'At least one subject is required' });
    if (!rooms?.length)       return res.status(400).json({ success: false, message: 'At least one room is required' });
    if (!workingDays?.length) return res.status(400).json({ success: false, message: 'Working days are required' });

    /* Prefer caller-supplied entries, but auto-generate if empty */
    let safeEntries = Array.isArray(entries)
      ? entries.filter(e => e && typeof e === 'object' && e.teacher && e.subject && e.room && e.day && e.time)
      : [];

    if (safeEntries.length === 0) {
      safeEntries = generateEntries({ teachers, subjects, rooms, workingDays, timeSlots });
    }

    const schedule = await Schedule.create({
      name: name || 'Default Schedule',
      teachers, subjects, rooms, workingDays,
      timeSlots: timeSlots || 6,
      constraints: constraints || '',
      entries: safeEntries,
      createdBy: req.user?._id,
    });

    res.status(201).json({ success: true, data: schedule });
  } catch (err) {
    console.error('[Schedule] saveSchedule error:', err.stack || err.message);
    res.status(500).json({ success: false, message: 'Failed to save schedule: ' + err.message });
  }
};

/* ── POST /api/schedule/generate ── */
const generateScheduleEntries = async (req, res) => {
  try {
    const { teachers, subjects, rooms, workingDays, timeSlots } = req.body;

    if (!teachers?.length)    return res.status(400).json({ success: false, message: 'At least one teacher is required' });
    if (!subjects?.length)    return res.status(400).json({ success: false, message: 'At least one subject is required' });
    if (!rooms?.length)       return res.status(400).json({ success: false, message: 'At least one room is required' });
    if (!workingDays?.length) return res.status(400).json({ success: false, message: 'Working days are required' });

    const entries = generateEntries({ teachers, subjects, rooms, workingDays, timeSlots });
    res.json({ success: true, count: entries.length, data: entries });
  } catch (err) {
    console.error('[Schedule] generateScheduleEntries error:', err.stack || err.message);
    res.status(500).json({ success: false, message: 'Failed to generate entries: ' + err.message });
  }
};

/* ── GET /api/schedule/:id ── */
const getScheduleById = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });
    res.json({ success: true, data: schedule });
  } catch (err) {
    console.error('[Schedule] getScheduleById error:', err.stack || err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch schedule: ' + err.message });
  }
};

/* ── DELETE /api/schedule/:id ── */
const deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });
    res.json({ success: true, message: 'Schedule deleted' });
  } catch (err) {
    console.error('[Schedule] deleteSchedule error:', err.stack || err.message);
    res.status(500).json({ success: false, message: 'Failed to delete schedule: ' + err.message });
  }
};

module.exports = { getSchedules, saveSchedule, generateScheduleEntries, getScheduleById, deleteSchedule };
