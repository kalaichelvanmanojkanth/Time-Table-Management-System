const mongoose = require('mongoose');
const Course = require('../models/Course');
const Lecturer = require('../models/Lecturer');
const Room = require('../models/Room');
const TimeSlot = require('../models/TimeSlot');
const Timetable = require('../models/Timetable');

const DAY_VALUES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const WEEK_PATTERN = /^\d{4}-W\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const POPULATE_OPTIONS = [
  { path: 'courseId', select: 'name code department sessionsPerWeek' },
  { path: 'lecturerId', select: 'name department availability' },
  { path: 'roomId', select: 'name capacity type' },
  { path: 'timeslotId', select: 'day startTime endTime' },
];

const dayIndex = (day) => DAY_VALUES.indexOf(day);

const toMinutes = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const compareTimeSlots = (left, right) => {
  const dayDifference = dayIndex(left.day) - dayIndex(right.day);

  if (dayDifference !== 0) {
    return dayDifference;
  }

  const startDifference =
    toMinutes(left.startTime) - toMinutes(right.startTime);

  if (startDifference !== 0) {
    return startDifference;
  }

  return toMinutes(left.endTime) - toMinutes(right.endTime);
};

const slotsOverlap = (left, right) =>
  left.day === right.day &&
  toMinutes(left.startTime) < toMinutes(right.endTime) &&
  toMinutes(right.startTime) < toMinutes(left.endTime);

const availabilityCoversSlot = (availability, slot) =>
  Array.isArray(availability) &&
  availability.some(
    (item) =>
      item.day === slot.day &&
      toMinutes(item.startTime) <= toMinutes(slot.startTime) &&
      toMinutes(item.endTime) >= toMinutes(slot.endTime)
  );

const populateTimetableQuery = (query) =>
  POPULATE_OPTIONS.reduce(
    (currentQuery, option) => currentQuery.populate(option),
    query
  );

const serializeRef = (value, fields) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return { _id: value };
  }

  const result = { _id: value._id };

  for (const field of fields) {
    if (value[field] !== undefined) {
      result[field] = value[field];
    }
  }

  return result;
};

const buildConflict = ({ type, message, entry, week }) => ({
  type,
  message,
  week,
  entryId: entry?._id || null,
  course: serializeRef(entry?.courseId, [
    'name',
    'code',
    'department',
    'sessionsPerWeek',
  ]),
  lecturer: serializeRef(entry?.lecturerId, ['name', 'department']),
  room: serializeRef(entry?.roomId, ['name', 'capacity', 'type']),
  timeslot: serializeRef(entry?.timeslotId, ['day', 'startTime', 'endTime']),
});

const validateWeekValue = (value) =>
  typeof value === 'string' && WEEK_PATTERN.test(value.trim());

const validateTimeValue = (value) =>
  typeof value === 'string' && TIME_PATTERN.test(value.trim());

const getPopulatedTimetableEntries = async ({
  week,
  excludeId,
  courseId,
  timetableId,
}) => {
  const query = {};

  if (week) {
    query.week = week;
  }

  if (courseId) {
    query.courseId = courseId;
  }

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  if (timetableId) {
    query._id = timetableId;
  }

  return populateTimetableQuery(Timetable.find(query))
    .sort({ week: 1, createdAt: -1 })
    .exec();
};

const loadTimetableRelations = async ({
  courseId,
  lecturerId,
  roomId,
  timeslotId,
}) => {
  const [course, lecturer, room, timeslot] = await Promise.all([
    Course.findById(courseId),
    Lecturer.findById(lecturerId),
    Room.findById(roomId),
    TimeSlot.findById(timeslotId),
  ]);

  return { course, lecturer, room, timeslot };
};

