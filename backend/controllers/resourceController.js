/* ═══════════════════════════════════════════════════════════════
   resourceController.js
   ────────────────────────────────────────────────────────────────
   Full CRUD for Teacher, Subject, and Room.
   Also exposes POST /api/resource/seed-samples  to pre-populate
   the database with realistic Sri Lankan academic data.
═══════════════════════════════════════════════════════════════ */

const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Room    = require('../models/Room');

/* ──────────────────────────────────────────────────────────
   Generic helpers
────────────────────────────────────────────────────────── */
function makeController(Model, label) {
  return {
    /* GET /api/:resource */
    getAll: async (req, res) => {
      try {
        const filter = { isActive: true };
        if (req.query.department) filter.department = new RegExp(req.query.department, 'i');
        const docs = await Model.find(filter).sort({ name: 1 }).lean();
        res.json({ success: true, count: docs.length, data: docs });
      } catch (err) {
        console.error(`[${label}] getAll error:`, err.message);
        res.status(500).json({ success: false, message: `Failed to fetch ${label}s: ${err.message}` });
      }
    },

    /* GET /api/:resource/:id */
    getById: async (req, res) => {
      try {
        const doc = await Model.findById(req.params.id).lean();
        if (!doc) return res.status(404).json({ success: false, message: `${label} not found` });
        res.json({ success: true, data: doc });
      } catch (err) {
        res.status(500).json({ success: false, message: err.message });
      }
    },

    /* POST /api/:resource */
    create: async (req, res) => {
      try {
        const doc = await Model.create(req.body);
        console.log(`[${label}] created: ${doc.name}`);
        res.status(201).json({ success: true, data: doc });
      } catch (err) {
        if (err.code === 11000) {
          return res.status(409).json({ success: false, message: `A ${label} with that name already exists` });
        }
        console.error(`[${label}] create error:`, err.message);
        res.status(500).json({ success: false, message: err.message });
      }
    },

    /* PUT /api/:resource/:id */
    update: async (req, res) => {
      try {
        const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!doc) return res.status(404).json({ success: false, message: `${label} not found` });
        res.json({ success: true, data: doc });
      } catch (err) {
        res.status(500).json({ success: false, message: err.message });
      }
    },

    /* DELETE /api/:resource/:id  (soft-delete: sets isActive = false) */
    remove: async (req, res) => {
      try {
        const doc = await Model.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!doc) return res.status(404).json({ success: false, message: `${label} not found` });
        res.json({ success: true, message: `${label} deactivated` });
      } catch (err) {
        res.status(500).json({ success: false, message: err.message });
      }
    },
  };
}

const teacherCtrl = makeController(Teacher, 'Teacher');
const subjectCtrl = makeController(Subject, 'Subject');
const roomCtrl    = makeController(Room,    'Room');

/* ──────────────────────────────────────────────────────────
   Admin: seed sample data (idempotent — skips duplicates)
   POST /api/resource/seed-samples
────────────────────────────────────────────────────────── */
const SAMPLE_TEACHERS = [
  { name: 'Dr. Nimal Perera',         department: 'Computer Science' },
  { name: 'Prof. Anjali Silva',        department: 'Information Technology' },
  { name: 'Dr. Kasun Fernando',        department: 'Computer Science' },
  { name: 'Prof. Chamari Wijesinghe', department: 'Mathematics' },
  { name: 'Dr. Supun Jayasinghe',     department: 'Software Engineering' },
  { name: 'Prof. Dilani Perera',      department: 'Artificial Intelligence' },
  { name: 'Dr. Sanduni Fernando',     department: 'Computer Networks' },
  { name: 'Prof. Ruwan Kumara',       department: 'Database Systems' },
  { name: 'Dr. Tharindu Silva',       department: 'Computer Science' },
];

const SAMPLE_SUBJECTS = [
  { name: 'Algorithms & Problem Solving', code: 'CS201', credits: 3, department: 'Computer Science' },
  { name: 'Data Structures',             code: 'CS202', credits: 3, department: 'Computer Science' },
  { name: 'Operating Systems',           code: 'CS301', credits: 3, department: 'Computer Science' },
  { name: 'Computer Networks',           code: 'CS401', credits: 3, department: 'Computer Networks' },
  { name: 'Database Systems',            code: 'CS302', credits: 3, department: 'Database Systems' },
  { name: 'Artificial Intelligence (AI)',code: 'CS501', credits: 3, department: 'Artificial Intelligence' },
  { name: 'Machine Learning',            code: 'CS502', credits: 3, department: 'Artificial Intelligence' },
  { name: 'Software Engineering',        code: 'SE301', credits: 3, department: 'Software Engineering' },
  { name: 'Mathematics III',             code: 'MA301', credits: 3, department: 'Mathematics' },
  { name: 'Digital Circuits & Logic',   code: 'EE201', credits: 3, department: 'Electronics' },
];

const SAMPLE_ROOMS = [
  { name: 'A101',  type: 'Lecture Hall',  capacity: 80,  building: 'Block A' },
  { name: 'A102',  type: 'Lecture Hall',  capacity: 80,  building: 'Block A' },
  { name: 'B201',  type: 'Seminar Room',  capacity: 40,  building: 'Block B' },
  { name: 'B202',  type: 'Seminar Room',  capacity: 40,  building: 'Block B' },
  { name: 'B505',  type: 'Lecture Hall',  capacity: 120, building: 'Block B' },
  { name: 'G1306', type: 'Auditorium',    capacity: 300, building: 'Main Block' },
  { name: 'D101',  type: 'Tutorial Room', capacity: 25,  building: 'Block D' },
  { name: 'E201',  type: 'Lecture Hall',  capacity: 60,  building: 'Block E' },
  { name: 'Lab 01',type: 'Lab',           capacity: 30,  building: 'Computer Lab' },
  { name: 'Lab 02',type: 'Lab',           capacity: 30,  building: 'Computer Lab' },
];

const seedSamples = async (req, res) => {
  try {
    const results = { teachers: 0, subjects: 0, rooms: 0, skipped: 0 };

    // Upsert by name (no duplicates)
    for (const t of SAMPLE_TEACHERS) {
      const r = await Teacher.updateOne({ name: t.name }, { $setOnInsert: t }, { upsert: true });
      if (r.upsertedCount) results.teachers++;
      else                 results.skipped++;
    }
    for (const s of SAMPLE_SUBJECTS) {
      const r = await Subject.updateOne({ name: s.name }, { $setOnInsert: s }, { upsert: true });
      if (r.upsertedCount) results.subjects++;
      else                 results.skipped++;
    }
    for (const rm of SAMPLE_ROOMS) {
      const r = await Room.updateOne({ name: rm.name }, { $setOnInsert: rm }, { upsert: true });
      if (r.upsertedCount) results.rooms++;
      else                 results.skipped++;
    }

    console.log('[SeedSamples]', results);
    res.status(201).json({
      success: true,
      message: `Sample data seeded — ${results.teachers} teacher(s), ${results.subjects} subject(s), ${results.rooms} room(s) created (${results.skipped} already existed)`,
      results,
    });
  } catch (err) {
    console.error('[SeedSamples] error:', err.message);
    res.status(500).json({ success: false, message: 'Seed failed: ' + err.message });
  }
};

module.exports = {
  teacherCtrl,
  subjectCtrl,
  roomCtrl,
  seedSamples,
};
