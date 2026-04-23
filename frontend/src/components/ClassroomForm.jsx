import React from 'react';

const defaultFormState = {
  roomName: '',
  building: '',
  capacity: '',
  type: 'classroom',
  resources: '',
  status: 'available',
};

const toFormState = (classroom) => {
  if (!classroom) return defaultFormState;
  return {
    roomName: classroom.roomName || '',
    building: classroom.building || '',
    capacity: classroom.capacity ? String(classroom.capacity) : '',
    type: classroom.type || 'classroom',
    resources: Array.isArray(classroom.resources) ? classroom.resources.join(', ') : '',
    status: classroom.status || 'available',
  };
};

function ClassroomForm({ activeClassroom, onCancel, onSubmit, saving }) {
  const formState = toFormState(activeClassroom);
  const [errors, setErrors] = React.useState({});

  const validateForm = (formData) => {
    const newErrors = {};
    const roomName = formData.get('roomName')?.trim();
    if (!roomName) newErrors.roomName = 'Room name is required';
    else if (roomName.length < 2) newErrors.roomName = 'Room name must be at least 2 characters';
    else if (roomName.length > 50) newErrors.roomName = 'Room name must be less than 50 characters';

    const building = formData.get('building')?.trim();
    if (!building) newErrors.building = 'Building is required';
    else if (building.length < 2) newErrors.building = 'Building must be at least 2 characters';
    else if (building.length > 50) newErrors.building = 'Building must be less than 50 characters';

    const capacity = formData.get('capacity');
    if (!capacity) newErrors.capacity = 'Capacity is required';
    else if (Number(capacity) < 1) newErrors.capacity = 'Capacity must be at least 1';
    else if (Number(capacity) > 500) newErrors.capacity = 'Capacity cannot exceed 500';

    const resources = formData.get('resources')?.trim();
    if (resources) {
      const resourceArray = resources.split(',').map((r) => r.trim());
      if (resourceArray.length > 10) newErrors.resources = 'Maximum 10 resources allowed';
      for (const resource of resourceArray) {
        if (resource.length > 100) {
          newErrors.resources = 'Each resource must be less than 100 characters';
          break;
        }
      }
    }

    return newErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    const payload = {
      roomName: formData.get('roomName')?.trim(),
      building: formData.get('building')?.trim(),
      capacity: Number(formData.get('capacity')),
      type: formData.get('type'),
      status: formData.get('status'),
      resources: String(formData.get('resources') || '')
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean),
    };

    // no booking fields in stable form
    onSubmit(payload);
  };

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">{activeClassroom ? 'Update classroom' : 'Add classroom'}</p>
          <h2>{activeClassroom ? `Edit ${activeClassroom.roomName}` : 'New room or lab'}</h2>
        </div>
      </div>

      <label>
        Room Name
        <input name="roomName" defaultValue={formState.roomName} placeholder="B-204" required />
        {errors.roomName && <span className="error-message">{errors.roomName}</span>}
      </label>

      <label>
        Building
        <input name="building" defaultValue={formState.building} placeholder="Science Block" required />
        {errors.building && <span className="error-message">{errors.building}</span>}
      </label>

      <div className="form-grid">
        <label>
          Capacity
          <input name="capacity" defaultValue={formState.capacity} min="1" type="number" required />
          {errors.capacity && <span className="error-message">{errors.capacity}</span>}
        </label>

        <label>
          Type
          <select name="type" defaultValue={formState.type}>
            <option value="classroom">Classroom</option>
            <option value="lab">Lab</option>
          </select>
        </label>
      </div>

      <label>
        Resources
        <input name="resources" defaultValue={formState.resources} placeholder="projector, computers, smart board" />
        {errors.resources && <span className="error-message">{errors.resources}</span>}
      </label>

      

      <label>
        Status
        <select name="status" defaultValue={formState.status}>
          <option value="available">Available</option>
          <option value="ongoing">Ongoing</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </label>

      <div className="form-actions">
        {activeClassroom ? (
          <button className="button ghost" onClick={onCancel} type="button">
            Cancel edit
          </button>
        ) : null}
        <button className="button primary" disabled={saving} type="submit">
          {saving ? 'Saving...' : activeClassroom ? 'Update classroom' : 'Create classroom'}
        </button>
      </div>
    </form>
  );
}

export default ClassroomForm;
