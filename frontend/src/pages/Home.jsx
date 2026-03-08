import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FaRocket,
  FaShieldAlt,
  FaBox,
  FaChartLine,
  FaArrowRight,
} from 'react-icons/fa';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Manage Your Products <br />
            <span className="text-primary">With Ease</span>
          </h1>
          <p className="hero-subtitle">
            A full-stack MERN application with authentication, CRUD operations,
            and a beautiful responsive interface. Get started in seconds.
          </p>
          <div className="hero-actions">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary btn-lg">
                Go to Dashboard <FaArrowRight />
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  Get Started <FaArrowRight />
                </Link>
                <Link to="/login" className="btn btn-outline btn-lg">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FaShieldAlt />
              </div>
              <h3>Secure Authentication</h3>
              <p>
                JWT-based authentication with bcrypt password hashing keeps your
                data safe and secure.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaBox />
              </div>
              <h3>Product Management</h3>
              <p>
                Full CRUD operations to create, read, update, and delete
                products with ease.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaRocket />
              </div>
              <h3>Modern Tech Stack</h3>
              <p>
                Built with MongoDB, Express.js, React.js, and Node.js — the
                powerful MERN stack.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaChartLine />
              </div>
              <h3>Responsive Design</h3>
              <p>
                Beautiful, responsive UI that works seamlessly on desktop,
                tablet, and mobile devices.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
