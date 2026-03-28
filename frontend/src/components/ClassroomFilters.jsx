function ClassroomFilters({ filters, onChange, onReset }) {
  return (
    <section className="panel filters-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Discover space</p>
          <h2>Filter classrooms</h2>
        </div>
        <button className="button ghost" onClick={onReset} type="button">
          Reset
        </button>
      </div>

      <div className="filters-grid">
        <label>
          Building
          <input
            name="building"
            onChange={onChange}
            placeholder="Engineering"
            value={filters.building}
          />
        </label>

        <label>
          Type
          <select name="type" onChange={onChange} value={filters.type}>
            <option value="">All</option>
            <option value="classroom">Classroom</option>
            <option value="lab">Lab</option>
          </select>
        </label>

        <label>
          Status
          <select name="status" onChange={onChange} value={filters.status}>
            <option value="">Any</option>
            <option value="available">Available</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </label>

        <label>
          Min Capacity
          <input
            min="0"
            name="minCapacity"
            onChange={onChange}
            placeholder="30"
            type="number"
            value={filters.minCapacity}
          />
        </label>

        <label>
          Resource
          <input
            name="resource"
            onChange={onChange}
            placeholder="projector"
            value={filters.resource}
          />
        </label>

        <label className="checkbox-label">
          <span>Available only</span>
          <input
            checked={filters.availableOnly}
            name="availableOnly"
            onChange={onChange}
            type="checkbox"
          />
        </label>
      </div>
    </section>
  );
}

export default ClassroomFilters;
