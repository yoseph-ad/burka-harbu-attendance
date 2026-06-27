import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, ShieldAlert, FileText, Camera, 
  LogOut, Sun, Moon, Shield, Menu, X, Users2 
} from 'lucide-react';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Registration from './pages/Registration';
import TeacherManagement from './pages/TeacherManagement';
import Reports from './pages/Reports';
import KioskScan from './pages/KioskScan';
import KioskLogin from './pages/KioskLogin';
import Students from './pages/Students';
import { authService } from './services/api';

// Protected Route Wrapper
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('access_token');
  return token ? children : <Navigate to="/login" replace />;
};

// Admin Route Wrapper
const AdminRoute = ({ children, user }) => {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/login" replace />;
  return user && user.role === 'ADMIN' ? children : <Navigate to="/dashboard" replace />;
};

// Kiosk or Admin Route Wrapper
const KioskOrAdminRoute = ({ children, user }) => {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/kiosk/login" replace />;
  return user && (user.role === 'ADMIN' || user.role === 'KIOSK_DEVICE') ? children : <Navigate to="/dashboard" replace />;
};

const NavigationWrapper = ({ user, setUser, theme, toggleTheme }) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide sidebar on Login and Kiosk scan pages
  const isKiosk = location.pathname === '/kiosk' || location.pathname === '/kiosk/login';
  const isLogin = location.pathname === '/login';

  if (isLogin || isKiosk) return null;

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['ADMIN', 'TEACHER'] },
    { path: '/students', label: 'Student Directory', icon: <Users size={20} />, roles: ['ADMIN', 'TEACHER'] },
    { path: '/reports', label: 'Attendance Reports', icon: <FileText size={20} />, roles: ['ADMIN', 'TEACHER'] },
    { path: '/kiosk', label: 'Kiosk Camera', icon: <Camera size={20} />, roles: ['ADMIN'] },
    { path: '/teachers', label: 'Teacher Management', icon: <Users2 size={20} />, roles: ['ADMIN'] },
  ];

  return (
    <>
      {/* Mobile Top Header */}
      <div style={{
        display: 'none',
        padding: '16px 20px',
        backgroundColor: 'var(--bg-sidebar)',
        color: '#ffffff',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: 'var(--shadow-md)',
        '@media (maxWidth: 768px)': { display: 'flex' }
      }} className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: '800', fontFamily: 'Outfit' }}>BURKA HARBU</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '260px',
        backgroundColor: 'var(--bg-sidebar)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        boxShadow: 'var(--shadow-lg)',
        transition: 'transform var(--transition-normal)'
      }} className={`sidebar-nav ${mobileOpen ? 'open' : ''}`}>
        
        {/* Logo block */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            color: 'var(--accent)',
            border: '1px solid rgba(212,175,55,0.3)'
          }}>
            <Shield size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '-0.02em', fontFamily: 'Outfit', lineHeight: '1.2' }}>BURKA HARBU</h2>
            <p style={{ fontSize: '9px', color: 'var(--accent)', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Secondary School</p>
          </div>
        </div>

        {/* User context info */}
        <div style={{
          padding: '20px 24px',
          backgroundColor: 'rgba(0,0,0,0.15)',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>PORTAL SESSION</p>
          <h4 style={{ fontSize: '14px', fontWeight: '700', marginTop: '2px' }}>{user?.first_name} {user?.last_name}</h4>
          <span style={{
            display: 'inline-block',
            fontSize: '9px',
            fontWeight: '800',
            backgroundColor: user?.role === 'ADMIN' ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.1)',
            color: user?.role === 'ADMIN' ? 'var(--accent)' : '#ffffff',
            padding: '2px 8px',
            borderRadius: '9999px',
            marginTop: '6px',
            letterSpacing: '0.05em'
          }}>
            {user?.role}
          </span>
        </div>

        {/* Navigation Items */}
        <nav style={{ padding: '24px 16px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems
            .filter(item => item.roles.includes(user?.role))
            .map(item => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    color: active ? '#ffffff' : 'rgba(255,255,255,0.65)',
                    backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: active ? '600' : '500',
                    borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
                    transition: 'all var(--transition-fast)'
                  }}
                  className="nav-link"
                >
                  <span style={{ color: active ? 'var(--accent)' : 'inherit' }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
        </nav>

        {/* Sidebar Footer options */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme} 
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              display: 'flex',
              padding: '6px',
              borderRadius: 'var(--radius-sm)'
            }}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="footer-btn"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 68, 68, 0.8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: '600'
            }}
            className="footer-btn"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>

      </div>
    </>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [init, setInit] = useState(true);

  // Initialize Auth state
  useEffect(() => {
    const activeUser = authService.getCurrentUser();
    if (activeUser) {
      setUser(activeUser);
    }
    setInit(false);
  }, []);

  // Theme configuration Sync
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  if (init) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-app)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Verifying credentials...</p>
      </div>
    );
  }

  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        
        {/* Sidebar Nav Component */}
        <NavigationWrapper user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} />

        {/* Main Content Area */}
        <main style={{
          flexGrow: 1,
          padding: user ? '32px 32px 32px 292px' : '0px', // Shift right to avoid sidebar overlap
          width: '100%',
          transition: 'padding var(--transition-normal)'
        }} className="main-viewport">
          <Routes>
            {/* Authenticated redirect */}
            <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
            
            <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login setUser={setUser} />} />
            
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard user={user} />
              </PrivateRoute>
            } />

            <Route path="/students" element={
              <PrivateRoute>
                <Students user={user} />
              </PrivateRoute>
            } />

            <Route path="/registration" element={
              <AdminRoute user={user}>
                <Registration />
              </AdminRoute>
            } />

            <Route path="/teachers" element={
              <AdminRoute user={user}>
                <TeacherManagement />
              </AdminRoute>
            } />

            <Route path="/reports" element={
              <PrivateRoute>
                <Reports user={user} />
              </PrivateRoute>
            } />

            <Route path="/kiosk" element={
              <KioskOrAdminRoute user={user}>
                <KioskScan />
              </KioskOrAdminRoute>
            } />

            <Route path="/kiosk/login" element={user ? <Navigate to="/kiosk" replace /> : <KioskLogin setUser={setUser} />} />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
