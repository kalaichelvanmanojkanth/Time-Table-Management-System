const mongoose = require('mongoose');

const PERSON_NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]*$/;
const DEPARTMENT_PATTERN = /^[A-Za-z][A-Za-z\s&/-]*$/;

const DAY_VALUES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const toMinutes = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const availabilitySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: [true, 'Availability day is required'],
      enum: DAY_VALUES,
    },
    startTime: {
      type: String,
      required: [true, 'Availability start time is required'],
      match: [TIME_PATTERN, 'Start time must be in HH:MM format'],
    },
    endTime: {
      type: String,
      required: [true, 'Availability end time is required'],
      match: [TIME_PATTERN, 'End time must be in HH:MM format'],
      validate: {
        validator(value) {
          return toMinutes(value) > toMinutes(this.startTime);
        },
        message: 'Availability end time must be after start time',
      },
    },
  },
  {
    _id: false,
  }
);

const lecturerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Lecturer name is required'],
      trim: true,
      maxlength: [120, 'Lecturer name cannot exceed 120 characters'],
      match: [
        PERSON_NAME_PATTERN,
        'Lecturer name can only contain letters, spaces, apostrophes, periods, and hyphens',
      ],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      maxlength: [100, 'Department cannot exceed 100 characters'],
      match: [
        DEPARTMENT_PATTERN,
        'Department can only contain letters, spaces, ampersands, slashes, and hyphens',
      ],
    },
    availability: {
      type: [availabilitySchema],
      validate: [
        {
          validator(value) {
            return Array.isArray(value) && value.length > 0;
          },
          message: 'At least one availability window is required',
        },
        {
          validator(value) {
            const grouped = new Map();

            for (const item of value) {
              if (!grouped.has(item.day)) {
                grouped.set(item.day, []);
              }
              grouped.get(item.day).push(item);
            }

            for (const items of grouped.values()) {
              const sorted = [...items].sort(
                (left, right) =>
                  toMinutes(left.startTime) - toMinutes(right.startTime)
              );

              for (let index = 1; index < sorted.length; index += 1) {
                const previous = sorted[index - 1];
                const current = sorted[index];

                if (
                  toMinutes(previous.endTime) > toMinutes(current.startTime)
                ) {
                  return false;
                }
              }
            }

            return true;
          },
          message: 'Availability windows cannot overlap on the same day',
        },
      ],
    },
    subjects: [{ type: String, trim: true }],
    maxWeeklyHours: { type: Number, default: 20 },
  },
  {
    timestamps: true,
    collection: 'lecturers'
  }
);

module.exports = mongoose.model('Lecturer', lecturerSchema);
