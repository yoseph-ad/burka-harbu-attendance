import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, UserCheck, UserX, Percent, AlertCircle, 
  ArrowRight, ShieldAlert, Award, Calendar, CheckSquare 
} from 'lucide-react';
import { reportService } from '../services/api';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await reportService.getStats();
      setStats(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard analytics...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="card card-gold" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '24px' }}>
        <AlertCircle size={24} style={{ color: 'var(--error)' }} />
        <div>
          <h3 style={{ color: 'var(--error)' }}>Dashboard Load Error</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{error || 'An unexpected error occurred.'}</p>
          <button className="btn btn-secondary" onClick={fetchStats} style={{ marginTop: '10px' }}>Try Again</button>
        </div>
      </div>
    );
  }

  const COLORS = ['#10b981', '#ef4444', '#f59e0b']; // Present, Absent, Unmarked
  const pieData = [
    { name: 'Present', value: stats.today_present },
    { name: 'Absent', value: stats.today_absent },
    { name: 'Unmarked', value: stats.today_unmarked }
  ].filter(d => d.value > 0);

  return (
    <div>
      {/* Welcome Banner */}
      <div className="card card-gold" style={{
        padding: '24px 32px',
        marginBottom: '28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(212, 175, 55, 0.05) 100%)'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)' }}>
            Welcome, {user.first_name || user.username}!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            {user.role === 'ADMIN' 
              ? 'Administrator Portal - Burka Harbu Secondary School' 
              : `Teacher Portal - Assigned Section: ${user.assigned_sections?.[0]?.full_name || 'No Section Assigned'}`
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {user.role === 'ADMIN' && (
            <>
              <Link to="/registration" className="btn btn-secondary">
                Register Student
              </Link>
              <Link to="/kiosk" className="btn btn-accent">
                Kiosk Scanning
              </Link>
            </>
          )}
          {user.role === 'TEACHER' && (
            <Link to="/reports" className="btn btn-primary">
              View Class Reports
            </Link>
          )}
        </div>
      </div>

      {/* Numerical Stats Dashboard Grid */}
      <div className="dashboard-grid">
        <div className="card card-gold">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>TOTAL ENROLLED</p>
              <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px' }}>{stats.total_students}</h2>
            </div>
            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(27, 54, 93, 0.1)', color: 'var(--primary)' }}>
              <Users size={24} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
            Grade 9–12 students active
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>PRESENT TODAY</p>
              <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: 'var(--success)' }}>{stats.today_present}</h2>
            </div>
            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'var(--success-light)', color: '#065f46' }}>
              <UserCheck size={24} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
            Scanned at entrance today
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--error)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>ABSENT TODAY</p>
              <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: 'var(--error)' }}>{stats.today_absent}</h2>
            </div>
            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'var(--error-light)', color: '#991b1b' }}>
              <UserX size={24} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
            Marked as absent
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>ATTENDANCE RATE</p>
              <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: 'var(--accent-dark)' }}>{stats.today_rate}%</h2>
            </div>
            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'var(--warning-light)', color: '#92400e' }}>
              <Percent size={24} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
            Percentage of active students
          </div>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        marginBottom: '28px'
      }}>
        {/* Trend Area Chart */}
        <div className="card" style={{ height: '340px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Attendance Trend (Last 7 Days)</h3>
          <div style={{ flexGrow: 1, width: '100%', minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trend_stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="var(--text-secondary)" fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="attendance_rate" name="Rate (%)" stroke="var(--primary)" fillOpacity={1} fill="url(#colorRate)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Pie Chart */}
        <div className="card" style={{ height: '340px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '16px', alignSelf: 'flex-start' }}>Today's Student Distribution</h3>
          {pieData.length === 0 ? (
            <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', color: 'var(--text-secondary)' }}>
              No scans recorded yet today.
            </div>
          ) : (
            <div style={{ display: 'flex', width: '100%', flexGrow: 1, alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '60%', height: '100%', minWidth: '150px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => {
                        let colorIndex = 0;
                        if (entry.name === 'Absent') colorIndex = 1;
                        if (entry.name === 'Unmarked') colorIndex = 2;
                        return <Cell key={`cell-${index}`} fill={COLORS[colorIndex]} />;
                      })}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pieData.map((entry, index) => {
                  let colorIndex = 0;
                  if (entry.name === 'Absent') colorIndex = 1;
                  if (entry.name === 'Unmarked') colorIndex = 2;
                  return (
                    <div key={entry.name} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[colorIndex] }} />
                        <span style={{ fontWeight: '500' }}>{entry.name}</span>
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: '800', marginLeft: '18px' }}>
                        {entry.value} ({Math.round(entry.value / stats.total_students * 100)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role specific bottom panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* LEFT COLUMN: Section/Grade overview */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={18} style={{ color: 'var(--accent-dark)' }} />
            {user.role === 'ADMIN' ? 'Section Performance' : 'My Section Summary'}
          </h3>
          <div className="table-container" style={{ flexGrow: 1 }}>
            <table>
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Students</th>
                  <th style={{ textAlign: 'right' }}>Today's Rate</th>
                </tr>
              </thead>
              <tbody>
                {stats.section_stats.map((sec) => (
                  <tr key={sec.section_id}>
                    <td style={{ fontWeight: '600' }}>{sec.section_name}</td>
                    <td>{sec.total_students}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: sec.attendance_rate >= 90 ? 'var(--success)' : sec.attendance_rate >= 75 ? 'var(--warning)' : 'var(--error)' }}>
                      {sec.attendance_rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Actionable Alerts */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          {user.role === 'ADMIN' ? (
            // Admin: Ranked list of most absent students
            <>
              <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)' }}>
                <ShieldAlert size={18} />
                Most Absent Students (Ranked)
              </h3>
              {stats.most_absent.length === 0 ? (
                <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '14px', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '20px' }}>
                  No students flagged with chronic absences.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '230px' }}>
                  {stats.most_absent.map((student, idx) => (
                    <div key={student.student_id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(239, 68, 68, 0.03)',
                      border: '1px solid rgba(239, 68, 68, 0.08)'
                    }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '700' }}>{student.full_name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ID: {student.student_id} | Class: {student.grade} - {student.section}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="badge badge-danger" style={{ fontWeight: '700' }}>
                          {student.absent_count} Absences
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Teacher: List of absent students today
            <>
              <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)' }}>
                <Calendar size={18} />
                Absent Today ({stats.absent_today.length})
              </h3>
              {stats.absent_today.length === 0 ? (
                <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', fontSize: '14px', border: '1px dashed var(--success)', borderRadius: '8px', padding: '20px', backgroundColor: 'rgba(16, 185, 129, 0.02)' }}>
                  Perfect attendance! No students absent today.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '230px' }}>
                  {stats.absent_today.map((student) => (
                    <div key={student.student_id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(239, 68, 68, 0.03)',
                      border: '1px solid rgba(239, 68, 68, 0.08)'
                    }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '700' }}>{student.full_name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ID: {student.student_id} | Class: {student.grade} - {student.section}</p>
                      </div>
                      <span className="badge badge-danger">Absent Today</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
