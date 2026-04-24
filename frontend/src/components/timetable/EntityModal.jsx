import { useEffect, useState } from 'react';
import { FaMinusCircle, FaPlus } from 'react-icons/fa';
import ConflictBanner from './ConflictBanner';
import {
  dayOrder,
  getApiErrorMessage,
  getValidationListFromError,
  validateEntityForm,
} from './timetableUtils';

const createAvailabilityWindow = () => ({
  day: 'Monday',
  startTime: '09:00',
  endTime: '10:00',
});

const createInitialFormState = (entityType, initialData = null) => {
  const defaults = {
    course: {
      name: '',
      code: '',
      department: '',
      sessionsPerWeek: '1',
    },
    lecturer: {
      name: '',
      department: '',
      availability: [createAvailabilityWindow()],
    },
    room: {
      name: '',
      capacity: '40',
      type: 'Lecture Hall',
    },
    timeslot: {
      day: 'Monday',
      startTime: '09:00',
      endTime: '10:00',
    },
  };

  if (!initialData) {
    return defaults[entityType];
  }

  if (entityType === 'lecturer') {
    return {
      name: initialData.name || '',
      department: initialData.department || '',
      availability:
        initialData.availability?.length > 0
          ? initialData.availability.map((item) => ({
              day: item.day,
              startTime: item.startTime,
              endTime: item.endTime,
            }))
          : [createAvailabilityWindow()],
    };
  }

  return {
    ...defaults[entityType],
    ...initialData,
    sessionsPerWeek:
      initialData.sessionsPerWeek !== undefined
        ? String(initialData.sessionsPerWeek)
        : defaults.course.sessionsPerWeek,
    capacity:
      initialData.capacity !== undefined
        ? String(initialData.capacity)
        : defaults.room.capacity,
  };
};

const getRenderableFormState = (entityType, formData, initialData = null) => {
  if (entityType === 'lecturer' && !Array.isArray(formData?.availability)) {
    return createInitialFormState(entityType, initialData);
  }

  if (
    entityType === 'course' &&
    (formData?.sessionsPerWeek === undefined || formData?.sessionsPerWeek === null)
  ) {
    return createInitialFormState(entityType, initialData);
  }

  if (
    entityType === 'room' &&
    (formData?.capacity === undefined || formData?.capacity === null)
  ) {
    return createInitialFormState(entityType, initialData);
  }

  if (
    entityType === 'timeslot' &&
    (!formData?.day || !formData?.startTime || !formData?.endTime)
  ) {
    return createInitialFormState(entityType, initialData);
  }

  return formData;
};

const modalMetadata = {
  course: {
    title: 'Add Course',
    subtitle: 'Create a course with a weekly session target.',
  },
  lecturer: {
    title: 'Add Lecturer',
    subtitle: 'Define lecturer availability before assigning sessions.',
  },
  room: {
    title: 'Add Room',
    subtitle: 'Register a room that can host timetable sessions.',
  },
  timeslot: {
    title: 'Add Time Slot',
    subtitle: 'Create a reusable scheduling window.',
  },
};

