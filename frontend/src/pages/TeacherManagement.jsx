import React, { useState, useEffect } from 'react';
import { UserPlus, Link2, Trash2, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { teacherService, studentService } from '../services/api';

const TeacherManagement = () => {
  // Lists
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // Form states - Create Teacher
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  
  // Form states - Assign Section
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // UI Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [teachersList, sectionsList, assignmentsList] = await Promise.all([
        teacherService.list(),
        studentService.getSections(),
        teacherService.listAssignments()
      ]);
      setTeachers(teachersList);
      setSections(sectionsList);
      setAssignments(assignmentsList);

      if (teachersList.length > 0) setSelectedTeacherId(teachersList[0].id.toString());
      if (sectionsList.length > 0) setSelectedSectionId(sectionsList[0].id.toString());
    } catch (err) {
      console.error(err);
      setError('Failed to load management configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    if (!username || !email || !firstName || !lastName || !password) {
      setError('Please fill in all teacher profile fields.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await teacherService.create({
        username,
        email,
        first_name: firstName,
        last_name: lastName,
        password
      });
      setSuccess(`Teacher account '${username}' created successfully.`);
      setUsername('');
      setEmail('');
      setFirstName('');
      setLastName('');
      setPassword('');
      loadData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.username?.[0] || err.response?.data?.email?.[0] || 'Failed to create teacher account.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!selectedTeacherId || !selectedSectionId) {
      setError('Please select both a teacher and a class section.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await teacherService.createAssignment(
        parseInt(selectedTeacherId),
        parseInt(selectedSectionId)
      );
      setSuccess('Class section assigned to teacher successfully.');
      loadData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to assign class section.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeacher = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete teacher '${name}'? This will also remove all their class assignments.`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await teacherService.delete(id);
      setSuccess(`Teacher '${name}' deleted successfully.`);
      loadData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to delete teacher.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (id) => {
    if (!window.confirm('Remove this class assignment?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await teacherService.deleteAssignment(id);
      setSuccess('Assignment removed successfully.');
      loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to remove assignment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Manage Teacher Accounts & Assignments</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Create portal credentials for teachers and assign sections to restrict their attendance views.
        </p>
      </div>

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
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: 'var(--success-light)',
          color: 'var(--success)',
          padding: '12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '13px',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}>
          <CheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{success}</span>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '28px'
      }}>
        
        {/* PANEL 1: Create and List Teachers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Create Form */}
          <div className="card card-gold">
            <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={20} style={{ color: 'var(--accent-dark)' }} />
              Create Teacher Account
            </h3>
            <form onSubmit={handleCreateTeacher} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Abebe" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Last Name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Keba" required />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Username</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. abebe_k" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Portal Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@burkaharbu.edu.et" required />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '10px' }}>
                Register Account
              </button>
            </form>
          </div>

          {/* Teachers List */}
          <div className="card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Active Teachers ({teachers.length})</h3>
            <div className="table-container" style={{ maxHeight: '300px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Username</th>
                    <th style={{ width: '60px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No teacher accounts registered.
                      </td>
                    </tr>
                  ) : (
                    teachers.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: '600' }}>{t.first_name} {t.last_name}</td>
                        <td>{t.username}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            onClick={() => handleDeleteTeacher(t.id, t.username)} 
                            className="btn btn-secondary" 
                            style={{ padding: '6px', color: 'var(--error)', border: 'none' }}
                            title="Delete Account"
                            disabled={loading}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* PANEL 2: Assignments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Assignment Form */}
          <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link2 size={20} style={{ color: 'var(--accent)' }} />
              Assign Section to Teacher
            </h3>
            <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Select Teacher</label>
                <select value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)}>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.username})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Select Class Section</label>
                <select value={selectedSectionId} onChange={(e) => setSelectedSectionId(e.target.value)}>
                  {sections.map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.grade_name} - {sec.name}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn btn-accent" disabled={loading || teachers.length === 0 || sections.length === 0} style={{ marginTop: '10px' }}>
                Link Assignment
              </button>
            </form>
          </div>

          {/* Assignments List */}
          <div className="card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Current Assignments ({assignments.length})</h3>
            <div className="table-container" style={{ maxHeight: '300px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Teacher Name</th>
                    <th>Class Section</th>
                    <th style={{ width: '60px', textAlign: 'center' }}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No section assignments linked.
                      </td>
                    </tr>
                  ) : (
                    assignments.map(ass => (
                      <tr key={ass.id}>
                        <td>{ass.teacher_name}</td>
                        <td style={{ fontWeight: '600' }}>{ass.section_name}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            onClick={() => handleDeleteAssignment(ass.id)} 
                            className="btn btn-secondary" 
                            style={{ padding: '6px', color: 'var(--error)', border: 'none' }}
                            title="Remove Link"
                            disabled={loading}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{
            backgroundColor: 'rgba(27, 54, 93, 0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            display: 'flex',
            gap: '8px'
          }}>
            <Info size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: '600', color: 'var(--primary)' }}>Assigned Access Policy</p>
              <p>Teachers can only view, check, and download reports for sections assigned to them. An admin, however, always maintains school-wide visibility.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default TeacherManagement;
