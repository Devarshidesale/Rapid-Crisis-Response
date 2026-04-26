import React, { useState } from 'react';

export default function ActionPanel({ geminiPlan, incidentId, backendUrl }) {
  const [approvedIds, setApprovedIds] = useState([]);
  const [rejectedIds, setRejectedIds] = useState([]);

  if (!geminiPlan) {
    return (
      <div style={styles.emptyContainer}>
        <style>
          {`
            @keyframes spin { 100% { transform: rotate(360deg); } }
            .loading-spinner {
              width: 40px; height: 40px;
              border: 3px solid rgba(255, 255, 255, 0.1);
              border-top-color: #3b82f6;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin-bottom: 1rem;
            }
          `}
        </style>
        <div className="loading-spinner"></div>
        <p style={{ color: '#94a3b8' }}>Waiting for AI analysis...</p>
      </div>
    );
  }

  const handleApprove = async (id) => {
    try {
      // Optimistic update for UI responsiveness
      setApprovedIds(prev => [...prev, id]);
      
      const res = await fetch(`${backendUrl}/incident/${incidentId}/action/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' })
      });
      
      if (!res.ok) {
        console.warn("Backend endpoint missing or failed, but UI state updated for demo.");
      }
    } catch (err) {
      console.error("Failed to approve action", err);
    }
  };

  const handleReject = (id) => {
    setRejectedIds(prev => [...prev, id]);
  };

  const getSeverityColor = (sev) => {
    if (sev === 'P1') return '#ef4444'; // Red
    if (sev === 'P2') return '#f59e0b'; // Orange
    return '#6b7280'; // Gray (P3)
  };

  const getCertColor = (cert) => {
    if (cert === 'CPR') return '#ef4444';
    if (cert === 'FIRE_SAFETY') return '#f59e0b';
    if (cert === 'FIRST_AID') return '#3b82f6';
    return '#64748b';
  };

  return (
    <div style={styles.container}>
      {/* Top Card */}
      <div style={styles.topCard}>
        <div style={styles.summary}>{geminiPlan.summary}</div>
        <div style={styles.badgesRow}>
          <span style={{ ...styles.badge, backgroundColor: getSeverityColor(geminiPlan.severity) }}>
            {geminiPlan.severity} INCIDENT
          </span>
          <span style={{ ...styles.badge, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
            ~{geminiPlan.estimatedAffectedGuests} guests affected
          </span>
        </div>
      </div>

      {/* Actions List */}
      <h3 style={styles.sectionTitle}>Required Actions</h3>
      <div style={styles.actionList}>
        {(geminiPlan.actions || []).map(action => {
          if (rejectedIds.includes(action.id)) return null;
          
          const isApproved = approvedIds.includes(action.id);
          
          return (
            <div key={action.id} style={styles.actionCard}>
              <div style={styles.actionHeader}>
                <span style={{ ...styles.priorityChip, color: getSeverityColor(action.priority) }}>
                  {action.priority}
                </span>
                <span style={styles.actionDesc}>{action.description}</span>
              </div>
              
              <div style={styles.actionFooter}>
                {isApproved ? (
                  <span style={styles.approvedText}>Approved ✓</span>
                ) : (
                  <div style={styles.buttonGroup}>
                    <button 
                      style={styles.approveBtn} 
                      onClick={() => handleApprove(action.id)}
                    >
                      ✓ Approve
                    </button>
                    <button 
                      style={styles.rejectBtn}
                      onClick={() => handleReject(action.id)}
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Staff Tasks */}
      <h3 style={{ ...styles.sectionTitle, marginTop: '1.5rem' }}>Staff Assignments</h3>
      <div style={styles.taskList}>
        {(geminiPlan.staffTasks || []).map(task => (
          <div key={task.taskId} style={styles.taskRow}>
            <span style={{ ...styles.certChip, backgroundColor: getCertColor(task.requiredCert) }}>
              {task.requiredCert}
            </span>
            <span style={styles.taskDesc}>{task.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    width: '100%'
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: '200px'
  },
  topCard: {
    background: 'rgba(0, 0, 0, 0.2)',
    padding: '1.25rem',
    borderRadius: '8px',
    borderLeft: '4px solid #ef4444'
  },
  summary: {
    fontWeight: 'bold',
    fontSize: '1.1rem',
    color: '#f8fafc',
    marginBottom: '1rem'
  },
  badgesRow: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  badge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: '0.5px'
  },
  sectionTitle: {
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#94a3b8',
    margin: '0.5rem 0 0.25rem 0'
  },
  actionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  actionCard: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  actionHeader: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start'
  },
  priorityChip: {
    fontSize: '0.75rem',
    fontWeight: 'bold',
    padding: '0.1rem 0',
    minWidth: '24px'
  },
  actionDesc: {
    fontSize: '0.95rem',
    color: '#e2e8f0',
    lineHeight: '1.4'
  },
  actionFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '0.25rem'
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.75rem'
  },
  approveBtn: {
    background: '#10b981',
    color: '#fff',
    border: 'none',
    padding: '0.4rem 1rem',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '0.85rem'
  },
  rejectBtn: {
    background: 'transparent',
    color: '#ef4444',
    border: '1px solid #ef4444',
    padding: '0.4rem 1rem',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '0.85rem'
  },
  approvedText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  taskRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    background: 'rgba(255, 255, 255, 0.02)',
    padding: '0.75rem',
    borderRadius: '6px'
  },
  certChip: {
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    color: '#fff',
    whiteSpace: 'nowrap'
  },
  taskDesc: {
    fontSize: '0.9rem',
    color: '#cbd5e1'
  }
};
