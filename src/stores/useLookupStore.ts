import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Weapon from '../models/Weapon';
import Gearset from '../models/Gearset';
import Brandset from '../models/Brandset';
import Skill from '../models/Skill';
import WeaponMod from '../models/WeaponMod';
import Talent from '../models/Talent';
import Attribute from '../models/Attribute';
import StatusImmunity from '../models/StatusImmunity';
import GearMod, { GearModCollection, GearModClassification } from '../models/GearMod';
import NamedExoticGear from '../models/NamedExoticGear';

interface LookupState {
  weapons: Map<string, Weapon>;
  talents: Map<string, Talent>;
  gearsets: Map<string, Gearset>;
  brandsets: Map<string, Brandset>;
  namedGear: Map<string, NamedExoticGear>;
  skills: Map<string, Skill>;
  weaponMods: Map<string, WeaponMod>;
  specializations: Map<string, any>;

  weaponAttributes: Map<string, Attribute>;
  weaponTypeAttributes: Map<string, Attribute>;
  gearAttributes: GearModCollection | null;
  gearModAttributes: Map<string, GearMod>;
  keenersWatch: Map<string, Attribute>;
  statusImmunities: Map<string, StatusImmunity>;
  missingMappings: Record<string, GearModClassification>;
  prompts: Map<string, string>;

  lastUpdated: number | null;
  isLoading: boolean;

  setWeapons: (weaponList: Weapon[]) => void;
  setTalents: (talentList: Talent[]) => void;
  setGearsets: (gearsetList: Gearset[]) => void;
  setBrandsets: (brandsetList: Brandset[]) => void;
  setNamedGear: (namedGearList: NamedExoticGear[]) => void;
  setSkills: (skillList: Skill[]) => void;
  setWeaponMods: (weaponModList: WeaponMod[]) => void;
  setSpecializations: (specializationList: any[]) => void;

  setWeaponAttributes: (attributeList: Attribute[]) => void;
  setWeaponTypeAttributes: (attributeList: Attribute[]) => void;
  setGearAttributes: (attributeList: GearMod[]) => void;
  setGearModAttributes: (attributeList: GearMod[]) => void;
  setKeenersWatch: (attributeList: Attribute[]) => void;
  setStatusImmunities: (immunityList: StatusImmunity[]) => void;
  setMissingMappings: (mappings: Record<string, GearModClassification>) => void;
  setPrompts: (promptsData: Record<string, string>) => void;

  setLoading: (isLoading: boolean) => void;

  getWeapon: (name: string) => Weapon | undefined;
  getTalent: (name: string) => Talent | undefined;
  getGearset: (name: string) => Gearset | undefined;
  getBrandset: (brand: string) => Brandset | undefined;
  getNamedGear: (name: string) => NamedExoticGear | undefined;
  getSkill: (name: string) => Skill | undefined;
  getWeaponMod: (name: string) => WeaponMod | undefined;
  getSpecialization: (name: string) => any | undefined;

  getWeaponAttribute: (key: string) => Attribute | undefined;
  getWeaponTypeAttribute: (key: string) => Attribute | undefined;
  getGearAttributes: () => GearModCollection | null;
  getGearModAttribute: (key: string) => GearMod | undefined;
  getKeenersWatchStat: (key: string) => Attribute | undefined;
  getStatusImmunity: (statusEffect: string) => StatusImmunity | undefined;
  getMissingMapping: (attribute: string) => GearModClassification | undefined;
  getPrompt: (key: string) => string | undefined;

  getAllWeapons: () => Weapon[];
  getAllTalents: () => Talent[];
  getAllWeaponTalents: () => Talent[];
  getAllGearTalents: () => Talent[];
  getAllGearsets: () => Gearset[];
  getAllBrandsets: () => Brandset[];
  getAllNamedGear: () => NamedExoticGear[];
  getAllSkills: () => Skill[];
  getAllWeaponMods: () => WeaponMod[];
  getAllSpecializations: () => any[];

  getAllWeaponAttributes: () => Attribute[];
  getAllWeaponTypeAttributes: () => Attribute[];
  getAllGearAttributes: () => GearMod[];
  getAllGearModAttributes: () => GearMod[];
  getAllKeenersWatch: () => Attribute[];
  getAllStatusImmunities: () => StatusImmunity[];
  getAllPrompts: () => Map<string, string>;

  /** Returns a unique sorted list of all attribute names across all lookup maps */
  getAttributeVocabulary: () => [string, string][];

  /** Returns a unique sorted list of gear mod attribute names */
  getGearModVocabulary: () => [string, string][];

