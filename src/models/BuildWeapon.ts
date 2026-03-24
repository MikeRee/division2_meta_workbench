import Weapon from './Weapon';
import WeaponMod from './WeaponMod';

export class BuildWeapon {
  // Static property to hold weapon attributes loaded from lookups.
  // Populated by initializeWeaponAttributes() during the App boot sequence (Phase 3)
  // before any BuildWeapon instances are created.
  private static weaponAttributeOptions: Record<string, number> = {};

  weapon: Weapon;
  get primaryAttribute1(): Record<string, number> {
    if (this.weapon.fixedPrimary1 && Object.keys(this.weapon.fixedPrimary1).length > 0)
      return this.weapon.fixedPrimary1;

    const core1Key = this.weapon.type.toLowerCase() + ' damage';
    return { [core1Key]: 15 };
  }

  private _primaryAttribute2: Record<string, number>;
  get primaryAttribute2(): Record<string, number> | null {
    if (this.weapon.fixedPrimary2 && Object.keys(this.weapon.fixedPrimary2).length > 0)
      return this.weapon.fixedPrimary2;
    if (this.weapon.type == 'pistol') return null;
    return this._primaryAttribute2;
  }
  setPrimaryAttribute2(key: string, value: number) {
    this._primaryAttribute2 = { [key]: value };
  }

  private _secondaryAttribute: Record<string, number>;
  get secondaryAttribute(): Record<string, number> {
    if (this.weapon.fixedSecondary && Object.keys(this.weapon.fixedSecondary).length > 0)
      return this.weapon.fixedSecondary;
    return this._secondaryAttribute;
  }
  setSecondaryAttribute(key: string, value: number) {
    this._secondaryAttribute = { [key]: value };
  }

  private _modSlots: Record<string, Record<string, number>>;
  get modSlots(): Record<string, Record<string, number>> {
    if (this.weapon.fixedSlots && Object.keys(this.weapon.fixedSlots).length > 0)
      return this.weapon.fixedSlots;
    return this._modSlots;
  }
  setModSlots(slots: Record<string, Record<string, number>>): string[] {
    if (this.weapon.fixedSlots && Object.keys(this.weapon.fixedSlots).length > 0)
      return [`Slots are fixed for ${this.weapon.name}, unable to set mod slots.`];

    const errors: string[] = [];
    const updatedSlots: Record<string, Record<string, number>> = {};
    for (const key of Object.keys(slots)) {
      if (this.weapon.modSlots.includes(key)) {
        updatedSlots[key] = slots[key];
      } else {
        errors.push(`Mod slot "${key}" does not exist on ${this.weapon.name}.`);
      }
    }
    this._modSlots = updatedSlots;
    return errors;
  }

  private _talents?: string;
  get talents(): string[] {
    if (this._talents) return [this._talents];
    return this.weapon.fixedTalent;
  }
  setTalent(talent: string | undefined) {
    this._talents = talent;
  }

  // Called during App bootstrap Phase 3, after lookup attributes are loaded.
  static initializeWeaponAttributes(weaponAttributes: Record<string, number>) {
    BuildWeapon.weaponAttributeOptions = weaponAttributes;
  }

  private static getWeaponAttributes(): Record<string, number> {
    return BuildWeapon.weaponAttributeOptions;
  }

  constructor(weapon: Weapon) {
    this.weapon = weapon;
    this._modSlots = {};

    // Initialize primaryAttribute2 from weapon attributes if not a pistol
    const weaponAttrs = BuildWeapon.getWeaponAttributes();
    if (weapon.type.toLowerCase() !== 'pistol') {
      const firstKey = Object.keys(weaponAttrs)[0];
      this._primaryAttribute2 = firstKey ? { [firstKey]: weaponAttrs[firstKey] } : {};
    } else {
      this._primaryAttribute2 = {};
    }

    // Initialize secondaryAttribute from weapon attributes
    const secondKey = Object.keys(weaponAttrs)[1];
    this._secondaryAttribute = secondKey ? { [secondKey]: weaponAttrs[secondKey] } : {};
  }
}
