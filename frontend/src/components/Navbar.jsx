import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaCalendarAlt, FaSignOutAlt, FaUser, FaBars, FaTimes } from 'react-icons/fa';
import { useState } from 'react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <FaCalendarAlt /> Smart TMS
        </Link>

        <button
          className="navbar-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <div className={`navbar-menu ${menuOpen ? 'active' : ''}`}>
          <Link
            to="/"
            className="navbar-link"
            onClick={() => setMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            to="/products"
            className="navbar-link"
            onClick={() => setMenuOpen(false)}
          >
            Products
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="navbar-link"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <div className="navbar-user">
                <FaUser />
                <span>{user?.name}</span>
              </div>
              <button onClick={handleLogout} className="btn btn-outline btn-sm">
                <FaSignOutAlt /> Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="btn btn-outline btn-sm"
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="btn btn-primary btn-sm"
                onClick={() => setMenuOpen(false)}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
