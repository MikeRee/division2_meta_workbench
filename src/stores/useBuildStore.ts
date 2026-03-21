import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Build from '../models/Build';
import BuildGear from '../models/BuildGear';
import { BuildWeapon } from '../models/BuildWeapon';

// Type for partial build updates
type BuildData = {
  id?: string | null;
  name?: string;
  specialization?: any;
  primaryWeapon?: BuildWeapon | null;
  secondaryWeapon?: BuildWeapon | null;
  pistol?: BuildWeapon | null;
  mask?: BuildGear | null;
  chest?: BuildGear | null;
  holster?: BuildGear | null;
  backpack?: BuildGear | null;
  gloves?: BuildGear | null;
  kneepads?: BuildGear | null;
  skill1?: any;
  skill2?: any;
  watch?: any;
  createdAt?: number | null;
  updatedAt?: number | null;
};

interface BuildState {
  currentBuild: Build;
  savedBuilds: Map<string, Build>;

  updateCurrentBuild: (updates: Partial<BuildData>) => void;
  setSpecialization: (specialization: any) => void;
  setPrimaryWeapon: (primaryWeapon: any) => void;
  setSecondaryWeapon: (secondaryWeapon: any) => void;
  setPistol: (pistol: any) => void;
  setMask: (mask: any) => void;
  setChest: (chest: any) => void;
  setHolster: (holster: any) => void;
  setBackpack: (backpack: any) => void;
  setGloves: (gloves: any) => void;
  setKneepads: (kneepads: any) => void;
  setSkill1: (skill1: any) => void;
  setSkill2: (skill2: any) => void;
  setWatch: (watch: any) => void;

  saveCurrentBuild: (name?: string) => string;
  loadBuild: (buildId: string) => boolean;
  deleteBuild: (buildId: string) => boolean;
  newBuild: () => void;
  cloneCurrentBuild: () => void;
  getAllSavedBuilds: () => Build[];
  getSavedBuild: (buildId: string) => Build | undefined;
  updateSavedBuild: (buildId: string, updates: Partial<BuildData>) => boolean;
  clearAllBuilds: () => void;
  exportCurrentBuild: () => string;
  importBuild: (jsonString: string) => boolean;
}

/**
 * BuildStore - Manages the current build and saved builds
 * Provides functionality to create, save, load, and delete builds
 */
