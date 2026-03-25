import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/ProductList';
import CreateProduct from './pages/CreateProduct';
import EditProduct from './pages/EditProduct';
import Analytics from './pages/analytics/Analytics';
import TeacherWorkload from './pages/analytics/TeacherWorkload';
import SubjectDistribution from './pages/analytics/SubjectDistribution';
import ResourceUtilization from './pages/analytics/ResourceUtilization';
import Reports from './pages/analytics/Reports';

import AISchedulingIndex from './pages/ai-scheduling/AISchedulingIndex';
import AISchedulingSetup from './pages/ai-scheduling/AISchedulingSetup';
import ConflictDetection from './pages/ai-scheduling/ConflictDetection';
import OptimizationSuggestions from './pages/ai-scheduling/OptimizationSuggestions';
import TimetableAnalytics from './pages/ai-scheduling/TimetableAnalytics';

/* Hide the legacy Navbar on the homepage — Home.jsx has its own premium navbar */
function AppShell() {
  const { pathname } = useLocation();
  const showNavbar = pathname !== '/' && !pathname.startsWith('/analytics') && !pathname.startsWith('/ai-scheduling');

  return (
    <div className="app">
      {showNavbar && <Navbar />}
      <main className={showNavbar ? 'main-content' : ''}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div className="container">
                  <Dashboard />
                </div>
              </ProtectedRoute>
            }
          />
          <Route path="/products" element={<div className="container"><ProductList /></div>} />
          <Route
            path="/products/new"
            element={
              <ProtectedRoute>
                <div className="container">
                  <CreateProduct />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:id/edit"
            element={
              <ProtectedRoute>
                <div className="container">
                  <EditProduct />
                </div>
              </ProtectedRoute>
            }
          />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/analytics/teacher-workload" element={<TeacherWorkload />} />
          <Route path="/analytics/subject-distribution" element={<SubjectDistribution />} />
          <Route path="/analytics/resource-utilization" element={<ResourceUtilization />} />
          <Route path="/analytics/reports" element={<Reports />} />

          {/* AI Scheduling Module */}
          <Route path="/ai-scheduling" element={<AISchedulingIndex />} />
          <Route path="/ai-scheduling/setup" element={<AISchedulingSetup />} />
          <Route path="/ai-scheduling/conflicts" element={<ConflictDetection />} />
          <Route path="/ai-scheduling/optimization" element={<OptimizationSuggestions />} />
          <Route path="/ai-scheduling/analytics" element={<TimetableAnalytics />} />
        </Routes>
      </main>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </Router>
  );
}

export default App;
