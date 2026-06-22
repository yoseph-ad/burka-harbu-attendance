import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, Shield } from 'lucide-react';
import { authService } from '../services/api';

const Login = ({ setUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await authService.login(username, password);
      setUser(data.user);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'Invalid username or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Graphic Accents */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(27, 54, 93, 0.08) 0%, rgba(0, 0, 0, 0) 70%)',
        top: '-10%',
        left: '-10%',
        zIndex: -1
      }} />
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212, 175, 55, 0.06) 0%, rgba(0, 0, 0, 0) 70%)',
        bottom: '-10%',
        right: '-10%',
        zIndex: -1
      }} />

      <div style={{
        width: '100%',
        maxWidth: '420px',
        zIndex: 1
      }}>
        {/* School Identity Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary)',
            border: '2px solid var(--accent)',
            marginBottom: '16px',
            boxShadow: 'var(--shadow-gold)',
            color: 'var(--accent)'
          }}>
            <Shield size={32} />
          </div>
          <h1 style={{
            fontSize: '24px',
            color: 'var(--primary)',
            fontWeight: '800',
            lineHeight: '1.2'
          }}>BURKA HARBU</h1>
          <p style={{
            fontSize: '11px',
            color: 'var(--accent-dark)',
            fontWeight: '700',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginTop: '4px'
          }}>Secondary School</p>
        </div>

        {/* Login Card */}
        <div className="card card-gold" style={{
          padding: '36px',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <h2 style={{
            fontSize: '20px',
            marginBottom: '6px',
            fontWeight: '700'
          }}>Digital Portal</h2>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '13px',
            marginBottom: '28px'
          }}>Log in to access your dashboard</p>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'var(--error-light)',
              color: 'var(--error)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              marginBottom: '20px',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                marginBottom: '6px',
                color: 'var(--text-primary)'
              }}>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)'
                }} />
                <input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  style={{
                    paddingLeft: '38px',
                    height: '42px'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                marginBottom: '6px',
                color: 'var(--text-primary)'
              }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)'
                }} />
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  style={{
                    paddingLeft: '38px',
                    height: '42px'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary glow-btn"
              disabled={loading}
              style={{
                width: '100%',
                height: '44px',
                fontWeight: '600',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.25)'
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo Credentials Hint */}
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          padding: '12px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(27, 54, 93, 0.03)',
          border: '1px dashed var(--border-color)',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          <p style={{ fontWeight: '600', marginBottom: '2px', color: 'var(--primary)' }}>Demo Credentials:</p>
          <p>Admin: <code style={{ backgroundColor: 'var(--bg-app)', padding: '2px 4px', borderRadius: '3px' }}>admin</code> / <code style={{ backgroundColor: 'var(--bg-app)', padding: '2px 4px', borderRadius: '3px' }}>admin123</code></p>
          <p style={{ marginTop: '2px' }}>Teacher: <code style={{ backgroundColor: 'var(--bg-app)', padding: '2px 4px', borderRadius: '3px' }}>teacher</code> / <code style={{ backgroundColor: 'var(--bg-app)', padding: '2px 4px', borderRadius: '3px' }}>teacher123</code></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
