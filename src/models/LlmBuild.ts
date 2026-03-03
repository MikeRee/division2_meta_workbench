import { CoreType } from './CoreValue';

class LlmBuild {
  id: string;
  name: string;
  specialization: string;
  primaryWeapon: LlmWeapon | null;
  secondaryWeapon: LlmWeapon | null;
  pistol: LlmWeapon | null;
  mask: LlmGear | null;
  chest: LlmGear | null;
  holster: LlmGear | null;
  backpack: LlmGear | null;
  gloves: LlmGear | null;
  kneepads: LlmGear | null;
  skill1: string;
  skill2: string;
  watch: string | null;
  createdAt: number;
  updatedAt: number;

  constructor({
    id = null,
    name = '',
    specialization = '',
    primaryWeapon = null,
    secondaryWeapon = null,
    pistol = null,
    mask = null,
    chest = null,
    holster = null,
    backpack = null,
    gloves = null,
    kneepads = null,
    skill1 = '',
    skill2 = '',
    watch = null,
    createdAt = null,
    updatedAt = null
  }: {
    id?: string | null;
    name?: string;
    specialization?: string;
    primaryWeapon?: LlmWeapon | null;
    secondaryWeapon?: LlmWeapon | null;
    pistol?: LlmWeapon | null;
    mask?: LlmGear | null;
    chest?: LlmGear | null;
    holster?: LlmGear | null;
    backpack?: LlmGear | null;
    gloves?: LlmGear | null;
    kneepads?: LlmGear | null;
    skill1?: string;
    skill2?: string;
    watch?: string | null;
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

  private generateId(): string {
    return `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

class LlmWeapon {
  constructor(
    public name: string,
    public weaponAttribute: string,
    public muzzleIfOption: string | null,
    public underbarrelIfOption: string | null,
    public magazineIfOption: string | null,
    public opticsIfOption: string | null,
  ) {}
}

class LlmGear {
  name: string;
  core: CoreType;
  minor1?: string | null;
  minor2?: string | null;
  minor3?: string | null;
  
  constructor(
    name: string,
    core: CoreType,
    minor1?: string | null,
    minor2?: string | null,
    minor3?: string | null
  ) {
    this.name = name;
    this.core = core;
    this.minor1 = minor1;
    this.minor2 = minor2;
    this.minor3 = minor3;
  }
}


export default LlmBuild;
