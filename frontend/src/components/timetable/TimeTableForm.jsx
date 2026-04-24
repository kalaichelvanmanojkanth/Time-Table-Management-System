import { useEffect, useMemo, useState } from 'react';
import {
  FaCheckCircle,
  FaBolt,
  FaBook,
  FaChalkboardTeacher,
  FaDoorOpen,
  FaClock,
  FaHistory,
  FaLightbulb,
  FaPen,
} from 'react-icons/fa';
import EntityModal from './EntityModal';
import ConflictBanner from './ConflictBanner';
import {
  buildClientConflicts,
  dayOrder,
  formatTimeRange,
  formatWeekLabel,
  getConflictListFromError,
  getCurrentWeekValue,
  isIntervalTimeslot,
  getLecturerScheduleSuggestions,
  getLecturerDisplayLabel,
  getSelectableTimeSlots,
  validateTimetableEntryForm,
} from './timetableUtils';

const WEEKDAY_VALUES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const createDefaultForm = () => ({
  courseId: '',
  lecturerId: '',
  roomId: '',
  timeslotId: '',
  week: getCurrentWeekValue(),
});

const createFormState = (initialData = null) =>
  initialData
    ? {
      courseId: initialData.courseId?._id || initialData.courseId || '',
      lecturerId: initialData.lecturerId?._id || initialData.lecturerId || '',
      roomId: initialData.roomId?._id || initialData.roomId || '',
      timeslotId: initialData.timeslotId?._id || initialData.timeslotId || '',
      week: initialData.week || getCurrentWeekValue(),
    }
    : createDefaultForm();

const resourceConfig = [
  {
    type: 'course',
    field: 'courseId',
    icon: <FaBook />,
    buttonLabel: 'Add Course',
  },
  {
    type: 'lecturer',
    field: 'lecturerId',
    icon: <FaChalkboardTeacher />,
    buttonLabel: 'Add Lecturer',
  },
  {
    type: 'room',
    field: 'roomId',
    icon: <FaDoorOpen />,
    buttonLabel: 'Add Room',
  },
];

