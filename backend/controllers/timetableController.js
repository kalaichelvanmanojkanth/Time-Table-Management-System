const Timetable = require('../models/Timetable');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Room = require('../models/Room');
const { getUnifiedAnalyticsData } = require('../utils/analyticsNormalizer');

// GET all timetable entries (populated)
exports.getTimetables = async (req, res) => {
  try {
    const unified = await getUnifiedAnalyticsData({
      TeacherModel: Teacher,
      SubjectModel: Subject,
      RoomModel: Room,
      TimetableModel: Timetable,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[timetableController] getTimetables unified counts:', unified.meta.schedules);
    }
    console.log(`[API] /timetables GET → sending ${(unified.timetableEntries || []).length} entries`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, data: unified.timetableEntries || [] });
  } catch (err) {
    console.error('[timetableController] getTimetables error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ success: false, message: 'Failed to fetch timetables', error: err.message });
  }
};

// POST create timetable entry
exports.createTimetable = async (req, res) => {
  try {
    const entry = await Timetable.create(req.body);
    const populated = await Timetable.findById(entry._id)
      .populate('subjectId', 'name department weeklyHours')
      .populate('teacherId', 'name department maxWeeklyHours')
      .populate('roomId',    'name type capacity')
      .lean();
    console.log(`[API] /timetables POST → created entry id: ${entry._id}`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('[timetableController] createTimetable error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT update timetable entry
exports.updateTimetable = async (req, res) => {
  try {
    const entry = await Timetable.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('subjectId', 'name department weeklyHours')
      .populate('teacherId', 'name department maxWeeklyHours')
      .populate('roomId',    'name type capacity')
      .lean();
    if (!entry) return res.status(404).json({ success: false, message: 'Timetable entry not found' });
    console.log(`[API] /timetables PUT → updated entry id: ${entry._id}`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, data: entry });
  } catch (err) {
    console.error('[timetableController] updateTimetable error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE timetable entry
exports.deleteTimetable = async (req, res) => {
  try {
    const entry = await Timetable.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Timetable entry not found' });
    console.log(`[API] /timetables DELETE → deleted entry id: ${entry._id}`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, message: 'Timetable entry deleted' });
  } catch (err) {
    console.error('[timetableController] deleteTimetable error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ success: false, message: err.message });
  }
};
