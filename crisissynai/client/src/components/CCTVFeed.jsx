import React, { useState, useEffect, useRef } from 'react';

export default function CCTVFeed({ onDetection }) {
  const canvasRef = useRef(null);
  const [detections, setDetections] = useState([]);
  const [cameraId, setCameraId] = useState('CAM-01');
  const frameRef = useRef(0);

  // Simulated CCTV feed — draws animated scene on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const CAMERAS = {
      'CAM-01': { label: 'Lobby Main', color: '#1a1a2e' },
      'CAM-02': { label: 'Kitchen', color: '#1a1a1a' },
      'CAM-03': { label: 'Stairwell A', color: '#0f0f23' },
      'CAM-04': { label: 'Corridor F1', color: '#121220' },
    };

    // Simulated people positions
    const people = [
      { x: 80, y: 180, vx: 0.3, vy: 0, w: 20, h: 40, label: 'Person' },
      { x: 200, y: 160, vx: -0.2, vy: 0, w: 20, h: 40, label: 'Person' },
      { x: 320, y: 190, vx: 0.1, vy: 0, w: 20, h: 40, label: 'Person' },
      { x: 140, y: 170, vx: 0.4, vy: 0, w: 20, h: 40, label: 'Person' },
      { x: 260, y: 200, vx: -0.15, vy: 0, w: 20, h: 40, label: 'Person' },
    ];

    const draw = () => {
      frameRef.current += 1;
      const cam = CAMERAS[cameraId];
      
      // Background
      ctx.fillStyle = cam.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid lines (surveillance aesthetic)
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      }
      for (let j = 0; j < canvas.height; j += 30) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke();
      }

      // Floor / room structure
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 50, canvas.width - 40, canvas.height - 70);
      
      // Pillars
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(100, 50, 10, canvas.height - 70);
      ctx.fillRect(250, 50, 10, canvas.height - 70);

      // Move and draw people
      people.forEach((p, i) => {
        p.x += p.vx;
        if (p.x > canvas.width - 40 || p.x < 30) p.vx *= -1;

        // Body (simple stick figure / rectangle)
        ctx.fillStyle = 'rgba(0, 255, 100, 0.6)';
        ctx.fillRect(p.x, p.y, p.w, p.h);

        // Head
        ctx.beginPath();
        ctx.arc(p.x + p.w / 2, p.y - 5, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 100, 0.6)';
        ctx.fill();
      });

      // AI Detection Boxes (appear periodically)
      const showDetection = frameRef.current % 180 > 120;
      if (showDetection && detections.length > 0) {
        detections.forEach(d => {
          // Bounding box
          ctx.strokeStyle = d.type === 'FALL' ? '#ef4444' : '#f59e0b';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 3]);
          ctx.strokeRect(d.x, d.y, d.w, d.h);
          ctx.setLineDash([]);

          // Label
          ctx.fillStyle = d.type === 'FALL' ? '#ef4444' : '#f59e0b';
          ctx.font = 'bold 10px monospace';
          const conf = (d.confidence * 100).toFixed(0);
          ctx.fillText(`${d.label} ${conf}%`, d.x, d.y - 4);
        });
      }

      // Timestamp overlay
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, 25);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px monospace';
      const now = new Date();
      const ts = now.toLocaleTimeString();
      ctx.fillText(`${cam.label} | ${ts} | REC`, 8, 16);

      // REC dot (blinking)
      if (frameRef.current % 60 < 40) {
        ctx.beginPath();
        ctx.arc(canvas.width - 15, 13, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
      }

      // FPS counter
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '9px monospace';
      ctx.fillText('30 FPS | H.264', canvas.width - 90, canvas.height - 5);

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [cameraId, detections]);

  // Simulate AI detection events
  const triggerCrowdDetection = () => {
    const newDetections = [
      { x: 60, y: 150, w: 120, h: 80, type: 'CROWD', label: 'CROWD RUSH', confidence: 0.87 },
      { x: 200, y: 140, w: 100, h: 90, type: 'CROWD', label: 'ANOMALY', confidence: 0.72 },
    ];
    setDetections(newDetections);
    if (onDetection) onDetection('VISION_CROWD', 0.87);
    setTimeout(() => setDetections([]), 8000);
  };

  const triggerFallDetection = () => {
    const newDetections = [
      { x: 180, y: 170, w: 60, h: 50, type: 'FALL', label: 'PERSON FALLEN', confidence: 0.92 },
    ];
    setDetections(newDetections);
    if (onDetection) onDetection('VISION_FALL', 0.92);
    setTimeout(() => setDetections([]), 8000);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>CCTV Surveillance</span>
        <div style={styles.camButtons}>
          {['CAM-01', 'CAM-02', 'CAM-03', 'CAM-04'].map(cam => (
            <button
              key={cam}
              style={cameraId === cam ? styles.camBtnActive : styles.camBtn}
              onClick={() => setCameraId(cam)}
            >
              {cam}
            </button>
          ))}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={420}
        height={260}
        style={styles.canvas}
      />

      <div style={styles.aiBar}>
        <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.75rem' }}>
          AI VISION: {detections.length > 0 ? 'ANOMALY DETECTED' : 'MONITORING'}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button style={styles.detectBtn} onClick={triggerCrowdDetection}>
            Sim: Crowd Rush
          </button>
          <button style={{ ...styles.detectBtn, borderColor: '#ef4444', color: '#ef4444' }} onClick={triggerFallDetection}>
            Sim: Person Fall
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    height: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  camButtons: { display: 'flex', gap: '0.25rem' },
  camBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#94a3b8',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.7rem',
  },
  camBtnActive: {
    background: '#3b82f6',
    border: '1px solid #3b82f6',
    color: '#fff',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.7rem',
    fontWeight: 'bold',
  },
  canvas: {
    width: '100%',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  aiBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '6px',
  },
  detectBtn: {
    background: 'transparent',
    border: '1px solid #f59e0b',
    color: '#f59e0b',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.7rem',
    fontWeight: 'bold',
  },
};
