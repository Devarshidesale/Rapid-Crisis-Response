import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const FLOOR_PLAN_COORDS = {
  room101: [18.52040, 73.85670],
  room102: [18.52045, 73.85675],
  room201: [18.52050, 73.85680],
  room202: [18.52052, 73.85685],
  kitchen: [18.52035, 73.85660],
  lobby:   [18.52042, 73.85672],
  stair_a: [18.52055, 73.85670],
  stair_b: [18.52048, 73.85665],
  EXIT_NORTH: [18.52060, 73.85665],
  EXIT_SOUTH: [18.52025, 73.85665]
};

export default function BuildingMap({ incident, evacPath = [] }) {
  const [activeFloor, setActiveFloor] = useState(1);
  const mapCenter = [18.5204, 73.8567];

  const hasAlert = incident && (incident.uiColor === 'RED' || incident.uiColor === 'AMBER');
  const hazardCoords = hasAlert ? FLOOR_PLAN_COORDS[incident.zone] : null;

  // Convert node IDs from evacPath array to lat/lng coordinates
  const polylinePositions = (evacPath || [])
    .map(nodeId => FLOOR_PLAN_COORDS[nodeId])
    .filter(Boolean); // remove any undefined coordinates

  return (
    <div className="building-map-wrapper" style={styles.wrapper}>
      {/* Inline styles for the pulsing marker animation */}
      <style>
        {`
          @keyframes pulseMapMarker {
            0% { stroke-width: 0; stroke-opacity: 1; }
            100% { stroke-width: 20px; stroke-opacity: 0; }
          }
          .pulse-marker path {
            animation: pulseMapMarker 1.5s infinite;
            stroke: #ef4444;
          }
        `}
      </style>

      <div style={styles.header}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Building Overview</h3>
        {hasAlert && (
          <span style={styles.alertBadge}>
            Hazard Zone: {incident.zone.toUpperCase()}
          </span>
        )}
      </div>

      <div style={styles.mapContainer}>
        <MapContainer 
          center={mapCenter} 
          zoom={18} 
          style={{ height: '100%', width: '100%', borderRadius: '8px' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Hazard Marker */}
          {hazardCoords && (
            <CircleMarker 
              center={hazardCoords} 
              radius={20} 
              color="#ef4444" 
              fillOpacity={0.3}
              className="pulse-marker"
            >
              <Popup>Detected Hazard: {incident.type}</Popup>
            </CircleMarker>
          )}

          {/* Evacuation Route Polyline */}
          {polylinePositions.length > 1 && (
            <Polyline 
              positions={polylinePositions} 
              color="#10b981" 
              weight={4} 
              dashArray="10, 10"
            />
          )}

          {/* Assembly Point Marker */}
          <CircleMarker 
            center={FLOOR_PLAN_COORDS.EXIT_NORTH} 
            radius={8} 
            color="#10b981" 
            fillColor="#10b981" 
            fillOpacity={0.8}
          >
            <Popup>Safe Assembly Point</Popup>
          </CircleMarker>
          <CircleMarker 
            center={FLOOR_PLAN_COORDS.EXIT_SOUTH} 
            radius={8} 
            color="#10b981" 
            fillColor="#10b981" 
            fillOpacity={0.8}
          >
            <Popup>Safe Assembly Point</Popup>
          </CircleMarker>

        </MapContainer>
      </div>

      <div style={styles.floorTabs}>
        {[1, 2, 3].map(floor => (
          <button 
            key={floor}
            style={activeFloor === floor ? styles.tabActive : styles.tabInactive}
            onClick={() => setActiveFloor(floor)}
          >
            Floor {floor}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: '1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  mapContainer: {
    flex: 1,
    minHeight: '300px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  floorTabs: {
    display: 'flex',
    gap: '0.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: '0.5rem'
  },
  tabActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '0.4rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem'
  },
  tabInactive: {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '0.4rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem'
  }
};