const validateManualAllocation = ({ course, lecturer, room, timeslot, week }) => {
  const conflicts = [];

  if (!course) {
    conflicts.push({
      type: 'course',
      message: 'Selected course was not found',
      week,
    });
  }

  if (!lecturer) {
    conflicts.push({
      type: 'lecturer',
      message: 'Selected lecturer was not found',
      week,
    });
  }

  if (!room) {
    conflicts.push({
      type: 'room',
      message: 'Selected room was not found',
      week,
    });
  }

  if (!timeslot) {
    conflicts.push({
      type: 'timeslot',
      message: 'Selected time slot was not found',
      week,
    });
  }

  if (!course || !lecturer || !room || !timeslot) {
    return conflicts;
  }

  if (course.department !== lecturer.department) {
    conflicts.push({
      type: 'lecturer',
      message: `Lecturer ${lecturer.name} is not in the ${course.department} department`,
      week,
      course: serializeRef(course, [
        'name',
        'code',
        'department',
        'sessionsPerWeek',
      ]),
      lecturer: serializeRef(lecturer, ['name', 'department']),
      timeslot: serializeRef(timeslot, ['day', 'startTime', 'endTime']),
    });
  }

  if (!availabilityCoversSlot(lecturer.availability, timeslot)) {
    conflicts.push({
      type: 'availability',
      message: `Lecturer ${lecturer.name} is unavailable during ${timeslot.day} ${timeslot.startTime}-${timeslot.endTime}`,
      week,
      course: serializeRef(course, [
        'name',
        'code',
        'department',
        'sessionsPerWeek',
      ]),
      lecturer: serializeRef(lecturer, ['name', 'department']),
      timeslot: serializeRef(timeslot, ['day', 'startTime', 'endTime']),
    });
  }

  return conflicts;
};

const findEntryConflicts = ({ existingEntries, candidate, week }) => {
  const conflicts = [];

  for (const entry of existingEntries) {
    if (!entry.timeslotId || !slotsOverlap(entry.timeslotId, candidate.timeslot)) {
      continue;
    }

    if (String(entry.lecturerId?._id) === String(candidate.lecturer._id)) {
      conflicts.push(
        buildConflict({
          type: 'lecturer',
          message: `Lecturer ${candidate.lecturer.name} already has a session during ${candidate.timeslot.day} ${candidate.timeslot.startTime}-${candidate.timeslot.endTime}`,
          entry,
          week,
        })
      );
    }

    if (String(entry.roomId?._id) === String(candidate.room._id)) {
      conflicts.push(
        buildConflict({
          type: 'room',
          message: `Room ${candidate.room.name} is already booked during ${candidate.timeslot.day} ${candidate.timeslot.startTime}-${candidate.timeslot.endTime}`,
          entry,
          week,
        })
      );
    }

    if (String(entry.courseId?._id) === String(candidate.course._id)) {
      conflicts.push(
        buildConflict({
          type: 'course',
          message: `Course ${candidate.course.code} already has a session during ${candidate.timeslot.day} ${candidate.timeslot.startTime}-${candidate.timeslot.endTime}`,
          entry,
          week,
        })
      );
    }
  }

  return conflicts;
};

const replaceWeekTimetable = async ({ week, draftEntries }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    await Timetable.deleteMany({ week }).session(session);

    if (draftEntries.length > 0) {
      await Timetable.insertMany(draftEntries, { session });
    }

    await session.commitTransaction();
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    if (
      /Transaction numbers are only allowed on a replica set member or mongos/i.test(
        error.message
      ) ||
      /replica set/i.test(error.message)
    ) {
      await Timetable.deleteMany({ week });

      if (draftEntries.length > 0) {
        await Timetable.insertMany(draftEntries);
      }

      return;
    }

    throw error;
  } finally {
    session.endSession();
  }
};

