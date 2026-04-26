import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * Real-time Firestore listener for incidents belonging to a property.
 * Returns all incidents and picks the most urgent active one
 * (RED > AMBER) as activeIncident.
 */
export function useIncidentStream(propertyId) {
  const [incidents, setIncidents] = useState([]);
  const [activeIncident, setActiveIncident] = useState(null);

  useEffect(() => {
    if (!propertyId) return;

    const q = query(
      collection(db, "incidents"),
      where("propertyId", "==", propertyId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setIncidents(docs);

      // Pick the most urgent active incident: RED first, then AMBER
      const red = docs.find((d) => d.uiColor === "RED");
      const amber = docs.find((d) => d.uiColor === "AMBER");
      setActiveIncident(red || amber || null);
    });

    // IMPORTANT: always clean up the listener
    return unsub;
  }, [propertyId]);

  return { incidents, activeIncident };
}
