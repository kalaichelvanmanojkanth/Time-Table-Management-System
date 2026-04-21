import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaBook,
  FaChalkboardTeacher,
  FaClock,
  FaDoorOpen,
  FaEye,
  FaMagic,
  FaPlus,
} from 'react-icons/fa';
import Spinner from '../components/Spinner';
import TimeTableLayout from '../components/timetable/TimeTableLayout';
import EntityModal from '../components/timetable/EntityModal';
import GenerateTimetableModal from '../components/timetable/GenerateTimetableModal';
import timetableApi from '../components/timetable/timetableApi';
import {
  compareSlots,
  formatTimeRange,
  formatWeekLabel,
  getApiErrorMessage,
  getConflictListFromError,
  getCurrentWeekValue,
  getResourceCountSummary,
  getEntrySlot,
  mergeResourceItem,
  sortTimeSlots,
} from '../components/timetable/timetableUtils';

const resourceIcons = {
  course: <FaBook />,
  lecturer: <FaChalkboardTeacher />,
  room: <FaDoorOpen />,
  timeslot: <FaClock />,
};

const resourceKeyMap = {
  course: 'courses',
  lecturer: 'lecturers',
  room: 'rooms',
  timeslot: 'timeslots',
};

const resourceApiMap = {
  course: timetableApi.courses,
  lecturer: timetableApi.lecturers,
  room: timetableApi.rooms,
  timeslot: timetableApi.timeslots,
};

