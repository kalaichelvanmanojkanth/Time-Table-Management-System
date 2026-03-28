function ClassroomTable({
  classrooms,
  deletingId,
  onDelete,
  onEdit,
  readOnly = false,
  maintenanceRooms = [],
}) {
  return (
    <section className="panel table-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Inventory</p>
          <h2>Rooms and resources</h2>
        </div>
        <span className="table-count">{classrooms.length} visible</span>
      </div>

      {readOnly ? (
        <section className="maintenance-inline">
          <div className="maintenance-head">
            <div>
              <p className="eyebrow">Maintenance updates</p>
              <h2>Inside inventory</h2>
            </div>
            <span className="maintenance-count">{maintenanceRooms.length} total</span>
          </div>

          {maintenanceRooms.length === 0 ? (
            <p className="muted">No classrooms are currently marked for maintenance.</p>
          ) : (
            <div className="maintenance-list">
              {maintenanceRooms.slice(0, 6).map((room) => (
                <article className="maintenance-item" key={room._id}>
                  <div>
                    <strong>{room.roomName}</strong>
                    <p className="maintenance-meta">{room.building}</p>
                  </div>
                  <span className="status-badge maintenance">maintenance</span>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Room</th>
              <th>Building</th>
              <th>Capacity</th>
              <th>Type</th>
              <th>Resources</th>
              <th>Status</th>
              {!readOnly ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {classrooms.length === 0 ? (
              <tr>
                <td className="empty-state" colSpan={readOnly ? "6" : "7"}>
                  No classrooms match the current filters.
                </td>
              </tr>
            ) : (
              classrooms.map((classroom) => (
                <tr key={classroom._id}>
                  <td>
                    <strong>{classroom.roomName}</strong>
                  </td>
                  <td>{classroom.building}</td>
                  <td>{classroom.capacity}</td>
                  <td>
                    <span className={`pill ${classroom.type}`}>{classroom.type}</span>
                  </td>
                  <td>
                    <div className="resource-list">
                      {(classroom.resources || []).length > 0
                        ? classroom.resources.map((resource) => (
                            <span className="resource-tag" key={resource}>
                              {resource}
                            </span>
                          ))
                        : <span className="muted">No resources</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${classroom.status}`}>{classroom.status}</span>
                  </td>
                  {!readOnly ? (
                    <td>
                      <div className="action-row">
                        <button className="button ghost" onClick={() => onEdit(classroom)} type="button">
                          Edit
                        </button>
                        <button
                          className="button danger"
                          disabled={deletingId === classroom._id}
                          onClick={() => onDelete(classroom)}
                          type="button"
                        >
                          {deletingId === classroom._id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ClassroomTable;
