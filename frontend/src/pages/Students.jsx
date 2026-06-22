import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, Search, Filter, Trash2, Plus, 
  AlertCircle, CheckCircle, Info, Calendar 
} from 'lucide-react';
import { studentService } from '../services/api';

const Students = ({ user }) => {
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);

  // Filter forms
  const [gradeId, setGradeId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // UI Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [gradesList, sectionsList] = await Promise.all([
        studentService.getGrades(),
        studentService.getSections()
      ]);
      setGrades(gradesList);
      setSections(sectionsList);
      
      // Initial list load
      fetchStudents(gradesList, sectionsList);
    } catch (err) {
      console.error(err);
      setError('Failed to load filter metadata.');
      setLoading(false);
    }
  };

  const fetchStudents = async (gList = grades, sList = sections) => {
    setLoading(true);
    setError('');
    
    const params = {};
    if (gradeId) params.grade = gradeId;
    if (sectionId) params.section = sectionId;
    if (searchQuery) params.search = searchQuery;

    try {
      const data = await studentService.list(params);
      setStudents(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load students list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter sections dropdown when grade changes
  useEffect(() => {
    if (sections.length > 0) {
      if (gradeId) {
        setFilteredSections(sections.filter(sec => sec.grade.toString() === gradeId));
      } else {
        setFilteredSections(sections);
      }
      setSectionId(''); // Reset section filter
    }
  }, [gradeId, sections]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  const handleDeleteStudent = async (id, name, studentIdStr) => {
    if (!window.confirm(`Are you sure you want to delete student '${name}' (${studentIdStr})? This will permanently delete all their face encodings and attendance history.`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await studentService.delete(id);
      setSuccess(`Student '${name}' deleted successfully.`);
      fetchStudents();
    } catch (err) {
      console.error(err);
      setError('Failed to delete student.');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Student Directory</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            List, search, and manage student registry files and facial profile attachments.
          </p>
        </div>
        {user.role === 'ADMIN' && (
          <Link to="/registration" className="btn btn-primary" style={{ gap: '8px' }}>
            <Plus size={16} />
            Register Student
          </Link>
        )}
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
          <AlertCircle size={18} />
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
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card card-gold" style={{ padding: '20px' }}>
        <form onSubmit={handleSearchSubmit} style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr repeat(auto-fit, minmax(140px, 1fr)) 100px',
          gap: '14px',
          alignItems: 'flex-end'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Search Student</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Name or Student ID" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
            </div>
          </div>

          {user.role === 'ADMIN' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Grade</label>
                <select value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
                  <option value="">All Grades</option>
                  {grades.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Section</label>
                <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                  <option value="">All Sections</option>
                  {filteredSections.map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.grade_name} - {sec.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {user.role === 'TEACHER' && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Assigned Class</label>
              <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                <option value="">All My Classes</option>
                {user.assigned_sections?.map(sec => (
                  <option key={sec.id} value={sec.id}>{sec.full_name}</option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', height: '38px' }}>
            Filter
          </button>
        </form>
      </div>

      {/* Students List Table */}
      <div className="card" style={{ padding: '0px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px' }}>Registered Students</h3>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
            Total Count: {students.length}
          </span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Photo</th>
                <th>Student ID</th>
                <th>Full Name</th>
                <th>Gender</th>
                <th>Date of Birth</th>
                <th>Grade & Section</th>
                <th>Face Encodings</th>
                {user.role === 'ADMIN' && <th style={{ width: '60px', textAlign: 'center' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={user.role === 'ADMIN' ? 8 : 7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                    {loading ? 'Retrieving records...' : 'No registered students found matching the filter criteria.'}
                  </td>
                </tr>
              ) : (
                students.map(student => (
                  <tr key={student.id}>
                    <td>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        backgroundColor: 'rgba(27, 54, 93, 0.05)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {student.photo_path ? (
                          <img 
                            src={`http://localhost:8000/media/${student.photo_path}`} 
                            alt="avatar"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}&backgroundColor=1b365d&textColor=d4af37`;
                            }}
                          />
                        ) : (
                          <img 
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}&backgroundColor=1b365d&textColor=d4af37`} 
                            alt="avatar" 
                          />
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: '600', fontSize: '13px' }}>{student.student_id}</td>
                    <td style={{ fontWeight: '600' }}>{student.full_name}</td>
                    <td>{student.gender === 'M' ? 'Male' : 'Female'}</td>
                    <td>{student.dob}</td>
                    <td style={{ fontWeight: '500' }}>{student.section_full}</td>
                    <td>
                      <span className="badge badge-success" style={{ gap: '4px' }}>
                        {student.encodings?.length || 0} Angles Ready
                      </span>
                    </td>
                    {user.role === 'ADMIN' && (
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteStudent(student.id, student.full_name, student.student_id)}
                          className="btn btn-secondary"
                          style={{ padding: '6px', color: 'var(--error)', border: 'none' }}
                          title="Delete Student"
                          disabled={loading}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Students;
