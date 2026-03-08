import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface CleanDataState {
  // Clean data storage
  cleanData: Map<string, any>;
  
  // Metadata
  lastUpdated: number | null;
  isProcessing: boolean;

  // Actions
  setCleanData: (key: string, data: any) => void;
  getCleanData: (key: string) => any | undefined;
  hasCleanData: (key: string) => boolean;
  removeCleanData: (key: string) => void;
  getAllCleanData: () => Record<string, any>;
  clearAll: () => void;
  setProcessing: (isProcessing: boolean) => void;
}

/**
 * CleanDataStore - Stores cleaned/normalized versions of data
 * Provides simple key-value storage for processed data
 */
const useCleanDataStore = create<CleanDataState>()(
  persist(
    (set, get) => ({
      // Data storage
      cleanData: new Map<string, any>(),
      
      // Metadata
      lastUpdated: null,
      isProcessing: false,

      // Actions
      setCleanData: (key, data) => {
        const currentData = get().cleanData;
        const newData = new Map(currentData);
        newData.set(key, data);
        set({ cleanData: newData, lastUpdated: Date.now() });
      },

      getCleanData: (key) => get().cleanData.get(key),

      hasCleanData: (key) => get().cleanData.has(key),

      removeCleanData: (key) => {
        const currentData = get().cleanData;
        const newData = new Map(currentData);
        newData.delete(key);
        set({ cleanData: newData, lastUpdated: Date.now() });
      },

      getAllCleanData: () => {
        const dataMap = get().cleanData;
        return Object.fromEntries(dataMap.entries());
      },

      clearAll: () => set({
        cleanData: new Map(),
        lastUpdated: null,
      }),

      setProcessing: (isProcessing) => set({ isProcessing }),
    }),
    {
      name: 'clean-data-store',
      storage: createJSONStorage(() => localStorage, {
        reviver: (_key, value: any) => {
          if (_key === 'cleanData' && Array.isArray(value)) {
            return new Map(value);
          }
          return value;
        },
        replacer: (_key, value) => {
          if (value instanceof Map) {
            return Array.from(value.entries());
          }
          return value;
        }
      })
    }
  )
);

export default useCleanDataStore;
export { useCleanDataStore };
