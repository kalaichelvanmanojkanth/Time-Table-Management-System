/* ─────────────────────────────────────────────────────────────
   resourceRoutes.js
   Mounts full CRUD for Teachers, Subjects, and Rooms under:
     /api/teachers
     /api/subjects
     /api/rooms
   Plus:
     POST /api/resource/seed-samples  → pre-populate sample data
─────────────────────────────────────────────────────────────── */
const express = require('express');
const { teacherCtrl, subjectCtrl, roomCtrl, seedSamples } = require('../controllers/resourceController');

/* ── Teachers ── */
const teacherRouter = express.Router();
teacherRouter.get('/',    teacherCtrl.getAll);
teacherRouter.post('/',   teacherCtrl.create);
teacherRouter.get('/:id', teacherCtrl.getById);
teacherRouter.put('/:id', teacherCtrl.update);
teacherRouter.delete('/:id', teacherCtrl.remove);

/* ── Subjects ── */
const subjectRouter = express.Router();
subjectRouter.get('/',    subjectCtrl.getAll);
subjectRouter.post('/',   subjectCtrl.create);
subjectRouter.get('/:id', subjectCtrl.getById);
subjectRouter.put('/:id', subjectCtrl.update);
subjectRouter.delete('/:id', subjectCtrl.remove);

/* ── Rooms ── */
const roomRouter = express.Router();
roomRouter.get('/',    roomCtrl.getAll);
roomRouter.post('/',   roomCtrl.create);
roomRouter.get('/:id', roomCtrl.getById);
roomRouter.put('/:id', roomCtrl.update);
roomRouter.delete('/:id', roomCtrl.remove);

/* ── Admin seed endpoint ── */
const resourceRouter = express.Router();
resourceRouter.post('/seed-samples', seedSamples);

module.exports = { teacherRouter, subjectRouter, roomRouter, resourceRouter };
