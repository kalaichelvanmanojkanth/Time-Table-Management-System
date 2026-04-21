import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ClassroomManagementPage from './pages/ClassroomManagementPage';
import CreateProduct from './pages/CreateProduct';
import CreateTimeTable from './pages/CreateTimeTable';
import Dashboard from './pages/Dashboard';
import EditProduct from './pages/EditProduct';
import EditTimeTable from './pages/EditTimeTable';
import Home from './pages/Home';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ProductList from './pages/ProductList';
import Register from './pages/Register';
import TimeTableDashboard from './pages/TimeTableDashboard';
import UserClassroomPage from './pages/UserClassroomPage';
import ViewTimeTable from './pages/ViewTimeTable';
import Analytics from './pages/analytics/Analytics';
import Reports from './pages/analytics/Reports';
import ResourceUtilization from './pages/analytics/ResourceUtilization';
import SubjectDistribution from './pages/analytics/SubjectDistribution';
import TeacherWorkload from './pages/analytics/TeacherWorkload';

function App() {
  const location = useLocation();

  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/forgot-password';
  const isHomePage = location.pathname === '/';
  const isTimeTablePage = location.pathname.startsWith('/timetable');
  const isRolePage =
    location.pathname === '/user' || location.pathname === '/admin';
  const isAnalyticsPage = location.pathname.startsWith('/analytics');
  // Preserve the original Home page layout by not wrapping it with the app-level
  // Navbar/Footer chrome that belongs to the other modules.
  const showGlobalChrome =
    !isAuthPage &&
    !isHomePage &&
    !isTimeTablePage &&
    !isRolePage &&
    !isAnalyticsPage;

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
          </nav>
        </header>
      ) : null}

      <main className={isRolePage ? undefined : 'main-content'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
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
          <Route path="/timetable/view" element={<ViewTimeTable />} />
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
              <ProtectedRoute>
                <ClassroomManagementPage />
              </ProtectedRoute>
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
