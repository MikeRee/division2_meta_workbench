import BuildGear, { GearType } from './BuildGear';
import { BuildWeapon } from './BuildWeapon';
import { CoreType, parseCoreType } from './CoreValue';
import { KeenersWatchStats } from './KeenersWatchStats';
import LlmBuild, { LlmWeapon, LlmGear, LlmAttachments } from './LlmBuild';
import { useLookupStore } from '../stores/useLookupStore';
import useCleanDataStore from '../stores/useCleanDataStore';
import { fuzzyFind } from '../utils/fuzzySearch';
import Gearset from './Gearset';
import Brandset from './Brandset';
import NamedExoticGear from './NamedExoticGear';

function getDefaultWatchStats(): KeenersWatchStats {
  const keenersWatchData = useLookupStore.getState().keenersWatch;
  const defaults: KeenersWatchStats = {
    Offensive: {},
    Defensive: {},
    Utility: {},
    Handling: {},
  };
  if (keenersWatchData instanceof Map && keenersWatchData.size > 0) {
    keenersWatchData.forEach((attr: any) => {
      const rawCategory = attr.category;
      const category = rawCategory
        ? ((rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1)) as keyof KeenersWatchStats)
        : null;
      const statName = attr.attribute;
      const maxValue = parseFloat(attr.max.toString().replace('%', '')) || 0;
      if (category && statName && defaults[category]) {
        defaults[category][statName] = maxValue;
      }
    });
  }
  return defaults;
}

class Build {
  id: string;
  name: string;
  specialization: any;
  primaryWeapon: BuildWeapon | null;
  secondaryWeapon: BuildWeapon | null;
  pistol: BuildWeapon | null;
  mask: BuildGear | null;
  chest: BuildGear | null;
  holster: BuildGear | null;
  backpack: BuildGear | null;
  gloves: BuildGear | null;
  kneepads: BuildGear | null;
  skill1: any;
  skill2: any;
  watch: KeenersWatchStats;
  createdAt: number;
  updatedAt: number;

  constructor({
    id = null,
    name = '',
    specialization = null,
    primaryWeapon = null,
    secondaryWeapon = null,
    pistol = null,
    mask = null,
    chest = null,
    holster = null,
    backpack = null,
    gloves = null,
    kneepads = null,
    skill1 = null,
    skill2 = null,
    watch = null,
    createdAt = null,
    updatedAt = null,
  }: {
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
  } = {}) {
    this.id = id || this.generateId();
    this.name = name;
    this.specialization = specialization;
    this.primaryWeapon = primaryWeapon;
    this.secondaryWeapon = secondaryWeapon;
    this.pistol = pistol;
    this.mask = mask;
    this.chest = chest;
    this.holster = holster;
    this.backpack = backpack;
    this.gloves = gloves;
    this.kneepads = kneepads;
    this.skill1 = skill1;
    this.skill2 = skill2;
    this.watch =
      watch &&
      typeof watch === 'object' &&
      Object.values(watch).some((cat: any) => cat && Object.keys(cat).length > 0)
        ? watch
        : getDefaultWatchStats();
    this.createdAt = createdAt || Date.now();
    this.updatedAt = updatedAt || Date.now();
  }

