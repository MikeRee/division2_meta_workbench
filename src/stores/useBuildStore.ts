import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Build from '../models/Build';
import BuildGear from '../models/BuildGear';
import { BuildWeapon } from '../models/BuildWeapon';
import Specialization from '../models/Specialization';

// Type for partial build updates
type BuildData = {
  name?: string;
  specialization?: Specialization | null;
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
  builds: [Build, Build, Build, Build];
  activeBuildIndex: number;
  currentBuild: Build;
  savedBuilds: Map<string, Build>;

  setActiveBuildIndex: (index: number) => void;
  getBuild: (index: number) => Build;
  setBuild: (index: number, build: Build) => void;

  updateCurrentBuild: (updates: Partial<BuildData>) => void;
  setSpecialization: (specialization: Specialization | null) => void;
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
  loadBuild: (name: string) => boolean;
  deleteBuild: (name: string) => boolean;
  newBuild: () => void;
  getAllSavedBuilds: () => Build[];
  getSavedBuild: (name: string) => Build | undefined;
  updateSavedBuild: (name: string, updates: Partial<BuildData>) => boolean;
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
      // 4 build slots
      builds: [new Build(), new Build(), new Build(), new Build()] as [Build, Build, Build, Build],
      activeBuildIndex: 0,

      // currentBuild kept in sync as alias for builds[activeBuildIndex]
      currentBuild: new Build(),

      // Saved builds map (name -> Build)
      savedBuilds: new Map<string, Build>(),

      setActiveBuildIndex: (index: number) => {
        if (index < 0 || index > 3) return;
        set({ activeBuildIndex: index, currentBuild: get().builds[index] });
      },

      getBuild: (index: number) => {
        if (index < 0 || index > 3) return get().builds[0];
        return get().builds[index];
      },

      setBuild: (index: number, build: Build) => {
        if (index < 0 || index > 3) return;
        const builds = [...get().builds] as [Build, Build, Build, Build];
        builds[index] = build;
        const patch: any = { builds };
        if (index === get().activeBuildIndex) patch.currentBuild = build;
        set(patch);
      },

      // Actions for current build
      updateCurrentBuild: (updates) => {
        const idx = get().activeBuildIndex;
        const current = get().builds[idx];
        // Preserve live class instances (BuildWeapon / BuildGear) from the current build
        // instead of serializing to JSON which loses getters and class identity.
        const updated = new Build({
          name: current.name,
          specialization: current.specialization,
          primaryWeapon: current.primaryWeapon,
          secondaryWeapon: current.secondaryWeapon,
          pistol: current.pistol,
          mask: current.mask,
          chest: current.chest,
          holster: current.holster,
          backpack: current.backpack,
          gloves: current.gloves,
          kneepads: current.kneepads,
          skill1: current.skill1,
          skill2: current.skill2,
          watch: current.watch,
          createdAt: current.createdAt,
          ...updates,
          updatedAt: Date.now(),
        });
        const builds = [...get().builds] as [Build, Build, Build, Build];
        builds[idx] = updated;
        set({ builds, currentBuild: updated });
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
        const idx = get().activeBuildIndex;
        const current = get().builds[idx];
        const buildName = name || current.name || 'Untitled Build';
        const buildToSave = new Build({
          name: buildName,
          specialization: current.specialization,
          primaryWeapon: current.primaryWeapon,
          secondaryWeapon: current.secondaryWeapon,
          pistol: current.pistol,
          mask: current.mask,
          chest: current.chest,
          holster: current.holster,
          backpack: current.backpack,
          gloves: current.gloves,
          kneepads: current.kneepads,
          skill1: current.skill1,
          skill2: current.skill2,
          watch: current.watch,
          createdAt: current.createdAt,
          updatedAt: Date.now(),
        });

        const savedBuilds = new Map(get().savedBuilds);
        savedBuilds.set(buildName, buildToSave);

        const builds = [...get().builds] as [Build, Build, Build, Build];
        builds[get().activeBuildIndex] = buildToSave;
        set({
          savedBuilds,
          builds,
          currentBuild: buildToSave,
        });

        return buildName;
      },

      // Load a saved build as current
      loadBuild: (name) => {
        const build = get().savedBuilds.get(name);
        if (build) {
          const idx = get().activeBuildIndex;
          const loaded = new Build({
            name: build.name,
            specialization: build.specialization,
            primaryWeapon: build.primaryWeapon,
            secondaryWeapon: build.secondaryWeapon,
            pistol: build.pistol,
            mask: build.mask,
            chest: build.chest,
            holster: build.holster,
            backpack: build.backpack,
            gloves: build.gloves,
            kneepads: build.kneepads,
            skill1: build.skill1,
            skill2: build.skill2,
            watch: build.watch,
            createdAt: build.createdAt,
            updatedAt: build.updatedAt,
          });
          const builds = [...get().builds] as [Build, Build, Build, Build];
          builds[idx] = loaded;
          set({ builds, currentBuild: loaded });
          return true;
        }
        return false;
      },

      // Delete a saved build
      deleteBuild: (name) => {
        const savedBuilds = new Map(get().savedBuilds);
        const deleted = savedBuilds.delete(name);
        if (deleted) {
          set({ savedBuilds });
        }
        return deleted;
      },

      // Create a new empty build (resets the active slot)
      newBuild: () => {
        const idx = get().activeBuildIndex;
        const builds = [...get().builds] as [Build, Build, Build, Build];
        const empty = new Build();
        builds[idx] = empty;
        set({ builds, currentBuild: empty });
      },

      // Get all saved builds as array
      getAllSavedBuilds: () => {
        return Array.from(get().savedBuilds.values());
      },

      // Get saved build by name
      getSavedBuild: (name) => {
        return get().savedBuilds.get(name);
      },

      // Update a saved build
      updateSavedBuild: (name, updates) => {
        const savedBuilds = new Map(get().savedBuilds);
        const build = savedBuilds.get(name);

        if (build) {
          const updated = new Build({
            name: build.name,
            specialization: build.specialization,
            primaryWeapon: build.primaryWeapon,
            secondaryWeapon: build.secondaryWeapon,
            pistol: build.pistol,
            mask: build.mask,
            chest: build.chest,
            holster: build.holster,
            backpack: build.backpack,
            gloves: build.gloves,
            kneepads: build.kneepads,
            skill1: build.skill1,
            skill2: build.skill2,
            watch: build.watch,
            createdAt: build.createdAt,
            ...updates,
            updatedAt: Date.now(),
          });
          // If name changed, remove old key
          if (updates.name && updates.name !== name) {
            savedBuilds.delete(name);
            savedBuilds.set(updates.name, updated);
          } else {
            savedBuilds.set(name, updated);
          }
          set({ savedBuilds });

          // If updating current build, update it too
          const idx = get().activeBuildIndex;
          if (get().builds[idx].name === name) {
            const builds = [...get().builds] as [Build, Build, Build, Build];
            builds[idx] = updated;
            set({ builds, currentBuild: updated });
          }
          return true;
        }
        return false;
      },

      // Clear all saved builds
      clearAllBuilds: () => {
        const emptyBuilds = [new Build(), new Build(), new Build(), new Build()] as [
          Build,
          Build,
          Build,
          Build,
        ];
        set({
          savedBuilds: new Map(),
          builds: emptyBuilds,
          activeBuildIndex: 0,
          currentBuild: emptyBuilds[0],
        });
      },

      // Export current build as JSON
      exportCurrentBuild: () => {
        const current = get().builds[get().activeBuildIndex];
        return JSON.stringify(current.toJSON(), null, 2);
      },

      // Import build from JSON
      importBuild: (jsonString) => {
        try {
          const data = JSON.parse(jsonString);
          const build = Build.fromJSON(data);
          const idx = get().activeBuildIndex;
          const builds = [...get().builds] as [Build, Build, Build, Build];
          builds[idx] = build;
          set({ builds, currentBuild: build });
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
          if (key === 'builds' && Array.isArray(value)) {
            try {
              const restored = value.map((b: any) => (b ? Build.fromJSON(b) : new Build()));
              while (restored.length < 4) restored.push(new Build());
              return restored.slice(0, 4) as [Build, Build, Build, Build];
            } catch (error) {
              console.warn('Failed to restore builds from localStorage:', error);
              return [new Build(), new Build(), new Build(), new Build()];
            }
          }
          if (key === 'currentBuild' && value) {
            // Legacy migration: will be handled in onRehydrateStorage
            try {
              return Build.fromJSON(value);
            } catch {
              return new Build();
            }
          }
          if (key === 'savedBuilds' && Array.isArray(value)) {
            try {
              return new Map(
                value.map(([name, buildData]: [string, any]) => [name, Build.fromJSON(buildData)]),
              );
            } catch (error) {
              console.warn('Failed to restore savedBuilds from localStorage:', error);
              return new Map();
            }
          }
          return value;
        },
        replacer: (key, value) => {
          if (key === 'builds' && Array.isArray(value)) {
            return value.map((b: Build) => (b instanceof Build ? b.toJSON() : b));
          }
          if (key === 'currentBuild' && value instanceof Build) {
            return value.toJSON();
          }
          if (key === 'savedBuilds' && value instanceof Map) {
            return Array.from(value.entries()).map(([name, build]) => [name, build.toJSON()]);
          }
          return value;
        },
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Sync currentBuild from builds[activeBuildIndex]
        state.currentBuild = state.builds[state.activeBuildIndex];
      },
      skipHydration: true,
    },
  ),
);

export default useBuildStore;
export { useBuildStore };