  clearAll: () => void;
}

/**
 * LookupStore - Caches all loaded models from Google Sheets
 * Provides both full lists and lookup by name functionality
 */
const useLookupStore = create<LookupState>()(
  persist(
    (set, get) => ({
      // Data maps for quick lookup by name
      weapons: new Map<string, Weapon>(),
      talents: new Map<string, Talent>(),
      gearsets: new Map<string, Gearset>(),
      brandsets: new Map<string, Brandset>(),
      namedGear: new Map<string, NamedExoticGear>(),
      skills: new Map<string, Skill>(),
      weaponMods: new Map<string, WeaponMod>(),
      specializations: new Map<string, any>(),

      // CSV data maps
      weaponAttributes: new Map<string, Attribute>(),
      weaponTypeAttributes: new Map<string, Attribute>(),
      gearAttributes: null,
      gearModAttributes: new Map<string, GearMod>(),
      keenersWatch: new Map<string, Attribute>(),
      statusImmunities: new Map<string, StatusImmunity>(),
      missingMappings: {},
      prompts: new Map<string, string>(),

      // Metadata
      lastUpdated: null,
      isLoading: false,

      // Actions
      setWeapons: (weaponList) => {
        const weaponMap = new Map<string, Weapon>();
        weaponList.forEach((weapon) => {
          if (weapon.name) {
            weaponMap.set(weapon.name, weapon);
          }
        });
        set({ weapons: weaponMap, lastUpdated: Date.now() });
      },

      setTalents: (talentList) => {
        const talentMap = new Map<string, Talent>();
        talentList.forEach((talent) => {
          if (talent.name) {
            talentMap.set(talent.name, talent);
          }
        });
        set({ talents: talentMap, lastUpdated: Date.now() });
      },

      setGearsets: (gearsetList) => {
        const gearsetMap = new Map<string, Gearset>();
        gearsetList.forEach((gearset) => {
          if (gearset.name) {
            gearsetMap.set(gearset.name, gearset);
          }
        });
        set({ gearsets: gearsetMap, lastUpdated: Date.now() });
      },

      setBrandsets: (brandsetList) => {
        const brandsetMap = new Map<string, Brandset>();
        brandsetList.forEach((brandset) => {
          if (brandset.brand) {
            brandsetMap.set(brandset.brand, brandset);
          }
        });
        set({ brandsets: brandsetMap, lastUpdated: Date.now() });
      },

      setNamedGear: (namedGearList) => {
        const namedGearMap = new Map<string, NamedExoticGear>();
        namedGearList.forEach((gear) => {
          if (gear.name) {
            namedGearMap.set(gear.name, gear);
          }
        });
        set({ namedGear: namedGearMap, lastUpdated: Date.now() });
      },

      setSkills: (skillList) => {
        const skillMap = new Map<string, Skill>();
        skillList.forEach((skill) => {
          if (skill.name) {
            skillMap.set(skill.name, skill);
          }
        });
        set({ skills: skillMap, lastUpdated: Date.now() });
      },

      setWeaponMods: (weaponModList) => {
        const weaponModMap = new Map<string, WeaponMod>();
        weaponModList.forEach((mod) => {
          if (mod.name) {
            weaponModMap.set(mod.name, mod);
          }
        });
        set({ weaponMods: weaponModMap, lastUpdated: Date.now() });
      },

      setSpecializations: (specializationList) => {
        const specializationMap = new Map<string, any>();
        specializationList.forEach((spec) => {
          if (spec.name) {
            specializationMap.set(spec.name, spec);
          }
        });
        set({ specializations: specializationMap, lastUpdated: Date.now() });
      },

      // CSV data setters
      setWeaponAttributes: (attributeList) => {
        const attributeMap = new Map<string, Attribute>();
        attributeList.forEach((attr) => {
          const key = attr.getKey();
          attributeMap.set(key, attr);
        });
        set({ weaponAttributes: attributeMap, lastUpdated: Date.now() });
      },

      setWeaponTypeAttributes: (attributeList) => {
        const attributeMap = new Map<string, Attribute>();
        attributeList.forEach((attr) => {
          const key = attr.getKey();
          attributeMap.set(key, attr);
        });
        set({ weaponTypeAttributes: attributeMap, lastUpdated: Date.now() });
      },

      setGearAttributes: (attributeList) => {
        const collection = new GearModCollection(attributeList);
        set({ gearAttributes: collection, lastUpdated: Date.now() });
      },

      setGearModAttributes: (attributeList) => {
        const attributeMap = new Map<string, GearMod>();
        attributeList.forEach((attr) => {
          const key = attr.getKey();
          attributeMap.set(key, attr);
        });
        set({ gearModAttributes: attributeMap, lastUpdated: Date.now() });
      },

      setKeenersWatch: (attributeList) => {
        const attributeMap = new Map<string, Attribute>();
        attributeList.forEach((attr) => {
          const key = attr.getKey();
          attributeMap.set(key, attr);
        });
        set({ keenersWatch: attributeMap, lastUpdated: Date.now() });
      },

      setStatusImmunities: (immunityList) => {
        const immunityMap = new Map<string, StatusImmunity>();
        immunityList.forEach((immunity) => {
          if (immunity.statusEffect) {
            immunityMap.set(immunity.statusEffect, immunity);
          }
        });
        set({ statusImmunities: immunityMap, lastUpdated: Date.now() });
      },

      setMissingMappings: (mappings) => {
        set({ missingMappings: mappings, lastUpdated: Date.now() });
      },

      setPrompts: (promptsData) => {
        const promptsMap = new Map<string, string>();
        Object.entries(promptsData).forEach(([key, value]) => {
          promptsMap.set(key, value);
        });
        set({ prompts: promptsMap, lastUpdated: Date.now() });
      },

      setLoading: (isLoading) => set({ isLoading }),

      // Lookup methods
      getWeapon: (name) => get().weapons.get(name),
      getTalent: (name) => get().talents.get(name),
      getGearset: (name) => get().gearsets.get(name),
      getBrandset: (brand) => get().brandsets.get(brand),
      getNamedGear: (name) => get().namedGear.get(name),
      getSkill: (name) => get().skills.get(name),
      getWeaponMod: (name) => get().weaponMods.get(name),
      getSpecialization: (name) => get().specializations.get(name),

      // CSV data lookup methods
      getWeaponAttribute: (key) => get().weaponAttributes.get(key),
      getWeaponTypeAttribute: (key) => get().weaponTypeAttributes.get(key),
      getGearAttributes: () => get().gearAttributes,
      getGearModAttribute: (key) => get().gearModAttributes.get(key),
      getKeenersWatchStat: (key) => get().keenersWatch.get(key),
      getStatusImmunity: (statusEffect) => get().statusImmunities.get(statusEffect),
      getMissingMapping: (attribute) => get().missingMappings[attribute],
      getPrompt: (key) => get().prompts.get(key),

      // Get all items as arrays
      getAllWeapons: () => {
        const weapons = get().weapons;
        return weapons instanceof Map ? Array.from(weapons.values()) : [];
      },
      getAllWeaponTalents: () => {
        const talents = get().talents;
        if (!(talents instanceof Map)) return [];
        return Array.from(talents.values()).filter((t) => t.type === 'weapon');
      },
      getAllGearTalents: () => {
        const talents = get().talents;
        if (!(talents instanceof Map)) return [];
        return Array.from(talents.values()).filter((t) => t.type === 'gear');
      },
      getAllTalents: () => {
        const talents = get().talents;
        return talents instanceof Map ? Array.from(talents.values()) : [];
      },
      getAllGearsets: () => {
        const gearsets = get().gearsets;
        return gearsets instanceof Map ? Array.from(gearsets.values()) : [];
      },
      getAllBrandsets: () => {
        const brandsets = get().brandsets;
        return brandsets instanceof Map ? Array.from(brandsets.values()) : [];
      },
      getAllNamedGear: () => {
        const namedGear = get().namedGear;
        return namedGear instanceof Map ? Array.from(namedGear.values()) : [];
      },
      getAllSkills: () => {
        const skills = get().skills;
        return skills instanceof Map ? Array.from(skills.values()) : [];
      },
      getAllWeaponMods: () => {
        const mods = get().weaponMods;
        return mods instanceof Map ? Array.from(mods.values()) : [];
      },
      getAllSpecializations: () => {
        const specs = get().specializations;
        return specs instanceof Map ? Array.from(specs.values()) : [];
      },

      // CSV data get all methods
      getAllWeaponAttributes: () => Array.from(get().weaponAttributes.values()),
      getAllWeaponTypeAttributes: () => Array.from(get().weaponTypeAttributes.values()),
      getAllGearAttributes: () => {
        const collection = get().gearAttributes;
        if (!collection) return [];
        // Return all gear mods from all classifications
        return [
          ...collection.getAttributes(GearModClassification.Offensive),
          ...collection.getAttributes(GearModClassification.Defensive),
          ...collection.getAttributes(GearModClassification.Skill),
        ];
      },
      getAllGearModAttributes: () => Array.from(get().gearModAttributes.values()),
      getAllKeenersWatch: () => Array.from(get().keenersWatch.values()),
      getAllStatusImmunities: () => Array.from(get().statusImmunities.values()),
      getAllPrompts: () => get().prompts,

      getAttributeVocabulary: () => {
        const names = new Set<string>();
        const state = get();

        // weaponAttributes: Map<string, Attribute>
        if (state.weaponAttributes instanceof Map) {
          for (const attr of state.weaponAttributes.values()) {
            if (attr.attribute) names.add(attr.attribute);
          }
        }

        // weaponTypeAttributes: Map<string, Attribute>
        if (state.weaponTypeAttributes instanceof Map) {
          for (const attr of state.weaponTypeAttributes.values()) {
            if (attr.attribute) names.add(attr.attribute);
          }
        }

        // gearAttributes: GearModCollection
        if (state.gearAttributes) {
          const all = state.gearAttributes.getAll();
          for (const key of Object.keys(all)) {
            if (key) names.add(key);
          }
        }

        // gearModAttributes: Map<string, GearMod>
        if (state.gearModAttributes instanceof Map) {
          for (const mod of state.gearModAttributes.values()) {
            if (mod.attribute) names.add(mod.attribute);
          }
        }

        // keenersWatch: Map<string, Attribute>
        if (state.keenersWatch instanceof Map) {
          for (const attr of state.keenersWatch.values()) {
            if (attr.attribute) names.add(attr.attribute);
          }
        }

        const sorted = Array.from(names).sort();
        return sorted.map((n) => [n, n] as [string, string]);
      },

      getGearModVocabulary: () => {
        const names = new Set<string>();
        const state = get();

        if (state.gearModAttributes instanceof Map) {
          for (const mod of state.gearModAttributes.values()) {
            if (mod.attribute) names.add(mod.attribute);
          }
        }

        const sorted = Array.from(names).sort();
        return sorted.map((n) => [n, n] as [string, string]);
      },

      // Clear all data
      clearAll: () =>
        set({
          weapons: new Map(),
          talents: new Map(),
          gearsets: new Map(),
          brandsets: new Map(),
          namedGear: new Map(),
          skills: new Map(),
          weaponMods: new Map(),
          specializations: new Map(),
          weaponAttributes: new Map(),
          weaponTypeAttributes: new Map(),
          gearAttributes: null,
          gearModAttributes: new Map(),
          keenersWatch: new Map(),
          statusImmunities: new Map(),
          missingMappings: {},
          prompts: new Map(),
          lastUpdated: null,
        }),
    }),
    {
      name: 'lookup-store',
      storage: createJSONStorage(() => localStorage, {
        reviver: (key, value: any) => {
          const mapKeys = [
            'weapons',
            'talents',
            'gearsets',
            'brandsets',
            'namedGear',
            'skills',
            'weaponMods',
            'specializations',
            'weaponAttributes',
            'weaponTypeAttributes',
            'gearModAttributes',
            'keenersWatch',
            'statusImmunities',
            'prompts',
          ];

          if (mapKeys.includes(key) && Array.isArray(value)) {
            // Re-instantiate models if needed
            const rehydrate = (item: any) => {
              if (!item) return item;
              switch (key) {
                case 'weapons':
                  return new Weapon(item);
                case 'talents':
                  return new Talent(item);
                case 'gearsets':
                  return new Gearset(item);
                case 'brandsets':
                  return new Brandset(item);
                case 'namedGear':
                  return new NamedExoticGear(item);
                case 'skills':
                  return new Skill(item);
                case 'weaponMods':
                  return new WeaponMod(item);
                case 'weaponAttributes':
                case 'weaponTypeAttributes':
                case 'keenersWatch':
                  return new Attribute(item);
                case 'gearModAttributes':
                  return new GearMod(item);
                case 'statusImmunities':
                  return new StatusImmunity(item);
                case 'prompts':
                  return item; // prompts are just strings
                default:
                  return item;
              }
            };
            return new Map(value.map(([k, v]) => [k, rehydrate(v)]));
          }

          // Handle GearModCollection
          if (key === 'gearAttributes' && Array.isArray(value)) {
            const mods = value.map((item) => new GearMod(item));
            return new GearModCollection(mods);
          }

          return value;
        },
        replacer: (key, value) => {
          if (value instanceof Map) {
            return Array.from(value.entries());
          }
          if (value instanceof GearModCollection) {
            return value.toArray();
          }
          return value;
        },
      }),
      skipHydration: true,
    },
  ),
);

export default useLookupStore;
export { useLookupStore };
