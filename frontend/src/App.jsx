import { useState, useEffect } from 'react';

function App() {
  const [status, setStatus] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setStatus({ loading: false, data, error: null }))
      .catch((err) => setStatus({ loading: false, data: null, error: err.message }));
  }, []);

  const checkAgain = () => {
    setStatus({ loading: true, data: null, error: null });
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setStatus({ loading: false, data, error: null }))
      .catch((err) => setStatus({ loading: false, data: null, error: err.message }));
  };

  const { loading, data, error } = status;
  const connected = data?.database?.connected;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>MongoDB Connection Status</h1>

        {loading && (
          <div style={styles.statusBox}>
            <div style={styles.spinner} />
            <p style={styles.statusText}>Checking connection...</p>
          </div>
        )}

        {error && (
          <div style={{ ...styles.statusBox, ...styles.errorBox }}>
            <span style={styles.icon}>&#10060;</span>
            <h2 style={{ ...styles.statusHeading, color: '#dc2626' }}>Connection Failed</h2>
            <p style={styles.statusText}>Backend server is not reachable</p>
            <p style={styles.detail}>{error}</p>
          </div>
        )}

        {data && (
          <div style={{ ...styles.statusBox, ...(connected ? styles.successBox : styles.errorBox) }}>
            <span style={styles.icon}>{connected ? '✅' : '❌'}</span>
            <h2 style={{ ...styles.statusHeading, color: connected ? '#16a34a' : '#dc2626' }}>
              {connected ? 'Connected Successfully' : 'Disconnected'}
            </h2>
            <p style={styles.statusText}>
              Status: <strong>{data.database.status}</strong>
            </p>
            {connected && (
              <div style={styles.details}>
                <p style={styles.detail}>
                  <span style={styles.label}>Host:</span> {data.database.host}
                </p>
                <p style={styles.detail}>
                  <span style={styles.label}>Database:</span> {data.database.name}
                </p>
                <p style={styles.detail}>
                  <span style={styles.label}>API:</span> {data.message}
                </p>
              </div>
            )}
          </div>
        )}

        <button onClick={checkAgain} style={styles.button}>
          🔄 Check Again
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: '1rem',
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '2.5rem',
    maxWidth: '480px',
    width: '100%',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
    textAlign: 'center',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '1.5rem',
  },
  statusBox: {
    padding: '1.5rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
  },
  successBox: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
  },
  icon: {
    fontSize: '2.5rem',
    display: 'block',
    marginBottom: '0.75rem',
  },
  statusHeading: {
    fontSize: '1.25rem',
    fontWeight: 700,
    marginBottom: '0.25rem',
  },
  statusText: {
    color: '#64748b',
    fontSize: '0.95rem',
    margin: '0.25rem 0',
  },
  details: {
    marginTop: '1rem',
    textAlign: 'left',
    background: '#f8fafc',
    borderRadius: '8px',
    padding: '1rem',
  },
  detail: {
    fontSize: '0.875rem',
    color: '#475569',
    margin: '0.35rem 0',
    wordBreak: 'break-all',
  },
  label: {
    fontWeight: 600,
    color: '#1e293b',
  },
  button: {
    padding: '0.65rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#ffffff',
    background: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 1rem',
  },
};

export default App;
