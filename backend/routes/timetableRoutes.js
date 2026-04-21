const express = require('express');
const { body, param, query } = require('express-validator');
const Timetable = require('../models/Timetable');
const Course = require('../models/Course');
const Lecturer = require('../models/Lecturer');
const Room = require('../models/Room');
const TimeSlot = require('../models/TimeSlot');
const { protect } = require('../middleware/auth');
const {
  asyncHandler,
  handleValidationErrors,
  sendNotFound,
} = require('./routeHelpers');
const {
  compareTimeSlots,
  findEntryConflicts,
  generateWeekDraft,
  getPopulatedTimetableEntries,
  loadTimetableRelations,
  populateTimetableQuery,
  replaceWeekTimetable,
  validateManualAllocation,
  validateWeekValue,
} = require('./timetableHelpers');

const router = express.Router();
const protectedWrite = [protect];

const timetableValidation = [
  body('courseId', 'Course is required').isMongoId(),
  body('lecturerId', 'Lecturer is required').isMongoId(),
  body('roomId', 'Room is required').isMongoId(),
  body('timeslotId', 'Time slot is required').isMongoId(),
  body('week', 'Week must follow the YYYY-Www format').custom(validateWeekValue),
];

const clearTimetableValidation = [
  body('week')
    .notEmpty()
    .withMessage('Week is required to clear timetable entries')
    .custom(validateWeekValue)
    .withMessage('Week must follow the YYYY-Www format'),
  body('courseId').optional().isMongoId().withMessage('Invalid course id'),
];

const idValidation = [param('id', 'Invalid timetable id').isMongoId()];

const getExistingEntriesForValidation = async (week, excludeId) =>
  getPopulatedTimetableEntries({ week, excludeId });

const clearTimetableEntries = async ({ week, courseId }) => {
  const deleteQuery = {
    week,
    ...(courseId ? { courseId } : {}),
  };

  const result = await Timetable.deleteMany(deleteQuery);
  const scopeLabel = courseId
    ? 'filtered timetable entries'
    : 'timetable entries for the selected week';

  return {
    success: true,
    count: result.deletedCount,
    message:
      result.deletedCount > 0
        ? `Cleared ${result.deletedCount} ${scopeLabel}`
        : `No ${scopeLabel} matched the selected filters`,
  };
};

router.get(
  '/',
  [
    query('week')
      .optional()
      .custom(validateWeekValue)
      .withMessage('Week must follow the YYYY-Www format'),
    query('courseId').optional().isMongoId().withMessage('Invalid course id'),
  ],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const entries = await getPopulatedTimetableEntries({
      week: req.query.week,
      courseId: req.query.courseId,
    });

    res.json({
      success: true,
      count: entries.length,
      data: entries,
    });
  })
);

router.delete(
  '/',
  protectedWrite,
  [
    query('week')
      .notEmpty()
      .withMessage('Week is required to clear timetable entries')
      .custom(validateWeekValue)
      .withMessage('Week must follow the YYYY-Www format'),
    query('courseId').optional().isMongoId().withMessage('Invalid course id'),
  ],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const response = await clearTimetableEntries({
      week: req.query.week,
      courseId: req.query.courseId,
    });

    res.json(response);
  })
);

router.post(
  '/clear',
  protectedWrite,
  clearTimetableValidation,
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const response = await clearTimetableEntries({
      week: req.body.week,
      courseId: req.body.courseId,
    });

    res.json(response);
  })
);

router.delete(
  '/clear',
  protectedWrite,
  [
    query('week')
      .notEmpty()
      .withMessage('Week is required to clear timetable entries')
      .custom(validateWeekValue)
      .withMessage('Week must follow the YYYY-Www format'),
    query('courseId').optional().isMongoId().withMessage('Invalid course id'),
  ],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const response = await clearTimetableEntries({
      week: req.query.week,
      courseId: req.query.courseId,
    });

    res.json(response);
  })
);

router.get(
  '/:id',
  idValidation,
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const entry = await populateTimetableQuery(
      Timetable.findById(req.params.id)
    ).exec();

    if (!entry) {
      sendNotFound(res, 'Timetable entry');
      return;
    }

    res.json({
      success: true,
      data: entry,
    });
  })
);

