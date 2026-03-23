import BuildGear, { GearSource, GearType } from './BuildGear';
import { BuildWeapon } from './BuildWeapon';
import { CoreType, getDefaultCoreValue, parseCoreType } from './CoreValue';
import { KeenersWatchStats } from './KeenersWatchStats';
import LlmBuild from './LlmBuild';
import NamedGear from './NamedGear';
import { useLookupStore } from '../stores/useLookupStore';
import useCleanDataStore from '../stores/useCleanDataStore';
import { fuzzyFind } from '../utils/fuzzySearch';
import Gearset from './Gearset';
import Brandset from './Brandset';

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
    const convertWeapon = (weapon: BuildWeapon | null) => {
      if (!weapon) return null;

      const result: any = {
        name: weapon.weapon.name,
        attrib1: Object.keys(weapon.primaryAttribute1)[0] || '',
      };

      const pa2 = weapon.primaryAttribute2;
      if (pa2) {
        const pa2Key = Object.keys(pa2)[0];
        if (pa2Key) result.attrib2 = pa2Key;
      }
      const sa = weapon.secondaryAttribute;
      if (sa) {
        const saKey = Object.keys(sa)[0];
        if (saKey) result.mod = saKey;
      }

      const attachments: any = {};
      if (weapon.modSlots?.muzzle) {
        const key = Object.keys(weapon.modSlots.muzzle)[0];
        if (key) attachments.muzzleIfOption = key;
      }
      if (weapon.modSlots?.underbarrel) {
        const key = Object.keys(weapon.modSlots.underbarrel)[0];
        if (key) attachments.underbarrelIfOption = key;
      }
      if (weapon.modSlots?.magazine) {
        const key = Object.keys(weapon.modSlots.magazine)[0];
        if (key) attachments.magazineIfOption = key;
      }
      if (weapon.modSlots?.optics) {
        const key = Object.keys(weapon.modSlots.optics)[0];
        if (key) attachments.opticsIfOption = key;
      }

      if (Object.keys(attachments).length > 0) {
        result.attachments = attachments;
      }

      return result;
    };

    const convertGear = (gear: BuildGear | null) => {
      if (!gear) return null;

      const result: any = {
        name: gear.name,
        core: gear.core.map((c) => c.type),
      };

      if (gear.minor1?.key) result.gearAttrib1 = gear.minor1.key;
      if (gear.minor2?.key) result.gearAttrib2 = gear.minor2.key;
      if (gear.minor3?.key) result.gearMod = gear.minor3.key;

      return result;
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
    const result: Record<string, any> = llm.toJSON();
    const defaults = getDefaultWatchStats();
    const merged: KeenersWatchStats = { ...defaults };
    for (const cat of Object.keys(merged) as (keyof KeenersWatchStats)[]) {
      merged[cat] = { ...defaults[cat], ...(this.watch?.[cat] || {}) };
    }
    result.watch = merged;
    return result;
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
      const llmCores: CoreType[] = llmGear.core || [];

      const storeState = useCleanDataStore.getState();

      // Try named/exotic gear first
      const namedGear: NamedGear[] = storeState.getCleanData('namedGear') || [];
      let namedMatch = fuzzyFind(name, namedGear, (ng) => ng.name);

      if (namedMatch) {
        try {
          const buildGear = new BuildGear(namedMatch);

          // If the gear has 3 cores (exotic with all 3), keep them as-is from the data
          // Otherwise (1 core), assign the first LLM-provided core
          if (buildGear.core.length < 3 && llmCores.length > 0) {
            const coreType = parseCoreType(llmCores[0]);
            buildGear.core = [{ type: coreType, value: getDefaultCoreValue(coreType) }];
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
          if (llmCores.length > 0) {
            const coreType = parseCoreType(llmCores[0]);
            buildGear.core = [{ type: coreType, value: getDefaultCoreValue(coreType) }];
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
          if (llmCores.length > 0) {
            const coreType = parseCoreType(llmCores[0]);
            buildGear.core = [{ type: coreType, value: getDefaultCoreValue(coreType) }];
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
          buildData[slot] = new BuildWeapon(
            buildData[slot].weapon,
            buildData[slot]._modSlots || buildData[slot].configuredModSlots || {},
          );
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
