import { useEffect, useState, useDeferredValue, startTransition } from "react";
import ClassroomFilters from "../components/ClassroomFilters";
import ClassroomForm from "../components/ClassroomForm";
import ClassroomTable from "../components/ClassroomTable";
import ClassroomBot from "../components/ClassroomBot";
import campusIllustration from "../assets/campus-illustration.svg";
import equipmentIllustration from "../assets/equipment-illustration.svg";
import {
  createClassroom,
  deleteClassroom,
  getClassrooms,
  updateClassroom,
} from "../services/classroomApi";

const initialFilters = {
  building: "",
  type: "",
  status: "",
  minCapacity: "",
  resource: "",
  availableOnly: false,
};

function ClassroomManagementPage() {
  const [filters, setFilters] = useState(initialFilters);
  const deferredFilters = useDeferredValue(filters);
  const [classrooms, setClassrooms] = useState([]);
  const [stats, setStats] = useState({ total: 0, available: 0, labs: 0 });
  const [activeClassroom, setActiveClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadClassrooms = async (currentFilters = deferredFilters) => {
    try {
      setLoading(true);
      setError("");
      const payload = await getClassrooms({
        ...currentFilters,
        availableOnly: currentFilters.availableOnly ? "true" : "",
      });

      startTransition(() => {
        setClassrooms(payload.data);
        setStats({
          total: payload.total,
          available: payload.data.filter((item) => item.status === "available").length,
          labs: payload.data.filter((item) => item.type === "lab").length,
        });
      });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassrooms();
  }, [deferredFilters]);

  const handleFilterChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFilters((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (activeClassroom?._id) {
        await updateClassroom(activeClassroom._id, payload);
        setMessage("Classroom updated successfully.");
      } else {
        await createClassroom(payload);
        setMessage("Classroom created successfully.");
      }

      setActiveClassroom(null);
      await loadClassrooms(filters);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (classroom) => {
    const shouldDelete = window.confirm(`Delete ${classroom.roomName} from ${classroom.building}?`);

    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingId(classroom._id);
      setError("");
      setMessage("");
      await deleteClassroom(classroom._id);
      setMessage("Classroom deleted successfully.");
      if (activeClassroom?._id === classroom._id) {
        setActiveClassroom(null);
      }
      await loadClassrooms(filters);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId("");
    }
  };

  return (
    <main className="classroom-page">
      <section className="hero-card">
        <div>
          <p className="eyebrow">University timetable management</p>
          <h1>Campus space operations dashboard</h1>
          <p className="hero-copy">
            Manage room inventory, monitor availability, and keep scheduling decisions grounded in live capacity and resource data.
          </p>
        </div>
        <div className="stats-grid">
          <div className="hero-image-wrap">
            <img alt="University campus buildings" className="hero-image" src={campusIllustration} />
          </div>
          <article>
            <span>Visible rooms</span>
            <strong>{stats.total}</strong>
          </article>
          <article>
            <span>Available visible</span>
            <strong>{stats.available}</strong>
          </article>
          <article>
            <span>Labs</span>
            <strong>{stats.labs}</strong>
          </article>
        </div>
      </section>

      {message ? <div className="feedback success">{message}</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <section className="workspace-grid">
        <div className="left-rail">
          <aside className="panel visual-panel">
            <p className="eyebrow">Resources snapshot</p>
            <h2>Labs and equipment view</h2>
            <img
              alt="Classroom resources and equipment"
              className="equipment-image"
              src={equipmentIllustration}
            />
          </aside>

          <ClassroomForm
            activeClassroom={activeClassroom}
            key={activeClassroom?._id || "new"}
            onCancel={() => setActiveClassroom(null)}
            onSubmit={handleSubmit}
            saving={saving}
          />
        </div>

        <div className="content-rail">
          <ClassroomFilters
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleResetFilters}
          />

          {loading ? (
            <section className="panel loading-panel">Loading classrooms...</section>
          ) : (
            <ClassroomTable
              classrooms={classrooms}
              deletingId={deletingId}
              onDelete={handleDelete}
              onEdit={setActiveClassroom}
            />
          )}
        </div>
      </section>

      <ClassroomBot />
    </main>
  );
}

export default ClassroomManagementPage;
