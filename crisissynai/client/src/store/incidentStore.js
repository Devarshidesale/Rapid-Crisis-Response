import { create } from "zustand";

const useIncidentStore = create((set) => ({
  // The currently selected / most urgent incident object
  activeIncident: null,
  setActiveIncident: (incident) => set({ activeIncident: incident }),

  // Which property this dashboard is viewing
  propertyId: "hotel-a",
  setPropertyId: (id) => set({ propertyId: id }),
}));

export default useIncidentStore;
