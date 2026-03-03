import BuildGear from './BuildGear';
import { BuildWeapon } from './BuildWeapon';

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
  watch: any;
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
    updatedAt = null
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
    this.watch = watch;
    this.createdAt = createdAt || Date.now();
    this.updatedAt = updatedAt || Date.now();
  }

  generateId(): string {
    return `build_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(json: any): Build {
    const buildData = { ...json };
    
    // Convert gear slot data to BuildGear instances if they exist and aren't already instances
    if (buildData.mask && !(buildData.mask instanceof BuildGear)) {
      buildData.mask = BuildGear.fromJSON(buildData.mask);
    }
    if (buildData.chest && !(buildData.chest instanceof BuildGear)) {
      buildData.chest = BuildGear.fromJSON(buildData.chest);
    }
    if (buildData.holster && !(buildData.holster instanceof BuildGear)) {
      buildData.holster = BuildGear.fromJSON(buildData.holster);
    }
    if (buildData.backpack && !(buildData.backpack instanceof BuildGear)) {
      buildData.backpack = BuildGear.fromJSON(buildData.backpack);
    }
    if (buildData.gloves && !(buildData.gloves instanceof BuildGear)) {
      buildData.gloves = BuildGear.fromJSON(buildData.gloves);
    }
    if (buildData.kneepads && !(buildData.kneepads instanceof BuildGear)) {
      buildData.kneepads = BuildGear.fromJSON(buildData.kneepads);
    }
    
    // Convert weapon slot data to BuildWeapon instances if they exist and aren't already instances
    if (buildData.primaryWeapon && !(buildData.primaryWeapon instanceof BuildWeapon)) {
      buildData.primaryWeapon = new BuildWeapon(
        buildData.primaryWeapon.weapon,
        buildData.primaryWeapon.configuredModSlots || {}
      );
    }
    if (buildData.secondaryWeapon && !(buildData.secondaryWeapon instanceof BuildWeapon)) {
      buildData.secondaryWeapon = new BuildWeapon(
        buildData.secondaryWeapon.weapon,
        buildData.secondaryWeapon.configuredModSlots || {}
      );
    }
    if (buildData.pistol && !(buildData.pistol instanceof BuildWeapon)) {
      buildData.pistol = new BuildWeapon(
        buildData.pistol.weapon,
        buildData.pistol.configuredModSlots || {}
      );
    }
    
    return new Build(buildData);
  }

  clone(): Build {
    return new Build({
      ...this.toJSON(),
      id: null, // Generate new ID for clone
      createdAt: null,
      updatedAt: null
    });
  }
}

export default Build;
