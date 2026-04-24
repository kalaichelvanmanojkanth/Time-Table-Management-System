import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaEye, FaPlus, FaTrash } from 'react-icons/fa';
import Spinner from '../components/Spinner';
import TimeTableLayout from '../components/timetable/TimeTableLayout';
import TimeTableGrid from '../components/timetable/TimeTableGrid';
import timetableApi from '../components/timetable/timetableApi';
import { useAuth } from '../context/AuthContext';
import {
  buildConflictEntryIds,
  formatTimeRange,
  formatWeekLabel,
  getApiErrorMessage,
  getCurrentWeekValue,
  getLecturerDisplayLabel,
  sortTimeSlots,
} from '../components/timetable/timetableUtils';

const ViewTimeTable = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [week, setWeek] = useState(
    searchParams.get('week') || getCurrentWeekValue()
  );
  const [selectedCourseId, setSelectedCourseId] = useState(
    searchParams.get('courseId') || ''
  );
  const [courses, setCourses] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const canManageTimetable = Boolean(user);

  useEffect(() => {
    const queryWeek = searchParams.get('week') || getCurrentWeekValue();
    const queryCourseId = searchParams.get('courseId') || '';

    setWeek((previousWeek) =>
      previousWeek === queryWeek ? previousWeek : queryWeek
    );
    setSelectedCourseId((previousCourseId) =>
      previousCourseId === queryCourseId ? previousCourseId : queryCourseId
    );
  }, [searchParams]);

  // Home page timetable navigation lands on this screen, so the latest
  // timetable data is fetched here and rendered in both grid and list views.
  const loadViewData = async (selectedWeek = week, courseId = selectedCourseId) => {
    const [courseResponse, timeslotResponse, timetableResponse] = await Promise.all([
      timetableApi.courses.getAll(),
      timetableApi.timeslots.getAll(),
      timetableApi.timetables.list({
        week: selectedWeek,
        ...(courseId ? { courseId } : {}),
      }),
    ]);

    setCourses(courseResponse.data);
    setTimeSlots(sortTimeSlots(timeslotResponse.data));
    setEntries(timetableResponse.data);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        await loadViewData(week, selectedCourseId);
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, 'Failed to load timetable view.')
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCourseId, week]);

  useEffect(() => {
    const createdEntry = location.state?.createdEntry;

    if (!createdEntry?._id) {
      return;
    }

    const isWeekMatch = createdEntry.week === week;
    const isCourseMatch =
      !selectedCourseId || createdEntry.courseId?._id === selectedCourseId;

    if (!isWeekMatch || !isCourseMatch) {
      return;
    }

    setEntries((previousEntries) => {
      const hasEntry = previousEntries.some((entry) => entry._id === createdEntry._id);

      if (hasEntry) {
        return previousEntries;
      }

      return [createdEntry, ...previousEntries];
    });
  }, [location.state, selectedCourseId, week]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this timetable entry?')) {
      return;
    }

    try {
      await timetableApi.timetables.delete(id);
      toast.success('Timetable entry deleted.');
      await loadViewData(week, selectedCourseId);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Failed to delete timetable entry.')
      );
    }
  };

  const handleClearSchedule = async () => {
    if (entries.length === 0) {
      toast.info('There are no timetable entries to clear for the selected filters.');
      return;
    }

    const targetLabel = selectedCourseId
      ? `all sessions for the selected course in ${formatWeekLabel(week)}`
      : `all sessions in ${formatWeekLabel(week)}`;

    if (!window.confirm(`Clear ${targetLabel}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await timetableApi.timetables.clear({
        week,
        ...(selectedCourseId ? { courseId: selectedCourseId } : {}),
      });
      setEntries([]);
      toast.success(response.message || 'Schedule cleared successfully.');
      await loadViewData(week, selectedCourseId);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Failed to clear timetable entries.')
      );
    }
  };

  const handleWeekChange = (value) => {
    setWeek(value);
    setSearchParams((previousParams) => {
      const params = new URLSearchParams(previousParams);
      params.set('week', value);
      if (selectedCourseId) {
        params.set('courseId', selectedCourseId);
      } else {
        params.delete('courseId');
      }
      return params;
    });
  };

  const handleCourseChange = (value) => {
    setSelectedCourseId(value);
    setSearchParams((previousParams) => {
      const params = new URLSearchParams(previousParams);
      params.set('week', week);
      if (value) {
        params.set('courseId', value);
      } else {
        params.delete('courseId');
      }
      return params;
    });
  };

  if (loading) {
    return <Spinner />;
  }

  const conflictEntryIds = buildConflictEntryIds(entries);

  return (
    <TimeTableLayout
      readOnly={!canManageTimetable}
      title="View Timetable"
      description={
        canManageTimetable
          ? 'Inspect the current week in a grid view, filter by course, and jump straight into editing or deleting sessions.'
          : 'View the published timetable for the selected week and course filters.'
      }
      actions={
        canManageTimetable ? (
        <>
          <Link to="/timetable/create" className="btn btn-primary">
            <FaPlus /> Create Entry
          </Link>
          <Link to="/timetable" className="btn btn-outline">
            <FaEye /> Dashboard
          </Link>
        </>
        ) : null
      }
    >
      <div className="timetable-grid-layout">
        <div className="timetable-panel">
          <div className="timetable-view-filters">
            <div className="form-group" style={{ minWidth: '220px' }}>
              <label htmlFor="viewWeek">Week</label>
              <input
                id="viewWeek"
                type="week"
                value={week}
                onChange={(event) => handleWeekChange(event.target.value)}
              />
            </div>

            <div className="form-group" style={{ minWidth: '260px' }}>
              <label htmlFor="viewCourse">Course</label>
              <select
                id="viewCourse"
                value={selectedCourseId}
                onChange={(event) => handleCourseChange(event.target.value)}
              >
                <option value="">All courses</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
            </div>

            <span className="timetable-chip">{formatWeekLabel(week)}</span>
            <span className="timetable-chip timetable-chip--soft">
              {entries.length} Sessions
            </span>
            {canManageTimetable ? (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleClearSchedule}
                disabled={entries.length === 0}
              >
                <FaTrash /> {selectedCourseId ? 'Clear Filtered' : 'Clear Week'}
              </button>
            ) : null}
          </div>

          <div className="timetable-summary-grid" style={{ marginTop: '1rem' }}>
            <div className="timetable-summary-card">
              <strong>Active Week</strong>
              <p>{formatWeekLabel(week)}</p>
            </div>
            <div className="timetable-summary-card">
              <strong>Course Filter</strong>
              <p>
                {selectedCourseId
                  ? courses.find((course) => course._id === selectedCourseId)?.code || 'Selected course'
                  : 'All courses'}
              </p>
            </div>
            <div className="timetable-summary-card">
              <strong>Grid Status</strong>
              <p>{entries.length > 0 ? 'Schedule ready to review' : 'No sessions for current filters'}</p>
            </div>
          </div>
        </div>

        <div className="timetable-panel">
          <h3>Week Grid</h3>
          <TimeTableGrid
            entries={entries}
            timeSlots={timeSlots}
            conflictEntryIds={conflictEntryIds}
            onDelete={handleDelete}
            showActions={canManageTimetable}
          />
        </div>

        <div className="timetable-panel">
          <h3>Session List</h3>
          {entries.length === 0 ? (
            <div className="timetable-empty-state">
              <p>No sessions found for the selected filters.</p>
            </div>
          ) : (
            <div className="timetable-table-wrapper">
              <table className="timetable-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Lecturer</th>
                    <th>Room</th>
                    <th>Time</th>
                    {canManageTimetable ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry._id}>
                      <td>
                        <strong>{entry.courseId?.code}</strong>
                        <div>{entry.courseId?.name}</div>
                      </td>
                      <td>{getLecturerDisplayLabel(entry.lecturerId)}</td>
                      <td>{entry.roomId?.name}</td>
                      <td>
                        {entry.timeslotId?.day} • {formatTimeRange(entry.timeslotId)}
                      </td>
                      {canManageTimetable ? (
                        <td>
                          <div className="timetable-inline-actions">
                            <Link
                              to={`/timetable/edit/${entry._id}`}
                              className="btn btn-outline btn-sm"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(entry._id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </TimeTableLayout>
  );
};

export default ViewTimeTable;
