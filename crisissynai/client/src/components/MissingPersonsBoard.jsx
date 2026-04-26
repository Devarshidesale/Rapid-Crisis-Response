import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function MissingPersonsBoard({ propertyId }) {
  const [guests, setGuests] = useState([]);
  const [flashingIds, setFlashingIds] = useState(new Set());
  const previousGuests = useRef([]);

  // Fetch live guests data
  useEffect(() => {
    if (!propertyId) return;

    const q = query(
      collection(db, "guests"),
      where("propertyId", "==", propertyId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort to keep table order consistent
      data.sort((a, b) => (a.roomId || "").localeCompare(b.roomId || ""));
      setGuests(data);
    });

    return () => unsub(); // IMPORTANT: cleanup
  }, [propertyId]);

  // Handle flash animation when status changes to SAFE
  useEffect(() => {
    let changed = false;
    const newFlashing = new Set(flashingIds);

    guests.forEach(guest => {
      const prev = previousGuests.current.find(g => g.id === guest.id);
      if (prev && prev.checkInStatus !== 'SAFE' && guest.checkInStatus === 'SAFE') {
        newFlashing.add(guest.id);
        changed = true;
        
        // Remove the flash class after 2 seconds
        setTimeout(() => {
          setFlashingIds(current => {
            const next = new Set(current);
            next.delete(guest.id);
            return next;
          });
        }, 2000);
      }
    });

    if (changed) {
      setFlashingIds(newFlashing);
    }
    
    previousGuests.current = guests;
  }, [guests]);

  // Compute counts
  const safeCount = guests.filter(g => g.checkInStatus === "SAFE").length;
  const missingCount = guests.filter(g => 
    ["MISSING", "EVACUATING", "CHECKED_IN"].includes(g.checkInStatus)
  ).length; // Included CHECKED_IN as technically missing during an evacuation

  const getStatusColor = (status) => {
    if (status === 'SAFE') return '#10b981';
    if (status === 'EVACUATING') return '#f59e0b';
    if (status === 'MISSING') return '#ef4444';
    return '#64748b'; // CHECKED_IN
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes flashGreen {
            0% { background-color: rgba(16, 185, 129, 0.4); }
            100% { background-color: transparent; }
          }
          .flash-green-row {
            animation: flashGreen 2s ease-out;
          }
          .mp-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
          }
          .mp-table th {
            padding: 0.75rem;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            color: #94a3b8;
            font-weight: 500;
          }
          .mp-table td {
            padding: 0.75rem;
            border-bottom: 1px solid rgba(255,255,255,0.05);
          }
        `}
      </style>

      {/* Big Counter Boxes */}
      <div style={styles.counterRow}>
        <div style={{ ...styles.counterBox, borderColor: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
          <div style={styles.counterTitle}>✅ SAFE</div>
          <div style={{ ...styles.counterValue, color: '#10b981' }}>{safeCount}</div>
        </div>
        
        <div style={{ ...styles.counterBox, borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}>
          <div style={styles.counterTitle}>🚨 UNACCOUNTED</div>
          <div style={{ ...styles.counterValue, color: '#ef4444' }}>{missingCount}</div>
        </div>
      </div>

      {/* Guest Table */}
      <div style={styles.tableContainer}>
        <table className="mp-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Guest Name</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Need</th>
            </tr>
          </thead>
          <tbody>
            {guests.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No guests found for this property.
                </td>
              </tr>
            ) : (
              guests.map(g => (
                <tr 
                  key={g.id} 
                  className={flashingIds.has(g.id) ? 'flash-green-row' : ''}
                >
                  <td style={{ fontWeight: 'bold' }}>{g.roomId}</td>
                  <td>{g.name}</td>
                  <td>
                    <span style={{ 
                      ...styles.statusPill, 
                      backgroundColor: getStatusColor(g.checkInStatus) 
                    }}>
                      {g.checkInStatus}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '1.2rem' }}>
                    {g.specialNeeds ? '♿' : ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    height: '100%'
  },
  counterRow: {
    display: 'flex',
    gap: '1rem'
  },
  counterBox: {
    flex: 1,
    padding: '1rem',
    borderRadius: '8px',
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  counterTitle: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: '0.5rem',
    letterSpacing: '1px'
  },
  counterValue: {
    fontSize: '48px',
    fontWeight: '900',
    lineHeight: '1'
  },
  tableContainer: {
    flex: 1,
    overflowY: 'auto',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)'
  },
  statusPill: {
    padding: '0.2rem 0.6rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    color: 'white'
  }
};
