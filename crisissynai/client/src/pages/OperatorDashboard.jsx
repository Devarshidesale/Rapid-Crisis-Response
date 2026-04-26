import React, { useState, useEffect } from 'react';
import { useIncidentStream } from '../hooks/useIncidentStream';
import ConfidenceGauge from '../components/ConfidenceGauge';
import ActionPanel from '../components/ActionPanel';
import BuildingMap from '../components/BuildingMap';
import MissingPersonsBoard from '../components/MissingPersonsBoard';
import CCTVFeed from '../components/CCTVFeed';
import SensorPanel from '../components/SensorPanel';

export default function OperatorDashboard() {
  const { incidents, activeIncident } = useIncidentStream("hotel-a");
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
  
  const [evacPath, setEvacPath] = useState([]);
  const [loadingDemo, setLoadingDemo] = useState(null);
  const [auditLog, setAuditLog] = useState([]);

  // Fetch evacuation path whenever the active incident changes
  useEffect(() => {
    if (activeIncident?.id) {
      fetch(`${backendUrl}/building/evacpath/${activeIncident.id}/room101`)
        .then(res => res.json())
        .then(data => {
          if (data && data.path) setEvacPath(data.path);
        })
        .catch(err => console.error("Evac path fetch error:", err));
    } else {
      setEvacPath([]);
    }
  }, [activeIncident?.id, backendUrl]);

  // Add to audit log
  const addLog = (msg) => {
    setAuditLog(prev => [
      { time: new Date().toLocaleTimeString(), text: msg },
      ...prev.slice(0, 30)
    ]);
  };

  // Demo signal sender
  const triggerSignal = async (buttonId, payload, isP1 = false) => {
    setLoadingDemo(buttonId);
    addLog(`Signal sent: ${payload.type} from ${payload.zone}`);
    try {
      const res = await fetch(`${backendUrl}/signal/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      addLog(`VCS updated → Signal accepted`);

      if (isP1) {
        addLog('⏳ Waiting 2s for VCS threshold...');
        await new Promise(r => setTimeout(r, 2000));
        // Send additional signal to cross threshold
        await fetch(`${backendUrl}/signal/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'STAFF_WEARABLE', zone: 'lobby', floor: 1, room: 'lobby', raw_confidence: 0.95, propertyId: 'hotel-a' })
        });
        addLog('🔴 P1 THRESHOLD CROSSED — Gemini AI generating plan...');
      }
    } catch (err) {
      addLog(`✗ Error: ${err.message}`);
    }
    setLoadingDemo(null);
  };

  // CCTV detection handler
  const handleCCTVDetection = (type, confidence) => {
    addLog(`🎥 AI Vision detected: ${type} (${(confidence * 100).toFixed(0)}%)`);
    triggerSignal('cctv', {
      type, zone: 'lobby', floor: 1, room: 'lobby',
      raw_confidence: confidence, propertyId: 'hotel-a'
    });
  };

  const uiColor = activeIncident?.uiColor || 'BLUE';
  const colorMap = { BLUE: '#3b82f6', AMBER: '#f59e0b', RED: '#ef4444' };
  const statusTextMap = { BLUE: 'All Clear', AMBER: 'Verifying', RED: 'P1 ACTIVE' };

  return (
    <div style={styles.dashboard}>
      <style>{`
        @keyframes pulse-border { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .demo-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; display: inline-block; }
      `}</style>

      {/* ═══ TOP HEADER ═══ */}
      <header style={{
        ...styles.header,
        borderBottomColor: colorMap[uiColor],
        animation: uiColor === 'RED' ? 'pulse-border 2s infinite' : 'none',
      }}>
        <div>
          <h1 style={styles.headerTitle}>CrisisSync<span style={{ color: '#3b82f6' }}>AI</span></h1>
          <span style={styles.headerSub}>Grand Hotel A — Nerve Center</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={styles.incidentCounter}>
            Incidents: <strong>{incidents.length}</strong>
          </div>
          <div style={{ ...styles.statusPill, backgroundColor: colorMap[uiColor] }}>
            {statusTextMap[uiColor]}
          </div>
        </div>
      </header>

      {/* ═══ MAIN 3-COLUMN GRID ═══ */}
      <div style={styles.mainGrid}>
        
        {/* LEFT COLUMN: CCTV + Sensors */}
        <div style={styles.leftCol}>
          <div style={styles.panel}>
            <CCTVFeed onDetection={handleCCTVDetection} />
          </div>
          <div style={styles.panel}>
            <SensorPanel />
          </div>
        </div>

        {/* CENTER COLUMN: VCS Gauge + Action Panel */}
        <div style={styles.centerCol}>
          <div style={styles.panel}>
            <ConfidenceGauge
              vcs={activeIncident?.vcs || 0}
              uiColor={uiColor}
            />
          </div>
          <div style={{ ...styles.panel, flex: 1, overflow: 'auto', padding: '0.5rem' }}>
            <ActionPanel
              geminiPlan={activeIncident?.geminiPlan || null}
              incidentId={activeIncident?.id}
              backendUrl={backendUrl}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Map + Missing Persons */}
        <div style={styles.rightCol}>
          <div style={{ ...styles.panel, flex: 1, padding: 0, overflow: 'hidden', minHeight: '300px' }}>
            <BuildingMap
              incident={activeIncident}
              evacPath={evacPath}
            />
          </div>
          <div style={{ ...styles.panel, maxHeight: '300px', overflow: 'auto' }}>
            <MissingPersonsBoard propertyId="hotel-a" />
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM ROW: Audit Log + Demo Controls ═══ */}
      <div style={styles.bottomRow}>
        {/* Audit Trail */}
        <div style={styles.auditPanel}>
          <div style={styles.auditHeader}>Audit Trail</div>
          <div style={styles.auditScroll}>
            {auditLog.length === 0 && (
              <div style={{ color: '#64748b', fontStyle: 'italic', padding: '0.5rem' }}>
                No events yet. Use demo controls to start.
              </div>
            )}
            {auditLog.map((log, i) => (
              <div key={i} style={styles.auditItem}>
                <span style={{ color: '#64748b', fontSize: '0.75rem', marginRight: '0.5rem' }}>{log.time}</span>
                {log.text}
              </div>
            ))}
          </div>
        </div>

        {/* Demo Controls */}
        <div style={styles.demoBar}>
          <div style={styles.demoLabel}>🎮 DEMO CONTROLS</div>
          <div style={styles.demoButtons}>
            <button style={styles.demoBtn} disabled={loadingDemo === 'smoke'}
              onClick={() => triggerSignal('smoke', {
                type: 'IOT_SMOKE', zone: 'kitchen', floor: 1, room: 'kitchen', raw_confidence: 0.85, propertyId: 'hotel-a'
              })}>
              {loadingDemo === 'smoke' ? <span className="demo-spinner" /> : '🔥'} Smoke
            </button>
            <button style={styles.demoBtn} disabled={loadingDemo === 'crowd'}
              onClick={() => triggerSignal('crowd', {
                type: 'VISION_CROWD', zone: 'lobby', floor: 1, room: 'lobby', raw_confidence: 0.75, propertyId: 'hotel-a'
              })}>
              {loadingDemo === 'crowd' ? <span className="demo-spinner" /> : '👥'} Crowd
            </button>
            <button style={styles.demoBtn} disabled={loadingDemo === 'sos'}
              onClick={() => triggerSignal('sos', {
                type: 'GUEST_SOS', zone: 'lobby', floor: 1, room: 'room201', raw_confidence: 1.0, propertyId: 'hotel-a'
              })}>
              {loadingDemo === 'sos' ? <span className="demo-spinner" /> : '🆘'} SOS
            </button>
            <button style={{ ...styles.demoBtn, background: '#dc2626', border: '2px solid #7f1d1d' }}
              disabled={loadingDemo === 'p1'}
              onClick={() => triggerSignal('p1', {
                type: 'VISION_FALL', zone: 'lobby', floor: 1, room: 'lobby', raw_confidence: 0.9, propertyId: 'hotel-a'
              }, true)}>
              {loadingDemo === 'p1' ? <span className="demo-spinner" /> : '⚡'} TRIGGER P1
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  dashboard: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#0a0f1e',
    color: '#f8fafc',
    fontFamily: "'Inter', sans-serif",
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1.5rem',
    background: 'rgba(15, 23, 42, 0.9)',
    borderBottom: '2px solid #3b82f6',
    flexShrink: 0,
  },
  headerTitle: { margin: 0, fontSize: '1.3rem', fontWeight: 900 },
  headerSub: { fontSize: '0.8rem', color: '#94a3b8' },
  incidentCounter: { fontSize: '0.85rem', color: '#94a3b8' },
  statusPill: {
    padding: '0.4rem 1.2rem',
    borderRadius: '999px',
    fontWeight: 800,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    color: '#fff',
    fontSize: '0.85rem',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '28% 28% 1fr',
    gap: '1rem',
    flex: 1,
    padding: '1rem',
    minHeight: 0,
    overflow: 'hidden',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    minHeight: 0,
    overflow: 'auto',
  },
  centerCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    minHeight: 0,
    overflow: 'hidden',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    minHeight: 0,
    overflow: 'hidden',
  },
  panel: {
    background: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '12px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
  },
  bottomRow: {
    display: 'flex',
    gap: '1rem',
    padding: '0 1rem 0.75rem 1rem',
    flexShrink: 0,
    maxHeight: '140px',
  },
  auditPanel: {
    flex: 1,
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '10px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  auditHeader: {
    padding: '0.4rem 0.75rem',
    background: 'rgba(0,0,0,0.3)',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  auditScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.4rem 0.75rem',
    fontSize: '0.8rem',
  },
  auditItem: {
    padding: '0.2rem 0',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
  demoBar: {
    background: '#fde047',
    color: '#000',
    padding: '0.75rem',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    minWidth: '380px',
  },
  demoLabel: {
    fontWeight: 900,
    fontSize: '0.85rem',
    textTransform: 'uppercase',
  },
  demoButtons: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  demoBtn: {
    background: '#1e293b',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 0.8rem',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontSize: '0.8rem',
    transition: 'transform 0.1s',
  },
};
