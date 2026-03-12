import { CoreType } from './CoreValue';
import { KeenersWatchStats } from './KeenersWatchStats';

class LlmBuild {
  // specialization: string;
  primaryWeapon: LlmWeapon | null;
  secondaryWeapon: LlmWeapon | null;
  pistol: LlmWeapon | null;
  mask: LlmGear | null;
  chest: LlmGear | null;
  holster: LlmGear | null;
  backpack: LlmGear | null;
  gloves: LlmGear | null;
  kneepads: LlmGear | null;
  // skill1: string;
  // skill2: string;
  // watch: KeenersWatchStats | null;

  constructor({
    // specialization = '',
    primaryWeapon = null,
    secondaryWeapon = null,
    pistol = null,
    mask = null,
    chest = null,
    holster = null,
    backpack = null,
    gloves = null,
    kneepads = null,
    // skill1 = '',
    // skill2 = '',
    // watch = null,
  }: {
    // specialization?: string;
    primaryWeapon?: LlmWeapon | null;
    secondaryWeapon?: LlmWeapon | null;
    pistol?: LlmWeapon | null;
    mask?: LlmGear | null;
    chest?: LlmGear | null;
    holster?: LlmGear | null;
    backpack?: LlmGear | null;
    gloves?: LlmGear | null;
    kneepads?: LlmGear | null;
    // skill1?: string;
    // skill2?: string;
    // watch?: KeenersWatchStats | null;
  } = {}) {
    // this.specialization = specialization;
    this.primaryWeapon = primaryWeapon;
    this.secondaryWeapon = secondaryWeapon;
    this.pistol = pistol;
    this.mask = mask;
    this.chest = chest;
    this.holster = holster;
    this.backpack = backpack;
    this.gloves = gloves;
    this.kneepads = kneepads;
    // this.skill1 = skill1;
    // this.skill2 = skill2;
    // this.watch = watch;
  }

  toJSON() {
    const result: any = {};
    
    if (this.primaryWeapon) result.primaryWeapon = this.primaryWeapon;
    if (this.secondaryWeapon) result.secondaryWeapon = this.secondaryWeapon;
    if (this.pistol) result.pistol = this.pistol;
    if (this.mask) result.mask = this.mask;
    if (this.chest) result.chest = this.chest;
    if (this.holster) result.holster = this.holster;
    if (this.backpack) result.backpack = this.backpack;
    if (this.gloves) result.gloves = this.gloves;
    if (this.kneepads) result.kneepads = this.kneepads;
    
    return result;
  }
}

class LlmWeapon {
  constructor(
    public name: string,
    public attrib1: string,
    public attrib2: string | null,
    public mod: string | null,
    public attachments: LlmAttachments | null,
  ) {}
}

class LlmGear {
  name: string;
  core: CoreType[];
  gearAttrib1?: string | null;
  gearAttrib2?: string | null;
  gearMod?: string | null;
  
  constructor(
    name: string,
    core: CoreType[],
    gearAttrib1?: string | null,
    gearAttrib2?: string | null,
    gearMod?: string | null
  ) {
    this.name = name;
    this.core = core;
    this.gearAttrib1 = gearAttrib1;
    this.gearAttrib2 = gearAttrib2;
    this.gearMod = gearMod;
  }
}

class LlmAttachments {
  constructor(
    public muzzleIfOption: string | null,
    public underbarrelIfOption: string | null,
    public magazineIfOption: string | null,
    public opticsIfOption: string | null,
  ) {}}


export default LlmBuild;
