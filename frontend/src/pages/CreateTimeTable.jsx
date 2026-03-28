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
    await timetableApi.timetables.create(formData);
    toast.success('Timetable entry created successfully.');
    navigate(`/timetable/view?week=${encodeURIComponent(formData.week)}`);
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
      />
    </TimeTableLayout>
  );
};

export default CreateTimeTable;
