import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/ProductList';
import CreateProduct from './pages/CreateProduct';
import EditProduct from './pages/EditProduct';
import TimeTableDashboard from './pages/TimeTableDashboard';
import CreateTimeTable from './pages/CreateTimeTable';
import ViewTimeTable from './pages/ViewTimeTable';
import EditTimeTable from './pages/EditTimeTable';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const location = useLocation();
  const isAuthPage =
    location.pathname === '/login' || location.pathname === '/register';
  const isTimeTablePage = location.pathname.startsWith('/timetable');
  const showGlobalChrome = !isAuthPage && !isTimeTablePage;

  return (
    <div className="app">
      {showGlobalChrome ? <Navbar /> : null}

      <main className="main-content">
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {showGlobalChrome ? <Footer /> : null}
      <ToastContainer position="top-right" autoClose={4000} />
    </div>
  );
}

export default App;
