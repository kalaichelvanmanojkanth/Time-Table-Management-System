const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Room = require('../models/Room');
const Timetable = require('../models/Timetable');
const { getUnifiedAnalyticsData } = require('../utils/analyticsNormalizer');

// GET all teachers
exports.getTeachers = async (req, res) => {
  try {
    const unified = await getUnifiedAnalyticsData({
      TeacherModel: Teacher,
      SubjectModel: Subject,
      RoomModel: Room,
      TimetableModel: Timetable,
    });

    const teachers = [...unified.teachers].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (process.env.NODE_ENV !== 'production') {
      console.log('[teacherController] getTeachers unified counts:', unified.meta.teachers);
    }
    console.log(`[API] /teachers GET → sending ${teachers.length} records`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, data: teachers || [] });
  } catch (err) {
    console.error('[teacherController] getTeachers error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ success: false, message: 'Failed to fetch teachers', error: err.message });
  }
};

// POST create teacher
exports.createTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.create(req.body);
    console.log(`[API] /teachers POST → created teacher: ${teacher.name}`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(201).json({ success: true, data: teacher });
  } catch (err) {
    console.error('[teacherController] createTeacher error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT update teacher
exports.updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    console.log(`[API] /teachers PUT → updated teacher: ${teacher.name}`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, data: teacher });
  } catch (err) {
    console.error('[teacherController] updateTeacher error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE teacher
exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    console.log(`[API] /teachers DELETE → deleted teacher: ${teacher.name}`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, message: 'Teacher deleted' });
  } catch (err) {
    console.error('[teacherController] deleteTeacher error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ success: false, message: err.message });
  }
};
