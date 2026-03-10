import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DATA_KEYS, type DataKey } from '../constants/dataKeys';
import Weapon from '../models/Weapon';
import WeaponTalent from '../models/WeaponTalent';
import ExoticWeapon from '../models/ExoticWeapon';
import Gearset from '../models/Gearset';
import Brandset from '../models/Brandset';
import GearTalent from '../models/GearTalent';
import NamedGear from '../models/NamedGear';
import Skill from '../models/Skill';
import WeaponMod from '../models/WeaponMod';
import Attribute from '../models/Attribute';
import GearMod from '../models/GearMod';
import { KeenersWatchStats } from '../models/KeenersWatchStats';
import StatusImmunity from '../models/StatusImmunity';

// Re-export for backwards compatibility
export const CLEAN_DATA_KEYS = DATA_KEYS;
export type CleanDataKey = DataKey;

// Type mapping for each clean data key
export interface CleanDataTypeMap {
  weapons: Weapon[];
  weaponTalents: WeaponTalent[];
  exoticWeapons: ExoticWeapon[];
  gearsets: Gearset[];
  brandsets: Brandset[];
  gearTalents: GearTalent[];
  namedGear: NamedGear[];
  skills: Skill[];
  weaponMods: WeaponMod[];
  specializations: any[]; // No specific model yet
  weaponAttributes: Attribute[];
  weaponTypeAttributes: Attribute[];
  gearAttributes: Attribute[];
  gearMods: GearMod[];
  keenersWatch: KeenersWatchStats;
  statusImmunities: StatusImmunity[];
}

interface CleanDataState {
  // Typed clean data storage
  data: Partial<CleanDataTypeMap>;
  lastUpdated: Record<CleanDataKey, number>;
  isProcessing: boolean;

  // Actions
  setCleanData: <K extends CleanDataKey>(key: K, data: CleanDataTypeMap[K]) => void;
  getCleanData: <K extends CleanDataKey>(key: K) => CleanDataTypeMap[K] | undefined;
  hasCleanData: (key: CleanDataKey) => boolean;
  removeCleanData: (key: CleanDataKey) => void;
  clearAll: () => void;
  setProcessing: (isProcessing: boolean) => void;
}

/**
 * Mapping of data keys to their class constructors
 */
const CLASS_CONSTRUCTORS: Partial<Record<CleanDataKey, new (data: any) => any>> = {
  weapons: Weapon,
  weaponTalents: WeaponTalent,
  exoticWeapons: ExoticWeapon,
  gearsets: Gearset,
  brandsets: Brandset,
  gearTalents: GearTalent,
  namedGear: NamedGear,
  skills: Skill,
  weaponMods: WeaponMod,
  weaponAttributes: Attribute,
  weaponTypeAttributes: Attribute,
  gearAttributes: Attribute,
  gearMods: GearMod,
  statusImmunities: StatusImmunity,
  // keenersWatch and specializations have no class constructors
};

/**
 * Restore class instances from plain objects after deserialization
 */
const restoreClassInstances = (key: CleanDataKey, data: any): any => {
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
      lastUpdated: {} as Record<CleanDataKey, number>,
      isProcessing: false,

      // Actions
      setCleanData: (key, data) => {
        set((state) => ({
          data: { ...state.data, [key]: data },
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

      clearAll: () => set({
        data: {},
        lastUpdated: {} as Record<CleanDataKey, number>,
      }),

      setProcessing: (isProcessing) => set({ isProcessing }),
    }),
    {
      name: 'clean-data-store',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // After rehydration, restore class instances from plain objects
        if (state?.data) {
          const restoredData: any = {};
          for (const [dataKey, dataValue] of Object.entries(state.data)) {
            restoredData[dataKey] = restoreClassInstances(
              dataKey as CleanDataKey,
              dataValue
            );
          }
          state.data = restoredData;
        }
      },
    }
  )
);

export default useCleanDataStore;
export { useCleanDataStore };
