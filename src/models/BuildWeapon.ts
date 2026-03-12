import { CoreType } from "./CoreValue";
import Weapon from "./Weapon";
import WeaponMod from "./WeaponMod";

export class BuildWeapon {
  // Static property to hold weapon attributes loaded from lookups
  private static weaponAttributeOptions: Record<string, number> = {};
  private static isInitialized = false;
  
  weapon: Weapon;
  core1: WeaponModValue;
  core2?: WeaponModValue;
  attrib?: WeaponModValue;
  configuredModSlots: Record<string, Record<string, number>>;

  // Static method to initialize weapon attributes from lookups
  static initializeWeaponAttributes(weaponAttributes: Record<string, number>) {
    BuildWeapon.weaponAttributeOptions = weaponAttributes;
    BuildWeapon.isInitialized = true;
  }

  // Static method to get weapon attributes, loading from localStorage if needed
  private static getWeaponAttributes(): Record<string, number> {
    if (!BuildWeapon.isInitialized) {
      // Try to load from localStorage (lookup-store)
      try {
        const lookupStore = localStorage.getItem('lookup-store');
        if (lookupStore) {
          const parsed = JSON.parse(lookupStore);
          if (parsed.state?.weaponAttributes) {
            // weaponAttributes is stored as an array of [key, value] pairs
            const attrs: Record<string, number> = {};
            parsed.state.weaponAttributes.forEach(([key, attr]: [string, any]) => {
              if (attr && attr.attribute) {
                const maxValue = parseFloat(attr.max) || 0;
                attrs[attr.attribute] = maxValue;
              }
            });
            BuildWeapon.weaponAttributeOptions = attrs;
            BuildWeapon.isInitialized = true;
          }
        }
      } catch (error) {
        console.error('Error loading weapon attributes from localStorage:', error);
      }
    }
    return BuildWeapon.weaponAttributeOptions;
  }

  constructor(
    weapon: Weapon,
    configuredModSlots: Record<string, Record<string, number>> = {},
    allWeaponMods?: WeaponMod[]
  ) {
    this.weapon = weapon;
    
    // Get weapon attributes (will load from localStorage if not initialized)
    const weaponAttrs = BuildWeapon.getWeaponAttributes();
    
    // Set core1 with weapon type damage
    const core1Key = weapon.type.toLowerCase() + " damage";
    this.core1 = new WeaponModValue({ [core1Key]: 15 }, core1Key, 15);
    
    // If core2 is undefined and weapon type is not pistol, create with all weapon attributes as options
    if (weapon.type.toLowerCase() !== 'pistol') {
      const firstKey = Object.keys(weaponAttrs)[0];
      this.core2 = new WeaponModValue(weaponAttrs, firstKey);
    }
    
    const secondKey = Object.keys(weaponAttrs)[1];
    this.attrib = new WeaponModValue(weaponAttrs, secondKey);
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