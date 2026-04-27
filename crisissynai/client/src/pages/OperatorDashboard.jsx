import React, { useState, useEffect, useRef } from 'react';
import { useIncidentStream } from '../hooks/useIncidentStream';
import ConfidenceGauge from '../components/ConfidenceGauge';
import ActionPanel from '../components/ActionPanel';
import BuildingMap from '../components/BuildingMap';
import MissingPersonsBoard from '../components/MissingPersonsBoard';
import CCTVFeed from '../components/CCTVFeed';
import SensorPanel from '../components/SensorPanel';
import HeroCanvas from '../components/HeroCanvas';
import './FireNet.css';

export default function OperatorDashboard() {
  const { incidents, activeIncident } = useIncidentStream("hotel-a");
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

  const [evacPath, setEvacPath] = useState([]);
  const [loadingDemo, setLoadingDemo] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [navScrolled, setNavScrolled] = useState(false);
  const dashRef = useRef(null);
  const cardRefs = useRef([]);

  // Scroll detection for nav
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // IntersectionObserver for card animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, idx) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), idx * 80);
        }
      });
    }, { threshold: 0.1 });

    cardRefs.current.forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  // Fetch evacuation path
  useEffect(() => {
    if (activeIncident?.id) {
      fetch(`${backendUrl}/building/evacpath/${activeIncident.id}/room101`)
        .then(res => res.json())
        .then(data => { if (data?.path) setEvacPath(data.path); })
        .catch(err => console.error("Evac path fetch error:", err));
    } else {
      setEvacPath([]);
    }
  }, [activeIncident?.id, backendUrl]);

  const addLog = (msg) => {
    setAuditLog(prev => [
      { time: new Date().toLocaleTimeString(), text: msg },
      ...prev.slice(0, 30)
    ]);
  };

  const triggerSignal = async (buttonId, payload, isP1 = false) => {
    setLoadingDemo(buttonId);
    addLog(`Signal sent: ${payload.type} from ${payload.zone}`);
    try {
      await fetch(`${backendUrl}/signal/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      addLog(`VCS updated → Signal accepted`);
      if (isP1) {
        addLog('⏳ Waiting 2s for VCS threshold...');
        await new Promise(r => setTimeout(r, 2000));
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

  const handleCCTVDetection = (type, confidence) => {
    addLog(`🎥 AI Vision detected: ${type} (${(confidence * 100).toFixed(0)}%)`);
    triggerSignal('cctv', {
      type, zone: 'lobby', floor: 1, room: 'lobby',
      raw_confidence: confidence, propertyId: 'hotel-a'
    });
  };

  const uiColor = activeIncident?.uiColor || 'BLUE';

  const setCardRef = (idx) => (el) => { cardRefs.current[idx] = el; };

  return (
    <div style={{ background: '#080808', color: '#F0F0F0', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ═══ TOP NAV ═══ */}
      <nav className={`fn-nav ${navScrolled ? 'scrolled' : ''}`}>
        <a className="fn-nav-brand" href="#top">rapid<span>crisis</span> response</a>
        <ul className="fn-nav-links">
          <li><a href="#top">Overview</a></li>
          <li><a href="#dashboard">Units</a></li>
          <li><a href="#dashboard">Incidents</a></li>
          <li><a href="#dashboard">Dispatch</a></li>
          <li><a href="#dashboard">Reports</a></li>
        </ul>
        <div className="fn-nav-right">
          <button className="fn-nav-icon" title="Notifications">🔔</button>
          <button className="fn-nav-icon" title="Settings">⚙</button>
          <button className="fn-nav-icon" title="Profile">👤</button>
          <button className="fn-alert-btn">ALERT CENTER</button>
        </div>
      </nav>

      {/* ═══ HERO SECTION ═══ */}
      <section className="fn-hero" id="top">
        {/* Full-viewport 3D Model */}
        <div className="fn-hero-iframe-wrap">
          <iframe
            title="3D Fire Scene"
            allowFullScreen
            allow="autoplay; fullscreen; xr-spatial-tracking"
            src="https://sketchfab.com/models/fefd42f4b53a433bbdc8b70bcbb6a945/embed?autostart=1&ui_controls=0&ui_infos=0&ui_watermark=0&ui_watermark_link=0&ui_ar=0&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0"
          />
          <div className="fn-hero-iframe-mask" />
        </div>

        {/* Particle overlay */}
        {/* <HeroCanvas /> */}

        {/* Hero Content — bottom left */}
        <div className="fn-hero-content">
          <div className="fn-status-pill">
            <span className="fn-status-dot" />
            SYSTEM ONLINE
          </div>
          <h1 className="fn-hero-title">
            Crisis-Sync AI
          </h1>
          <p className="fn-hero-desc">
            Experience the platform — where real-time intelligence, AI-driven response, and tactical coordination meet exceptional crisis management.
          </p>
          <button className="fn-hero-cta" onClick={() => document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' })}>
            Enter Command Center
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        {/* Stat counters — bottom right */}
        <div className="fn-stat-pills">
          <div className="fn-stat-pill">
            <div className="accent-bar" style={{ background: '#22C55E' }} />
            <span className="val">0</span>
            <span className="lbl">Active Units</span>
          </div>
          <div className="fn-stat-pill">
            <div className="accent-bar" style={{ background: '#FF3B1F' }} />
            <span className="val">{incidents.length > 0 ? incidents.length : 0}</span>
            <span className="lbl">Live Incidents</span>
          </div>
          <div className="fn-stat-pill">
            <div className="accent-bar" style={{ background: '#FFB020' }} />
            <span className="val">0ms</span>
            <span className="lbl">Avg Response</span>
          </div>
        </div>

        {/* Scroll Cue */}
        <div className="fn-scroll-cue">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span>Scroll</span>
        </div>
      </section>

      {/* ═══ DASHBOARD SECTION ═══ */}
      <section className="fn-dashboard" id="dashboard" ref={dashRef}>
        <h2 className="fn-section-title">COMMAND CENTER</h2>
        <p className="fn-section-sub">Real-time incident monitoring & response</p>

        <div className="fn-dash-grid">
          {/* CCTV Feed */}
          <div className="fn-card" ref={setCardRef(0)}>
            <div className="fn-card-header">
              <span className="fn-card-title">CCTV Feed</span>
              <span className="fn-card-badge" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>LIVE</span>
            </div>
            <CCTVFeed onDetection={handleCCTVDetection} />
          </div>

          {/* VCS Gauge */}
          <div className="fn-card" ref={setCardRef(1)}>
            <div className="fn-card-header">
              <span className="fn-card-title">VCS Confidence</span>
              <span className="fn-card-badge" style={{
                background: uiColor === 'RED' ? 'rgba(255,59,31,0.15)' : 'rgba(255,176,32,0.15)',
                color: uiColor === 'RED' ? '#FF3B1F' : '#FFB020'
              }}>
                {uiColor}
              </span>
            </div>
            <ConfidenceGauge vcs={activeIncident?.vcs || 0} uiColor={uiColor} />
          </div>

          {/* Building Map */}
          <div className="fn-card" ref={setCardRef(2)} style={{ minHeight: 320, padding: 0, overflow: 'hidden' }}>
            <div className="fn-card-header" style={{ padding: '12px 20px' }}>
              <span className="fn-card-title">Building Map</span>
              <span className="fn-card-badge" style={{ background: 'rgba(255,176,32,0.15)', color: '#FFB020' }}>TACTICAL</span>
            </div>
            <div style={{ flex: 1, minHeight: 260 }}>
              <BuildingMap incident={activeIncident} evacPath={evacPath} />
            </div>
          </div>

          {/* Sensor Panel */}
          <div className="fn-card" ref={setCardRef(3)}>
            <div className="fn-card-header">
              <span className="fn-card-title">Sensor Array</span>
              <span className="fn-card-badge" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>NOMINAL</span>
            </div>
            <SensorPanel />
          </div>

          {/* Action Panel */}
          <div className="fn-card" ref={setCardRef(4)} style={{ overflow: 'auto' }}>
            <div className="fn-card-header">
              <span className="fn-card-title">Response Actions</span>
              <span className="fn-card-badge" style={{ background: 'rgba(255,59,31,0.15)', color: '#FF3B1F' }}>GEMINI AI</span>
            </div>
            <ActionPanel
              geminiPlan={activeIncident?.geminiPlan || null}
              incidentId={activeIncident?.id}
              backendUrl={backendUrl}
            />
          </div>

          {/* Missing Persons */}
          <div className="fn-card" ref={setCardRef(5)} style={{ overflow: 'auto', maxHeight: 400 }}>
            <div className="fn-card-header">
              <span className="fn-card-title">Missing Persons</span>
              <span className="fn-card-badge" style={{ background: 'rgba(255,59,31,0.15)', color: '#FF3B1F' }}>TRACKING</span>
            </div>
            <MissingPersonsBoard propertyId="hotel-a" />
          </div>
        </div>

        {/* ═══ BOTTOM: Audit + Demo ═══ */}
        <div className="fn-bottom-row">
          <div className="fn-audit-panel">
            <div className="fn-audit-header">Audit Trail</div>
            <div className="fn-audit-scroll">
              {auditLog.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No events yet. Use demo controls to start.
                </div>
              )}
              {auditLog.map((log, i) => (
                <div key={i} className="fn-audit-item">
                  <span className="fn-audit-time">{log.time}</span>
                  {log.text}
                </div>
              ))}
            </div>
          </div>

          <div className="fn-demo-bar">
            <div className="fn-demo-label">🎮 DEMO CONTROLS</div>
            <div className="fn-demo-buttons">
              <button className="fn-demo-btn" disabled={loadingDemo === 'smoke'}
                onClick={() => triggerSignal('smoke', {
                  type: 'IOT_SMOKE', zone: 'kitchen', floor: 1, room: 'kitchen', raw_confidence: 0.85, propertyId: 'hotel-a'
                })}>
                {loadingDemo === 'smoke' ? <span className="fn-demo-spinner" /> : '🔥'} Smoke
              </button>
              <button className="fn-demo-btn" disabled={loadingDemo === 'crowd'}
                onClick={() => triggerSignal('crowd', {
                  type: 'VISION_CROWD', zone: 'lobby', floor: 1, room: 'lobby', raw_confidence: 0.75, propertyId: 'hotel-a'
                })}>
                {loadingDemo === 'crowd' ? <span className="fn-demo-spinner" /> : '👥'} Crowd
              </button>
              <button className="fn-demo-btn" disabled={loadingDemo === 'sos'}
                onClick={() => triggerSignal('sos', {
                  type: 'GUEST_SOS', zone: 'lobby', floor: 1, room: 'room201', raw_confidence: 1.0, propertyId: 'hotel-a'
                })}>
                {loadingDemo === 'sos' ? <span className="fn-demo-spinner" /> : '🆘'} SOS
              </button>
              <button className="fn-demo-btn danger" disabled={loadingDemo === 'p1'}
                onClick={() => triggerSignal('p1', {
                  type: 'VISION_FALL', zone: 'lobby', floor: 1, room: 'lobby', raw_confidence: 0.9, propertyId: 'hotel-a'
                }, true)}>
                {loadingDemo === 'p1' ? <span className="fn-demo-spinner" /> : '⚡'} TRIGGER P1
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