const EntityModal = ({
  entityType,
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
}) => {
  const [formData, setFormData] = useState(
    createInitialFormState(entityType, initialData)
  );
  const [submitting, setSubmitting] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setFormData(createInitialFormState(entityType, initialData));
      setValidationIssues([]);
      setSubmitting(false);
    }
  }, [entityType, initialData, isOpen]);

  if (!isOpen) {
    return null;
  }

  const metadata = modalMetadata[entityType];
  const renderFormData = getRenderableFormState(entityType, formData, initialData);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValidationIssues([]);
    setFormData((previousState) => ({
      ...previousState,
      [name]: value,
    }));
  };

  const handleAvailabilityChange = (index, field, value) => {
    setValidationIssues([]);
    setFormData((previousState) => ({
      ...previousState,
      availability: previousState.availability.map((window, windowIndex) =>
        windowIndex === index ? { ...window, [field]: value } : window
      ),
    }));
  };

  const addAvailabilityWindow = () => {
    setValidationIssues([]);
    setFormData((previousState) => ({
      ...previousState,
      availability: [...previousState.availability, createAvailabilityWindow()],
    }));
  };

  const removeAvailabilityWindow = (index) => {
    setValidationIssues([]);
    setFormData((previousState) => ({
      ...previousState,
      availability: previousState.availability.filter(
        (_, windowIndex) => windowIndex !== index
      ),
    }));
  };

  const buildPayload = () => {
    if (entityType === 'course') {
      return {
        ...renderFormData,
        sessionsPerWeek: Number(renderFormData.sessionsPerWeek),
      };
    }

    if (entityType === 'room') {
      return {
        ...renderFormData,
        capacity: Number(renderFormData.capacity),
      };
    }

    return renderFormData;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setValidationIssues([]);

    const clientValidationIssues = validateEntityForm(entityType, renderFormData);

    if (clientValidationIssues.length > 0) {
      setValidationIssues(clientValidationIssues);
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit(entityType, buildPayload());
      onClose();
    } catch (error) {
      const nextIssues = getValidationListFromError(
        error,
        getApiErrorMessage(error, `Unable to save ${entityType}.`)
      );
      setValidationIssues(nextIssues);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="timetable-modal-backdrop">
      <div className="timetable-modal">
        <div className="timetable-modal-header">
          <div>
            <h3>{metadata.title}</h3>
            <p>{metadata.subtitle}</p>
          </div>
          <button
            type="button"
            className="timetable-close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <ConflictBanner
          title="Unable to save"
          conflicts={validationIssues}
        />

        <form onSubmit={handleSubmit} className="form">
          {entityType === 'course' ? (
            <div className="timetable-form-grid">
              <div className="form-group">
                <label htmlFor="courseName">Course Name</label>
                <input
                  id="courseName"
                  name="name"
                  value={renderFormData.name}
                  onChange={handleChange}
                  placeholder="Software Engineering"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="courseCode">Course Code</label>
                <input
                  id="courseCode"
                  name="code"
                  value={renderFormData.code}
                  onChange={handleChange}
                  placeholder="SE401"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="courseDepartment">Department</label>
                <input
                  id="courseDepartment"
                  name="department"
                  value={renderFormData.department}
                  onChange={handleChange}
                  placeholder="Computing"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="sessionsPerWeek">Sessions Per Week</label>
                <input
                  id="sessionsPerWeek"
                  name="sessionsPerWeek"
                  type="number"
                  min="1"
                  value={renderFormData.sessionsPerWeek}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          ) : null}

          {entityType === 'lecturer' ? (
            <>
              <div className="timetable-form-grid">
                <div className="form-group">
                  <label htmlFor="lecturerName">Lecturer Name</label>
                  <input
                    id="lecturerName"
                    name="name"
                    value={renderFormData.name}
                    onChange={handleChange}
                    placeholder="Dr. Jane Perera"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lecturerDepartment">Department</label>
                  <input
                    id="lecturerDepartment"
                    name="department"
                    value={renderFormData.department}
                    onChange={handleChange}
                    placeholder="Computing"
                    required
                  />
                </div>
              </div>

              <div className="timetable-modal-header" style={{ marginTop: '1rem' }}>
                <div>
                  <h3>Availability</h3>
                  <p>Add the time windows during which this lecturer can teach.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={addAvailabilityWindow}
                >
                  <FaPlus /> Add Window
                </button>
              </div>

              <div className="timetable-availability-grid">
                {renderFormData.availability.map((window, index) => (
                  <div key={`${window.day}-${index}`} className="timetable-availability-row">
                    <div className="form-group">
                      <label htmlFor={`availability-day-${index}`}>Day</label>
                      <select
                        id={`availability-day-${index}`}
                        value={window.day}
                        onChange={(event) =>
                          handleAvailabilityChange(index, 'day', event.target.value)
                        }
                        required
                      >
                        {dayOrder.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor={`availability-start-${index}`}>Start</label>
                      <input
                        id={`availability-start-${index}`}
                        type="time"
                        value={window.startTime}
                        onChange={(event) =>
                          handleAvailabilityChange(index, 'startTime', event.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor={`availability-end-${index}`}>End</label>
                      <input
                        id={`availability-end-${index}`}
                        type="time"
                        value={window.endTime}
                        onChange={(event) =>
                          handleAvailabilityChange(index, 'endTime', event.target.value)
                        }
                        required
                      />
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => removeAvailabilityWindow(index)}
                      disabled={renderFormData.availability.length === 1}
                    >
                      <FaMinusCircle />
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {entityType === 'room' ? (
            <div className="timetable-form-grid">
              <div className="form-group">
                <label htmlFor="roomName">Room Name</label>
                <input
                  id="roomName"
                  name="name"
                  value={renderFormData.name}
                  onChange={handleChange}
                  placeholder="Lab A1"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="roomCapacity">Capacity</label>
                <input
                  id="roomCapacity"
                  name="capacity"
                  type="number"
                  min="1"
                  value={renderFormData.capacity}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="roomType">Room Type</label>
                <input
                  id="roomType"
                  name="type"
                  value={renderFormData.type}
                  onChange={handleChange}
                  placeholder="Lecture Hall"
                  required
                />
              </div>
            </div>
          ) : null}

          {entityType === 'timeslot' ? (
            <div className="timetable-form-grid">
              <div className="form-group">
                <label htmlFor="timeslotDay">Day</label>
                <select
                  id="timeslotDay"
                  name="day"
                  value={renderFormData.day}
                  onChange={handleChange}
                  required
                >
                  {dayOrder.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="timeslotStart">Start Time</label>
                <input
                  id="timeslotStart"
                  name="startTime"
                  type="time"
                  value={renderFormData.startTime}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="timeslotEnd">End Time</label>
                <input
                  id="timeslotEnd"
                  name="endTime"
                  type="time"
                  value={renderFormData.endTime}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          ) : null}

          <div className="form-actions" style={{ marginTop: '1rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : metadata.title}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntityModal;
