<<<<<<< HEAD
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, NavLink, Route, Routes } from "react-router-dom";
import ClassroomManagementPage from "./pages/ClassroomManagementPage";
import UserClassroomPage from "./pages/UserClassroomPage";

const ADMIN_PASSWORD = "1234";
const ADMIN_AUTH_KEY = "utm_admin_auth";

function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (password === ADMIN_PASSWORD) {
      onLogin();
      setPassword("");
      setError("");
      return;
    }

    setError("Incorrect password. Try again.");
  };

  return (
    <main className="classroom-page">
      <section className="panel admin-login-panel">
        <p className="eyebrow">Admin access</p>
        <h2>Enter admin password</h2>
        <p className="hero-copy">
          This page is protected. Enter the admin password to continue to the management dashboard.
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
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    const hasAuth = window.sessionStorage.getItem(ADMIN_AUTH_KEY) === "true";
    setIsAdminAuthenticated(hasAuth);
  }, []);

  const handleAdminLogin = () => {
    window.sessionStorage.setItem(ADMIN_AUTH_KEY, "true");
    setIsAdminAuthenticated(true);
  };

  const handleAdminLogout = () => {
    window.sessionStorage.removeItem(ADMIN_AUTH_KEY);
    setIsAdminAuthenticated(false);
  };

  return (
    <BrowserRouter>
      <div className="role-layout">
        <header className="role-header">
          <div>
            <h1>UNIVERSITY TIMETABLE SYSTEM</h1>
            
          </div>
          <nav className="role-nav">
            <NavLink className={({ isActive }) => `role-link${isActive ? " active" : ""}`} to="/user">
              User page
            </NavLink>
            <NavLink className={({ isActive }) => `role-link${isActive ? " active" : ""}`} to="/admin">
              Admin page
            </NavLink>
            {isAdminAuthenticated ? (
              <button className="button ghost role-logout" onClick={handleAdminLogout} type="button">
                Logout
              </button>
            ) : null}
          </nav>
        </header>

        <Routes>
          <Route element={<Navigate replace to="/user" />} path="/" />
          <Route element={<UserClassroomPage />} path="/user" />
          <Route
            element={
              isAdminAuthenticated ? (
                <ClassroomManagementPage />
              ) : (
                <AdminLogin onLogin={handleAdminLogin} />
              )
            }
            path="/admin"
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
          <Route path="/analytics" element={<Analytics />} />
