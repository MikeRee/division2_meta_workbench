import { CoreType } from './CoreValue';

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
    public primaryAttrib1: string,
    public primaryAttrib2: string | null,
    public secondaryAttrib: string | null,
    public talent: string | null,
    public attachments: LlmAttachments | null,
  ) {}

  toJSON() {
    const result: any = { name: this.name, primaryAttrib1: this.primaryAttrib1 };
    if (this.primaryAttrib2 != null) result.primaryAttrib2 = this.primaryAttrib2;
    if (this.secondaryAttrib != null) result.secondaryAttrib = this.secondaryAttrib;
    if (this.talent != null) result.talent = this.talent;
    if (this.attachments != null) result.attachments = this.attachments;
    return result;
  }
}

class LlmGear {
  constructor(
    public name: string,
    public core: CoreType | null,
    public gearAttrib1?: string | null,
    public gearAttrib2?: string | null,
    public gearMods?: string[] | null,
    public talent?: string | null,
  ) {}

  toJSON() {
    const result: any = { name: this.name, core: this.core };
    if (this.gearAttrib1 != null) result.gearAttrib1 = this.gearAttrib1;
    if (this.gearAttrib2 != null) result.gearAttrib2 = this.gearAttrib2;
    if (this.talent != null) result.talent = this.talent;
    if (this.gearMods != null) result.gearMods = this.gearMods;
    return result;
  }
}

class LlmAttachments {
  constructor(
    public muzzleIfOption: string | null,
    public underbarrelIfOption: string | null,
    public magazineIfOption: string | null,
    public opticsIfOption: string | null,
  ) {}

  toJSON() {
    const result: any = {};
    if (this.muzzleIfOption != null) result.muzzleIfOption = this.muzzleIfOption;
    if (this.underbarrelIfOption != null) result.underbarrelIfOption = this.underbarrelIfOption;
    if (this.magazineIfOption != null) result.magazineIfOption = this.magazineIfOption;
    if (this.opticsIfOption != null) result.opticsIfOption = this.opticsIfOption;
    return result;
  }
}

export default LlmBuild;
export { LlmWeapon, LlmGear, LlmAttachments };
