import React, { useState, useEffect } from 'react';
import { 
  FileText, Calendar, Filter, FileSpreadsheet, AlertCircle, 
  ArrowUpDown, Search, RefreshCw, CheckCircle, HelpCircle 
} from 'lucide-react';
import { studentService, attendanceService, reportService } from '../services/api';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';

const Reports = ({ user }) => {
  // Filters
  const [gradeId, setGradeId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)); // 14 days ago
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10)); // Today
  const [statusParam, setStatusParam] = useState('');
  
  // Lists
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [records, setRecords] = useState([]);
  const [studentStats, setStudentStats] = useState([]); // Per student attendance rates

  // Analytics Stats
  const [gradeChartData, setGradeChartData] = useState([]);
  const [sectionChartData, setSectionChartData] = useState([]);
  const [trendChartData, setTrendChartData] = useState([]);

  // UI States
  const [loading, setLoading] = useState(false);
  const [submittingOverride, setSubmittingOverride] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Initial Load of Grades and Sections
  useEffect(() => {
    const initializeFilters = async () => {
      try {
        const [gradesList, sectionsList] = await Promise.all([
          studentService.getGrades(),
          studentService.getSections()
        ]);
        setGrades(gradesList);
        setSections(sectionsList);
      } catch (err) {
        console.error(err);
        setError('Failed to load filter parameters.');
      }
    };
    initializeFilters();
  }, []);

  // 2. Filter Sections based on Grade
  useEffect(() => {
    if (sections.length > 0) {
      if (gradeId) {
        setFilteredSections(sections.filter(sec => sec.grade.toString() === gradeId));
      } else {
        setFilteredSections(sections);
      }
      setSectionId(''); // Reset section filter when grade changes
    }
  }, [gradeId, sections]);

  // 3. Fetch attendance logs and compile charts
  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    const params = {
      start_date: startDate,
      end_date: endDate,
    };
    if (gradeId) params.grade = gradeId;
    if (sectionId) params.section = sectionId;
    if (statusParam) params.status = statusParam;

    try {
      const data = await attendanceService.listRecords(params);
      setRecords(data);
      compileAnalytics(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch attendance logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (grades.length > 0 || sections.length > 0) {
      fetchReportData();
    }
  }, [grades, sections]);

  // 4. Compile Recharts structures from plain record data
  const compileAnalytics = (rawRecords) => {
    if (rawRecords.length === 0) {
      setGradeChartData([]);
      setSectionChartData([]);
      setTrendChartData([]);
      setStudentStats([]);
      return;
    }

    // A. Trend Chart Data (grouped by date)
    const dateGroups = {};
    rawRecords.forEach(rec => {
      const d = rec.date;
      if (!dateGroups[d]) dateGroups[d] = { present: 0, absent: 0 };
      if (rec.status === 'PRESENT') dateGroups[d].present++;
      if (rec.status === 'ABSENT') dateGroups[d].absent++;
    });

    const trend = Object.keys(dateGroups).sort().map(d => {
      const p = dateGroups[d].present;
      const a = dateGroups[d].absent;
      const total = p + a;
      const rate = total > 0 ? (p / total) * 100 : 0;
      return {
        date: d.slice(5), // MM-DD format
        Present: p,
        Absent: a,
        'Attendance Rate (%)': Math.round(rate)
      };
    });
    setTrendChartData(trend);

    // B. Grade overview comparison
    const gradeGroups = {};
    rawRecords.forEach(rec => {
      const gName = rec.student_details.grade_name || 'Unknown';
      if (!gradeGroups[gName]) gradeGroups[gName] = { present: 0, absent: 0 };
      if (rec.status === 'PRESENT') gradeGroups[gName].present++;
      if (rec.status === 'ABSENT') gradeGroups[gName].absent++;
    });

    const gData = Object.keys(gradeGroups).map(gName => {
      const p = gradeGroups[gName].present;
      const a = gradeGroups[gName].absent;
      const rate = (p + a) > 0 ? (p / (p + a)) * 100 : 0;
      return {
        name: gName,
        'Attendance %': Math.round(rate)
      };
    });
    setGradeChartData(gData);

    // C. Section comparison
    const sectionGroups = {};
    rawRecords.forEach(rec => {
      const sName = rec.student_details.section_name || 'Unknown';
      const gName = rec.student_details.grade_name || '';
      const fullSecName = gName ? `${gName.split(' ')[1]}${sName}` : sName; // e.g. "9A"
      if (!sectionGroups[fullSecName]) sectionGroups[fullSecName] = { present: 0, absent: 0 };
      if (rec.status === 'PRESENT') sectionGroups[fullSecName].present++;
      if (rec.status === 'ABSENT') sectionGroups[fullSecName].absent++;
    });

    const sData = Object.keys(sectionGroups).map(sName => {
      const p = sectionGroups[sName].present;
      const a = sectionGroups[sName].absent;
      const rate = (p + a) > 0 ? (p / (p + a)) * 100 : 0;
      return {
        name: sName,
        'Attendance %': Math.round(rate)
      };
    });
    setSectionChartData(sData);

    // D. Per-Student History Rates
    const studentGroups = {};
    rawRecords.forEach(rec => {
      const sId = rec.student_details.student_id;
      if (!studentGroups[sId]) {
        studentGroups[sId] = {
          name: rec.student_details.full_name,
          class: `${rec.student_details.grade_name} - ${rec.student_details.section_name}`,
          present: 0,
          absent: 0
        };
      }
      if (rec.status === 'PRESENT') studentGroups[sId].present++;
      if (rec.status === 'ABSENT') studentGroups[sId].absent++;
    });

    const sStats = Object.keys(studentGroups).map(sId => {
      const p = studentGroups[sId].present;
      const a = studentGroups[sId].absent;
      const total = p + a;
      const rate = total > 0 ? (p / total) * 100 : 0;
      return {
        student_id: sId,
        full_name: studentGroups[sId].name,
        class_name: studentGroups[sId].class,
        present: p,
        absent: a,
        rate: Math.round(rate)
      };
    }).sort((x, y) => x.rate - y.rate); // Sort ascending (worst attendance first)
    setStudentStats(sStats);
  };

  // 5. Excel download trigger
  const handleDownloadExcel = async () => {
    const params = { start_date: startDate, end_date: endDate };
    if (gradeId) params.grade = gradeId;
    if (sectionId) params.section = sectionId;
    if (statusParam) params.status = statusParam;
    
    try {
      setSuccess('Generating Excel spreadsheet download...');
      await reportService.downloadExcel(params);
    } catch (err) {
      console.error(err);
      setError('Excel generation failed.');
    }
  };

  // 6. PDF download trigger
  const handleDownloadPdf = async () => {
    const params = { start_date: startDate, end_date: endDate };
    if (gradeId) params.grade = gradeId;
    if (sectionId) params.section = sectionId;
    if (statusParam) params.status = statusParam;

    try {
      setSuccess('Generating PDF report download...');
      await reportService.downloadPdf(params);
    } catch (err) {
      console.error(err);
      setError('PDF generation failed.');
    }
  };

  // 7. Toggle Present/Absent manually (for admins and assigned teachers)
  const handleOverrideStatus = async (recordId, studentDbId, currentDate, currentStatus) => {
    const nextStatus = currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    setSubmittingOverride(recordId);
    setError('');
    
    try {
      await attendanceService.markManual(studentDbId, nextStatus, currentDate);
      setSuccess(`Status overridden to '${nextStatus}' successfully.`);
      fetchReportData(); // Reload list
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to override attendance record.');
    } finally {
      setSubmittingOverride(null);
    }
  };

  const totalPresent = records.filter(r => r.status === 'PRESENT').count ? records.filter(r => r.status === 'PRESENT').length : records.filter(r => r.status === 'PRESENT').length;
  const totalAbsent = records.length - totalPresent;
  const averageRate = records.length > 0 ? Math.round((totalPresent / records.length) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Attendance Analytics & Reports</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Filter visual trends, analyze student logs, and download print-ready sheets.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleDownloadExcel} className="btn btn-secondary" style={{ gap: '8px', color: '#16a34a', borderColor: '#16a34a' }}>
            <FileSpreadsheet size={16} />
            Excel Export
          </button>
          <button onClick={handleDownloadPdf} className="btn btn-primary" style={{ gap: '8px' }}>
            <FileText size={16} />
            PDF Export
          </button>
        </div>
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

      {/* Filter panel */}
      <div className="card card-gold" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} style={{ color: 'var(--accent-dark)' }} />
          Filter Parameters
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '14px'
        }}>
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
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>My Sections</label>
              <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                <option value="">All My Classes</option>
                {user.assigned_sections?.map(sec => (
                  <option key={sec.id} value={sec.id}>{sec.full_name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Status</label>
            <select value={statusParam} onChange={(e) => setStatusParam(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={fetchReportData} className="btn btn-primary" disabled={loading} style={{ width: '100%', gap: '8px' }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Query Logs
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px'
      }}>
        <div className="card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>TOTAL LOGS</span>
          <h3 style={{ fontSize: '22px', fontWeight: '800', marginTop: '2px' }}>{records.length}</h3>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: '3px solid var(--success)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>PRESENT SUM</span>
          <h3 style={{ fontSize: '22px', fontWeight: '800', marginTop: '2px', color: 'var(--success)' }}>{totalPresent}</h3>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: '3px solid var(--error)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>ABSENT SUM</span>
          <h3 style={{ fontSize: '22px', fontWeight: '800', marginTop: '2px', color: 'var(--error)' }}>{totalAbsent}</h3>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: '3px solid var(--accent)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>ATTENDANCE RATE</span>
          <h3 style={{ fontSize: '22px', fontWeight: '800', marginTop: '2px', color: 'var(--accent-dark)' }}>{averageRate}%</h3>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px'
      }}>
        {/* Chart A: Daily/Weekly Trend */}
        <div className="card" style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '14px' }}>Daily Attendance Trend</h3>
          <div style={{ flexGrow: 1, width: '100%', minHeight: 0 }}>
            {trendChartData.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>No data to render.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={10} />
                  <YAxis domain={[0, 100]} stroke="var(--text-secondary)" fontSize={10} />
                  <Tooltip />
                  <Legend fontSize={10} />
                  <Line type="monotone" dataKey="Attendance Rate (%)" stroke="var(--accent-dark)" strokeWidth={2.5} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart B: Section Comparison */}
        <div className="card" style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '14px' }}>Section Attendance comparison</h3>
          <div style={{ flexGrow: 1, width: '100%', minHeight: 0 }}>
            {sectionChartData.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>No data to render.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} />
                  <YAxis domain={[0, 100]} stroke="var(--text-secondary)" fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="Attendance %" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
        {/* Chart C: Grade Overview (Only relevant for Admin) */}
        {user.role === 'ADMIN' && (
          <div className="card" style={{ height: '320px', display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: '15px', marginBottom: '14px' }}>Grade-Level Average Attendance Rate</h3>
            <div style={{ flexGrow: 1, width: '100%', minHeight: 0 }}>
              {gradeChartData.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>No data to render.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} />
                    <YAxis domain={[0, 100]} stroke="var(--text-secondary)" fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="Attendance %" fill="var(--accent)" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Grid: Student Leaderboard vs Detailed logs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px'
      }}>
        
        {/* Student Attendance Summary Table (worst rates ranked) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', maxHeight: '420px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Per-Student Attendance Summary</h3>
          <div className="table-container" style={{ flexGrow: 1 }}>
            <table>
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Full Name</th>
                  <th>Class</th>
                  <th style={{ textAlign: 'right' }}>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {studentStats.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No student summaries compiled.</td>
                  </tr>
                ) : (
                  studentStats.map(student => (
                    <tr key={student.student_id}>
                      <td style={{ fontSize: '12px' }}>{student.student_id}</td>
                      <td style={{ fontWeight: '600' }}>{student.full_name}</td>
                      <td>{student.class_name}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: student.rate >= 90 ? 'var(--success)' : student.rate >= 75 ? 'var(--warning)' : 'var(--error)' }}>
                        {student.rate}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Attendance Records Table with Override options */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', maxHeight: '420px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Detailed Scans Log ({records.length})</h3>
          <div className="table-container" style={{ flexGrow: 1 }}>
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Override</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No scans match filters.</td>
                  </tr>
                ) : (
                  records.map(rec => (
                    <tr key={rec.id}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{rec.student_details.full_name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>ID: {rec.student_details.student_id} | {rec.student_details.grade_name}{rec.student_details.section_name}</div>
                      </td>
                      <td>{rec.date}</td>
                      <td>
                        <span className={`badge badge-${rec.status === 'PRESENT' ? 'success' : 'danger'}`}>
                          {rec.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {rec.timestamp ? new Date(rec.timestamp).toLocaleTimeString() : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleOverrideStatus(rec.id, rec.student, rec.date, rec.status)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '10px', height: '24px' }}
                          disabled={submittingOverride === rec.id}
                        >
                          {submittingOverride === rec.id ? 'Saving...' : 'Toggle'}
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

    </div>
  );
};

export default Reports;