const useBuildStore = create<BuildState>()(
  persist(
    (set, get) => ({
      // Current build being edited
      currentBuild: new Build(),

      // Saved builds map (id -> Build)
      savedBuilds: new Map<string, Build>(),

      // Actions for current build
      updateCurrentBuild: (updates) => {
        const current = get().currentBuild;
        // Ensure current is a Build instance or convert it
        const currentData = current instanceof Build ? current.toJSON() : (current as any);
        const updated = new Build({
          ...currentData,
          ...updates,
          updatedAt: Date.now(),
        });
        set({ currentBuild: updated });
      },

      setSpecialization: (specialization) => {
        get().updateCurrentBuild({ specialization });
      },

      setPrimaryWeapon: (primaryWeapon) => {
        get().updateCurrentBuild({ primaryWeapon });
      },

      setSecondaryWeapon: (secondaryWeapon) => {
        get().updateCurrentBuild({ secondaryWeapon });
      },

      setPistol: (pistol) => {
        get().updateCurrentBuild({ pistol });
      },

      setMask: (mask) => {
        get().updateCurrentBuild({ mask });
      },

      setChest: (chest) => {
        get().updateCurrentBuild({ chest });
      },

      setHolster: (holster) => {
        get().updateCurrentBuild({ holster });
      },

      setBackpack: (backpack) => {
        get().updateCurrentBuild({ backpack });
      },

      setGloves: (gloves) => {
        get().updateCurrentBuild({ gloves });
      },

      setKneepads: (kneepads) => {
        get().updateCurrentBuild({ kneepads });
      },

      setSkill1: (skill1) => {
        get().updateCurrentBuild({ skill1 });
      },

      setSkill2: (skill2) => {
        get().updateCurrentBuild({ skill2 });
      },

      setWatch: (watch) => {
        get().updateCurrentBuild({ watch });
      },

      // Save current build
      saveCurrentBuild: (name) => {
        const current = get().currentBuild;
        const currentData = current instanceof Build ? current.toJSON() : (current as any);
        const buildToSave = new Build({
          ...currentData,
          name: name || currentData.name || 'Untitled Build',
          updatedAt: Date.now(),
        });

        const savedBuilds = new Map(get().savedBuilds);
        savedBuilds.set(buildToSave.id, buildToSave);

        set({
          savedBuilds,
          currentBuild: buildToSave,
        });

        return buildToSave.id;
      },

      // Load a saved build as current
      loadBuild: (buildId) => {
        const build = get().savedBuilds.get(buildId);
        if (build) {
          set({ currentBuild: new Build(build.toJSON()) });
          return true;
        }
        return false;
      },

      // Delete a saved build
      deleteBuild: (buildId) => {
        const savedBuilds = new Map(get().savedBuilds);
        const deleted = savedBuilds.delete(buildId);
        if (deleted) {
          set({ savedBuilds });
        }
        return deleted;
      },

      // Create a new empty build
      newBuild: () => {
        set({ currentBuild: new Build() });
      },

      // Clone current build
      cloneCurrentBuild: () => {
        const current = get().currentBuild;
        const currentData = current instanceof Build ? current : Build.fromJSON(current as any);
        const cloned = currentData.clone();
        set({ currentBuild: cloned });
      },

      // Get all saved builds as array
      getAllSavedBuilds: () => {
        return Array.from(get().savedBuilds.values());
      },

      // Get saved build by ID
      getSavedBuild: (buildId) => {
        return get().savedBuilds.get(buildId);
      },

      // Update a saved build
      updateSavedBuild: (buildId, updates) => {
        const savedBuilds = new Map(get().savedBuilds);
        const build = savedBuilds.get(buildId);

        if (build) {
          const buildData = build instanceof Build ? build.toJSON() : (build as any);
          const updated = new Build({
            ...buildData,
            ...updates,
            id: buildId, // Preserve original ID
            updatedAt: Date.now(),
          });
          savedBuilds.set(buildId, updated);
          set({ savedBuilds });

          // If updating current build, update it too
          if (get().currentBuild.id === buildId) {
            set({ currentBuild: updated });
          }
          return true;
        }
        return false;
      },

      // Clear all saved builds
      clearAllBuilds: () => {
        set({
          savedBuilds: new Map(),
          currentBuild: new Build(),
        });
      },

      // Export current build as JSON
      exportCurrentBuild: () => {
        const current = get().currentBuild;
        const currentData = current instanceof Build ? current.toJSON() : (current as any);
        return JSON.stringify(currentData, null, 2);
      },

      // Import build from JSON
      importBuild: (jsonString) => {
        try {
          const data = JSON.parse(jsonString);
          const build = Build.fromJSON(data);
          set({ currentBuild: build });
          return true;
        } catch (error) {
          console.error('Failed to import build:', error);
          return false;
        }
      },
    }),
    {
      name: 'build-store',
      storage: createJSONStorage(() => localStorage, {
        reviver: (key, value: any) => {
          if (key === 'currentBuild' && value) {
            try {
              return Build.fromJSON(value);
            } catch (error) {
              console.warn('Failed to restore currentBuild from localStorage:', error);
              return new Build(value);
            }
          }
          if (key === 'savedBuilds' && Array.isArray(value)) {
            try {
              return new Map(
                value.map(([id, buildData]: [string, any]) => [id, Build.fromJSON(buildData)]),
              );
            } catch (error) {
              console.warn('Failed to restore savedBuilds from localStorage:', error);
              return new Map();
            }
          }
          return value;
        },
        replacer: (key, value) => {
          if (key === 'currentBuild' && value instanceof Build) {
            return value.toJSON();
          }
          if (key === 'savedBuilds' && value instanceof Map) {
            return Array.from(value.entries()).map(([id, build]) => [id, build.toJSON()]);
          }
          return value;
        },
      }),
      skipHydration: true,
    },
  ),
);

export default useBuildStore;
export { useBuildStore };
