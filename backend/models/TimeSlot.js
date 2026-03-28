const mongoose = require('mongoose');

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

const timeSlotSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: [true, 'Day is required'],
      enum: DAY_VALUES,
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [TIME_PATTERN, 'Start time must be in HH:MM format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [TIME_PATTERN, 'End time must be in HH:MM format'],
      validate: {
        validator(value) {
          return toMinutes(value) > toMinutes(this.startTime);
        },
        message: 'End time must be after start time',
      },
    },
  },
  {
    timestamps: true,
  }
);

timeSlotSchema.index(
  { day: 1, startTime: 1, endTime: 1 },
  { unique: true, name: 'unique_timeslot_window' }
);

module.exports = mongoose.model('TimeSlot', timeSlotSchema);