const TimeTableDashboard = () => {
  const [week, setWeek] = useState(getCurrentWeekValue());
  const [resources, setResources] = useState({
    courses: [],
    lecturers: [],
    rooms: [],
    timeslots: [],
  });
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resourceModalType, setResourceModalType] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generationConflicts, setGenerationConflicts] = useState([]);
  const [generating, setGenerating] = useState(false);

  const loadModuleData = async (selectedWeek = week) => {
    const [courses, lecturers, rooms, timeslots, timetableEntries] =
      await Promise.all([
        timetableApi.courses.getAll(),
        timetableApi.lecturers.getAll(),
        timetableApi.rooms.getAll(),
        timetableApi.timeslots.getAll(),
        timetableApi.timetables.list({ week: selectedWeek }),
      ]);

    setResources({
      courses: courses.data,
      lecturers: lecturers.data,
      rooms: rooms.data,
      timeslots: sortTimeSlots(timeslots.data),
    });
    setEntries(timetableEntries.data);
  };

  useEffect(() => {
    const fetchModuleData = async () => {
      setLoading(true);

      try {
        await loadModuleData(week);
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, 'Failed to load timetable dashboard.')
        );
      } finally {
        setLoading(false);
      }
    };

    fetchModuleData();
  }, [week]);

  const handleResourceCreate = async (entityType, payload) => {
    const response = await resourceApiMap[entityType].create(payload);
    const resourceKey = resourceKeyMap[entityType];

    toast.success(`${entityType} added successfully.`);
    setResources((previousState) => ({
      ...previousState,
      [resourceKey]: mergeResourceItem(
        previousState[resourceKey],
        response.data,
        entityType
      ),
    }));

    return response.data;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerationConflicts([]);

    try {
      const response = await timetableApi.timetables.generate({ week });
      setEntries(response.data);
      setShowGenerateModal(false);
      toast.success('Timetable generated successfully.');
    } catch (error) {
      setGenerationConflicts(getConflictListFromError(error));
      toast.error(
        getApiErrorMessage(error, 'Unable to generate timetable.')
      );
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  const targetSessions = getResourceCountSummary(resources.courses);
  const sortedEntries = [...entries].sort((left, right) => {
    const leftSlot = getEntrySlot(left);
    const rightSlot = getEntrySlot(right);

    return compareSlots(leftSlot, rightSlot);
  });
  const courseCoverage = resources.courses.map((course) => ({
    ...course,
    scheduled: entries.filter((entry) => entry.courseId?._id === course._id).length,
  }));

  return (
    <TimeTableLayout
      title="Time-Table Dashboard"
      description="Track resource readiness, review the current week, and generate a complete timetable without conflicts."
      actions={
        <>
          <div className="timetable-week-control">
            <span className="timetable-chip">{formatWeekLabel(week)}</span>
            <input
              type="week"
              value={week}
              onChange={(event) => setWeek(event.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowGenerateModal(true)}
          >
            <FaMagic /> Generate Timetable
          </button>
        </>
      }
    >
      <div className="timetable-grid-layout">
        <div className="timetable-panel">
          <div className="timetable-stat-grid">
            <div className="timetable-stat-card">
              <span>Courses</span>
              <strong>{resources.courses.length}</strong>
            </div>
            <div className="timetable-stat-card">
              <span>Lecturers</span>
              <strong>{resources.lecturers.length}</strong>
            </div>
            <div className="timetable-stat-card">
              <span>Rooms</span>
              <strong>{resources.rooms.length}</strong>
            </div>
            <div className="timetable-stat-card">
              <span>Scheduled Sessions</span>
              <strong>
                {entries.length}/{targetSessions || 0}
              </strong>
            </div>
          </div>
        </div>

        <div className="timetable-panel timetable-panel--half">
          <h3>Quick Actions</h3>
          <div className="timetable-quick-actions">
            <Link to="/timetable/create" className="btn btn-primary">
              <FaPlus /> Create Entry
            </Link>
            <Link to="/timetable/view" className="btn btn-outline">
              <FaEye /> View Grid
            </Link>
            {['course', 'lecturer', 'room', 'timeslot'].map((item) => (
              <button
                key={item}
                type="button"
                className="btn btn-outline"
                onClick={() => setResourceModalType(item)}
              >
                {resourceIcons[item]} Add {item === 'timeslot' ? 'TimeSlot' : item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="timetable-panel timetable-panel--half">
          <h3>Week Overview</h3>
          {sortedEntries.length === 0 ? (
            <div className="timetable-empty-state">
              <p>No sessions are scheduled for {formatWeekLabel(week)} yet.</p>
            </div>
          ) : (
            <div className="timetable-session-list">
              {sortedEntries.slice(0, 6).map((entry) => (
                <div key={entry._id} className="timetable-session-item">
                  <strong>{entry.courseId?.code}</strong>
                  <p>
                    {entry.courseId?.name} with {entry.lecturerId?.name}
                  </p>
                  <small>
                    {entry.timeslotId?.day} • {formatTimeRange(entry.timeslotId)} •{' '}
                    {entry.roomId?.name}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="timetable-panel timetable-panel--half">
          <h3>Course Coverage</h3>
          {courseCoverage.length === 0 ? (
            <div className="timetable-empty-state">
              <p>Add courses to start building a timetable plan.</p>
            </div>
          ) : (
            <div className="timetable-coverage-list">
              {courseCoverage.map((course) => (
                <div key={course._id} className="timetable-coverage-item">
                  <strong>
                    {course.code} • {course.name}
                  </strong>
                  <small>
                    {course.scheduled}/{course.sessionsPerWeek} sessions placed for{' '}
                    {course.department}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="timetable-panel timetable-panel--half">
          <h3>Resource Readiness</h3>
          <div className="timetable-summary-grid">
            <div className="timetable-summary-card">
              <strong>{resources.timeslots.length}</strong>
              <p>Reusable time slots available for scheduling.</p>
            </div>
            <div className="timetable-summary-card">
              <strong>{resources.lecturers.length}</strong>
              <p>Lecturers with department-matched availability.</p>
            </div>
            <div className="timetable-summary-card">
              <strong>{resources.rooms.length}</strong>
              <p>Rooms ready for automatic allocation.</p>
            </div>
          </div>
        </div>
      </div>

      <EntityModal
        entityType={resourceModalType || 'course'}
        isOpen={Boolean(resourceModalType)}
        onClose={() => setResourceModalType(null)}
        onSubmit={handleResourceCreate}
      />

      <GenerateTimetableModal
        isOpen={showGenerateModal}
        week={week}
        conflicts={generationConflicts}
        generating={generating}
        onClose={() => {
          setShowGenerateModal(false);
          setGenerationConflicts([]);
        }}
        onConfirm={handleGenerate}
      />
    </TimeTableLayout>
  );
};

export default TimeTableDashboard;
