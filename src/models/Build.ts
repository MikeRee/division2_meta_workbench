import BuildGear from './BuildGear';
import { BuildWeapon } from './BuildWeapon';
import { KeenersWatchStats } from './KeenersWatchStats';
import LlmBuild from './LlmBuild';

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
    this.watch = watch || null;
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
        attrib1: weapon.core1?.key || '',
      };

      if (weapon.core2?.key) result.attrib2 = weapon.core2.key;
      if (weapon.attrib?.key) result.mod = weapon.attrib.key;

      const attachments: any = {};
      if (weapon.configuredModSlots?.muzzle) {
        const key = Object.keys(weapon.configuredModSlots.muzzle)[0];
        if (key) attachments.muzzleIfOption = key;
      }
      if (weapon.configuredModSlots?.underbarrel) {
        const key = Object.keys(weapon.configuredModSlots.underbarrel)[0];
        if (key) attachments.underbarrelIfOption = key;
      }
      if (weapon.configuredModSlots?.magazine) {
        const key = Object.keys(weapon.configuredModSlots.magazine)[0];
        if (key) attachments.magazineIfOption = key;
      }
      if (weapon.configuredModSlots?.optics) {
        const key = Object.keys(weapon.configuredModSlots.optics)[0];
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

  static fromLlm(llmBuild: LlmBuild): Partial<Build> {
    // Note: This returns a partial Build since LlmBuild doesn't contain all Build properties
    // The caller should merge this with existing Build data or provide defaults

    const convertWeapon = (llmWeapon: any): BuildWeapon | null => {
      if (!llmWeapon) return null;

      // This is a simplified conversion - in practice, you'd need to:
      // 1. Look up the actual Weapon object by name
      // 2. Reconstruct the configuredModSlots from attachments
      // For now, returning null as we need more context about available weapons
      return null;
    };

    const convertGear = (llmGear: any): BuildGear | null => {
      if (!llmGear) return null;

      // This is a simplified conversion - in practice, you'd need to:
      // 1. Look up the actual gear source (brandset/gearset/named/exotic)
      // 2. Reconstruct the full GearModValue objects from the keys
      // For now, returning null as we need more context about available gear
      return null;
    };

    return {
      primaryWeapon: convertWeapon(llmBuild.primaryWeapon),
      secondaryWeapon: convertWeapon(llmBuild.secondaryWeapon),
      pistol: convertWeapon(llmBuild.pistol),
      mask: convertGear(llmBuild.mask),
      chest: convertGear(llmBuild.chest),
      holster: convertGear(llmBuild.holster),
      backpack: convertGear(llmBuild.backpack),
      gloves: convertGear(llmBuild.gloves),
      kneepads: convertGear(llmBuild.kneepads),
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
            buildData[slot].configuredModSlots || {},
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
