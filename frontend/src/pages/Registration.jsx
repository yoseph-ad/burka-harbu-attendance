import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, RotateCcw, AlertCircle, Info, ArrowLeft, Loader2 } from 'lucide-react';
import { studentService } from '../services/api';

const Registration = () => {
  const navigate = useNavigate();
  
  // Form fields
  const [studentId, setStudentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('M');
  const [dob, setDob] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  // Dropdown lists
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);

  // Webcam states
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  
  // Angle captures
  const angles = [
    { id: 'front', label: 'Front Angle' },
    { id: 'left', label: 'Left Profile' },
    { id: 'right', label: 'Right Profile' },
    { id: 'up', label: 'Slightly Up' },
    { id: 'down', label: 'Slightly Down' },
    { id: 'tilt', label: 'Slight Tilt' }
  ];

  const [images, setImages] = useState({
    front: null,
    left: null,
    right: null,
    up: null,
    down: null,
    tilt: null
  });

  const [activeAngle, setActiveAngle] = useState('front');

  // Submit states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Load Grades and Sections
  useEffect(() => {
    const loadSchoolStructure = async () => {
      try {
        const [gradesList, sectionsList] = await Promise.all([
          studentService.getGrades(),
          studentService.getSections()
        ]);
        setGrades(gradesList);
        setSections(sectionsList);
        
        if (gradesList.length > 0) {
          setSelectedGrade(gradesList[0].id.toString());
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load school structure details.');
      }
    };
    loadSchoolStructure();
  }, []);

  // Filter sections when grade changes
  useEffect(() => {
    if (selectedGrade) {
      const filtered = sections.filter(sec => sec.grade.toString() === selectedGrade);
      setFilteredSections(filtered);
      if (filtered.length > 0) {
        setSelectedSection(filtered[0].id.toString());
      } else {
        setSelectedSection('');
      }
    }
  }, [selectedGrade, sections]);

  // Start Webcam
  const startCamera = async () => {
    setCameraError('');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error(err);
      setCameraError('Webcam access denied or unavailable. You can use the simulator below.');
      setCameraActive(false);
    }
  };

  // Stop Webcam
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Take Snapshot
  const capturePhoto = () => {
    if (!cameraActive || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get base64 data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setImages(prev => ({
      ...prev,
      [activeAngle]: dataUrl
    }));

    // Auto-advance to next empty angle
    const angleIndex = angles.findIndex(a => a.id === activeAngle);
    if (angleIndex < angles.length - 1) {
      setActiveAngle(angles[angleIndex + 1].id);
    }
  };

  // Mock Simulator for headless environments
  const simulatePhoto = () => {
    // Generate a simple color box canvas to simulate a face
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Draw background
    context.fillStyle = '#1b365d';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw "face" shape
    context.fillStyle = '#d4af37';
    context.beginPath();
    context.arc(canvas.width / 2, canvas.height / 2 - 20, 90, 0, Math.PI * 2);
    context.fill();

    // Draw text indicator
    context.fillStyle = '#ffffff';
    context.font = 'bold 20px sans-serif';
    context.textAlign = 'center';
    context.fillText(`Mock Capture: ${activeAngle.toUpperCase()}`, canvas.width / 2, canvas.height / 2 + 100);

    const dataUrl = canvas.toDataURL('image/jpeg');
    setImages(prev => ({
      ...prev,
      [activeAngle]: dataUrl
    }));

    // Auto-advance
    const angleIndex = angles.findIndex(a => a.id === activeAngle);
    if (angleIndex < angles.length - 1) {
      setActiveAngle(angles[angleIndex + 1].id);
    }
  };

  const simulateAllPhotos = () => {
    const simulated = {};
    angles.forEach(angle => {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      context.fillStyle = '#1b365d';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#d4af37';
      context.beginPath();
      context.arc(canvas.width / 2, canvas.height / 2 - 20, 90, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffffff';
      context.font = 'bold 20px sans-serif';
      context.textAlign = 'center';
      context.fillText(`Mock Capture: ${angle.id.toUpperCase()}`, canvas.width / 2, canvas.height / 2 + 100);
      simulated[angle.id] = canvas.toDataURL('image/jpeg');
    });
    setImages(simulated);
  };

  const clearAngle = (angleId) => {
    setImages(prev => ({
      ...prev,
      [angleId]: null
    }));
    setActiveAngle(angleId);
  };

  const isFormValid = () => {
    return (
      studentId &&
      fullName &&
      gender &&
      dob &&
      selectedSection &&
      Object.values(images).every(img => img !== null)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) {
      setError('Please fill in all student details and capture all 6 face angles.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      student_id: studentId,
      full_name: fullName,
      gender: gender,
      dob: dob,
      section: parseInt(selectedSection),
      images: images
    };

    try {
      await studentService.register(payload);
      setSuccess(true);
      stopCamera();
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error(err);
      // Clean up specific field error formatting from Django rest
      let errMsg = 'Failed to register student.';
      if (err.response?.data) {
        if (typeof err.response.data === 'object') {
          const keys = Object.keys(err.response.data);
          if (keys.length > 0) {
            // Check if there is an image processing failure
            const firstKey = keys[0];
            const val = err.response.data[firstKey];
            errMsg = Array.isArray(val) ? val[0] : `${firstKey}: ${val}`;
          }
        } else {
          errMsg = err.response.data;
        }
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Hidden Canvas for captures */}
      <canvas ref={canvasRef} width="640" height="480" style={{ display: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ padding: '8px' }}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Register Student Face Profile</h1>
      </div>

      {success ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', borderLeft: '4px solid var(--success)' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--success-light)',
            color: 'var(--success)',
            marginBottom: '16px'
          }}>
            <Check size={32} />
          </div>
          <h2 style={{ color: 'var(--success)', fontSize: '24px', marginBottom: '8px' }}>Registration Successful!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>The AI face encodings have been securely stored in the database. Redirecting...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          
          {/* LEFT PANEL: Student Info Form */}
          <div className="card card-gold" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              Student Information
            </h3>

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

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Student ID</label>
              <input 
                type="text" 
                placeholder="e.g. BH-0091" 
                value={studentId} 
                onChange={(e) => setStudentId(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Full Name</label>
              <input 
                type="text" 
                placeholder="First Middle Last" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Date of Birth</label>
                <input 
                  type="date" 
                  value={dob} 
                  onChange={(e) => setDob(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Grade</label>
                <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
                  {grades.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Section</label>
                <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} required>
                  <option value="">Select Section</option>
                  {filteredSections.map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !isFormValid()}
                style={{ width: '100%', height: '46px', gap: '10px' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Processing Face Encodings...
                  </>
                ) : 'Submit Registration'}
              </button>
              
              {!isFormValid() && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '11px', textAlign: 'center', marginTop: '10px' }}>
                  Please complete the form and capture all 6 face angles to register.
                </p>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Webcam Face Capture */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              Face Angle Captures
            </h3>

            {/* Live Camera Viewport */}
            <div style={{
              width: '100%',
              aspectRatio: '4/3',
              backgroundColor: '#000000',
              borderRadius: 'var(--radius-md)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {cameraActive ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div className="scan-laser" />
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    backgroundColor: 'rgba(27, 54, 93, 0.85)',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: '600',
                    border: '1px solid var(--accent)'
                  }}>
                    Live Feed
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                  <Camera size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <p style={{ fontSize: '14px' }}>Camera is disconnected.</p>
                  <button type="button" onClick={startCamera} className="btn btn-secondary" style={{ marginTop: '12px', padding: '6px 14px' }}>
                    Re-enable Camera
                  </button>
                </div>
              )}
            </div>

            {/* Guided Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-accent" 
                onClick={cameraActive ? capturePhoto : simulatePhoto}
                style={{ flexGrow: 1, height: '42px', gap: '8px' }}
              >
                <Camera size={18} />
                Capture {angles.find(a => a.id === activeAngle)?.label}
              </button>
              {!cameraActive && (
                <button type="button" className="btn btn-secondary" onClick={simulateAllPhotos} title="Simulate All Captures">
                  Simulate All
                </button>
              )}
            </div>

            {cameraError && (
              <p style={{ fontSize: '11px', color: 'var(--error)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <Info size={12} />
                {cameraError}
              </p>
            )}

            {/* Angle Preview Thumbnails Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '8px',
              marginTop: '10px'
            }}>
              {angles.map((angle) => {
                const imgData = images[angle.id];
                const isActive = activeAngle === angle.id;
                
                return (
                  <div 
                    key={angle.id}
                    onClick={() => setActiveAngle(angle.id)}
                    style={{
                      aspectRatio: '1',
                      border: isActive ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      position: 'relative',
                      cursor: 'pointer',
                      backgroundColor: 'rgba(27, 54, 93, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {imgData ? (
                      <>
                        <img 
                          src={imgData} 
                          alt={angle.id} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            clearAngle(angle.id);
                          }}
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            backgroundColor: 'rgba(239, 68, 68, 0.85)',
                            color: '#ffffff',
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                          title="Clear angle capture"
                        >
                          ×
                        </div>
                      </>
                    ) : (
                      <span style={{ fontSize: '9px', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: '500', padding: '2px' }}>
                        {angle.id.toUpperCase()}
                      </span>
                    )}

                    {imgData && (
                      <div style={{
                        position: 'absolute',
                        bottom: '2px',
                        left: '2px',
                        backgroundColor: 'rgba(16, 185, 129, 0.85)',
                        color: '#ffffff',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '8px'
                      }}>
                        ✓
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{
              backgroundColor: 'rgba(212, 175, 55, 0.05)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              display: 'flex',
              gap: '8px',
              marginTop: '10px'
            }}>
              <Info size={16} style={{ color: 'var(--accent-dark)', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: '600', color: 'var(--primary)' }}>Multi-Angle Guidelines</p>
                <p>Ensure the student changes angles to capture Frontal, left/right profile, and slight up/down. This ensures dlib can recognize them under different lighting and positions.</p>
              </div>
            </div>

          </div>
          
        </form>
      )}

    </div>
  );
};

export default Registration;
