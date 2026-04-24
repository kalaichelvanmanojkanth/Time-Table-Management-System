import { FaMagic } from 'react-icons/fa';
import ConflictBanner from './ConflictBanner';
import { formatWeekLabel } from './timetableUtils';

const GenerateTimetableModal = ({
  isOpen,
  week,
  conflicts = [],
  generating = false,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="timetable-modal-backdrop">
      <div className="timetable-modal">
        <div className="timetable-modal-header">
          <div>
            <h3>Generate Timetable</h3>
            <p>
              This will replace the existing timetable for{' '}
              <strong>{formatWeekLabel(week)}</strong> only if every course can be
              scheduled without clashes.
            </p>
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
          title="Generation blocked"
          conflicts={conflicts}
        />

        <div className="timetable-summary-card" style={{ marginBottom: '1rem' }}>
          <strong>How it works</strong>
          <p>
            The generator matches courses with lecturers from the same department,
            checks lecturer availability, chooses the earliest valid time slots,
            and assigns the least-loaded free room.
          </p>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={generating}
          >
            <FaMagic /> {generating ? 'Generating...' : 'Generate Timetable'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateTimetableModal;
