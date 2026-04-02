import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MAIN_DATA_KEYS, type MainDataKey } from '../constants/dataKeys';
import Weapon from '../models/Weapon';
import Gearset from '../models/Gearset';
import Brandset from '../models/Brandset';
import Skill from '../models/Skill';
import WeaponMod from '../models/WeaponMod';
import Talent from '../models/Talent';
import Specialization from '../models/Specialization';
import NamedExoticGear from '../models/NamedExoticGear';
import GearAttribute from '../models/GearAttribute';
import KeenersWatchAttribute from '../models/KeenersWatchAttribute';
import WeaponTypeAttribute from '../models/WeaponTypeAttribute';
import GearModAttribute from '../models/GearModAttribute';
import { serializePromptData } from '../utils/promptDataSerializer';

// Type mapping for each clean data key
export interface CleanDataTypeMap {
  weapons: Weapon[];
  gearsets: Gearset[];
  brandsets: Brandset[];
  namedGear: NamedExoticGear[];
  skills: Skill[];
  weaponMods: WeaponMod[];
  talents: Talent[];
  specializations: Specialization[];
  weaponAttributes: Record<string, number>;
  gearAttributes: GearAttribute[];
  keenersWatch: KeenersWatchAttribute[];
  weaponTypeAttributes: WeaponTypeAttribute[];
  gearMods: GearModAttribute[];
}

interface CleanDataState {
  // Typed clean data storage
  data: Partial<CleanDataTypeMap>;
  lastUpdated: Record<MainDataKey, number>;
  isProcessing: boolean;

  // Actions
  setCleanData: <K extends MainDataKey>(key: K, data: CleanDataTypeMap[K]) => void;
  getCleanData: <K extends MainDataKey>(key: K) => CleanDataTypeMap[K] | undefined;
  hasCleanData: (key: MainDataKey) => boolean;
  removeCleanData: (key: MainDataKey) => void;
  clearAll: () => void;
  setProcessing: (isProcessing: boolean) => void;
  getAttributeVocabulary: () => [string, string][];
  getPromptDataSummary: () => { text: string; charCount: number; tokenEstimate: number };
}

/**
 * Mapping of data keys to their class constructors
 */
export const CLASS_CONSTRUCTORS: Partial<Record<MainDataKey, new (data: any) => any>> = {
  weapons: Weapon,
  gearsets: Gearset,
  brandsets: Brandset,
  namedGear: NamedExoticGear,
  skills: Skill,
  weaponMods: WeaponMod,
  talents: Talent,
  specializations: Specialization,
  gearAttributes: GearAttribute,
  keenersWatch: KeenersWatchAttribute,
  weaponTypeAttributes: WeaponTypeAttribute,
  gearMods: GearModAttribute,
};

/**
 * Get model fields from a class constructor by instantiating it with empty data
 */
export const getModelFields = (dataKey: MainDataKey): string[] => {
  const Constructor = CLASS_CONSTRUCTORS[dataKey];
  if (!Constructor) {
    return [];
  }

  try {
    const instance = new Constructor({});
    return Object.keys(instance);
  } catch (error) {
    console.error(`Failed to get fields for ${dataKey}:`, error);
    return [];
  }
};

/**
 * Get model field types from the FIELD_TYPES static property
 */
export const getModelFieldTypes = (dataKey: MainDataKey): Record<string, string> => {
  const Constructor = CLASS_CONSTRUCTORS[dataKey] as any;
  if (!Constructor || !Constructor.FIELD_TYPES) {
    return {};
  }
  return { ...Constructor.FIELD_TYPES };
};

/**
 * Restore class instances from plain objects after deserialization
 */
const restoreClassInstances = (key: MainDataKey, data: any): any => {
  if (!data) return undefined;

  try {
    const Constructor = CLASS_CONSTRUCTORS[key];
    if (Constructor && Array.isArray(data)) {
      return data.map((item) => new Constructor(item));
    }
    return data;
  } catch (error) {
    console.error(`Failed to restore class instances for ${key}:`, error);
    return data;
  }
};

/**
 * CleanDataStore - Stores cleaned/normalized versions of data with typed models
 * Mirrors RawDataStore structure but uses structured model instances
 */
const useCleanDataStore = create<CleanDataState>()(
  persist(
    (set, get) => ({
      // Data storage
      data: {},
      lastUpdated: {} as Record<MainDataKey, number>,
      isProcessing: false,

      // Actions
      setCleanData: (key, data) => {
        // Restore class instances when setting clean data
        const restoredData = restoreClassInstances(key, data);
        set((state) => ({
          data: { ...state.data, [key]: restoredData },
          lastUpdated: { ...state.lastUpdated, [key]: Date.now() },
        }));
      },

      getCleanData: (key) => get().data[key],

      hasCleanData: (key) => {
        const data = get().data[key];
        return data !== undefined && (Array.isArray(data) ? data.length > 0 : true);
      },

      removeCleanData: (key) => {
        set((state) => {
          const newData = { ...state.data };
          const newLastUpdated = { ...state.lastUpdated };
          delete newData[key];
          delete newLastUpdated[key];
          return { data: newData, lastUpdated: newLastUpdated };
        });
      },

      clearAll: () =>
        set({
          data: {},
          lastUpdated: {} as Record<MainDataKey, number>,
        }),

      setProcessing: (isProcessing) => set({ isProcessing }),

      getAttributeVocabulary: () => {
        const names = new Set<string>();
        const data = get().data;

        // Gearset: twoPc, threePc (Record<string, number>)
        const gearsets = data.gearsets;
        if (gearsets) {
          for (const gs of gearsets) {
            for (const key of Object.keys(gs.twoPc)) {
              if (key) names.add(key);
            }
            for (const key of Object.keys(gs.threePc)) {
              if (key) names.add(key);
            }
          }
        }

        // Brandset: onePc, twoPc, threePc (Record<string, number>)
        const brandsets = data.brandsets;
        if (brandsets) {
          for (const bs of brandsets) {
            for (const key of Object.keys(bs.onePc)) {
              if (key) names.add(key);
            }
            for (const key of Object.keys(bs.twoPc)) {
              if (key) names.add(key);
            }
            for (const key of Object.keys(bs.threePc)) {
              if (key) names.add(key);
            }
          }
        }

        // NamedExoticGear: attribute1, attribute2 (Record<string, number>)
        const namedGear = data.namedGear;
        if (namedGear) {
          for (const ng of namedGear) {
            for (const minor of [ng.attribute1, ng.attribute2]) {
              if (minor && typeof minor === 'object') {
                for (const key of Object.keys(minor)) {
                  if (key && key !== 'armor' && key !== 'skill tier') {
                    names.add(key);
                  }
                }
              }
            }
          }
        }

        const sorted = Array.from(names).sort();
        return sorted.map((n) => [n, n] as [string, string]);
      },

      getPromptDataSummary: () => {
        return serializePromptData(get().data);
      },
    }),
    {
      name: 'clean-data-store',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // After rehydration, restore class instances from plain objects
        if (state?.data) {
          const restoredData: any = {};
          for (const [dataKey, dataValue] of Object.entries(state.data)) {
            restoredData[dataKey] = restoreClassInstances(dataKey as MainDataKey, dataValue);
          }
          state.data = restoredData;
        }
      },
      skipHydration: true,
    },
  ),
);

export default useCleanDataStore;
export { useCleanDataStore };
