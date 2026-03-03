import { CoreType, CoreValue, getDefaultCoreValue } from './CoreValue';
import { GearModValue } from './GearMod';

export enum GearSource {
  Brandset = 'brandset',
  Gearset = 'gearset',
  Named = 'named',
  Exotic = 'exotic'
}

export enum GearType {
  Mask = 'mask',
  Chest = 'chest',
  Holster = 'holster',
  Gloves = 'gloves',
  Backpack = 'backpack',
  Kneepads = 'kneepads'
}

interface BuildGearData {
  name?: string;
  source: GearSource;
  type?: GearType | null;
  icon?: string;
  core?: CoreValue;
  minor1?: GearModValue | null;
  minor2?: GearModValue | null;
  minor3?: GearModValue | null;
}

class BuildGear {
  name: string;
  source: GearSource;
  type: GearType | null;
  icon: string;
  core: CoreValue;
  minor1: GearModValue | null;
  minor2: GearModValue | null;
  minor3: GearModValue | null;

  constructor({
    name = '',
    source,
    type = null,
    icon = '',
    core = { type: CoreType.WeaponDamage, value: getDefaultCoreValue(CoreType.WeaponDamage) },
    minor1 = null,
    minor2 = null,
    minor3: minor3 = null
  }: BuildGearData) {
    this.name = name;
    this.source = source;
    this.type = type;
    this.icon = icon;
    this.core = core;
    this.minor1 = minor1;
    this.minor2 = minor2;
    this.minor3 = minor3;
  }


  toJSON(): BuildGearData {
    return {
      name: this.name,
      source: this.source,
      type: this.type,
      icon: this.icon,
      core: this.core,
      minor1: this.minor1,
      minor2: this.minor2,
      minor3: this.minor3
    };
  }

  static fromJSON(json: BuildGearData): BuildGear {
    // Handle legacy string core values or ensure proper CoreValue structure
    let coreValue: CoreValue;
    if (json.core && typeof json.core === 'object' && 'type' in json.core && 'value' in json.core) {
      coreValue = json.core;
    } else {
      // Default to Weapon Damage if core is missing or invalid
      coreValue = { type: CoreType.WeaponDamage, value: getDefaultCoreValue(CoreType.WeaponDamage) };
    }
    
    return new BuildGear({
      ...json,
      core: coreValue
    });
  }
}

export default BuildGear;
