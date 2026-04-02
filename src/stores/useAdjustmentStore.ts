import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AdjustmentModifier {
  id: string;
  label: string;
  stat: string;
  value: number;
}

interface AdjustmentState {
  personalAccuracy: number;
  headshotPercentage: number;
  modifiers: AdjustmentModifier[];

  setPersonalAccuracy: (value: number) => void;
  setHeadshotPercentage: (value: number) => void;
  addModifier: (modifier: Omit<AdjustmentModifier, 'id'>) => void;
  updateModifier: (id: string, updates: Partial<Omit<AdjustmentModifier, 'id'>>) => void;
  removeModifier: (id: string) => void;
}

const useAdjustmentStore = create<AdjustmentState>()(
  persist(
    (set) => ({
      personalAccuracy: 50,
      headshotPercentage: 10,
      modifiers: [
        {
          id: crypto.randomUUID(),
          label: 'Critical Hit Base Adjustment',
          stat: 'critical hit damage',
          value: 25,
        },
      ],

      setPersonalAccuracy: (value) => set({ personalAccuracy: Math.min(100, Math.max(0, value)) }),
      setHeadshotPercentage: (value) =>
        set({ headshotPercentage: Math.min(100, Math.max(0, value)) }),

      addModifier: (modifier) =>
        set((state) => ({
          modifiers: [...state.modifiers, { ...modifier, id: crypto.randomUUID() }],
        })),

      updateModifier: (id, updates) =>
        set((state) => ({
          modifiers: state.modifiers.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),

      removeModifier: (id) =>
        set((state) => ({
          modifiers: state.modifiers.filter((m) => m.id !== id),
        })),
    }),
    {
      name: 'adjustment-modifiers-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export default useAdjustmentStore;
