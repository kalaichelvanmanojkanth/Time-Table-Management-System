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

      const mainTableRooms = fetched.filter((room) => {
        const roomStatus = String(room?.status || "").trim().toLowerCase();
        const selectedStatus = String(currentFilters.status || "").trim().toLowerCase();

        if (currentFilters.availableOnly) {
          return roomStatus === "available" || roomStatus === "ongoing";
        }

        if (selectedStatus === "maintenance") {
          return false;
        }

        if (selectedStatus === "available" || selectedStatus === "ongoing") {
          return roomStatus === selectedStatus;
        }

        return roomStatus === "available" || roomStatus === "ongoing";
      });

      setClassrooms(mainTableRooms);
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

  // Normalize building names to the four canonical labels
  const normalizeBuilding = (raw) => {
    if (!raw) return null;
    const s = String(raw).trim().toLowerCase();
    if (s === "engineering" || s === "engineering building") return "Engineering Building";
    if (s === "business" || s === "business building") return "Business Building";
    if (s === "new building") return "New Building";
    if (s === "main building") return "Main Building";
    // If a value contains one of the keywords, prefer mapped name
    if (s.includes("engineering")) return "Engineering Building";
    if (s.includes("business")) return "Business Building";
    if (s.includes("new building") || s.includes("new")) return "New Building";
    if (s.includes("main")) return "Main Building";
    return null;
  };

  // Combine available rooms + maintenance rooms for a complete count
  const allRooms = [...classrooms, ...(maintenanceRooms || [])];

  const buildingCounts = {
    "Engineering Building": 0,
    "Business Building": 0,
    "New Building": 0,
    "Main Building": 0,
  };

  allRooms.forEach((r) => {
    const b = normalizeBuilding(r && r.building);
    if (b && Object.prototype.hasOwnProperty.call(buildingCounts, b)) {
      buildingCounts[b] += 1;
    }
  });

  const chartData = [
    { key: "Engineering Building", value: buildingCounts["Engineering Building"], color: "#60a5fa" },
    { key: "Business Building", value: buildingCounts["Business Building"], color: "#f59e0b" },
    { key: "New Building", value: buildingCounts["New Building"], color: "#34d399" },
    { key: "Main Building", value: buildingCounts["Main Building"], color: "#a78bfa" },
  ];

  const totalRoomsForChart = chartData.reduce((s, c) => s + c.value, 0);

  // Small inline PieChart using SVG (no new deps). It's responsive via viewBox.
  const PieChart = ({ data, size = 120 }) => {
    const radius = size / 2;
    // stroke width controls donut thickness
    const strokeWidth = Math.max(10, Math.floor(radius * 0.5));
    const innerR = radius - strokeWidth / 2;
    const circumference = 2 * Math.PI * innerR;
    let offset = 0;
    const slices = data.map((d) => {
      const portion = totalRoomsForChart === 0 ? 1 / data.length : d.value / totalRoomsForChart;
      const dash = portion * circumference;
      const slice = { ...d, dash, offset };
      offset += dash;
      return slice;
    });

    return (
      <svg width="100%" viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <g transform={`translate(${radius},${radius})`}>
          {slices.map((sli, i) => (
            <circle
              key={sli.key}
              r={innerR}
              cx={0}
              cy={0}
              fill="transparent"
              stroke={sli.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${sli.dash} ${Math.max(0, circumference - sli.dash)}`}
              strokeDashoffset={-sli.offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 300ms, stroke 300ms, stroke 300ms" }}
            />
          ))}
          {/* center label */}
          <text x={0} y={4} textAnchor="middle" fontSize={13} fontWeight={600} fill="#111827">
            {totalRoomsForChart} Rooms
          </text>
        </g>
      </svg>
    );
  };

  return (
    <main className="classroom-page user-classroom-page">
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

      <section className="content-rail user-content-rail">
        <div className="user-toolbar">
          <ClassroomFilters filters={filters} onChange={handleFilterChange} onReset={handleResetFilters} />

          <aside className="panel chart-panel">
            <h3 className="chart-title">Rooms by Building</h3>
            <div className="chart-layout">
              <div style={{ width: 96, height: 96 }} className="shrink-0">
                <PieChart data={chartData} size={96} />
              </div>
              <div className="flex-1 text-sm">
                {chartData.map((d) => (
                  <div key={d.key} className="mb-1">
                    <div className="flex items-center justify-between text-[13px] leading-5">
                      <div className="flex items-center gap-2 truncate">
                        <span style={{ width: 10, height: 10, background: d.color, display: 'inline-block', borderRadius: 2 }} />
                        <span className="text-slate-700 truncate">{d.key}</span>
                      </div>
                      <div className="text-slate-600 pl-3">— {d.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
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
