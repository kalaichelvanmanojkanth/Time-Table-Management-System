import React, { useEffect, useState } from "react";
import ClassroomFilters from "../components/ClassroomFilters";
import ClassroomTable from "../components/ClassroomTable";
import ClassroomBot from "../components/ClassroomBot";
import { getClassrooms } from "../services/classroomApi";

const initialFilters = {
  building: "",
  type: "",
  status: "",
  minCapacity: "",
  resource: "",
  availableOnly: true,
};

function UserClassroomPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [classrooms, setClassrooms] = useState([]);
  const [maintenanceRooms, setMaintenanceRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);

  const loadClassrooms = async (currentFilters) => {
    try {
      setLoading(true);
      setError("");
      const [filteredPayload, maintenancePayload] = await Promise.all([
        getClassrooms({
          ...currentFilters,
          availableOnly: currentFilters.availableOnly ? "true" : "",
        }),
        getClassrooms({
          status: "maintenance",
          page: 1,
          limit: 50,
        }),
      ]);
      const fetched = filteredPayload.data || [];
      setClassrooms(fetched);
      setMaintenanceRooms(maintenancePayload.data || []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load classrooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassrooms(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (event) => {
    const { name, value, type, checked } = event.target;
    const next = {
      ...filters,
      [name]: type === "checkbox" ? checked : value,
    };
    setFilters(next);
    loadClassrooms(next);
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    loadClassrooms(initialFilters);
  };

  const handleViewDetails = (room) => {
    setSelectedRoom(room);
  };

  const handleCloseDetails = () => setSelectedRoom(null);

  return (
    <main className="classroom-page">
      <section className="hero-card">
        <div>
          <p className="eyebrow">User portal</p>
          <h1>Find available classrooms quickly</h1>
          <p className="hero-copy">
            Explore room availability, capacity, and resources. This page is read-only for students and staff.
          </p>
        </div>
        <div className="stats-grid">
          <article>
            <span>Visible rooms</span>
            <strong>{classrooms.length}</strong>
          </article>
          <article>
            <span>Mode</span>
            <strong>Read-only</strong>
          </article>
          <article>
            <span>Maintenance rooms</span>
            <strong>{maintenanceRooms.length}</strong>
          </article>
        </div>
      </section>

      {error ? <div className="feedback error">{error}</div> : null}

      <section className="content-rail">
        <div className="panel">
          <div className="flex items-center justify-between mb-4">
            <ClassroomFilters filters={filters} onChange={handleFilterChange} onReset={handleResetFilters} />

            <div className="flex items-center gap-2">
              {/* No date/time filter in stable version - keep filters compact */}
            </div>
          </div>
        </div>

        {loading ? (
          <section className="panel loading-panel">Loading classrooms...</section>
        ) : (
          <ClassroomTable classrooms={classrooms} maintenanceRooms={maintenanceRooms} readOnly />
        )}
      </section>

      <ClassroomBot />

    </main>
  );
}

export default UserClassroomPage;
