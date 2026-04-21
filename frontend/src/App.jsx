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
import AnalyticsDashboard from './pages/analytics/AnalyticsDashboard';
import Reports from './pages/analytics/Reports';
import ResourceUtilization from './pages/analytics/ResourceUtilization';
import SubjectDistribution from './pages/analytics/SubjectDistribution';
import TeacherWorkload from './pages/analytics/TeacherWorkload';
import AISchedulingSetup from './pages/AISchedulingSetup';
import ConflictDetection from './pages/ConflictDetection';
import OptimizationSuggestions from './pages/OptimizationSuggestions';

function App() {
  const location = useLocation();
  const { pathname } = location;

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password';
  const isHomePage = pathname === '/';
  const isTimeTablePage = pathname.startsWith('/timetable');
  const isRolePage = pathname === '/user' || pathname === '/admin';
  const isAnalyticsPage = pathname.startsWith('/analytics');
  const isAIPage = pathname.startsWith('/ai');

  const showGlobalChrome =
    !isAuthPage &&
    !isHomePage &&
    !isTimeTablePage &&
    !isRolePage &&
    !isAnalyticsPage &&
    !isAIPage;

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
          
          <Route path="/products/create" element={<ProtectedRoute><CreateProduct /></ProtectedRoute>} />
          <Route path="/products/edit/:id" element={<ProtectedRoute><EditProduct /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/timetable" element={<ProtectedRoute><TimeTableDashboard /></ProtectedRoute>} />
          <Route path="/timetable/create" element={<ProtectedRoute><CreateTimeTable /></ProtectedRoute>} />
          <Route path="/timetable/view" element={<ViewTimeTable />} />
          <Route path="/timetable/edit/:id" element={<ProtectedRoute><EditTimeTable /></ProtectedRoute>} />
          <Route path="/user" element={<UserClassroomPage />} />
          <Route path="/admin" element={<ProtectedRoute><ClassroomManagementPage /></ProtectedRoute>} />
          
          {/* Analytics Routes */}
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/analytics/dashboard" element={<AnalyticsDashboard />} />
          <Route path="/analytics/teacher-workload" element={<TeacherWorkload />} />
          <Route path="/analytics/subject-distribution" element={<SubjectDistribution />} />
          <Route path="/analytics/resource-utilization" element={<ResourceUtilization />} />
          <Route path="/analytics/reports" element={<Reports />} />

          {/* AI Scheduling Routes */}
          <Route path="/ai/setup" element={<AISchedulingSetup />} />
          <Route path="/ai/conflict-detection" element={<ConflictDetection />} />
          <Route path="/ai/optimization" element={<OptimizationSuggestions />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {showGlobalChrome ? <Footer /> : null}
      <ToastContainer position="top-right" autoClose={4000} />
    </div>
  );
}

export default App;