router.post(
  '/',
  protectedWrite,
  timetableValidation,
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const { course, lecturer, room, timeslot } = await loadTimetableRelations(
      req.body
    );

    const conflicts = validateManualAllocation({
      course,
      lecturer,
      room,
      timeslot,
      week: req.body.week,
    });

    if (conflicts.length > 0) {
      res.status(409).json({
        success: false,
        message: 'Unable to create timetable entry',
        conflicts,
      });
      return;
    }

    const existingEntries = await getExistingEntriesForValidation(req.body.week);
    const overlapConflicts = findEntryConflicts({
      existingEntries,
      candidate: { course, lecturer, room, timeslot },
      week: req.body.week,
    });

    if (overlapConflicts.length > 0) {
      res.status(409).json({
        success: false,
        message: 'Clash detected for the selected course, lecturer, room, or time slot',
        conflicts: overlapConflicts,
      });
      return;
    }

    const entry = await Timetable.create(req.body);
    const populatedEntry = await populateTimetableQuery(
      Timetable.findById(entry._id)
    ).exec();

    res.status(201).json({
      success: true,
      data: populatedEntry,
      message: 'Timetable entry created successfully',
    });
  })
);

router.put(
  '/:id',
  [...protectedWrite, ...idValidation, ...timetableValidation],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const existingEntry = await Timetable.findById(req.params.id);

    if (!existingEntry) {
      sendNotFound(res, 'Timetable entry');
      return;
    }

    const { course, lecturer, room, timeslot } = await loadTimetableRelations(
      req.body
    );

    const conflicts = validateManualAllocation({
      course,
      lecturer,
      room,
      timeslot,
      week: req.body.week,
    });

    if (conflicts.length > 0) {
      res.status(409).json({
        success: false,
        message: 'Unable to update timetable entry',
        conflicts,
      });
      return;
    }

    const existingEntries = await getExistingEntriesForValidation(
      req.body.week,
      req.params.id
    );
    const overlapConflicts = findEntryConflicts({
      existingEntries,
      candidate: { course, lecturer, room, timeslot },
      week: req.body.week,
    });

    if (overlapConflicts.length > 0) {
      res.status(409).json({
        success: false,
        message: 'Clash detected for the selected course, lecturer, room, or time slot',
        conflicts: overlapConflicts,
      });
      return;
    }

    const updatedEntry = await Timetable.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    const populatedEntry = await populateTimetableQuery(
      Timetable.findById(updatedEntry._id)
    ).exec();

    res.json({
      success: true,
      data: populatedEntry,
      message: 'Timetable entry updated successfully',
    });
  })
);

router.delete(
  '/:id',
  [...protectedWrite, ...idValidation],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const entry = await Timetable.findByIdAndDelete(req.params.id);

    if (!entry) {
      sendNotFound(res, 'Timetable entry');
      return;
    }

    res.json({
      success: true,
      message: 'Timetable entry deleted successfully',
    });
  })
);

router.post(
  '/generate',
  protectedWrite,
  [body('week', 'Week must follow the YYYY-Www format').custom(validateWeekValue)],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const [courses, lecturers, rooms, timeSlots] = await Promise.all([
      Course.find().sort({ code: 1 }),
      Lecturer.find().sort({ name: 1 }),
      Room.find().sort({ name: 1 }),
      TimeSlot.find().sort({ day: 1, startTime: 1, endTime: 1 }),
    ]);

    if (courses.length === 0 || lecturers.length === 0 || rooms.length === 0 || timeSlots.length === 0) {
      res.status(409).json({
        success: false,
        message:
          'Courses, lecturers, rooms, and time slots are all required before generating a timetable',
        conflicts: [],
      });
      return;
    }

    const orderedTimeSlots = [...timeSlots].sort(compareTimeSlots);
    const { draftEntries, unscheduled } = generateWeekDraft({
      week: req.body.week,
      courses,
      lecturers,
      rooms,
      timeSlots: orderedTimeSlots,
    });

    if (unscheduled.length > 0) {
      res.status(409).json({
        success: false,
        message: 'Unable to generate a clash-free timetable for the requested week',
        conflicts: unscheduled.map((item) => ({
          type: 'generation',
          message: `Session ${item.sessionNumber} for ${item.course.code}: ${item.reason}`,
          week: req.body.week,
          course: item.course,
        })),
        unscheduled,
      });
      return;
    }

    const replacementEntries = draftEntries.map(({ timeslot, ...entry }) => entry);
    await replaceWeekTimetable({
      week: req.body.week,
      draftEntries: replacementEntries,
    });

    const generatedEntries = await getPopulatedTimetableEntries({
      week: req.body.week,
    });

    res.json({
      success: true,
      data: generatedEntries,
      count: generatedEntries.length,
      message: 'Timetable generated successfully',
    });
  })
);

module.exports = router;
