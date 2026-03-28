import { useEffect, useState } from "react";
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

      setClassrooms(filteredPayload.data);
      setMaintenanceRooms(maintenancePayload.data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassrooms(filters);
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
        <ClassroomFilters filters={filters} onChange={handleFilterChange} onReset={handleResetFilters} />

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
