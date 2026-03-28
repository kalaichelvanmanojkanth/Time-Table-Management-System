const { validationResult } = require('express-validator');

const PERSON_NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]*$/;
const COURSE_NAME_PATTERN = /^[A-Za-z][A-Za-z\s'-]*$/;
const COURSE_CODE_PATTERN = /^[A-Za-z0-9-]+$/;
const DEPARTMENT_PATTERN = /^[A-Za-z][A-Za-z\s&/-]*$/;
const ROOM_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s./-]*$/;
const ROOM_TYPE_PATTERN = /^[A-Za-z][A-Za-z\s&/-]*$/;

const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return false;
  }

  res.status(400).json({
    success: false,
    errors: errors.array(),
  });

  return true;
};

const sendNotFound = (res, label) =>
  res.status(404).json({
    success: false,
    message: `${label} not found`,
  });

module.exports = {
  asyncHandler,
  COURSE_CODE_PATTERN,
  COURSE_NAME_PATTERN,
  DEPARTMENT_PATTERN,
  handleValidationErrors,
  PERSON_NAME_PATTERN,
  ROOM_NAME_PATTERN,
  ROOM_TYPE_PATTERN,
  sendNotFound,
};
