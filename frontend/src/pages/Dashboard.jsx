import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import useProducts from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';
import Spinner from '../components/Spinner';
import {
  FaPlus,
  FaBox,
  FaUser,
  FaCalendarAlt,
} from 'react-icons/fa';

const Dashboard = () => {
  const { user } = useAuth();
  const { products, loading, deleteProduct, fetchProducts } = useProducts();
  const [userProducts, setUserProducts] = useState([]);

  useEffect(() => {
    if (products && user) {
      const filtered = products.filter(
        (p) => p.user?._id === user._id || p.user === user._id
      );
      setUserProducts(filtered);
    }
  }, [products, user]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
        toast.success('Product deleted successfully');
      } catch (error) {
        toast.error(
          error.response?.data?.message || 'Failed to delete product'
        );
      }
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="dashboard">
      <div className="container">
        {/* Welcome Section */}
        <div className="dashboard-header">
          <div>
            <h1>Welcome, {user?.name}!</h1>
            <p className="text-muted">Manage your products from here</p>
          </div>
          <Link to="/products/create" className="btn btn-primary">
            <FaPlus /> Add Product
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#eff6ff' }}>
              <FaBox style={{ color: '#3b82f6' }} />
            </div>
            <div className="stat-info">
              <h3>{userProducts.length}</h3>
              <p>Your Products</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#f0fdf4' }}>
              <FaUser style={{ color: '#22c55e' }} />
            </div>
            <div className="stat-info">
              <h3>{user?.role}</h3>
              <p>Account Role</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#fefce8' }}>
              <FaCalendarAlt style={{ color: '#eab308' }} />
            </div>
            <div className="stat-info">
              <h3>{products.length}</h3>
              <p>Total Products</p>
            </div>
          </div>
        </div>

        {/* User's Products */}
        <div className="dashboard-section">
          <h2>Your Products</h2>
          {userProducts.length === 0 ? (
            <div className="empty-state">
              <FaBox className="empty-icon" />
              <h3>No products yet</h3>
              <p>Start by creating your first product</p>
              <Link to="/products/create" className="btn btn-primary">
                <FaPlus /> Create Product
              </Link>
            </div>
          ) : (
            <div className="products-grid">
              {userProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onDelete={handleDelete}
                  showActions={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
