export const dayOrder = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const weekPattern = /^\d{4}-W\d{2}$/;
export const personNamePattern = /^[A-Za-z][A-Za-z\s.'-]*$/;
export const courseNamePattern = /^[A-Za-z][A-Za-z\s'-]*$/;
export const courseCodePattern = /^[A-Za-z0-9-]+$/;
export const departmentPattern = /^[A-Za-z][A-Za-z\s&/-]*$/;
export const roomNamePattern = /^[A-Za-z0-9][A-Za-z0-9\s./-]*$/;
export const roomTypePattern = /^[A-Za-z][A-Za-z\s&/-]*$/;

const createValidationIssue = (message) => ({
  type: 'validation',
  message,
});

export const toMinutes = (value = '00:00') => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

export const compareSlots = (left, right) => {
  if (!left && !right) {
    return 0;
  }

  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  const dayDifference = dayOrder.indexOf(left.day) - dayOrder.indexOf(right.day);

  if (dayDifference !== 0) {
    return dayDifference;
  }

  const startDifference = toMinutes(left.startTime) - toMinutes(right.startTime);

  if (startDifference !== 0) {
    return startDifference;
  }

  return toMinutes(left.endTime) - toMinutes(right.endTime);
};

export const sortTimeSlots = (slots = []) => [...slots].sort(compareSlots);

export const slotsOverlap = (left, right) =>
  left?.day === right?.day &&
  toMinutes(left.startTime) < toMinutes(right.endTime) &&
  toMinutes(right.startTime) < toMinutes(left.endTime);

export const availabilityCoversSlot = (lecturer, slot) =>
  Array.isArray(lecturer?.availability) &&
  lecturer.availability.some(
    (window) =>
      window.day === slot.day &&
      toMinutes(window.startTime) <= toMinutes(slot.startTime) &&
      toMinutes(window.endTime) >= toMinutes(slot.endTime)
  );

export const getCurrentWeekValue = () => {
  const currentDate = new Date();
  const utcDate = new Date(
    Date.UTC(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate()
    )
  );
  const dayNumber = utcDate.getUTCDay() || 7;

  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7);

  return `${utcDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
};

export const formatWeekLabel = (week) => {
  const match = /^(\d{4})-W(\d{2})$/.exec(week || '');

  if (!match) {
    return week || 'Unknown week';
  }

  return `Week ${Number(match[2])}, ${match[1]}`;
};

export const formatTimeRange = (slot) =>
  slot ? `${slot.startTime} - ${slot.endTime}` : 'Unknown time';

export const getEntrySlot = (entry) => entry?.timeslotId || entry?.timeslot || null;

export const getLecturerDisplayLabel = (lecturer) => {
  if (!lecturer) {
    return 'Unnamed lecturer';
  }

  const name = lecturer.name?.trim();
  const department = lecturer.department?.trim();

  if (name && department) {
    return `${name} (${department})`;
  }

  if (name) {
    return name;
  }

  if (department) {
    return `Lecturer (${department})`;
  }

  return `Lecturer ${lecturer._id?.slice?.(-6) || ''}`.trim();
};

export const getApiErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data;
  const statusCode = error?.response?.status;

  if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
    const messages = responseData.errors
      .map((item) => item?.msg || item?.message || item)
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(', ');
    }
  }

  if (Array.isArray(responseData?.message) && responseData.message.length > 0) {
    const messages = responseData.message
      .map((item) => item?.msg || item?.message || item)
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(', ');
    }
  }

  if (typeof responseData?.message === 'string' && responseData.message.trim()) {
    return responseData.message;
  }

  if (typeof responseData?.error === 'string' && responseData.error.trim()) {
    return responseData.error;
  }

  if (statusCode === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  if (statusCode === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (!error?.response) {
    return 'Unable to reach the server. Please check your connection and try again.';
  }

  return responseData?.message || error?.message || fallbackMessage;
};

export const getValidationListFromError = (error, fallbackMessage) => {
  const responseData = error?.response?.data;

  if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
    return responseData.errors.map((item) =>
      createValidationIssue(item.msg || fallbackMessage)
    );
  }

  if (Array.isArray(responseData?.conflicts) && responseData.conflicts.length > 0) {
    return responseData.conflicts;
  }

  const message = getApiErrorMessage(error, fallbackMessage);
  return message ? [createValidationIssue(message)] : [];
};

export const getConflictListFromError = (error) =>
  Array.isArray(error?.response?.data?.conflicts)
    ? error.response.data.conflicts
    : [];

export const validateTimetableEntryForm = (formData, resources = {}) => {
  const issues = [];
  const { courses = [], lecturers = [], rooms = [], timeslots = [] } = resources;

  if (!weekPattern.test(formData?.week || '')) {
    issues.push(createValidationIssue('Week is required and must follow the YYYY-Www format.'));
  }

  if (!formData?.courseId) {
    issues.push(createValidationIssue('Please select a course.'));
  } else if (!courses.some((item) => item._id === formData.courseId)) {
    issues.push(createValidationIssue('The selected course could not be found.'));
  }

  if (!formData?.lecturerId) {
    issues.push(createValidationIssue('Please select a lecturer.'));
  } else if (!lecturers.some((item) => item._id === formData.lecturerId)) {
    issues.push(createValidationIssue('The selected lecturer could not be found.'));
  }

  if (!formData?.roomId) {
    issues.push(createValidationIssue('Please select a room.'));
  } else if (!rooms.some((item) => item._id === formData.roomId)) {
    issues.push(createValidationIssue('The selected room could not be found.'));
  }

  if (!formData?.timeslotId) {
    issues.push(createValidationIssue('Please select a time slot.'));
  } else if (!timeslots.some((item) => item._id === formData.timeslotId)) {
    issues.push(createValidationIssue('The selected time slot could not be found.'));
  }

  return issues;
};

export const validateEntityForm = (entityType, formData) => {
  const issues = [];
  const trimmedName = formData?.name?.trim() || '';
  const trimmedDepartment = formData?.department?.trim() || '';

  if (entityType === 'course') {
    if (!trimmedName) {
      issues.push(createValidationIssue('Course name is required.'));
    } else if (!courseNamePattern.test(trimmedName)) {
      issues.push(
        createValidationIssue(
          'Course name can contain only letters, spaces, apostrophes, and hyphens.'
        )
      );
    }

    if (!formData?.code?.trim()) {
      issues.push(createValidationIssue('Course code is required.'));
    } else if (!courseCodePattern.test(formData.code.trim().toUpperCase())) {
      issues.push(
        createValidationIssue(
          'Course code can only contain letters, numbers, and hyphens.'
        )
      );
    }

    if (!trimmedDepartment) {
      issues.push(createValidationIssue('Department is required.'));
    } else if (!departmentPattern.test(trimmedDepartment)) {
      issues.push(
        createValidationIssue(
          'Department can only contain letters, spaces, ampersands, slashes, and hyphens.'
        )
      );
    }

    if (!Number.isInteger(Number(formData?.sessionsPerWeek)) || Number(formData.sessionsPerWeek) < 1) {
      issues.push(createValidationIssue('Sessions per week must be a positive integer.'));
    }
  }

  if (entityType === 'lecturer') {
    if (!trimmedName) {
      issues.push(createValidationIssue('Lecturer name is required.'));
    } else if (!personNamePattern.test(trimmedName)) {
      issues.push(
        createValidationIssue(
          'Lecturer name can only contain letters, spaces, apostrophes, periods, and hyphens.'
        )
      );
    }

    if (!trimmedDepartment) {
      issues.push(createValidationIssue('Department is required.'));
    } else if (!departmentPattern.test(trimmedDepartment)) {
      issues.push(
        createValidationIssue(
          'Department can only contain letters, spaces, ampersands, slashes, and hyphens.'
        )
      );
    }

    if (!Array.isArray(formData?.availability) || formData.availability.length === 0) {
      issues.push(createValidationIssue('At least one availability window is required.'));
    } else {
      const groupedWindows = new Map();

      formData.availability.forEach((window, index) => {
        if (!dayOrder.includes(window?.day)) {
          issues.push(
            createValidationIssue(`Availability window ${index + 1} has an invalid day.`)
          );
        }

        if (!window?.startTime || !window?.endTime) {
          issues.push(
            createValidationIssue(
              `Availability window ${index + 1} must include both start and end times.`
            )
          );
          return;
        }

        if (toMinutes(window.endTime) <= toMinutes(window.startTime)) {
          issues.push(
            createValidationIssue(
              `Availability window ${index + 1} must end after it starts.`
            )
          );
        }

        if (!groupedWindows.has(window.day)) {
          groupedWindows.set(window.day, []);
        }

        groupedWindows.get(window.day).push(window);
      });

      for (const [day, windows] of groupedWindows.entries()) {
        const sortedWindows = [...windows].sort(
          (left, right) => toMinutes(left.startTime) - toMinutes(right.startTime)
        );

        for (let index = 1; index < sortedWindows.length; index += 1) {
          const previousWindow = sortedWindows[index - 1];
          const currentWindow = sortedWindows[index];

          if (toMinutes(previousWindow.endTime) > toMinutes(currentWindow.startTime)) {
            issues.push(
              createValidationIssue(`Availability windows cannot overlap on ${day}.`)
            );
            break;
          }
        }
      }
    }
  }

  if (entityType === 'room') {
    if (!trimmedName) {
      issues.push(createValidationIssue('Room name is required.'));
    } else if (!roomNamePattern.test(trimmedName)) {
      issues.push(
        createValidationIssue(
          'Room name can only contain letters, numbers, spaces, periods, slashes, and hyphens.'
        )
      );
    }

    if (!Number.isInteger(Number(formData?.capacity)) || Number(formData.capacity) < 1) {
      issues.push(createValidationIssue('Room capacity must be a positive integer.'));
    }

    if (!formData?.type?.trim()) {
      issues.push(createValidationIssue('Room type is required.'));
    } else if (!roomTypePattern.test(formData.type.trim())) {
      issues.push(
        createValidationIssue(
          'Room type can only contain letters, spaces, ampersands, slashes, and hyphens.'
        )
      );
    }
  }

  if (entityType === 'timeslot') {
    if (!dayOrder.includes(formData?.day)) {
      issues.push(createValidationIssue('Please choose a valid day.'));
    }

    if (!formData?.startTime) {
      issues.push(createValidationIssue('Start time is required.'));
    }

    if (!formData?.endTime) {
      issues.push(createValidationIssue('End time is required.'));
    }

    if (
      formData?.startTime &&
      formData?.endTime &&
      toMinutes(formData.endTime) <= toMinutes(formData.startTime)
    ) {
      issues.push(createValidationIssue('End time must be after start time.'));
    }
  }

  return issues;
};

export const mergeResourceItem = (items = [], item, entityType) => {
  const mergedItems = [
    ...items.filter((existingItem) => existingItem._id !== item._id),
    item,
  ];

  if (entityType === 'course') {
    return mergedItems.sort((left, right) => {
      const departmentDifference = (left.department || '').localeCompare(
        right.department || ''
      );

      if (departmentDifference !== 0) {
        return departmentDifference;
      }

      return (left.code || '').localeCompare(right.code || '');
    });
  }

  if (entityType === 'lecturer') {
    return mergedItems.sort((left, right) => {
      const departmentDifference = (left.department || '').localeCompare(
        right.department || ''
      );

      if (departmentDifference !== 0) {
        return departmentDifference;
      }

      return (left.name || '').localeCompare(right.name || '');
    });
  }

  if (entityType === 'room') {
    return mergedItems.sort((left, right) =>
      (left.name || '').localeCompare(right.name || '')
    );
  }

  if (entityType === 'timeslot') {
    return sortTimeSlots(mergedItems);
  }

  return mergedItems;
};

export const buildClientConflicts = ({
  entries = [],
  formData,
  resources,
  currentEntryId,
}) => {
  const { courses = [], lecturers = [], rooms = [], timeslots = [] } = resources;

  if (
    !formData?.courseId ||
    !formData?.lecturerId ||
    !formData?.roomId ||
    !formData?.timeslotId ||
    !formData?.week
  ) {
    return [];
  }

  const course = courses.find((item) => item._id === formData.courseId);
  const lecturer = lecturers.find((item) => item._id === formData.lecturerId);
  const room = rooms.find((item) => item._id === formData.roomId);
  const timeslot = timeslots.find((item) => item._id === formData.timeslotId);
  const conflicts = [];

  if (!course || !lecturer || !room || !timeslot) {
    return conflicts;
  }

  if (course.department !== lecturer.department) {
    conflicts.push({
      type: 'lecturer',
      message: `Lecturer ${lecturer.name} is not part of the ${course.department} department.`,
    });
  }

  if (!availabilityCoversSlot(lecturer, timeslot)) {
    conflicts.push({
      type: 'availability',
      message: `Lecturer ${lecturer.name} is unavailable on ${timeslot.day} at ${timeslot.startTime}-${timeslot.endTime}.`,
    });
  }

  for (const entry of entries) {
    if (entry._id === currentEntryId || entry.week !== formData.week) {
      continue;
    }

    const existingSlot = getEntrySlot(entry);

    if (!existingSlot || !slotsOverlap(existingSlot, timeslot)) {
      continue;
    }

    if (entry.lecturerId?._id === lecturer._id) {
      conflicts.push({
        type: 'lecturer',
        message: `${lecturer.name} already has a session during ${timeslot.day} ${timeslot.startTime}-${timeslot.endTime}.`,
      });
    }

    if (entry.roomId?._id === room._id) {
      conflicts.push({
        type: 'room',
        message: `${room.name} is already booked during ${timeslot.day} ${timeslot.startTime}-${timeslot.endTime}.`,
      });
    }

    if (entry.courseId?._id === course._id) {
      conflicts.push({
        type: 'course',
        message: `${course.code} already has a session during ${timeslot.day} ${timeslot.startTime}-${timeslot.endTime}.`,
      });
    }
  }

  return conflicts;
};

export const getSelectableTimeSlots = ({
  entries = [],
  formData,
  resources,
  currentEntryId,
}) => {
  const { lecturers = [], timeslots = [] } = resources || {};

  if (!formData?.week) {
    return timeslots;
  }

  const selectedLecturer = formData.lecturerId
    ? lecturers.find((item) => item._id === formData.lecturerId)
    : null;

  const relevantEntries = entries.filter(
    (entry) => entry.week === formData.week && entry._id !== currentEntryId
  );

  return sortTimeSlots(timeslots).filter((slot) => {
    if (selectedLecturer && !availabilityCoversSlot(selectedLecturer, slot)) {
      return false;
    }

    const isBlocked = relevantEntries.some((entry) => {
      const entrySlot = getEntrySlot(entry);

      if (!entrySlot || !slotsOverlap(entrySlot, slot)) {
        return false;
      }

      const lecturerConflict =
        formData.lecturerId &&
        (entry.lecturerId?._id === formData.lecturerId ||
          entry.lecturerId === formData.lecturerId);
      const roomConflict =
        formData.roomId &&
        (entry.roomId?._id === formData.roomId || entry.roomId === formData.roomId);
      const courseConflict =
        formData.courseId &&
        (entry.courseId?._id === formData.courseId ||
          entry.courseId === formData.courseId);

      return lecturerConflict || roomConflict || courseConflict;
    });

    return !isBlocked;
  });
};

const getEntityId = (entity) => entity?._id || entity;

export const getLecturerScheduleSuggestions = ({
  entries = [],
  formData,
  resources,
  currentEntryId,
  maxSuggestions = 5,
}) => {
  const { courses = [], lecturers = [], rooms = [], timeslots = [] } = resources || {};

  if (!formData?.lecturerId || !formData?.week) {
    return [];
  }

  const lecturer = lecturers.find((item) => item._id === formData.lecturerId);

  if (!lecturer) {
    return [];
  }

  const weekEntries = entries.filter(
    (entry) => entry.week === formData.week && entry._id !== currentEntryId
  );

  const courseCounts = weekEntries.reduce((accumulator, entry) => {
    const courseId = getEntityId(entry.courseId);

    if (!courseId) {
      return accumulator;
    }

    accumulator[courseId] = (accumulator[courseId] || 0) + 1;
    return accumulator;
  }, {});

  const roomCounts = weekEntries.reduce((accumulator, entry) => {
    const roomId = getEntityId(entry.roomId);

    if (!roomId) {
      return accumulator;
    }

    accumulator[roomId] = (accumulator[roomId] || 0) + 1;
    return accumulator;
  }, {});

  const matchingCourses = courses
    .filter((course) => course.department === lecturer.department)
    .map((course) => {
      const scheduled = courseCounts[course._id] || 0;
      const sessionsPerWeek = Number(course.sessionsPerWeek || 0);
      const remaining = Math.max(sessionsPerWeek - scheduled, 0);

      return {
        course,
        scheduled,
        remaining,
      };
    })
    .sort((left, right) => {
      if (right.remaining !== left.remaining) {
        return right.remaining - left.remaining;
      }

      return (left.course.code || '').localeCompare(right.course.code || '');
    });

  const availableSlots = sortTimeSlots(timeslots).filter((slot) => {
    if (!availabilityCoversSlot(lecturer, slot)) {
      return false;
    }

    const hasLecturerConflict = weekEntries.some((entry) => {
      const slotToCompare = getEntrySlot(entry);
      return (
        getEntityId(entry.lecturerId) === lecturer._id &&
        slotToCompare &&
        slotsOverlap(slotToCompare, slot)
      );
    });

    return !hasLecturerConflict;
  });

  const suggestions = [];

  for (const slot of availableSlots) {
    const freeRooms = rooms
      .filter((room) => {
        const isRoomBusy = weekEntries.some((entry) => {
          const slotToCompare = getEntrySlot(entry);
          return (
            getEntityId(entry.roomId) === room._id &&
            slotToCompare &&
            slotsOverlap(slotToCompare, slot)
          );
        });

        return !isRoomBusy;
      })
      .sort((left, right) => {
        const leftCount = roomCounts[left._id] || 0;
        const rightCount = roomCounts[right._id] || 0;

        if (leftCount !== rightCount) {
          return leftCount - rightCount;
        }

        return (left.name || '').localeCompare(right.name || '');
      });

    if (freeRooms.length === 0) {
      continue;
    }

    for (const courseInfo of matchingCourses) {
      const hasCourseConflict = weekEntries.some((entry) => {
        const slotToCompare = getEntrySlot(entry);

        return (
          getEntityId(entry.courseId) === courseInfo.course._id &&
          slotToCompare &&
          slotsOverlap(slotToCompare, slot)
        );
      });

      if (hasCourseConflict) {
        continue;
      }

      const room = freeRooms[0];

      suggestions.push({
        lecturerId: lecturer._id,
        courseId: courseInfo.course._id,
        roomId: room._id,
        timeslotId: slot._id,
        course: courseInfo.course,
        room,
        slot,
        reason:
          courseInfo.remaining > 0
            ? `${courseInfo.course.code} needs ${courseInfo.remaining} more session${
                courseInfo.remaining > 1 ? 's' : ''
              } this week.`
            : `${courseInfo.course.code} matches ${lecturer.department} and fits this slot.`,
      });

      if (suggestions.length >= maxSuggestions) {
        return suggestions;
      }
    }
  }

  return suggestions;
};

export const buildConflictEntryIds = (entries = []) => {
  const ids = new Set();

  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < entries.length;
      rightIndex += 1
    ) {
      const leftEntry = entries[leftIndex];
      const rightEntry = entries[rightIndex];
      const leftSlot = getEntrySlot(leftEntry);
      const rightSlot = getEntrySlot(rightEntry);

      if (!leftSlot || !rightSlot || !slotsOverlap(leftSlot, rightSlot)) {
        continue;
      }

      const sharesLecturer =
        leftEntry.lecturerId?._id === rightEntry.lecturerId?._id;
      const sharesRoom = leftEntry.roomId?._id === rightEntry.roomId?._id;
      const sharesCourse = leftEntry.courseId?._id === rightEntry.courseId?._id;

      if (sharesLecturer || sharesRoom || sharesCourse) {
        ids.add(leftEntry._id);
        ids.add(rightEntry._id);
      }
    }
  }

  return ids;
};

export const getGridDays = (timeSlots = [], entries = []) => {
  const usedDays = new Set();

  [...timeSlots, ...entries.map(getEntrySlot).filter(Boolean)].forEach((slot) => {
    if (slot?.day) {
      usedDays.add(slot.day);
    }
  });

  const orderedDays = dayOrder.filter((day) => usedDays.has(day));
  return orderedDays.length > 0 ? orderedDays : dayOrder.slice(0, 5);
};

export const getGridRanges = (timeSlots = [], entries = []) => {
  const uniqueRanges = new Map();

  [...timeSlots, ...entries.map(getEntrySlot).filter(Boolean)].forEach((slot) => {
    if (!slot) {
      return;
    }

    uniqueRanges.set(`${slot.startTime}-${slot.endTime}`, {
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  });

  return [...uniqueRanges.values()].sort(
    (left, right) => toMinutes(left.startTime) - toMinutes(right.startTime)
  );
};

export const getResourceCountSummary = (courses = []) =>
  courses.reduce((total, course) => total + Number(course.sessionsPerWeek || 0), 0);
