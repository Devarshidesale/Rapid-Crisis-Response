import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, onSnapshot, collection, query, orderBy, limit, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function StaffPortal() {
  const [searchParams] = useSearchParams();
  const incidentId = searchParams.get('incidentId');
  const staffId = searchParams.get('staffId');

  const [incident, setIncident] = useState(null);
  const [staff, setStaff] = useState(null);
  
  const [feed, setFeed] = useState([]);
  const [chat, setChat] = useState([]);
  const [chatMsg, setChatMsg] = useState("");
  const [elapsedSecs, setElapsedSecs] = useState(0);

  const feedEndRef = useRef(null);
  const chatEndRef = useRef(null);

  // 1. Listen to Incident
  useEffect(() => {
    if (!incidentId) return;
    const unsub = onSnapshot(doc(db, "incidents", incidentId), (docSnap) => {
      if (docSnap.exists()) setIncident(docSnap.data());
    });
    return () => unsub();
  }, [incidentId]);

  // 2. Listen to Staff
  useEffect(() => {
    if (!staffId) return;
    const unsub = onSnapshot(doc(db, "staff", staffId), (docSnap) => {
      if (docSnap.exists()) setStaff(docSnap.data());
    });
    return () => unsub();
  }, [staffId]);

  // 3. Listen to Team Feed
  useEffect(() => {
    if (!incidentId) return;
    const q = query(
      collection(db, "incidentUpdates", incidentId, "updates"),
      orderBy("timestamp", "asc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setFeed(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [incidentId]);

  // 4. Listen to Chat
  useEffect(() => {
    if (!incidentId) return;
    const q = query(
      collection(db, "incidentUpdates", incidentId, "chat"),
      orderBy("timestamp", "asc"),
      limit(15)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setChat(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [incidentId]);

  // Auto-scroll feeds
  useEffect(() => { feedEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [feed]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  // Timer SLA Calculation
  useEffect(() => {
    if (!incident?.timestamp) return;
    // Our Python backend writes timestamp as an ISO string
    const startTime = new Date(incident.timestamp).getTime();
    
    // Fallback if Date parsing fails or is weird
    if (isNaN(startTime)) return;

    const timerId = setInterval(() => {
      const now = Date.now();
      setElapsedSecs(Math.floor((now - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(timerId);
  }, [incident?.timestamp]);

  // Actions
  const handleStatusUpdate = async (newStatus) => {
    if (!staffId || !incidentId) return;
    
    // Update Staff Document
    try {
      await updateDoc(doc(db, "staff", staffId), { status: newStatus });
      
      // Post to team feed
      const staffName = staff?.name || 'Staff Member';
      const actionText = newStatus === 'ON_WAY' ? 'is on the way to the hazard zone.' : 'has arrived at the location.';
      
      await addDoc(collection(db, "incidentUpdates", incidentId, "updates"), {
        timestamp: serverTimestamp(),
        text: `${staffName} ${actionText}`
      });
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const sendChat = async (e) => {
    e.preventDefault();
    if (!chatMsg.trim() || !incidentId) return;
    
    try {
      await addDoc(collection(db, "incidentUpdates", incidentId, "chat"), {
        timestamp: serverTimestamp(),
        sender: staff?.name || 'Unknown',
        message: chatMsg.trim()
      });
      setChatMsg("");
    } catch (e) {
      console.error("Chat send error", e);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const activeTask = incident?.geminiPlan?.staffTasks?.[0];

  if (!incidentId || !staffId) {
    return <div style={styles.error}>Missing incident or staff context in URL.</div>;
  }

  const staffStatus = staff?.status || 'AVAILABLE';

  return (
    <div style={styles.container}>
      
      {/* SLA Header */}
      <header style={styles.headerRow}>
        <div style={styles.headerIdentity}>
          Staff ID: <span>{staff?.name || staffId}</span>
        </div>
        <div style={styles.slaBox}>
          <div>Incident active: {formatTime(Math.max(0, elapsedSecs))}</div>
          {elapsedSecs >= 90 ? (
            <div style={{ color: '#ef4444', fontWeight: 'bold' }}>🔴 Escalating to emergency services</div>
          ) : elapsedSecs >= 30 ? (
            <div style={{ color: '#f59e0b', fontWeight: 'bold' }}>⚠ Auto-escalating to manager in {90 - elapsedSecs}s</div>
          ) : (
            <div style={{ color: '#10b981' }}>Within SLA</div>
          )}
        </div>
      </header>

      {/* TOP CARD: Active Incident */}
      <div style={styles.topCard}>
        <div style={styles.topCardHeader}>
          <h2>🚨 ACTIVE INCIDENT</h2>
          {incident?.zone && (
            <span style={styles.incidentBadge}>
              {incident.type} @ {incident.zone.toUpperCase()}
            </span>
          )}
        </div>
        
        <div style={styles.taskBox}>
          <h3>Current Objective</h3>
          <p>{activeTask?.description || "Awaiting AI assignment..."}</p>
          {activeTask?.requiredCert && (
            <span style={styles.certBadge}>{activeTask.requiredCert}</span>
          )}
        </div>

        <div style={styles.buttonRow}>
          <button 
            style={staffStatus === 'ON_WAY' ? styles.btnGreenActive : styles.btnGreen}
            onClick={() => handleStatusUpdate('ON_WAY')}
            disabled={staffStatus === 'ON_WAY' || staffStatus === 'AT_LOCATION'}
          >
            🚗 ON THE WAY
          </button>
          
          <button 
            style={staffStatus === 'AT_LOCATION' ? styles.btnBlueActive : styles.btnBlue}
            onClick={() => handleStatusUpdate('AT_LOCATION')}
            disabled={staffStatus === 'AT_LOCATION' || staffStatus === 'AVAILABLE'}
          >
            📍 AT LOCATION
          </button>
        </div>
      </div>

      <div style={styles.splitGrid}>
        {/* TEAM FEED */}
        <div style={styles.feedPanel}>
          <h3 style={styles.panelTitle}>📡 Tactical Feed</h3>
          <div style={styles.scrollArea}>
            {feed.length === 0 ? <div style={styles.emptyText}>No updates yet.</div> : null}
            {feed.map((f, i) => (
              <div key={f.id || i} style={styles.feedItem}>
                <span style={styles.feedTime}>
                  {f.timestamp ? new Date(f.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Now'}
                </span>
                <span>{f.text}</span>
              </div>
            ))}
            <div ref={feedEndRef} />
          </div>
        </div>

        {/* CHAT */}
        <div style={styles.chatPanel}>
          <h3 style={styles.panelTitle}>💬 Comms</h3>
          <div style={styles.scrollArea}>
            {chat.length === 0 ? <div style={styles.emptyText}>No comms yet.</div> : null}
            {chat.map((c, i) => (
              <div key={c.id || i} style={{...styles.chatBubble, alignSelf: c.sender === staff?.name ? 'flex-end' : 'flex-start', background: c.sender === staff?.name ? '#1e3a8a' : '#1e293b'}}>
                <div style={styles.chatSender}>{c.sender}</div>
                <div>{c.message}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          
          <form onSubmit={sendChat} style={styles.chatForm}>
            <input 
              style={styles.chatInput}
              value={chatMsg}
              onChange={(e) => setChatMsg(e.target.value)}
              placeholder="Send message..."
            />
            <button type="submit" style={styles.chatSendBtn}>Send</button>
          </form>
        </div>
      </div>

    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    fontFamily: 'Inter, sans-serif',
    padding: '1rem',
    gap: '1rem',
    overflow: 'hidden'
  },
  error: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', 
    height: '100vh', backgroundColor: '#0f172a', color: '#f8fafc'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    paddingBottom: '0.5rem',
    flexShrink: 0
  },
  headerIdentity: {
    fontSize: '0.9rem',
    color: '#94a3b8'
  },
  slaBox: {
    textAlign: 'right',
    fontSize: '0.9rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.2rem'
  },
  topCard: {
    border: '2px solid #ef4444',
    borderRadius: '12px',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    flexShrink: 0
  },
  topCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  incidentBadge: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '0.4rem 1rem',
    borderRadius: '8px',
    fontWeight: '900',
    fontSize: '1.1rem'
  },
  taskBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: '1.5rem',
    borderRadius: '8px',
    borderLeft: '4px solid #3b82f6'
  },
  certBadge: {
    display: 'inline-block',
    marginTop: '1rem',
    backgroundColor: '#1e3a8a',
    color: '#93c5fd',
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 'bold'
  },
  buttonRow: {
    display: 'flex',
    gap: '1rem'
  },
  btnGreen: {
    flex: 1, padding: '1rem', borderRadius: '8px', border: '2px solid #10b981',
    backgroundColor: 'transparent', color: '#10b981', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer'
  },
  btnGreenActive: {
    flex: 1, padding: '1rem', borderRadius: '8px', border: 'none',
    backgroundColor: '#10b981', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'not-allowed', opacity: 0.7
  },
  btnBlue: {
    flex: 1, padding: '1rem', borderRadius: '8px', border: '2px solid #3b82f6',
    backgroundColor: 'transparent', color: '#3b82f6', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer'
  },
  btnBlueActive: {
    flex: 1, padding: '1rem', borderRadius: '8px', border: 'none',
    backgroundColor: '#3b82f6', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'not-allowed', opacity: 0.7
  },
  splitGrid: {
    display: 'flex',
    gap: '1rem',
    flex: 1,
    minHeight: 0
  },
  feedPanel: {
    flex: 1, backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden'
  },
  chatPanel: {
    flex: 1, backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden'
  },
  panelTitle: {
    margin: 0, padding: '1rem', backgroundColor: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)',
    fontSize: '1rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px'
  },
  scrollArea: {
    flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem'
  },
  emptyText: { color: '#64748b', fontStyle: 'italic', textAlign: 'center', marginTop: '1rem' },
  feedItem: {
    fontSize: '0.9rem', borderLeft: '2px solid #3b82f6', paddingLeft: '0.75rem'
  },
  feedTime: {
    color: '#94a3b8', fontSize: '0.75rem', marginRight: '0.5rem'
  },
  chatBubble: {
    padding: '0.75rem 1rem', borderRadius: '12px', maxWidth: '85%', fontSize: '0.95rem'
  },
  chatSender: {
    fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.2rem', textTransform: 'uppercase'
  },
  chatForm: {
    display: 'flex', padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', gap: '0.5rem'
  },
  chatInput: {
    flex: 1, backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
    padding: '0.5rem 0.75rem', color: 'white', outline: 'none'
  },
  chatSendBtn: {
    backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem',
    fontWeight: 'bold', cursor: 'pointer'
  }
};
