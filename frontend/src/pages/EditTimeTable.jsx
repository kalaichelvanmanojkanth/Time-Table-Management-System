import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const EditTimeTable = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState({
    courses: [],
    lecturers: [],
    rooms: [],
    timeslots: [],
  });
  const [entries, setEntries] = useState([]);
  const [entry, setEntry] = useState(null);

  const loadDependencies = async () => {
    const [
      courses,
      lecturers,
      rooms,
      timeslots,
      timetableEntries,
      timetableEntry,
    ] = await Promise.all([
      timetableApi.courses.getAll(),
      timetableApi.lecturers.getAll(),
      timetableApi.rooms.getAll(),
      timetableApi.timeslots.getAll(),
      timetableApi.timetables.list(),
      timetableApi.timetables.getById(id),
    ]);

    setResources({
      courses: courses.data,
      lecturers: lecturers.data,
      rooms: rooms.data,
      timeslots: sortTimeSlots(timeslots.data),
    });
    setEntries(timetableEntries.data);
    setEntry(timetableEntry.data);
  };

  useEffect(() => {
    const fetchDependencies = async () => {
      setLoading(true);

      try {
        await loadDependencies();
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, 'Failed to load timetable entry.')
        );
        navigate('/timetable');
      } finally {
        setLoading(false);
      }
    };

    fetchDependencies();
  }, [id, navigate]);

  const handleResourceCreate = async (entityType, payload, options = {}) => {
    const response =
      options.mode === 'update' && options.id
        ? await resourceApiMap[entityType].update(options.id, payload)
        : await resourceApiMap[entityType].create(payload);
    const resourceKey = resourceKeyMap[entityType];

    setResources((previousState) => ({
      ...previousState,
      [resourceKey]: mergeResourceItem(
        previousState[resourceKey],
        response.data,
        entityType
      ),
    }));
    if (!options.silent) {
      toast.success(
        options.mode === 'update'
          ? `${entityType} updated successfully.`
          : `${entityType} added successfully.`
      );
    }
    return response.data;
  };

  const handleSubmit = async (formData) => {
    await timetableApi.timetables.update(id, formData);
    toast.success('Timetable entry updated successfully.');
    navigate(`/timetable/view?week=${encodeURIComponent(formData.week)}`);
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <TimeTableLayout
      title="Edit Timetable Entry"
      description="Reschedule an existing session while keeping the timetable clash-free."
    >
      <TimeTableForm
        initialData={entry}
        resources={resources}
        existingEntries={entries}
        onSubmit={handleSubmit}
        onCreateResource={handleResourceCreate}
        isEdit={true}
      />
    </TimeTableLayout>
  );
};

export default EditTimeTable;
