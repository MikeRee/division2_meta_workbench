import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DATA_KEYS, type DataKey } from '../constants/dataKeys';

// Re-export for backwards compatibility
export const RAW_SHEET_KEYS = DATA_KEYS;
export type RawSheetKey = DataKey;

interface RawDataState {
  // Store everything as raw arrays of objects
  sheets: Partial<Record<RawSheetKey, any[]>>;
  lastUpdated: Record<string, number>;
  isLoading: boolean;

  // Actions
  setRawData: (key: RawSheetKey, data: any[]) => void;
  getRawData: (key: RawSheetKey) => any[];
  hasData: (key: RawSheetKey) => boolean;
  clearSheet: (key: RawSheetKey) => void;
  getAllKeys: () => RawSheetKey[];
  setLoading: (loading: boolean) => void;
  clearAll: () => void;
  loadAllRawFiles: () => Promise<void>;
  saveToFile: (key: RawSheetKey) => void;
}

/**
 * Helper function to save raw data to file
 * Triggers a download in the browser
 */
const downloadRawDataFile = (key: string, data: any[]) => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${key}.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`Saved raw data: ${key}.json`);
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
    throw error;
  }
};

/**
 * Convert camelCase to snake_case
 */
const camelToSnake = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * Convert snake_case to camelCase
 */
const snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Load a single JSON file from /raw directory
 */
const loadRawFile = async (filename: string): Promise<any[] | null> => {
  try {
    const response = await fetch(`/raw/${filename}`);
    if (!response.ok) {
      console.warn(`Failed to load /raw/${filename}: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return Array.isArray(data) ? data : null;
  } catch (error) {
    console.error(`Error loading /raw/${filename}:`, error);
    return null;
  }
};

/**
 * RawDataStore - Stores raw unprocessed data from Google Sheets
 * No normalization or model instantiation - just raw arrays
 */
export const useRawDataStore = create<RawDataState>()(
  persist(
    (set, get) => ({
      sheets: {},
      lastUpdated: {},
      isLoading: false,

      setRawData: (key, data) => {
        set((state) => ({
          sheets: { ...state.sheets, [key]: data },
          lastUpdated: { ...state.lastUpdated, [key]: Date.now() },
        }));
      },

      getRawData: (key) => get().sheets[key] || [],

      hasData: (key) => {
        const data = get().sheets[key];
        return data !== undefined && Array.isArray(data) && data.length > 0;
      },

      clearSheet: (key) =>
        set((state) => {
          const newSheets = { ...state.sheets };
          const newLastUpdated = { ...state.lastUpdated };
          delete newSheets[key];
          delete newLastUpdated[key];
          return { sheets: newSheets, lastUpdated: newLastUpdated };
        }),

      getAllKeys: () => Object.keys(get().sheets) as RawSheetKey[],

      setLoading: (isLoading) => set({ isLoading }),

      clearAll: () =>
        set({
          sheets: {},
          lastUpdated: {},
        }),

      loadAllRawFiles: async () => {
        set({ isLoading: true });
        try {
          const results = await Promise.all(
            RAW_SHEET_KEYS.map(async (key) => {
              const filename = `${camelToSnake(key)}.json`;
              const data = await loadRawFile(filename);
              return { key, data };
            })
          );

          const newSheets: Partial<Record<RawSheetKey, any[]>> = {};
          const newLastUpdated: Record<string, number> = {};
          const now = Date.now();

          results.forEach(({ key, data }) => {
            if (data) {
              newSheets[key] = data;
              newLastUpdated[key] = now;
              console.log(`Loaded ${key} from /raw (${data.length} items)`);
            }
          });

          set((state) => ({
            sheets: { ...state.sheets, ...newSheets },
            lastUpdated: { ...state.lastUpdated, ...newLastUpdated },
            isLoading: false,
          }));
        } catch (error) {
          console.error('Error loading raw files:', error);
          set({ isLoading: false });
        }
      },

      saveToFile: (key) => {
        const data = get().sheets[key];
        if (!data || !Array.isArray(data) || data.length === 0) {
          console.warn(`No data found for key: ${key}`);
          return;
        }
        const filename = camelToSnake(key);
        downloadRawDataFile(filename, data);
      },
    }),
    { name: 'raw-sheets-cache' }
  )
);

export default useRawDataStore;
