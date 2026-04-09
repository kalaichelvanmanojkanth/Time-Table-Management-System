import React, { useState, useEffect } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

import ClassroomManagementPage from "./pages/ClassroomManagementPage";
import CreateProduct from "./pages/CreateProduct";
import CreateTimeTable from "./pages/CreateTimeTable";
import Dashboard from "./pages/Dashboard";
import EditProduct from "./pages/EditProduct";
import EditTimeTable from "./pages/EditTimeTable";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ProductList from "./pages/ProductList";
import Register from "./pages/Register";
import TimeTableDashboard from "./pages/TimeTableDashboard";
import UserClassroomPage from "./pages/UserClassroomPage";
import ViewTimeTable from "./pages/ViewTimeTable";
import Analytics from "./pages/analytics/Analytics";
import Reports from "./pages/analytics/Reports";
import ResourceUtilization from "./pages/analytics/ResourceUtilization";
import SubjectDistribution from "./pages/analytics/SubjectDistribution";
import TeacherWorkload from "./pages/analytics/TeacherWorkload";

const ADMIN_PASSWORD = '1234';
const ADMIN_AUTH_KEY = 'utm_admin_auth';

function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();

    if (password === ADMIN_PASSWORD) {
      onLogin();
      setPassword('');
      setError('');
      return;
    }

    setError('Incorrect password. Try again.');
  };

  return (
    <main className="classroom-page">
      <section className="panel admin-login-panel">
        <p className="eyebrow">Admin access</p>
        <h2>Enter admin password</h2>
        <p className="hero-copy">
          This page is protected. Enter the admin password to continue to the
          management dashboard.
        </p>

        {error ? <div className="feedback error">{error}</div> : null}

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label>
            Password
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              type="password"
              value={password}
            />
          </label>
          <button className="button primary" type="submit">
            Login
          </button>
        </form>
      </section>
    </main>
  );
}

function App() {
  const location = useLocation();
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    const hasAuth = window.sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true';
    setIsAdminAuthenticated(hasAuth);
  }, []);

  const handleAdminLogin = () => {
    window.sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
    setIsAdminAuthenticated(true);
  };

  const handleAdminLogout = () => {
    window.sessionStorage.removeItem(ADMIN_AUTH_KEY);
    setIsAdminAuthenticated(false);
  };

  const isAuthPage =
    location.pathname === '/login' || location.pathname === '/register';
  const isTimeTablePage = location.pathname.startsWith('/timetable');
  const isRolePage =
    location.pathname === '/user' || location.pathname === '/admin';
  const isAnalyticsPage = location.pathname.startsWith('/analytics');
  const showGlobalChrome =
    !isAuthPage && !isTimeTablePage && !isRolePage && !isAnalyticsPage;

  return (
    <div className={isRolePage ? 'role-layout' : 'app'}>
      {showGlobalChrome ? <Navbar /> : null}

      {isRolePage ? (
        <header className="role-header">
          <div>
            <h1>UNIVERSITY TIMETABLE SYSTEM</h1>
          </div>
          <nav className="role-nav">
            <NavLink
              className={({ isActive }) => `role-link${isActive ? ' active' : ''}`}
              to="/user"
            >
              User page
            </NavLink>
            <NavLink
              className={({ isActive }) => `role-link${isActive ? ' active' : ''}`}
              to="/admin"
            >
              Admin page
            </NavLink>
            {isAdminAuthenticated ? (
              <button
                className="button ghost role-logout"
                onClick={handleAdminLogout}
                type="button"
              >
                Logout
              </button>
            ) : null}
          </nav>
        </header>
      ) : null}

      <main className={isRolePage ? undefined : 'main-content'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/products" element={<ProductList />} />
          <Route
            path="/products/create"
            element={
              <ProtectedRoute>
                <CreateProduct />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/edit/:id"
            element={
              <ProtectedRoute>
                <EditProduct />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/timetable"
            element={
              <ProtectedRoute>
                <TimeTableDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/timetable/create"
            element={
              <ProtectedRoute>
                <CreateTimeTable />
              </ProtectedRoute>
            }
          />
          <Route
            path="/timetable/view"
            element={
              <ProtectedRoute>
                <ViewTimeTable />
              </ProtectedRoute>
            }
          />
          <Route
            path="/timetable/edit/:id"
            element={
              <ProtectedRoute>
                <EditTimeTable />
              </ProtectedRoute>
            }
          />
          <Route path="/user" element={<UserClassroomPage />} />
          <Route
            path="/admin"
            element={
              isAdminAuthenticated ? (
                <ClassroomManagementPage />
              ) : (
                <AdminLogin onLogin={handleAdminLogin} />
              )
            }
          />
          <Route path="/analytics" element={<Analytics />} />
          <Route
            path="/analytics/teacher-workload"
            element={<TeacherWorkload />}
          />
          <Route
            path="/analytics/subject-distribution"
            element={<SubjectDistribution />}
          />
          <Route
            path="/analytics/resource-utilization"
            element={<ResourceUtilization />}
          />
          <Route path="/analytics/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {showGlobalChrome ? <Footer /> : null}
      <ToastContainer position="top-right" autoClose={4000} />
    </div>
  );
}

export default App;
