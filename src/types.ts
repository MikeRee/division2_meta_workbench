export interface AttributeData {
  classification?: string | null;
  attribute?: string;
  max?: string;
  category?: string | null;
  weaponType?: string | null;
}

export interface WeaponData {
  type?: string;
  variant?: string;
  name?: string;
  flag?: string | null;
  rpm?: string;
  baseMagSize?: string;
  moddedMagSize?: string;
  reload?: string;
  damage?: string;
  optimalRange?: string;
  modSlots?: string[];
}

export interface BrandsetData {
  brand?: string;
  icon?: string;
  bonus1?: string;
  bonus2?: string;
  bonus3?: string;
}

export interface GearsetData {
  name?: string;
  icon?: string;
  bonus2?: string;
  bonus3?: string;
  bonus4?: string;
  backpack?: string;
  chest?: string;
}

export interface ExoticWeaponData {
  name?: string;
  type?: string;
  slot?: string;
  talent?: string;
  description?: string;
}

export interface TalentData {
  name?: string;
  talent?: string;
  description?: string;
  slot?: string;
}

export interface NamedGearData {
  name?: string;
  brand?: string;
  slot?: string;
  talent?: string;
  source?: string;
}

export interface SkillData {
  name?: string;
  variant?: string;
  description?: string;
}

export interface WeaponModData {
  name?: string;
  slot?: string;
  bonus?: string;
}

export interface SpecializationData {
  name?: string;
  weapon?: string;
}

export interface StatusImmunityData {
  statusEffect?: string;
  max?: string;
}
