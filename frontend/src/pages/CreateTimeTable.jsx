import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Spinner from '../components/Spinner';
import TimeTableLayout from '../components/timetable/TimeTableLayout';
import TimeTableForm from '../components/timetable/TimeTableForm';
import timetableApi from '../components/timetable/timetableApi';
import {
  getApiErrorMessage,
  mergeResourceItem,
  sortTimeSlots,
} from '../components/timetable/timetableUtils';

const resourceApiMap = {
  course: timetableApi.courses,
  lecturer: timetableApi.lecturers,
  room: timetableApi.rooms,
  timeslot: timetableApi.timeslots,
};

const resourceKeyMap = {
  course: 'courses',
  lecturer: 'lecturers',
  room: 'rooms',
  timeslot: 'timeslots',
};

const CreateTimeTable = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resettingAll, setResettingAll] = useState(false);
  const [resources, setResources] = useState({
    courses: [],
    lecturers: [],
    rooms: [],
    timeslots: [],
  });
  const [entries, setEntries] = useState([]);

  const loadFormDependencies = async () => {
    const [courses, lecturers, rooms, timeslots, timetableEntries] =
      await Promise.all([
        timetableApi.courses.getAll(),
        timetableApi.lecturers.getAll(),
        timetableApi.rooms.getAll(),
        timetableApi.timeslots.getAll(),
        timetableApi.timetables.list(),
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
    const fetchDependencies = async () => {
      setLoading(true);

      try {
        await loadFormDependencies();
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, 'Failed to load timetable resources.')
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDependencies();
  }, []);

  const handleResourceCreate = async (entityType, payload) => {
    const response = await resourceApiMap[entityType].create(payload);
    const resourceKey = resourceKeyMap[entityType];

    setResources((previousState) => ({
      ...previousState,
      [resourceKey]: mergeResourceItem(
        previousState[resourceKey],
        response.data,
        entityType
      ),
    }));
    toast.success(`${entityType} added successfully.`);
    return response.data;
  };

  const handleSubmit = async (formData) => {
    const response = await timetableApi.timetables.create(formData);
    const createdEntry = response?.data;

    if (createdEntry?._id) {
      setEntries((previousEntries) => [createdEntry, ...previousEntries]);
    }

    toast.success('Timetable entry created successfully.');
    navigate(`/timetable/view?week=${encodeURIComponent(formData.week)}`, {
      state: { createdEntry },
    });
  };

  const handleRefreshData = async () => {
    await loadFormDependencies();
    toast.success('Scheduled entries and resources refreshed.');
  };

  const handleResetAllData = async () => {
    const confirmed = window.confirm(
      'Reset all data? This will permanently delete all schedules, courses, lecturers, rooms, and timeslots.'
    );

    if (!confirmed) {
      return;
    }

    setResettingAll(true);

    try {
      const [timetableEntries, courses, lecturers, rooms, timeslots] =
        await Promise.all([
          timetableApi.timetables.list(),
          timetableApi.courses.getAll(),
          timetableApi.lecturers.getAll(),
          timetableApi.rooms.getAll(),
          timetableApi.timeslots.getAll(),
        ]);

      await Promise.all(
        timetableEntries.data.map((entry) =>
          timetableApi.timetables.delete(entry._id)
        )
      );

      await Promise.all(
        timeslots.data.map((slot) => timetableApi.timeslots.delete(slot._id))
      );
      await Promise.all(
        rooms.data.map((room) => timetableApi.rooms.delete(room._id))
      );
      await Promise.all(
        lecturers.data.map((lecturer) =>
          timetableApi.lecturers.delete(lecturer._id)
        )
      );
      await Promise.all(
        courses.data.map((course) => timetableApi.courses.delete(course._id))
      );

      setEntries([]);
      setResources({
        courses: [],
        lecturers: [],
        rooms: [],
        timeslots: [],
      });

      toast.success('All schedules and timetable resources were reset.');
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Failed to reset all timetable data.')
      );
    } finally {
      setResettingAll(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <TimeTableLayout
      title="Create Timetable Entry"
      description="Add a single session manually while the module checks for lecturer, room, and course clashes."
    >
      <TimeTableForm
        resources={resources}
        existingEntries={entries}
        onSubmit={handleSubmit}
        onCreateResource={handleResourceCreate}
        onRefreshData={handleRefreshData}
        onResetAllData={handleResetAllData}
        resetAllLoading={resettingAll}
      />
    </TimeTableLayout>
  );
};

export default CreateTimeTable;