const TimeTableForm = ({
  initialData = null,
  resources,
  existingEntries = [],
  onSubmit,
  onCreateResource,
  onRefreshData,
  onResetAllData,
  resetAllLoading = false,
  isEdit = false,
  loading = false,
}) => {
  const [formData, setFormData] = useState(createDefaultForm());
  const [submitting, setSubmitting] = useState(false);
  const [formIssues, setFormIssues] = useState([]);
  const [serverConflicts, setServerConflicts] = useState([]);
  const [activeModalType, setActiveModalType] = useState(null);
  const [editingLecturerId, setEditingLecturerId] = useState('');
  const [formVersion, setFormVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setFormData(createFormState(initialData));
    setFormIssues([]);
    setServerConflicts([]);
  }, [initialData]);

  const selectedTimeSlot = resources.timeslots.find(
    (item) => item._id === formData.timeslotId
  );
  const isIntervalEntry = isIntervalTimeslot(selectedTimeSlot);

  const clientConflicts = isIntervalEntry
    ? []
    : buildClientConflicts({
      entries: existingEntries,
      formData,
      resources,
      currentEntryId: initialData?._id,
    });

  const selectedCourse = resources.courses.find(
    (item) => item._id === formData.courseId
  );
  const selectedLecturer = resources.lecturers.find(
    (item) => item._id === formData.lecturerId
  );
  const selectedRoom = resources.rooms.find((item) => item._id === formData.roomId);
  const lecturerSuggestions = useMemo(
    () =>
      getLecturerScheduleSuggestions({
        entries: existingEntries,
        formData,
        resources,
        currentEntryId: initialData?._id,
      }),
    [existingEntries, formData, resources, initialData?._id]
  );

  const weekEntries = existingEntries.filter((entry) => entry.week === formData.week);
  const recentWeekEntries = [...weekEntries].slice(0, 6);

  const latestPresetByCourse = weekEntries.reduce((accumulator, entry) => {
    const courseId = entry.courseId?._id || entry.courseId;

    if (!courseId || accumulator[courseId]) {
      return accumulator;
    }

    accumulator[courseId] = {
      lecturerId: entry.lecturerId?._id || entry.lecturerId || '',
      roomId: entry.roomId?._id || entry.roomId || '',
      timeslotId: entry.timeslotId?._id || entry.timeslotId || '',
      week: entry.week,
    };

    return accumulator;
  }, {});

  const selectedCoursePreset = formData.courseId
    ? latestPresetByCourse[formData.courseId]
    : null;

  const selectableTimeSlots = useMemo(() => {
    const filtered = getSelectableTimeSlots({
      entries: existingEntries,
      formData,
      resources,
      currentEntryId: initialData?._id,
    });

    return filtered.filter((slot) => WEEKDAY_VALUES.includes(slot.day));
  }, [existingEntries, formData, resources, initialData?._id]);

  const hiddenTimeSlotCount = Math.max(
    resources.timeslots.length - selectableTimeSlots.length,
    0
  );

  const lecturerAvailabilityWindows = selectedLecturer?.availability || [];

  const activeConflicts =
    formIssues.length > 0
      ? formIssues
      : serverConflicts.length > 0
        ? serverConflicts
        : clientConflicts;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormIssues([]);
    setServerConflicts([]);
    setFormData((previousState) => ({
      ...previousState,
      [name]: value,
    }));
  };

  useEffect(() => {
    if (!formData.timeslotId) {
      return;
    }

    const stillSelectable = selectableTimeSlots.some(
      (slot) => slot._id === formData.timeslotId
    );

    if (!stillSelectable) {
      setFormData((previousState) => ({
        ...previousState,
        timeslotId: '',
      }));
    }
  }, [formData.timeslotId, selectableTimeSlots]);

  useEffect(() => {
    if (!isIntervalEntry) {
      return;
    }

    setFormData((previousState) => {
      if (
        !previousState.courseId &&
        !previousState.lecturerId &&
        !previousState.roomId
      ) {
        return previousState;
      }

      return {
        ...previousState,
        courseId: '',
        lecturerId: '',
        roomId: '',
      };
    });
  }, [isIntervalEntry]);

  const handleResourceSubmit = async (entityType, payload) => {
    const editMode = entityType === 'lecturer' && Boolean(editingLecturerId);
    const createdEntity = await onCreateResource(entityType, payload, {
      mode: editMode ? 'update' : 'create',
      id: editMode ? editingLecturerId : undefined,
    });
    const config = resourceConfig.find((item) => item.type === entityType);

    if (config?.field && createdEntity?._id) {
      setFormData((previousState) => ({
        ...previousState,
        [config.field]: createdEntity._id,
      }));
    }

    if (editMode) {
      setEditingLecturerId('');
    }

    return createdEntity;
  };

  const applyQuickPreset = (preset, options = {}) => {
    if (!preset) {
      return;
    }

    setFormIssues([]);
    setServerConflicts([]);
    setFormData((previousState) => ({
      ...previousState,
      ...(options.keepCourse ? {} : { courseId: preset.courseId || previousState.courseId }),
      lecturerId: preset.lecturerId || previousState.lecturerId,
      roomId: preset.roomId || previousState.roomId,
      timeslotId: preset.timeslotId || previousState.timeslotId,
      week: preset.week || previousState.week,
    }));
  };

  const applyLecturerSuggestion = (suggestion) => {
    if (!suggestion) {
      return;
    }

    setFormIssues([]);
    setServerConflicts([]);
    setFormData((previousState) => ({
      ...previousState,
      courseId: suggestion.courseId,
      roomId: suggestion.roomId,
      timeslotId: suggestion.timeslotId,
      lecturerId: suggestion.lecturerId,
      week: previousState.week,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormIssues([]);
    setServerConflicts([]);

    const submitIntent =
      event?.nativeEvent?.submitter?.dataset?.intent || 'default';

    const validationIssues = validateTimetableEntryForm(formData, resources, {
      allowInterval: isIntervalEntry,
    });

    if (validationIssues.length > 0) {
      setFormIssues(validationIssues);
      return;
    }

    if (clientConflicts.length > 0) {
      setServerConflicts(clientConflicts);
      return;
    }

    setSubmitting(true);

    try {
      const payload = isIntervalEntry
        ? {
          ...formData,
          courseId: '',
          lecturerId: '',
          roomId: '',
          subject: 'Interval',
          teacher: 'Interval',
          room: 'Interval',
        }
        : formData;

      await onSubmit(payload, { submitIntent });

      if (!isEdit && submitIntent === 'add-next') {
        setFormData({
          ...createDefaultForm(),
          week: formData.week,
          lecturerId: formData.lecturerId,
          roomId: formData.roomId,
          timeslotId: formData.timeslotId,
        });
      }
    } catch (error) {
      setServerConflicts(getConflictListFromError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFormData(isEdit ? createFormState(initialData) : createDefaultForm());
    setFormIssues([]);
    setServerConflicts([]);
    setFormVersion((previousValue) => previousValue + 1);
  };

  const handleRefreshData = async () => {
    if (!onRefreshData) {
      return;
    }

    setRefreshing(true);
    setFormIssues([]);
    setServerConflicts([]);

    try {
      await onRefreshData();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="timetable-panel">
        <p className="timetable-helper-text">Loading timetable form...</p>
      </div>
    );
  }

  return (
    <>
      <div className="timetable-panel">
        <div className="timetable-quick-resource-strip" style={{ marginBottom: '1rem' }}>
          <span className="timetable-quick-resource-strip-label">Quick Add</span>
          {resourceConfig.map((config) => (
            <button
              key={config.type}
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setActiveModalType(config.type)}
            >
              {config.icon} {config.buttonLabel}
            </button>
          ))}
        </div>

        <div className="timetable-quick-memory">
          <div className="timetable-quick-memory-header">
            <h4>
              <FaBolt /> Quick Entry Memory
            </h4>
            <p>
              Reuse your latest lecturer, room, and time slot selections to create entries faster.
            </p>
          </div>

          {selectedCoursePreset ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => applyQuickPreset(selectedCoursePreset, { keepCourse: true })}
            >
              <FaBolt /> Use Latest Setup for Selected Course
            </button>
          ) : null}

          {recentWeekEntries.length > 0 ? (
            <div className="timetable-recent-combos">
              {recentWeekEntries.map((entry) => {
                const courseId = entry.courseId?._id || entry.courseId;
                const lecturerId = entry.lecturerId?._id || entry.lecturerId;
                const roomId = entry.roomId?._id || entry.roomId;
                const timeslotId = entry.timeslotId?._id || entry.timeslotId;

                return (
                  <button
                    key={entry._id}
                    type="button"
                    className="timetable-memory-chip"
                    onClick={() =>
                      applyQuickPreset({
                        courseId,
                        lecturerId,
                        roomId,
                        timeslotId,
                        week: entry.week,
                      })
                    }
                    title="Apply this previous combination"
                  >
                    <FaHistory />
                    <span>
                      {entry.courseId?.code || 'Course'} • {entry.roomId?.name || 'Room'} •{' '}
                      {entry.timeslotId?.day || 'Day'}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="timetable-helper-text">
              Create your first entry for this week and recent combinations will appear here.
            </p>
          )}
        </div>

        <ConflictBanner
          title="This entry needs attention"
          conflicts={activeConflicts}
        />

        <form key={formVersion} onSubmit={handleSubmit} className="form">
          <div className="timetable-form-grid">
            <div className="form-group">
              <label htmlFor="week">Week</label>
              <input
                id="week"
                name="week"
                type="week"
                value={formData.week}
                onChange={handleChange}
                required
              />
              <p className="timetable-helper-text">
                Scheduling for {formatWeekLabel(formData.week)}
              </p>
            </div>

            {!isIntervalEntry ? (
              <div className="form-group">
                <label htmlFor="courseId">Course</label>
                <select
                  id="courseId"
                  name="courseId"
                  value={formData.courseId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a course</option>
                  {resources.courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {!isIntervalEntry ? (
              <div className="form-group">
                <label htmlFor="lecturerId">Lecturer</label>
                {resources.lecturers.length === 0 ? (
                  <div className="timetable-summary-card">
                    <strong>No lecturers added yet</strong>
                    <p>
                      Create a lecturer first so this timetable entry can be
                      assigned correctly.
                    </p>
                    <div
                      className="timetable-inline-actions"
                      style={{ marginTop: '0.75rem' }}
                    >
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setActiveModalType('lecturer')}
                      >
                        <FaChalkboardTeacher /> Add Lecturer
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <select
                      id="lecturerId"
                      name="lecturerId"
                      value={formData.lecturerId}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select a lecturer</option>
                      {resources.lecturers.map((lecturer) => (
                        <option key={lecturer._id} value={lecturer._id}>
                          {getLecturerDisplayLabel(lecturer)}
                        </option>
                      ))}
                    </select>
                    <div className="timetable-inline-actions" style={{ marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={!formData.lecturerId}
                        onClick={() => setEditingLecturerId(formData.lecturerId)}
                      >
                        <FaPen /> Edit Lecturer Availability
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="timetable-summary-card">
                <strong>Interval Entry</strong>
                <p>
                  12:00–13:00 is treated as interval. Course, lecturer, and room are hidden for this entry.
                </p>
              </div>
            )}

            {selectedLecturer && !isIntervalEntry ? (
              <div className="timetable-lecturer-availability">
                <strong>Lecturer Availability</strong>
                {lecturerAvailabilityWindows.length > 0 ? (
                  <div className="timetable-recent-combos">
                    {lecturerAvailabilityWindows.map((window, index) => (
                      <span
                        key={`${window.day}-${window.startTime}-${window.endTime}-${index}`}
                        className="timetable-memory-chip"
                      >
                        {window.day} • {window.startTime} - {window.endTime}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="timetable-helper-text">
                    No availability windows found. Edit lecturer availability to improve slot suggestions.
                  </p>
                )}
              </div>
            ) : null}

            {formData.lecturerId && !isIntervalEntry ? (
              <div className="timetable-lecturer-suggestions">
                <div className="timetable-quick-memory-header">
                  <h4>
                    <FaLightbulb /> Best Match Suggestions
                  </h4>
                  <p>
                    Recommended course + room + time slot combinations for this lecturer.
                  </p>
                </div>

                {lecturerSuggestions.length > 0 ? (
                  <>
                    <div className="timetable-inline-actions" style={{ marginBottom: '0.65rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => applyLecturerSuggestion(lecturerSuggestions[0])}
                      >
                        <FaCheckCircle /> Apply Best Suggestion
                      </button>
                    </div>

                    <div className="timetable-suggestion-list">
                      {lecturerSuggestions.map((suggestion) => (
                        <button
                          key={`${suggestion.courseId}-${suggestion.roomId}-${suggestion.timeslotId}`}
                          type="button"
                          className="timetable-suggestion-card"
                          onClick={() => applyLecturerSuggestion(suggestion)}
                        >
                          <strong>
                            {suggestion.course?.code} • {suggestion.slot?.day} • {formatTimeRange(suggestion.slot)}
                          </strong>
                          <p>
                            Room: {suggestion.room?.name} ({suggestion.room?.type})
                          </p>
                          <small>{suggestion.reason}</small>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="timetable-helper-text">
                    No matching combinations found yet. Try adding more time slots or rooms, or choose another week.
                  </p>
                )}
              </div>
            ) : null}

            {!isIntervalEntry ? (
              <div className="form-group">
                <label htmlFor="roomId">Room</label>
                <select
                  id="roomId"
                  name="roomId"
                  value={formData.roomId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a room</option>
                  {resources.rooms.map((room) => (
                    <option key={room._id} value={room._id}>
                      {room.name} ({room.type})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="form-group">
              <label htmlFor="timeslotId">Time Slot</label>
              <select
                id="timeslotId"
                name="timeslotId"
                value={formData.timeslotId}
                onChange={handleChange}
                required
              >
                <option value="">Select a time slot</option>
                {selectableTimeSlots.map((slot) => (
                  <option key={slot._id} value={slot._id}>
                    {slot.day} | {formatTimeRange(slot)}
                  </option>
                ))}
              </select>
              {selectedLecturer ? (
                <p className="timetable-helper-text">
                  Showing lecturer-available and conflict-free slots only.
                </p>
              ) : null}
              <p className="timetable-helper-text">Only Monday to Friday slots are selectable for entries.</p>
              {hiddenTimeSlotCount > 0 ? (
                <p className="timetable-helper-text">
                  {hiddenTimeSlotCount} conflicting slot(s) hidden for current selections.
                </p>
              ) : null}
            </div>
          </div>

          <div className="timetable-summary-grid">
            <div className="timetable-summary-card">
              <strong>Selected Course</strong>
              <p>
                {isIntervalEntry
                  ? 'Interval block'
                  : selectedCourse
                    ? `${selectedCourse.code} • ${selectedCourse.department} • ${selectedCourse.sessionsPerWeek} sessions/week`
                    : 'Pick a course to see department and load details.'}
              </p>
            </div>
            <div className="timetable-summary-card">
              <strong>Selected Lecturer</strong>
              <p>
                {isIntervalEntry
                  ? 'Interval period'
                  : selectedLecturer
                    ? getLecturerDisplayLabel(selectedLecturer)
                    : 'Pick a lecturer to verify department and availability.'}
              </p>
            </div>
            <div className="timetable-summary-card">
              <strong>Selected Room & Slot</strong>
              <p>
                {selectedRoom && selectedTimeSlot
                  ? `${selectedRoom.name} • ${selectedTimeSlot.day} • ${formatTimeRange(
                    selectedTimeSlot
                  )}`
                  : 'Pick a room and time slot to complete the entry.'}
              </p>
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: '1.25rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting
                ? 'Saving...'
                : isEdit
                  ? 'Update Timetable Entry'
                  : 'Create Timetable Entry'}
            </button>
            {!isEdit ? (
              <button
                type="submit"
                className="btn btn-outline"
                data-intent="add-next"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Create & Add Next'}
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleResetForm}
              disabled={submitting}
            >
              {isEdit ? 'Reset Form' : 'Reset Entry'}
            </button>
            {!isEdit && onRefreshData ? (
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleRefreshData}
                disabled={submitting || refreshing}
              >
                {refreshing ? 'Refreshing...' : 'Refresh Scheduled Data'}
              </button>
            ) : null}
            {!isEdit && onResetAllData ? (
              <button
                type="button"
                className="btn btn-danger"
                onClick={onResetAllData}
                disabled={submitting || refreshing || resetAllLoading}
              >
                {resetAllLoading ? 'Resetting All Data...' : 'Reset All Data'}
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <EntityModal
        key={activeModalType || 'course'}
        entityType={activeModalType || 'course'}
        isOpen={Boolean(activeModalType)}
        onClose={() => setActiveModalType(null)}
        onSubmit={handleResourceSubmit}
      />

      <EntityModal
        key={editingLecturerId || 'lecturer-edit'}
        entityType="lecturer"
        isOpen={Boolean(editingLecturerId)}
        initialData={
          resources.lecturers.find((item) => item._id === editingLecturerId) || null
        }
        onClose={() => setEditingLecturerId('')}
        onSubmit={handleResourceSubmit}
      />
    </>
  );
};

export default TimeTableForm;
