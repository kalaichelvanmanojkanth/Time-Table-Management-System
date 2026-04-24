const fs = require('fs');

const content = fs.readFileSync('backend/controllers/timetableController.js', 'utf8');
const headBody = content.split('<<<<<<< HEAD\n')[1].split('=======\n')[0];
const mainBody = content.split('=======\n')[1].split('>>>>>>> ')[0].replace(/>>>>>>>.*\n/, '');

let merged = headBody.toString();

const getTimetablesMerged = `
const { getUnifiedAnalyticsData } = require('../utils/analyticsNormalizer');

const getTimetables = async (req, res) => {
  try {
    const unified = await getUnifiedAnalyticsData({
      TeacherModel: Teacher,
      SubjectModel: Subject,
      RoomModel: Room,
      TimetableModel: Timetable,
    });

    const entriesRaw = unified.timetableEntries || [];
    const mappedEntries = entriesRaw.map(e => ({
       ...e,
       subject: e.subjectId?.name || e.subject,
       teacher: e.teacherId?.name || e.teacher,
       room: e.roomId?.name || e.room,
       day: e.day,
       startTime: e.startTime,
       endTime: e.endTime,
       status: e.status
    }));

    const grid = buildGrid(mappedEntries);

    res.status(200).json({ 
       success: true, 
       data: mappedEntries,
       count: mappedEntries.length,
       grid: grid,
       meta: {
         days:      [...new Set(mappedEntries.map(e => e.day))],
         teachers:  [...new Set(mappedEntries.map(e => e.teacher))],
         subjects:  [...new Set(mappedEntries.map(e => e.subject))],
         rooms:     [...new Set(mappedEntries.map(e => e.room))],
         statuses:  [...new Set(mappedEntries.map(e => e.status))],
         fetchedAt: new Date().toISOString(),
         ...unified.meta
       } 
    });
  } catch (err) {
    console.error('[timetableController] getTimetables error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch timetables', error: err.message });
  }
};
`;

merged = merged.replace(/\/\* ── GET \/api\/timetables ── \*\/[\s\S]*?\/\* ── GET \/api\/timetables\/conflicts ── \*\//, getTimetablesMerged + '\n\n/* ── GET /api/timetables/conflicts ── */');

merged = merged.replace(/\/\* ── POST \/api\/timetables ── Create a single entry \*\/[\s\S]*?module\.exports = \{/, 
`/* ── POST /api/timetables ── Create a single entry */
const createTimetable = async (req, res) => {
  try {
    const entry = await Timetable.create(req.body);
    const populated = await Timetable.findById(entry._id)
      .populate('subjectId', 'name department weeklyHours')
      .populate('teacherId', 'name department maxWeeklyHours')
      .populate('roomId',    'name type capacity')
      .lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* ── PUT /api/timetables/:id ── Update one entry */
const updateTimetable = async (req, res) => {
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
    res.status(200).json({ success: true, data: entry });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* ── DELETE /api/timetables/:id ── Delete one entry */
const deleteTimetable = async (req, res) => {
  try {
    const entry = await Timetable.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Timetable entry not found' });
    res.status(200).json({ success: true, message: 'Timetable entry deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {`);

fs.writeFileSync('backend/controllers/timetableController.js', merged);
console.log('Fixed timetableController.js');
