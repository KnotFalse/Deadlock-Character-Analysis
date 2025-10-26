import { create } from "zustand";
import Fuse from "fuse.js";
import type { GraphData, GraphNode } from "../types";

interface FilterState {
  searchTerm: string;
  activeLabels: Set<string>;
  activeArchetypes: Set<string>;
  relationshipFilters: Set<string>;
  mechanicFilter: string | null;
  selectedNodeId: string | null;
}

interface GraphStore extends FilterState {
  setSearchTerm: (term: string) => void;
  toggleLabel: (label: string) => void;
  toggleArchetype: (label: string) => void;
  toggleRelationship: (type: string) => void;
  setMechanicFilter: (mechanic: string | null) => void;
  setSelectedNode: (id: string | null) => void;
  fuse: Fuse<GraphNode> | null;
  graphData: GraphData | null;
  setGraphData: (data: GraphData) => void;
  clearFilters: () => void;
}

const DEFAULT_LABELS = new Set(["Character", "Ability", "Mechanic", "Archetype"]);

export const useGraphStore = create<GraphStore>()((set) => ({
  searchTerm: "",
  activeLabels: new Set(DEFAULT_LABELS),
  activeArchetypes: new Set<string>(),
  relationshipFilters: new Set<string>(),
  mechanicFilter: null,
  selectedNodeId: null,
  fuse: null,
  graphData: null,
  setSearchTerm: (term: string) => set({ searchTerm: term }),
  toggleLabel: (label: string) =>
    set((state) => {
      const next = new Set(state.activeLabels);
      next.has(label) ? next.delete(label) : next.add(label);
      return { activeLabels: next };
    }),
  toggleArchetype: (label: string) =>
    set((state) => {
      const next = new Set(state.activeArchetypes);
      next.has(label) ? next.delete(label) : next.add(label);
      return { activeArchetypes: next };
    }),
  toggleRelationship: (type: string) =>
    set((state) => {
      const next = new Set(state.relationshipFilters);
      next.has(type) ? next.delete(type) : next.add(type);
      return { relationshipFilters: next };
    }),
  setMechanicFilter: (mechanic: string | null) => set({ mechanicFilter: mechanic }),
  setSelectedNode: (id: string | null) => set({ selectedNodeId: id }),
  setGraphData: (data: GraphData) =>
    set(() => ({
      graphData: data,
      fuse: new Fuse(data.nodes, {
        keys: [
          "properties.name",
          "properties.description",
          "id",
          "label",
          "properties.archetype",
        ],
        threshold: 0.3,
      }),
    })),
  clearFilters: () =>
    set({
      activeLabels: new Set(DEFAULT_LABELS),
      activeArchetypes: new Set<string>(),
      relationshipFilters: new Set<string>(),
      mechanicFilter: null,
      searchTerm: "",
    }),
}));
