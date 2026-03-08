import { CoreType } from "./CoreValue";
import Weapon from "./Weapon";

export class BuildWeapon {
  weapon: Weapon;
  core1: WeaponModValue;
  core2?: WeaponModValue;
  attrib: WeaponModValue;
  configuredModSlots: Record<string, Record<string, number>>;

  constructor(
    weapon: Weapon,
    core2: WeaponModValue | undefined,
    attrib: WeaponModValue | undefined,
    configuredModSlots: Record<string, Record<string, number>> = {}
  ) {
    this.weapon = weapon;
    this.core1 = new WeaponModValue({}, weapon.type.toLowerCase + " damage", 15);
    this.core2 = core2;
    this.attrib = attrib;
    this.configuredModSlots = configuredModSlots;
  }
}

class WeaponModValue {
  options: Record<string, number>;
  key?: string;
  value?: number;

  constructor(options: Record<string, number> = {}, key?: string, value?: number) {
    this.options = options;
    this.key = key;
    this.value = value;
  }
}