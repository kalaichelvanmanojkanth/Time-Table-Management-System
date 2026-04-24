const Lecturer = require('../models/Lecturer');
const Subject = require('../models/Subject');
const Room = require('../models/Room');
const Timetable = require('../models/Timetable');
const { getUnifiedAnalyticsData } = require('../utils/analyticsNormalizer');

// GET all lecturers
exports.getLecturers = async (req, res) => {
  try {
    const unified = await getUnifiedAnalyticsData({
      TeacherModel: Lecturer,
      SubjectModel: Subject,
      RoomModel: Room,
      TimetableModel: Timetable,
    });

    const lecturers = [...unified.teachers].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (process.env.NODE_ENV !== 'production') {
      console.log('[lecturerController] getLecturers unified counts:', unified.meta.teachers);
    }
    console.log(`[API] /lecturers GET → sending ${lecturers.length} records`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    // Map to include both lecturerId/lecturerName AND _id/name for frontend compatibility
    const mapped = lecturers.map(l => ({
      _id:            l._id,
      name:           l.name,
      department:     l.department,
      availability:   Array.isArray(l.availability) ? l.availability : [],
      maxWeeklyHours: l.maxWeeklyHours,
      lecturerId:     l._id,
      lecturerName:   l.name,
    }));
    res.status(200).json({ success: true, data: mapped });
  } catch (err) {
    console.error('[lecturerController] getLecturers error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ success: false, message: 'Failed to fetch lecturers', error: err.message });
  }
};

// POST create lecturer
exports.createLecturer = async (req, res) => {
  try {
    const lecturer = await Lecturer.create(req.body);
    console.log(`[API] /lecturers POST → created lecturer: ${lecturer.name}`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(201).json({ success: true, data: lecturer });
  } catch (err) {
    console.error('[lecturerController] createLecturer error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT update lecturer
exports.updateLecturer = async (req, res) => {
  try {
    const lecturer = await Lecturer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!lecturer) return res.status(404).json({ success: false, message: 'Lecturer not found' });
    console.log(`[API] /lecturers PUT → updated lecturer: ${lecturer.name}`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, data: lecturer });
  } catch (err) {
    console.error('[lecturerController] updateLecturer error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE lecturer
exports.deleteLecturer = async (req, res) => {
  try {
    const lecturer = await Lecturer.findByIdAndDelete(req.params.id);
    if (!lecturer) return res.status(404).json({ success: false, message: 'Lecturer not found' });
    console.log(`[API] /lecturers DELETE → deleted lecturer: ${lecturer.name}`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, message: 'Lecturer deleted' });
  } catch (err) {
    console.error('[lecturerController] deleteLecturer error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ success: false, message: err.message });
  }
};
