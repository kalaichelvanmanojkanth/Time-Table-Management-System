import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaEnvelope, FaLock, FaKey } from 'react-icons/fa';
import authService from '../services/authService';
import getApiErrorMessage from '../utils/getApiErrorMessage';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const handleGenerateToken = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authService.forgotPassword(email);
      const newToken = response?.data?.resetToken || '';
      setGeneratedToken(newToken);
      if (newToken) {
        setToken(newToken);
      }
      toast.success('Reset token generated. Use it to set your new password.');
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Unable to generate reset token. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!token.trim()) {
      toast.error('Reset token is required');
      return;
    }

    setResetLoading(true);

    try {
      await authService.resetPassword(token.trim(), password);
      toast.success('Password reset successful. Please sign in.');
      navigate('/login');
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Unable to reset password. Please try again.')
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <FaKey className="auth-icon" />
          <h2>Forgot Password</h2>
          <p>Generate a reset token and set a new password</p>
        </div>

        <form onSubmit={handleGenerateToken} className="form" style={{ marginBottom: '1rem' }}>
          <div className="form-group">
            <label htmlFor="email">
              <FaEnvelope /> Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your account email"
              required
            />
          </div>

          <button type="submit" className="btn btn-outline btn-block" disabled={loading}>
            {loading ? 'Generating token...' : 'Generate Reset Token'}
          </button>
        </form>

        {generatedToken ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '1rem' }}>
            Reset token: <strong>{generatedToken}</strong>
          </p>
        ) : null}

        <form onSubmit={handleResetPassword} className="form">
          <div className="form-group">
            <label htmlFor="token">
              <FaKey /> Reset Token
            </label>
            <input
              type="text"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste reset token"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <FaLock /> New Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              minLength={6}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              <FaLock /> Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={resetLoading}
          >
            {resetLoading ? 'Resetting password...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Back to <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
