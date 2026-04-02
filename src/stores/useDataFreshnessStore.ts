import { create } from 'zustand';
import { getBasePath } from '../utils/basePath';
import { useCleanDataStore } from './useCleanDataStore';
import { useFormulaStore } from './useFormulaStore';
import type { MainDataKey } from '../constants/dataKeys';

/** Simple string hash for comparison (djb2) */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

/** All trackable data keys — MainDataKey + formulas */
export type TrackableKey = MainDataKey | 'formulas';

/** The JSON files we track */
const TRACKED_FILES: Record<TrackableKey, string> = {
  weapons: 'clean/weapons.json',
  gearsets: 'clean/gearsets.json',
  brandsets: 'clean/brandsets.json',
  namedGear: 'clean/namedGear.json',
  skills: 'data/skills.json',
  weaponMods: 'clean/weaponMods.json',
  talents: 'clean/talents.json',
  specializations: 'clean/specializations.json',
  gearMods: 'clean/gearMods.json',
  gearAttributes: 'clean/gearAttributes.json',
  weaponAttributes: 'clean/weaponAttributes.json',
  keenersWatch: 'clean/keenersWatch.json',
  prompts: 'clean/prompts.json',
  formulas: 'clean/formulas.json',
};

interface DataFreshnessState {
  /** Hash of each JSON file at the time it was loaded into the store */
  loadedHashes: Record<string, number>;
  /** Keys whose disk JSON differs from what was originally loaded */
  staleKeys: Set<TrackableKey>;
  checking: boolean;
  lastChecked: number | null;

  /** Record the hash of a file when it gets loaded into a store */
  setLoadedHash: (key: TrackableKey, hash: number) => void;
  /** Snapshot current disk hashes for all files (call once after initial load) */
  snapshotCurrentHashes: () => Promise<void>;
  /** Compare disk JSON against the loaded hashes */
  checkFreshness: () => Promise<void>;
  /** Reload stale keys from disk into their respective stores */
  reloadStaleData: () => Promise<void>;
  markFresh: (key: TrackableKey) => void;
}

export const useDataFreshnessStore = create<DataFreshnessState>()((set, get) => ({
  loadedHashes: {},
  staleKeys: new Set(),
  checking: false,
  lastChecked: null,

  setLoadedHash: (key, hash) =>
    set((state) => ({
      loadedHashes: { ...state.loadedHashes, [key]: hash },
    })),

  snapshotCurrentHashes: async () => {
    const base = getBasePath();
    const hashes: Record<string, number> = {};

    await Promise.all(
      Object.entries(TRACKED_FILES).map(async ([key, file]) => {
        try {
          const res = await fetch(`${base}/${file}`);
          if (!res.ok) return;
          const text = await res.text();
          hashes[key] = hashString(text);
        } catch {
          // skip
        }
      }),
    );

    set({ loadedHashes: hashes });
  },

  checkFreshness: async () => {
    const { loadedHashes } = get();

    // If we have no baseline hashes yet, snapshot them first
    if (Object.keys(loadedHashes).length === 0) {
      await get().snapshotCurrentHashes();
      set({ lastChecked: Date.now() });
      return;
    }

    set({ checking: true });
    const base = getBasePath();
    const stale = new Set<TrackableKey>();

    await Promise.all(
      Object.entries(TRACKED_FILES).map(async ([key, file]) => {
        try {
          const res = await fetch(`${base}/${file}`, { cache: 'no-store' });
          if (!res.ok) return;
          const text = await res.text();
          const diskHash = hashString(text);
          const loaded = loadedHashes[key];

          if (loaded !== undefined && diskHash !== loaded) {
            stale.add(key as TrackableKey);
          }
        } catch {
          // network error — skip
        }
      }),
    );

    set({ staleKeys: stale, checking: false, lastChecked: Date.now() });
  },

  reloadStaleData: async () => {
    const { staleKeys } = get();
    if (staleKeys.size === 0) return;

    const base = getBasePath();
    const cleanStore = useCleanDataStore.getState();
    const formulaStore = useFormulaStore.getState();
    const reloaded = new Set<TrackableKey>();
    const newHashes: Record<string, number> = {};

    await Promise.all(
      Array.from(staleKeys).map(async (key) => {
        const file = TRACKED_FILES[key];
        if (!file) return;
        try {
          const res = await fetch(`${base}/${file}`, { cache: 'no-store' });
          if (!res.ok) return;
          const text = await res.text();
          const data = JSON.parse(text);

          if (key === 'formulas') {
            formulaStore.setAllFormulas(data);
          } else {
            cleanStore.setCleanData(key as MainDataKey, data);
          }

          // Update the baseline hash to the new disk content
          newHashes[key] = hashString(text);
          reloaded.add(key);
        } catch {
          // skip on error
        }
      }),
    );

    set((state) => {
      const remaining = new Set(state.staleKeys);
      reloaded.forEach((k) => remaining.delete(k));
      return {
        staleKeys: remaining,
        loadedHashes: { ...state.loadedHashes, ...newHashes },
      };
    });
  },

  markFresh: (key) =>
    set((state) => {
      const next = new Set(state.staleKeys);
      next.delete(key);
      return { staleKeys: next };
    }),
}));
