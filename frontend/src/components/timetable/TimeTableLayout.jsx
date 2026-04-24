import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaPlus, FaSignOutAlt, FaTable, FaUser } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import './TimeTableModule.css';

const adminNavItems = [
  {
    label: 'Dashboard',
    to: '/timetable',
    icon: <FaCalendarAlt />,
  },
  {
    label: 'Create Entry',
    to: '/timetable/create',
    icon: <FaPlus />,
  },
  {
    label: 'View Schedule',
    to: '/timetable/view',
    icon: <FaTable />,
  },
];

const TimeTableLayout = ({
  title,
  description,
  actions,
  children,
  readOnly = false,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = readOnly
    ? [
        {
          label: 'View Schedule',
          to: '/timetable/view',
          icon: <FaTable />,
        },
      ]
    : adminNavItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="timetable-module">
      <div className="timetable-shell">
        <div className="timetable-topbar">
          <div className="timetable-brand">
            <div className="timetable-brand-icon">
              <FaCalendarAlt />
            </div>
            <div>
              <h1>Time-Table Creation & Scheduling</h1>
              <p>
                Build conflict-free academic schedules with guided manual
                planning and one-click timetable generation.
              </p>
            </div>
          </div>

          <div className="timetable-userbar">
            {user ? (
              <>
                <div className="timetable-user-chip">
                  <FaUser />
                  <span>{user.name}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleLogout}
                >
                  <FaSignOutAlt /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/" className="btn btn-outline btn-sm">
                  Home
                </Link>
                <Link to="/login" className="btn btn-primary btn-sm">
                  Admin Login
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="timetable-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/timetable'}
              className={({ isActive }) =>
                `timetable-nav-link ${isActive ? 'active' : ''}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="timetable-page-header">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          {actions ? (
            <div className="timetable-page-actions">{actions}</div>
          ) : null}
        </div>

        {children}
      </div>
    </div>
  );
};

export default TimeTableLayout;
