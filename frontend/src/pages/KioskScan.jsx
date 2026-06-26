import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle, XCircle, AlertTriangle, ArrowLeft, Shield, Loader2 } from 'lucide-react';
import { attendanceService, studentService } from '../services/api';

const KioskScan = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const loopRef = useRef(null);

  // UI Scanning States
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanningStatus, setScanningStatus] = useState('READY'); // READY, SCANNING, SUCCESS, UNKNOWN, ALREADY_MARKED
  const [scanResult, setScanResult] = useState(null);
  const [studentsForSimulation, setStudentsForSimulation] = useState([]);
  const [showSimPanel, setShowSimPanel] = useState(false);

  // Web Audio Synth Chimes
  const playSound = (type) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, ctx.currentTime); // E5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime); // Low buzz
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4 double chime
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn('Audio synthesis blocked by browser security policy until interaction.', e);
    }
  };

  // Start Kiosk Camera
  const startCamera = async () => {
    setCameraError('');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 800, height: 600, facingMode: 'user' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        setScanningStatus('READY');
        
        // Start continuous frame grabbing loop
        startScanningLoop();
      }
    } catch (err) {
      console.error(err);
      setCameraError('Webcam failed to open. Check permissions or use Simulation panel.');
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Core Frame Grabbing loop (every 1.5 seconds)
  const startScanningLoop = () => {
    if (loopRef.current) clearInterval(loopRef.current);

    loopRef.current = setInterval(async () => {
      // Don't scan if we are displaying a feedback freeze state
      if (['SUCCESS', 'UNKNOWN', 'ALREADY_MARKED', 'SCANNING'].includes(scanningStatus)) {
        return;
      }

      grabAndPostFrame();
    }, 1500);
  };

  const grabAndPostFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setScanningStatus('SCANNING');
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Render current frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Frame = canvas.toDataURL('image/jpeg', 0.8);

    try {
      const response = await attendanceService.scan(base64Frame);
      handleScanResponse(response);
    } catch (err) {
      console.error(err);
      setScanningStatus('READY'); // Reset on network error so it keeps trying
    }
  };

  // Process matching responses
  const handleScanResponse = (data) => {
    if (data.status === 'SUCCESS' || data.status === 'SUCCESSFUL') {
      playSound('success');
      setScanningStatus('SUCCESS');
      setScanResult(data);
      
      // Freeze display for 3.5 seconds, then return to scanning
      setTimeout(() => {
        setScanningStatus('READY');
        setScanResult(null);
      }, 3500);

    } else if (data.status === 'ALREADY_MARKED' || data.status === 'ALREADY_PRESENT') {
      playSound('warning');
      setScanningStatus('ALREADY_MARKED');
      setScanResult(data);
      
      setTimeout(() => {
        setScanningStatus('READY');
        setScanResult(null);
      }, 3500);

    } else if (data.status === 'UNKNOWN') {
      playSound('error');
      setScanningStatus('UNKNOWN');
      setScanResult({ message: 'Unknown Student / Not Registered' });
      
      // Freeze error for 2.5 seconds
      setTimeout(() => {
        setScanningStatus('READY');
        setScanResult(null);
      }, 2500);

    } else {
      // NO_FACE detected (keep scanning silently)
      setScanningStatus('READY');
    }
  };

  // Seeding simulation options (gives teacher/admin clickable buttons to simulate scans)
  useEffect(() => {
    const getStudents = async () => {
      try {
        const list = await studentService.list();
        setStudentsForSimulation(list.slice(0, 8)); // Limit to first 8 students for convenience
      } catch (err) {
        console.error(err);
      }
    };
    startCamera();
    getStudents();

    return () => {
      stopCamera();
    };
  }, []);

  // Simulator helper: triggers attendance scan for a student without base64 camera feed
  const simulateScanForStudent = async (student) => {
    // Generate simulated matching data
    setScanningStatus('SCANNING');
    try {
      // In mock face service mode, sending a mockup base64 will match student 
      // if we trigger it directly, or we can send the mock frame and let the service deal with it.
      // But since we want to test client side UI, we can mock the server reply directly for testing!
      // This is a bulletproof development technique.
      
      const todayStr = new Date().toISOString();
      const mockReply = {
        status: 'SUCCESSFUL',
        message: `Welcome, ${student.full_name}! Attendance recorded.`,
        student: {
          full_name: student.full_name,
          student_id: student.student_id,
          grade: student.grade_name,
          section: student.section_name,
          photo_path: student.photo_path
        },
        timestamp: todayStr
      };
      
      // Let's call the real API scanning route but mock if it fails or returns UNKNOWN,
      // or simply simulate the visual flash to showcase the design!
      // Let's do the visual simulation!
      handleScanResponse(mockReply);
    } catch (err) {
      console.error(err);
    }
  };

  const simulateUnknownScan = () => {
    handleScanResponse({ status: 'UNKNOWN' });
  };

  // Compute borders based on scanning outcome
  let overlayColor = 'rgba(212, 175, 55, 0.2)'; // Gold scan line
  let borderFlash = '';
  
  if (scanningStatus === 'SUCCESS') {
    overlayColor = 'rgba(16, 185, 129, 0.4)';
    borderFlash = 'scan-success-flash';
  } else if (scanningStatus === 'UNKNOWN') {
    overlayColor = 'rgba(239, 68, 68, 0.4)';
    borderFlash = 'scan-error-flash';
  } else if (scanningStatus === 'ALREADY_MARKED') {
    overlayColor = 'rgba(245, 158, 11, 0.4)';
    borderFlash = 'scan-success-flash';
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0b1329',
      color: '#ffffff',
      zIndex: 999,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, sans-serif'
    }}>
      
      {/* Hidden canvas for grabs */}
      <canvas ref={canvasRef} width="640" height="480" style={{ display: 'none' }} />

      {/* Header bar */}
      <div style={{
        padding: '16px 24px',
        backgroundColor: '#070c19',
        borderBottom: '1px solid #1a2a4a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={() => { stopCamera(); navigate('/dashboard'); }} 
            className="btn btn-secondary" 
            style={{ padding: '8px', color: '#ffffff', borderColor: '#223762' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={24} style={{ color: 'var(--accent)' }} />
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Entrance Attendance Terminal</h2>
              <p style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Burka Harbu Secondary School</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setShowSimPanel(!showSimPanel)} 
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '11px', color: '#ffffff', borderColor: '#223762' }}
          >
            {showSimPanel ? 'Hide Simulator' : 'Test Simulation'}
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#111e38',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '12px',
            border: '1px solid #223762'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: cameraActive ? 'var(--success)' : 'var(--error)'
            }} />
            <span>Kiosk mode: {cameraActive ? 'ACTIVE' : 'OFFLINE'}</span>
          </div>
        </div>
      </div>

      {/* Main Kiosk Content */}
      <div style={{
        flexGrow: 1,
        display: 'flex',
        position: 'relative',
        overflow: 'hidden'
      }}>
        
        {/* Left Side: Video Scanning Frame */}
        <div style={{
          width: showSimPanel ? '65%' : '100%',
          height: '100%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#070c19',
          padding: '24px',
          transition: 'width 0.3s ease'
        }}>
          
          <div className={borderFlash} style={{
            position: 'relative',
            width: '100%',
            maxWidth: '680px',
            aspectRatio: '4/3',
            backgroundColor: '#000000',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '3px solid #223762',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover', 
                transform: 'scaleX(-1)',
                display: cameraActive ? 'block' : 'none'
              }}
            />
            {cameraActive ? (
              <>
                {/* Laser Overlay animation */}
                {scanningStatus === 'SCANNING' && (
                  <>
                    <div className="scan-laser" />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(212, 175, 55, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: 'var(--accent)',
                      textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}>
                      SCANNING FACE...
                    </div>
                  </>
                )}

                {/* Status-specific overlays */}
                {['SUCCESS', 'ALREADY_MARKED', 'UNKNOWN'].includes(scanningStatus) && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: overlayColor,
                    zIndex: 20,
                    transition: 'all 0.3s ease'
                  }} />
                )}
              </>
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                padding: '20px'
              }}>
                <Camera size={64} style={{ marginBottom: '16px', opacity: 0.3 }} />
                <p>{cameraError || 'Loading kiosk scanner...'}</p>
                <button onClick={startCamera} className="btn btn-accent" style={{ marginTop: '16px' }}>
                  Open Webcam
                </button>
              </div>
            )}

            {/* Target Face Guide Reticle */}
            {cameraActive && scanningStatus === 'READY' && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '280px',
                height: '340px',
                border: '2px dashed rgba(212, 175, 55, 0.6)',
                borderRadius: '140px / 170px',
                pointerEvents: 'none',
                boxShadow: '0 0 0 9999px rgba(7, 12, 25, 0.4)'
              }}>
                <span style={{
                  position: 'absolute',
                  bottom: '-35px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(7, 12, 25, 0.85)',
                  color: 'var(--accent)',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 10px',
                  borderRadius: '9999px',
                  whiteSpace: 'nowrap'
                }}>
                  ALIGN FACE IN OVAL
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Scan Status & Result Panel */}
        <div style={{
          width: showSimPanel ? '35%' : '100%',
          maxWidth: showSimPanel ? 'none' : '440px',
          height: '100%',
          borderLeft: '1px solid #1a2a4a',
          backgroundColor: '#111e38',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          transition: 'width 0.3s ease'
        }}>
          
          {/* Default Ready state */}
          {scanningStatus === 'READY' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: '3px solid var(--accent)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
                marginBottom: '20px',
                animation: 'pulse-scan-green 2s infinite'
              }}>
                <Camera size={36} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Ready to Scan</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
                Please look directly into the camera to log your daily attendance.
              </p>
            </div>
          )}

          {/* Scanning frame grab state */}
          {scanningStatus === 'SCANNING' && (
            <div style={{ textAlign: 'center' }}>
              <div className="scan-success-flash" style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: '3px solid var(--accent)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
                marginBottom: '20px'
              }}>
                <Loader2 className="animate-spin" size={36} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Matching Face...</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
                Running AI comparison against school registry.
              </p>
            </div>
          )}

          {/* SUCCESS State: Mark Registered Student */}
          {scanningStatus === 'SUCCESS' && scanResult && (
            <div style={{ textAlign: 'center', animation: 'scaleUp 0.3s ease' }}>
              <div style={{ color: 'var(--success)', marginBottom: '16px' }}>
                <CheckCircle size={64} style={{ display: 'inline' }} />
              </div>
              
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--success)' }}>Scan Verified!</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Attendance recorded successfully.
              </p>

              {/* Student Photo Card */}
              <div style={{
                backgroundColor: '#070c19',
                border: '1px solid var(--success)',
                borderRadius: '12px',
                padding: '20px',
                marginTop: '24px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#111e38',
                  border: '1px solid #223762',
                  flexShrink: 0
                }}>
                  {scanResult.student.photo_path ? (
                    <img 
                      src={`http://localhost:8000/media/${scanResult.student.photo_path}`} 
                      alt="Student" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        // Fallback image generator
                        e.target.onerror = null;
                        e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${scanResult.student.full_name}&backgroundColor=1b365d&textColor=d4af37`;
                      }}
                    />
                  ) : (
                    <img 
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${scanResult.student.full_name}&backgroundColor=1b365d&textColor=d4af37`} 
                      alt="Student" 
                    />
                  )}
                </div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '700' }}>{scanResult.student.full_name}</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>ID: {scanResult.student.student_id}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Class: {scanResult.student.grade} - {scanResult.student.section}</p>
                  <p style={{ fontSize: '10px', color: 'var(--success)', fontWeight: '600', marginTop: '6px' }}>
                    Present: {new Date(scanResult.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ALREADY MARKED State: Already checked today */}
          {scanningStatus === 'ALREADY_MARKED' && scanResult && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--warning)', marginBottom: '16px' }}>
                <CheckCircle size={64} style={{ display: 'inline' }} />
              </div>
              
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--warning)' }}>Already Logged</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                You have already checked in today.
              </p>

              {/* Student Photo Card */}
              <div style={{
                backgroundColor: '#070c19',
                border: '1px solid var(--warning)',
                borderRadius: '12px',
                padding: '20px',
                marginTop: '24px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#111e38',
                  border: '1px solid #223762',
                  flexShrink: 0
                }}>
                  {scanResult.student.photo_path ? (
                    <img 
                      src={`http://localhost:8000/media/${scanResult.student.photo_path}`} 
                      alt="Student" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${scanResult.student.full_name}&backgroundColor=1b365d&textColor=d4af37`;
                      }}
                    />
                  ) : (
                    <img 
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${scanResult.student.full_name}&backgroundColor=1b365d&textColor=d4af37`} 
                      alt="Student" 
                    />
                  )}
                </div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '700' }}>{scanResult.student.full_name}</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>ID: {scanResult.student.student_id}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Class: {scanResult.student.grade} - {scanResult.student.section}</p>
                  <p style={{ fontSize: '10px', color: 'var(--warning)', fontWeight: '600', marginTop: '6px' }}>
                    Welcome back! Enjoy your day.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* UNKNOWN Student warning state */}
          {scanningStatus === 'UNKNOWN' && (
            <div style={{ textAlign: 'center', animation: 'shake 0.3s ease' }}>
              <div style={{ color: 'var(--error)', marginBottom: '16px' }}>
                <XCircle size={64} style={{ display: 'inline' }} />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--error)' }}>Match Failed!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
                Face not recognized. Please scan again or register in the Admin Dashboard if you are new.
              </p>
            </div>
          )}

        </div>

        {/* RIGHT DRAWER: Simulation Test Panel */}
        {showSimPanel && (
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '35%',
            height: '100%',
            backgroundColor: '#070c19',
            borderLeft: '1px solid #1a2a4a',
            padding: '24px',
            overflowY: 'auto',
            zIndex: 100
          }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--accent)' }}>Development Simulator</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Since you might not have registered students or camera captures in your current browser, click a student below to simulate their face scan:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {studentsForSimulation.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px', border: '1px dashed #223762' }}>
                  No students in DB. Seed first using the '/setup_school' command.
                </div>
              ) : (
                studentsForSimulation.map(student => (
                  <button
                    key={student.student_id}
                    onClick={() => simulateScanForStudent(student)}
                    className="btn btn-secondary"
                    style={{
                      justifyContent: 'flex-start',
                      padding: '10px 14px',
                      textAlign: 'left',
                      borderColor: '#223762',
                      color: '#ffffff'
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '13px' }}>{student.full_name}</p>
                      <p style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>ID: {student.student_id} | {student.grade_name}{student.section_name}</p>
                    </div>
                  </button>
                ))
              )}

              <div style={{ borderTop: '1px solid #1a2a4a', marginTop: '14px', paddingTop: '14px' }}>
                <button 
                  onClick={simulateUnknownScan} 
                  className="btn btn-danger"
                  style={{ width: '100%', height: '38px', fontSize: '12px' }}
                >
                  Simulate Unknown Student Scan
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default KioskScan;
