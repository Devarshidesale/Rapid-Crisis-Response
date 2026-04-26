import React, { useState, useEffect } from 'react';

export default function SensorPanel() {
  const [sensors, setSensors] = useState({
    smoke_kitchen: { label: 'Smoke - Kitchen', value: 12, unit: 'ppm', threshold: 50, status: 'normal' },
    smoke_lobby: { label: 'Smoke - Lobby', value: 5, unit: 'ppm', threshold: 50, status: 'normal' },
    heat_kitchen: { label: 'Heat - Kitchen', value: 28, unit: '°C', threshold: 60, status: 'normal' },
    heat_stair: { label: 'Heat - Stairwell', value: 24, unit: '°C', threshold: 60, status: 'normal' },
    co_level: { label: 'CO Level', value: 2, unit: 'ppm', threshold: 35, status: 'normal' },
    sprinkler: { label: 'Sprinkler System', value: 100, unit: '%', threshold: 50, status: 'normal' },
  });

  // Simulate live sensor fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setSensors(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          const s = { ...updated[key] };
          // Small random fluctuation
          const delta = (Math.random() - 0.5) * 4;
          s.value = Math.max(0, Math.round((s.value + delta) * 10) / 10);
          s.status = s.value > s.threshold ? 'alert' : s.value > s.threshold * 0.7 ? 'warning' : 'normal';
          updated[key] = s;
        });
        return updated;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Spike a sensor (called by demo controls)
  const spikeSensor = (key, newValue) => {
    setSensors(prev => ({
      ...prev,
      [key]: { ...prev[key], value: newValue, status: newValue > prev[key].threshold ? 'alert' : 'warning' }
    }));
  };

  const getColor = (status) => {
    if (status === 'alert') return '#ef4444';
    if (status === 'warning') return '#f59e0b';
    return '#10b981';
  };

  const getBarWidth = (value, threshold) => {
    return Math.min(100, (value / (threshold * 1.5)) * 100);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>IoT Sensor Grid</h3>
        <span style={styles.liveTag}>LIVE</span>
      </div>

      <div style={styles.grid}>
        {Object.entries(sensors).map(([key, s]) => (
          <div key={key} style={{
            ...styles.sensorCard,
            borderLeftColor: getColor(s.status),
          }}>
            <div style={styles.sensorLabel}>{s.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
              <span style={{ ...styles.sensorValue, color: getColor(s.status) }}>
                {s.value}
              </span>
              <span style={styles.sensorUnit}>{s.unit}</span>
            </div>
            <div style={styles.barTrack}>
              <div style={{
                ...styles.barFill,
                width: `${getBarWidth(s.value, s.threshold)}%`,
                backgroundColor: getColor(s.status),
              }} />
            </div>
            {s.status === 'alert' && (
              <div style={styles.alertText}>THRESHOLD EXCEEDED</div>
            )}
          </div>
        ))}
      </div>

      <button
        style={styles.spikeBtn}
        onClick={() => {
          spikeSensor('smoke_kitchen', 78);
          spikeSensor('heat_kitchen', 65);
          spikeSensor('co_level', 42);
        }}
      >
        Sim: Kitchen Fire Sensors
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveTag: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '0.1rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    letterSpacing: '1px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
  },
  sensorCard: {
    background: 'rgba(255,255,255,0.03)',
    borderLeft: '3px solid #10b981',
    borderRadius: '6px',
    padding: '0.6rem',
  },
  sensorLabel: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    marginBottom: '0.25rem',
    textTransform: 'uppercase',
  },
  sensorValue: {
    fontSize: '1.4rem',
    fontWeight: '900',
  },
  sensorUnit: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  barTrack: {
    width: '100%',
    height: '3px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '2px',
    marginTop: '0.3rem',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    transition: 'width 0.5s ease, background-color 0.5s ease',
    borderRadius: '2px',
  },
  alertText: {
    fontSize: '0.6rem',
    color: '#ef4444',
    fontWeight: 'bold',
    marginTop: '0.2rem',
    letterSpacing: '0.5px',
  },
  spikeBtn: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
    padding: '0.4rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 'bold',
  },
};
