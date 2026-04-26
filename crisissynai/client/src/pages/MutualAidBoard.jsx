import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function MutualAidBoard() {
  const [requests, setRequests] = useState([]);
  const [sending, setSending] = useState(false);
  const [accepted, setAccepted] = useState({});

  // Listen to mutual aid requests
  useEffect(() => {
    const q = query(
      collection(db, "mutualAidRequests"),
      where("toPropertyId", "==", "hotel-b")
    );
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const resources = {
    rooms: 24,
    firstAidKits: 5,
    cprStaff: 3,
    securityStaff: 4,
  };

  const handleAcceptRelocation = async (requestId) => {
    try {
      await updateDoc(doc(db, "mutualAidRequests", requestId), {
        status: "ACCEPTED",
        respondedAt: new Date().toISOString(),
      });
      setAccepted(prev => ({ ...prev, [requestId]: true }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeployStaff = async (requestId) => {
    try {
      await updateDoc(doc(db, "mutualAidRequests", requestId), {
        staffDeployed: true,
      });
      setAccepted(prev => ({ ...prev, [`staff_${requestId}`]: true }));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 10px rgba(239,68,68,0.3); } 50% { box-shadow: 0 0 25px rgba(239,68,68,0.6); } }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>Sister Property Dashboard</h1>
        <span style={styles.subtitle}>Grand Hotel B — Mutual Aid Network</span>
      </header>

      {/* Incoming Requests */}
      <div style={styles.content}>
        {requests.length === 0 ? (
          <div style={styles.noRequests}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤝</div>
            <h2>No Active Requests</h2>
            <p>When a sister property needs help, alerts will appear here.</p>
          </div>
        ) : (
          requests.map(req => (
            <div key={req.id} style={{
              ...styles.requestCard,
              animation: 'fadeSlideIn 0.5s ease, glow 2s infinite',
            }}>
              <div style={styles.alertBanner}>
                🚨 INCOMING MUTUAL AID REQUEST
              </div>
              <div style={styles.requestBody}>
                <h2 style={{ margin: '0 0 0.5rem 0' }}>
                  Emergency at Grand Hotel A
                </h2>
                <p style={{ color: '#94a3b8', margin: '0 0 1.5rem 0' }}>
                  Can you assist with evacuation and guest relocation?
                  <br />
                  Requested rooms: <strong>{req.requestedRooms || 20}</strong>
                </p>

                <div style={styles.buttonRow}>
                  <button
                    style={accepted[req.id] ? styles.btnAccepted : styles.btnAccept}
                    onClick={() => handleAcceptRelocation(req.id)}
                    disabled={accepted[req.id]}
                  >
                    {accepted[req.id] ? '✓ Rooms Confirmed' : '🏨 Accept Relocation Request'}
                  </button>
                  <button
                    style={accepted[`staff_${req.id}`] ? styles.btnAccepted : styles.btnDeploy}
                    onClick={() => handleDeployStaff(req.id)}
                    disabled={accepted[`staff_${req.id}`]}
                  >
                    {accepted[`staff_${req.id}`] ? '✓ Staff Deployed' : '👨‍⚕️ Deploy Security Staff'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Our Resources */}
        <div style={styles.resourceSection}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px' }}>
            Our Available Resources
          </h3>
          <div style={styles.resourceGrid}>
            <div style={styles.resourceCard}>
              <div style={styles.resourceNum}>{resources.rooms}</div>
              <div style={styles.resourceLabel}>Available Rooms</div>
            </div>
            <div style={styles.resourceCard}>
              <div style={styles.resourceNum}>{resources.firstAidKits}</div>
              <div style={styles.resourceLabel}>First Aid Kits</div>
            </div>
            <div style={styles.resourceCard}>
              <div style={styles.resourceNum}>{resources.cprStaff}</div>
              <div style={styles.resourceLabel}>CPR Certified Staff</div>
            </div>
            <div style={styles.resourceCard}>
              <div style={styles.resourceNum}>{resources.securityStaff}</div>
              <div style={styles.resourceLabel}>Security Personnel</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#f8fafc',
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    padding: '1.5rem 2rem',
    background: 'rgba(30, 41, 59, 0.8)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  title: { margin: 0, fontSize: '1.5rem', fontWeight: 900 },
  subtitle: { fontSize: '0.9rem', color: '#94a3b8' },
  content: {
    padding: '2rem',
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  noRequests: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: '#64748b',
  },
  requestCard: {
    background: 'rgba(30, 41, 59, 0.8)',
    border: '2px solid #ef4444',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  alertBanner: {
    background: '#ef4444',
    color: 'white',
    padding: '0.75rem 1.5rem',
    fontWeight: 900,
    fontSize: '1rem',
    textAlign: 'center',
    letterSpacing: '1px',
  },
  requestBody: {
    padding: '1.5rem',
  },
  buttonRow: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  btnAccept: {
    flex: 1,
    padding: '1rem',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '2px solid #10b981',
    color: '#10b981',
    borderRadius: '10px',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  btnDeploy: {
    flex: 1,
    padding: '1rem',
    background: 'rgba(59, 130, 246, 0.15)',
    border: '2px solid #3b82f6',
    color: '#3b82f6',
    borderRadius: '10px',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  btnAccepted: {
    flex: 1,
    padding: '1rem',
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid #64748b',
    color: '#10b981',
    borderRadius: '10px',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'not-allowed',
  },
  resourceSection: {
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '16px',
    padding: '1.5rem',
  },
  resourceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1rem',
  },
  resourceCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    padding: '1.25rem',
    textAlign: 'center',
  },
  resourceNum: {
    fontSize: '2.5rem',
    fontWeight: 900,
    color: '#3b82f6',
  },
  resourceLabel: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    marginTop: '0.5rem',
  },
};
