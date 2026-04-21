import { Link } from 'react-router-dom';
import { FaEdit, FaTrash } from 'react-icons/fa';
import {
  formatTimeRange,
  getGridDays,
  getGridRanges,
  getEntrySlot,
  getLecturerDisplayLabel,
} from './timetableUtils';

const TimeTableGrid = ({
  entries = [],
  timeSlots = [],
  conflictEntryIds = new Set(),
  onDelete,
  showActions = true,
}) => {
  const days = getGridDays(timeSlots, entries);
  const ranges = getGridRanges(timeSlots, entries);

  if (ranges.length === 0) {
    return (
      <div className="timetable-empty-state">
        <p>No timetable sessions are available for the selected filters.</p>
      </div>
    );
  }

  const getCellEntries = (day, range) =>
    entries.filter((entry) => {
      const slot = getEntrySlot(entry);

      return (
        slot?.day === day &&
        slot?.startTime === range.startTime &&
        slot?.endTime === range.endTime
      );
    });

  return (
    <div className="timetable-grid-board">
      <table>
        <thead>
          <tr>
            <th className="timetable-grid-time">Time</th>
            {days.map((day) => (
              <th key={day}>{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ranges.map((range) => (
            <tr key={`${range.startTime}-${range.endTime}`}>
              <td className="timetable-grid-time">
                {formatTimeRange(range)}
              </td>
              {days.map((day) => {
                const cellEntries = getCellEntries(day, range);
                const hasConflict = cellEntries.some((entry) =>
                  conflictEntryIds.has(entry._id)
                );

                return (
                  <td
                    key={`${day}-${range.startTime}-${range.endTime}`}
                    className={`timetable-grid-cell ${
                      hasConflict ? 'timetable-grid-cell--conflict' : ''
                    }`}
                  >
                    {cellEntries.length === 0 ? (
                      <span className="timetable-helper-text">Free</span>
                    ) : (
                      cellEntries.map((entry) => (
                        <div
                          key={entry._id}
                          className={`timetable-entry-card ${
                            conflictEntryIds.has(entry._id)
                              ? 'timetable-entry-card--conflict'
                              : ''
                          }`}
                        >
                          <strong>{entry.courseId?.code}</strong>
                          <div className="timetable-entry-meta">
                            <span>{entry.courseId?.name}</span>
                            <span>{getLecturerDisplayLabel(entry.lecturerId)}</span>
                            <span>{entry.roomId?.name}</span>
                          </div>
                          {showActions ? (
                            <div
                              className="timetable-inline-actions"
                              style={{ marginTop: '0.75rem' }}
                            >
                              <Link
                                to={`/timetable/edit/${entry._id}`}
                                className="btn btn-outline btn-sm"
                              >
                                <FaEdit /> Edit
                              </Link>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => onDelete?.(entry._id)}
                              >
                                <FaTrash /> Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TimeTableGrid;