const generateWeekDraft = ({
  week,
  courses,
  lecturers,
  rooms,
  timeSlots,
}) => {
  const draftEntries = [];
  const unscheduled = [];
  const lecturerLoad = new Map();
  const roomLoad = new Map();
  const sortedCourses = [...courses].sort((left, right) =>
    left.code.localeCompare(right.code)
  );
  const sortedTimeSlots = [...timeSlots].sort(compareTimeSlots);

  for (const lecturer of lecturers) {
    lecturerLoad.set(String(lecturer._id), 0);
  }

  for (const room of rooms) {
    roomLoad.set(String(room._id), 0);
  }

  for (const course of sortedCourses) {
    const eligibleLecturers = lecturers.filter(
      (lecturer) => lecturer.department === course.department
    );

    if (eligibleLecturers.length === 0) {
      for (let sessionNumber = 1; sessionNumber <= course.sessionsPerWeek; sessionNumber += 1) {
        unscheduled.push({
          course: serializeRef(course, [
            'name',
            'code',
            'department',
            'sessionsPerWeek',
          ]),
          sessionNumber,
          reason: `No lecturer is available in the ${course.department} department`,
        });
      }

      continue;
    }

    for (let sessionNumber = 1; sessionNumber <= course.sessionsPerWeek; sessionNumber += 1) {
      let placement = null;

      for (const timeSlot of sortedTimeSlots) {
        const lecturerCandidates = [...eligibleLecturers]
          .filter((lecturer) => availabilityCoversSlot(lecturer.availability, timeSlot))
          .sort((left, right) => {
            const loadDifference =
              lecturerLoad.get(String(left._id)) -
              lecturerLoad.get(String(right._id));

            if (loadDifference !== 0) {
              return loadDifference;
            }

            return left.name.localeCompare(right.name);
          });

        if (lecturerCandidates.length === 0) {
          continue;
        }

        for (const lecturer of lecturerCandidates) {
          const lecturerConflict = draftEntries.some(
            (entry) =>
              entry.week === week &&
              String(entry.lecturerId) === String(lecturer._id) &&
              slotsOverlap(entry.timeslot, timeSlot)
          );

          const courseConflict = draftEntries.some(
            (entry) =>
              entry.week === week &&
              String(entry.courseId) === String(course._id) &&
              slotsOverlap(entry.timeslot, timeSlot)
          );

          if (lecturerConflict || courseConflict) {
            continue;
          }

          const roomCandidates = [...rooms]
            .filter(
              (room) =>
                !draftEntries.some(
                  (entry) =>
                    entry.week === week &&
                    String(entry.roomId) === String(room._id) &&
                    slotsOverlap(entry.timeslot, timeSlot)
                )
            )
            .sort((left, right) => {
              const loadDifference =
                roomLoad.get(String(left._id)) - roomLoad.get(String(right._id));

              if (loadDifference !== 0) {
                return loadDifference;
              }

              return left.name.localeCompare(right.name);
            });

          if (roomCandidates.length === 0) {
            continue;
          }

          placement = {
            courseId: course._id,
            lecturerId: lecturer._id,
            roomId: roomCandidates[0]._id,
            timeslotId: timeSlot._id,
            week,
            timeslot: timeSlot,
          };
          break;
        }

        if (placement) {
          break;
        }
      }

      if (!placement) {
        unscheduled.push({
          course: serializeRef(course, [
            'name',
            'code',
            'department',
            'sessionsPerWeek',
          ]),
          sessionNumber,
          reason: `No clash-free combination of lecturer, room, and time slot was available for ${course.code}`,
        });
        continue;
      }

      draftEntries.push(placement);
      lecturerLoad.set(
        String(placement.lecturerId),
        lecturerLoad.get(String(placement.lecturerId)) + 1
      );
      roomLoad.set(
        String(placement.roomId),
        roomLoad.get(String(placement.roomId)) + 1
      );
    }
  }

  return { draftEntries, unscheduled };
};

module.exports = {
  DAY_VALUES,
  WEEK_PATTERN,
  TIME_PATTERN,
  POPULATE_OPTIONS,
  availabilityCoversSlot,
  compareTimeSlots,
  findEntryConflicts,
  generateWeekDraft,
  getPopulatedTimetableEntries,
  loadTimetableRelations,
  populateTimetableQuery,
  replaceWeekTimetable,
  serializeRef,
  slotsOverlap,
  toMinutes,
  validateManualAllocation,
  validateTimeValue,
  validateWeekValue,
};
