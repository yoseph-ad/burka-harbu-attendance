import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Tablet, AlertCircle, Shield } from 'lucide-react';
import { authService } from '../services/api';

const KioskLogin = ({ setUser }) => {
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
      
      // Ensure the logged-in user has the appropriate authorization level
      if (data.user.role !== 'KIOSK_DEVICE' && data.user.role !== 'ADMIN') {
        setError('Unauthorized device credential. Kiosk registration required.');
        authService.logout();
        return;
      }
      
      setUser(data.user);
      navigate('/kiosk');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'Device authentication failed. Please verify credentials.'
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
      backgroundColor: '#0b1329',
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxHeight: '100%',
        maxWidth: '400px',
        backgroundColor: '#111e38',
        border: '1px solid #223762',
        borderRadius: '16px',
        padding: '36px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: '#1a2a4a',
            border: '2px solid var(--accent)',
            color: 'var(--accent)',
            marginBottom: '16px'
          }}>
            <Tablet size={30} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Kiosk Device Setup</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '6px' }}>
            Authenticate this physical tablet to activate entrance scanning
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '20px',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-secondary)',
              marginBottom: '6px'
            }}>Kiosk Device ID</label>
            <input
              type="text"
              placeholder="Enter device username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                height: '42px',
                backgroundColor: '#070c19',
                border: '1px solid #223762',
                borderRadius: '8px',
                color: '#ffffff',
                padding: '0 12px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-secondary)',
              marginBottom: '6px'
            }}>Secure Device Key</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                placeholder="Enter device key"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  height: '42px',
                  backgroundColor: '#070c19',
                  border: '1px solid #223762',
                  borderRadius: '8px',
                  color: '#ffffff',
                  padding: '0 12px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: '44px',
              backgroundColor: 'var(--accent)',
              border: 'none',
              borderRadius: '8px',
              color: '#070c19',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Shield size={16} />
            {loading ? 'Registering Device...' : 'Authorize Tablet'}
          </button>
        </form>
      </div>
    </div>
  );
},
export default KioskLogin;
