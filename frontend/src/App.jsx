import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <Navbar />
          <main className="main-content">
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
            </Routes>
          </main>
          <ToastContainer position="bottom-right" autoClose={3000} />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
