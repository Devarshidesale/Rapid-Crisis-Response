import React from 'react';

export default function ConfidenceGauge({ vcs = 0, uiColor = 'BLUE' }) {
  // Math for 180 degree arc
  const radius = 80;
  const arcLength = Math.PI * radius; // ~251.327
  const fillLength = (vcs / 100) * arcLength;
  const strokeDashoffset = arcLength - fillLength;

  // Colors based on uiColor
  const colorMap = {
    BLUE: '#3b82f6',
    AMBER: '#f59e0b',
    RED: '#ef4444'
  };
  const activeColor = colorMap[uiColor] || colorMap.BLUE;

  // Status text based on uiColor
  const statusTextMap = {
    BLUE: 'All Systems Normal',
    AMBER: 'Verifying Threat...',
    RED: '⚠ VERIFIED — P1 ACTIVE'
  };
  const statusText = statusTextMap[uiColor] || statusTextMap.BLUE;

  return (
    <div 
      className={`confidence-gauge-container ${uiColor === 'RED' ? 'pulse-red' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <style>
        {`
          @keyframes pulseRedAlert {
            0% { transform: scale(1.0); }
            50% { transform: scale(1.03); }
            100% { transform: scale(1.0); }
          }
          .pulse-red {
            animation: pulseRedAlert 1s infinite;
          }
          .gauge-path {
            transition: stroke-dashoffset 0.8s ease, stroke 0.8s ease;
          }
        `}
      </style>

      <svg width="240" height="130" viewBox="0 0 200 110">
        {/* Background Arc */}
        <path 
          d="M 20 100 A 80 80 0 0 1 180 100" 
          fill="none" 
          stroke="#1e293b" 
          strokeWidth="16" 
          strokeLinecap="round" 
        />
        
        {/* Foreground Arc */}
        <path 
          className="gauge-path"
          d="M 20 100 A 80 80 0 0 1 180 100" 
          fill="none" 
          stroke={activeColor} 
          strokeWidth="16" 
          strokeLinecap="round" 
          strokeDasharray={arcLength}
          strokeDashoffset={strokeDashoffset}
        />
        
        {/* Centered VCS Number */}
        <text 
          x="100" 
          y="95" 
          textAnchor="middle" 
          fill={activeColor} 
          style={{ fontSize: '32px', fontWeight: 'bold', fontFamily: 'sans-serif' }}
        >
          {vcs}
        </text>
      </svg>

      {/* Status Text */}
      <div 
        style={{ 
          color: activeColor, 
          fontSize: '1.1rem', 
          fontWeight: '600', 
          marginTop: '10px',
          textShadow: uiColor === 'RED' ? '0 0 10px rgba(239,68,68,0.5)' : 'none'
        }}
      >
        {statusText}
      </div>
    </div>
  );
}
