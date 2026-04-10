const Subject = require('../models/Subject');

// GET all subjects
exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ createdAt: -1 });
    console.log(`[API] /subjects GET → sending ${subjects.length} records`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, data: subjects || [] });
  } catch (err) {
    console.error('[subjectController] getSubjects error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ success: false, message: 'Failed to fetch subjects', error: err.message });
  }
};

// POST create subject
exports.createSubject = async (req, res) => {
  try {
    const subject = await Subject.create(req.body);
    console.log(`[API] /subjects POST → created subject: ${subject.name}`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(201).json({ success: true, data: subject });
  } catch (err) {
    console.error('[subjectController] createSubject error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT update subject
exports.updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    console.log(`[API] /subjects PUT → updated subject: ${subject.name}`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, data: subject });
  } catch (err) {
    console.error('[subjectController] updateSubject error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE subject
exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    console.log(`[API] /subjects DELETE → deleted subject: ${subject.name}`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, message: 'Subject deleted' });
  } catch (err) {
    console.error('[subjectController] deleteSubject error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ success: false, message: err.message });
  }
};