  generateId(): string {
    return `build_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  toLlm(): LlmBuild {
    const convertWeapon = (weapon: BuildWeapon | null): LlmWeapon | null => {
      if (!weapon) return null;

      const attrib1 = Object.keys(weapon.primaryAttribute1)[0] || '';

      let attrib2: string | null = null;
      const pa2 = weapon.primaryAttribute2;
      if (pa2) {
        const pa2Key = Object.keys(pa2)[0];
        if (pa2Key) attrib2 = pa2Key;
      }

      let attrib3: string | null = null;
      const sa = weapon.secondaryAttribute;
      if (sa) {
        const saKey = Object.keys(sa)[0];
        if (saKey) attrib3 = saKey;
      }

      let attachments: LlmAttachments | null = null;
      const buildSlots = weapon.modSlots; // equipped mods (Record<string, Record<string, number>>)
      const weaponSlots = weapon.weapon.modSlots; // available slot names (string[])

      if (Object.keys(buildSlots).length > 0) {
        // Build has equipped mods — map them
        const muzzle = buildSlots.muzzle ? Object.keys(buildSlots.muzzle)[0] || null : null;
        const underbarrel = buildSlots.underbarrel
          ? Object.keys(buildSlots.underbarrel)[0] || null
          : null;
        const magazine = buildSlots.magazine ? Object.keys(buildSlots.magazine)[0] || null : null;
        const optics = buildSlots.optics ? Object.keys(buildSlots.optics)[0] || null : null;

        if (muzzle || underbarrel || magazine || optics) {
          attachments = new LlmAttachments(muzzle, underbarrel, magazine, optics);
        }
      } else if (weaponSlots.length > 0) {
        // No mods equipped — show available slots as MISSING MOD, others as NOT AN OPTION
        const slotSet = new Set(weaponSlots.map((s) => s.toLowerCase()));
        attachments = new LlmAttachments(
          slotSet.has('muzzle') ? 'MISSING MOD' : 'NOT AN OPTION',
          slotSet.has('underbarrel') ? 'MISSING MOD' : 'NOT AN OPTION',
          slotSet.has('magazine') ? 'MISSING MOD' : 'NOT AN OPTION',
          slotSet.has('optics') ? 'MISSING MOD' : 'NOT AN OPTION',
        );
      }

      return new LlmWeapon(
        weapon.weapon.name,
        attrib1,
        attrib2,
        attrib3,
        weapon.talents?.[0] ?? null,
        attachments,
      );
    };

    const convertGear = (gear: BuildGear | null): LlmGear | null => {
      if (!gear) return null;

      const core = gear.core.length === 3 ? null : (gear.core[0] ?? null);

      return new LlmGear(
        gear.name,
        core,
        gear.minor1?.key || null,
        gear.minor2?.key || null,
        gear.minor3?.key ? [gear.minor3.key] : null,
      );
    };

    return new LlmBuild({
      primaryWeapon: convertWeapon(this.primaryWeapon),
      secondaryWeapon: convertWeapon(this.secondaryWeapon),
      pistol: convertWeapon(this.pistol),
      mask: convertGear(this.mask),
      chest: convertGear(this.chest),
      holster: convertGear(this.holster),
      backpack: convertGear(this.backpack),
      gloves: convertGear(this.gloves),
      kneepads: convertGear(this.kneepads),
    });
  }

  toView(): Record<string, any> {
    const llm = this.toLlm();
    return llm.toJSON();
  }

  static fromLlm(llmBuild: LlmBuild): Partial<Build> {
    // Note: This returns a partial Build since LlmBuild doesn't contain all Build properties
    // The caller should merge this with existing Build data or provide defaults

    const convertWeapon = (llmWeapon: any): BuildWeapon | null => {
      if (!llmWeapon) return null;

      // This is a simplified conversion - in practice, you'd need to:
      // 1. Look up the actual Weapon object by name
      // 2. Reconstruct the modSlots from attachments
      // For now, returning null as we need more context about available weapons
      return null;
    };

    const convertGear = (llmGear: any, gearType: GearType): BuildGear | null => {
      if (!llmGear) return null;

      const name: string = llmGear.name;
      const llmCore: CoreType | null = llmGear.core ?? null;

      const storeState = useCleanDataStore.getState();

      // Try named/exotic gear first
      const namedGear: NamedExoticGear[] = storeState.getCleanData('namedGear') || [];
      let namedMatch = fuzzyFind(name, namedGear, (ng) => ng.name);

      if (namedMatch) {
        try {
          const buildGear = new BuildGear(namedMatch);

          // If the gear has 3 cores (exotic with all 3), keep them as-is from the data
          // Otherwise (1 core), assign the first LLM-provided core
          if (buildGear.core.length < 3 && llmCore) {
            const coreType = parseCoreType(llmCore);
            buildGear.core = [coreType];
          }

          return buildGear;
        } catch (e) {
          console.warn(`Build.fromLlm: failed to create BuildGear from named gear "${name}"`, e);
        }
      }

      // Try gearsets
      const gearsets: Gearset[] = storeState.getCleanData('gearsets') || [];
      const gearsetMatch = fuzzyFind(name, gearsets, (gs) => gs.name);
      if (gearsetMatch) {
        try {
          const buildGear = new BuildGear(gearsetMatch, gearType);
          if (llmCore) {
            const coreType = parseCoreType(llmCore);
            buildGear.core = [coreType];
          }
          return buildGear;
        } catch (e) {
          console.warn(`Build.fromLlm: failed to create BuildGear from gearset "${name}"`, e);
        }
      }

      // Try brandsets
      const brandsets: Brandset[] = storeState.getCleanData('brandsets') || [];
      const brandMatch = fuzzyFind(name, brandsets, (bs) => bs.brand);
      if (brandMatch) {
        try {
          const buildGear = new BuildGear(brandMatch, gearType);
          if (llmCore) {
            const coreType = parseCoreType(llmCore);
            buildGear.core = [coreType];
          }
          return buildGear;
        } catch (e) {
          console.warn(`Build.fromLlm: failed to create BuildGear from brandset "${name}"`, e);
        }
      }

      console.warn(`Build.fromLlm: no match found for gear "${name}"`);
      return null;
    };

    return {
      primaryWeapon: convertWeapon(llmBuild.primaryWeapon),
      secondaryWeapon: convertWeapon(llmBuild.secondaryWeapon),
      pistol: convertWeapon(llmBuild.pistol),
      mask: convertGear(llmBuild.mask, GearType.Mask),
      chest: convertGear(llmBuild.chest, GearType.Chest),
      holster: convertGear(llmBuild.holster, GearType.Holster),
      backpack: convertGear(llmBuild.backpack, GearType.Backpack),
      gloves: convertGear(llmBuild.gloves, GearType.Gloves),
      kneepads: convertGear(llmBuild.kneepads, GearType.Kneepads),
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      specialization: this.specialization,
      primaryWeapon: this.primaryWeapon,
      secondaryWeapon: this.secondaryWeapon,
      pistol: this.pistol,
      mask: this.mask,
      chest: this.chest,
      holster: this.holster,
      backpack: this.backpack,
      gloves: this.gloves,
      kneepads: this.kneepads,
      skill1: this.skill1,
      skill2: this.skill2,
      watch: this.watch,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromJSON(json: any): Build {
    const buildData = { ...json };

    // Convert gear slot data to BuildGear instances if they exist and aren't already instances
    const gearSlots = ['mask', 'chest', 'holster', 'backpack', 'gloves', 'kneepads'] as const;
    for (const slot of gearSlots) {
      if (buildData[slot] && !(buildData[slot] instanceof BuildGear)) {
        try {
          buildData[slot] = BuildGear.fromJSON(buildData[slot]);
        } catch (error) {
          console.warn(`Build.fromJSON: failed to restore ${slot}, keeping raw data`, error);
        }
      }
    }

    // Convert weapon slot data to BuildWeapon instances if they exist and aren't already instances
    const weaponSlots = ['primaryWeapon', 'secondaryWeapon', 'pistol'] as const;
    for (const slot of weaponSlots) {
      if (buildData[slot] && !(buildData[slot] instanceof BuildWeapon)) {
        try {
          buildData[slot] = new BuildWeapon(buildData[slot].weapon);
        } catch (error) {
          console.warn(`Build.fromJSON: failed to restore ${slot}, keeping raw data`, error);
        }
      }
    }

    return new Build(buildData);
  }

  clone(): Build {
    return new Build({
      ...this.toJSON(),
      id: null, // Generate new ID for clone
      createdAt: null,
      updatedAt: null,
    });
  }
}

export default Build;
