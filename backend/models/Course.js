const mongoose = require('mongoose');

const COURSE_NAME_PATTERN = /^[A-Za-z][A-Za-z\s'-]*$/;
const COURSE_CODE_PATTERN = /^[A-Za-z0-9-]+$/;
const DEPARTMENT_PATTERN = /^[A-Za-z][A-Za-z\s&/-]*$/;

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
      maxlength: [150, 'Course name cannot exceed 150 characters'],
      match: [
        COURSE_NAME_PATTERN,
        'Course name can contain only letters, spaces, apostrophes, and hyphens',
      ],
    },
    code: {
      type: String,
      required: [true, 'Course code is required'],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [30, 'Course code cannot exceed 30 characters'],
      match: [
        COURSE_CODE_PATTERN,
        'Course code can only contain letters, numbers, and hyphens',
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
    sessionsPerWeek: {
      type: Number,
      required: [true, 'Sessions per week is required'],
      min: [1, 'Sessions per week must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Sessions per week must be an integer',
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Course', courseSchema);
