import { useEffect, useState } from 'react';
import {
  FaBook,
  FaChalkboardTeacher,
  FaDoorOpen,
  FaPlus,
  FaClock,
} from 'react-icons/fa';
import EntityModal from './EntityModal';
import ConflictBanner from './ConflictBanner';
import {
  buildClientConflicts,
  formatTimeRange,
  formatWeekLabel,
  getConflictListFromError,
  getCurrentWeekValue,
  getLecturerDisplayLabel,
  validateTimetableEntryForm,
} from './timetableUtils';

const createDefaultForm = () => ({
  courseId: '',
  lecturerId: '',
  roomId: '',
  timeslotId: '',
  week: getCurrentWeekValue(),
});

const createBlankForm = () => ({
  courseId: '',
  lecturerId: '',
  roomId: '',
  timeslotId: '',
  week: '',
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
  {
    type: 'timeslot',
    field: 'timeslotId',
    icon: <FaClock />,
    buttonLabel: 'Add TimeSlot',
  },
];

const TimeTableForm = ({
  initialData = null,
  resources,
  existingEntries = [],
  onSubmit,
  onCreateResource,
  isEdit = false,
  loading = false,
}) => {
  const [formData, setFormData] = useState(createDefaultForm());
  const [submitting, setSubmitting] = useState(false);
  const [formIssues, setFormIssues] = useState([]);
  const [serverConflicts, setServerConflicts] = useState([]);
  const [activeModalType, setActiveModalType] = useState(null);
  const [formVersion, setFormVersion] = useState(0);

  useEffect(() => {
    setFormData(createFormState(initialData));
    setFormIssues([]);
    setServerConflicts([]);
  }, [initialData]);

  const clientConflicts = buildClientConflicts({
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
  const selectedTimeSlot = resources.timeslots.find(
    (item) => item._id === formData.timeslotId
  );

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

  const handleResourceSubmit = async (entityType, payload) => {
    const createdEntity = await onCreateResource(entityType, payload);
    const config = resourceConfig.find((item) => item.type === entityType);

    if (config?.field && createdEntity?._id) {
      setFormData((previousState) => ({
        ...previousState,
        [config.field]: createdEntity._id,
      }));
    }

    return createdEntity;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormIssues([]);
    setServerConflicts([]);

    const validationIssues = validateTimetableEntryForm(formData, resources);

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
      await onSubmit(formData);
    } catch (error) {
      setServerConflicts(getConflictListFromError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFormData(isEdit ? createFormState(initialData) : createBlankForm());
    setFormIssues([]);
    setServerConflicts([]);
    setFormVersion((previousValue) => previousValue + 1);
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
        <div className="timetable-resource-actions" style={{ marginBottom: '1rem' }}>
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
              )}
            </div>

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
                {resources.timeslots.map((slot) => (
                  <option key={slot._id} value={slot._id}>
                    {slot.day} | {formatTimeRange(slot)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="timetable-summary-grid">
            <div className="timetable-summary-card">
              <strong>Selected Course</strong>
              <p>
                {selectedCourse
                  ? `${selectedCourse.code} • ${selectedCourse.department} • ${selectedCourse.sessionsPerWeek} sessions/week`
                  : 'Pick a course to see department and load details.'}
              </p>
            </div>
            <div className="timetable-summary-card">
              <strong>Selected Lecturer</strong>
              <p>
                {selectedLecturer
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
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleResetForm}
              disabled={submitting}
            >
              {isEdit ? 'Reset Form' : 'Clear Form'}
            </button>
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
    </>
  );
};

export default TimeTableForm;
