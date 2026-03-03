import Weapon from "./Weapon";

export class BuildWeapon {
  weapon: Weapon;
  configuredModSlots: Record<string, Record<string, number>>;

  constructor(
    weapon: Weapon,
    configuredModSlots: Record<string, Record<string, number>> = {}
  ) {
    this.weapon = weapon;
    this.configuredModSlots = configuredModSlots;
  }
}
