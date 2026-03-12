import { CoreType, CoreValue, getDefaultCoreValue, parseCoreType } from './CoreValue';
import { GearModValue } from './GearMod';
import { parseEnum } from '../utils/enumParser';
import Gearset from './Gearset';
import Brandset from './Brandset';
import NamedGear from './NamedGear';
import { MinorAttribute } from './NamedGear';

export enum GearSource {
  Brandset = 'brandset',
  Gearset = 'gearset',
  Named = 'named',
  Exotic = 'exotic'
}

/**
 * Parse a string into GearSource enum
 * @throws Error if value is not a valid GearSource
 */
export function parseGearSource(value: string | GearSource): GearSource {
  return parseEnum(value, GearSource, 'GearSource');
}

export enum GearType {
  Mask = 'mask',
  Chest = 'chest',
  Holster = 'holster',
  Gloves = 'gloves',
  Backpack = 'backpack',
  Kneepads = 'kneepads'
}

/**
 * Parse a string into GearType enum
 * @throws Error if value is not a valid GearType
 */
export function parseGearType(value: string | GearType): GearType {
  return parseEnum(value, GearType, 'GearType');
}

interface BuildGearData {
  name?: string;
  source: GearSource | string;
  type?: GearType | string | null;
  icon?: string;
  core?: CoreValue[];
  minor1?: GearModValue | null;
  minor2?: GearModValue | null;
  minor3?: GearModValue | null;
}

class BuildGear {
  // Static property to hold gear attributes loaded from lookups
  private static gearAttributeOptions: Record<string, number> = {};
  private static isInitialized = false;

  name: string;
  source: GearSource;
  type: GearType | null;
  icon: string;
  core: CoreValue[];
  minor1: GearModValue | null;
  minor2: GearModValue | null;
  minor3: GearModValue | null;

  // Static method to initialize gear attributes from lookups
  static initializeGearAttributes(gearAttributes: Record<string, number>) {
    console.log('BuildGear.initializeGearAttributes called with', Object.keys(gearAttributes).length, 'attributes');
    // Only initialize if we have valid attributes (not just empty string)
    const validAttrs = Object.keys(gearAttributes).filter(key => key !== '');
    if (validAttrs.length > 0) {
      BuildGear.gearAttributeOptions = gearAttributes;
      BuildGear.isInitialized = true;
    } else {
      console.warn('BuildGear.initializeGearAttributes - received invalid attributes, skipping initialization');
    }
  }

  // Static method to get gear attributes, loading from localStorage if needed
  private static getGearAttributes(): Record<string, number> {
    if (!BuildGear.isInitialized) {
      console.log('BuildGear.getGearAttributes - not initialized, trying localStorage');
      // Try to load from localStorage (lookup-store)
      try {
        const lookupStore = localStorage.getItem('lookup-store');
        if (lookupStore) {
          const parsed = JSON.parse(lookupStore);
          console.log('BuildGear.getGearAttributes - parsed localStorage:', parsed.state?.gearAttributes ? 'has gearAttributes' : 'no gearAttributes');
          if (parsed.state?.gearAttributes) {
            const attrs: Record<string, number> = {};
            
            // gearAttributes is stored as a GearModCollection serialized as array
            if (Array.isArray(parsed.state.gearAttributes)) {
              console.log('BuildGear.getGearAttributes - gearAttributes is array with', parsed.state.gearAttributes.length, 'items');
              // It's an array of [key, GearMod] pairs from the Map
              parsed.state.gearAttributes.forEach((item: any, index: number) => {
                // Handle both array format [key, mod] and direct mod format
                const mod = Array.isArray(item) ? item[1] : item;
                if (mod && mod.attribute && mod.max !== undefined) {
                  attrs[mod.attribute] = typeof mod.max === 'number' ? mod.max : parseFloat(mod.max) || 0;
                } else {
                  console.log('BuildGear.getGearAttributes - item', index, 'invalid:', item);
                }
              });
            }
            
            console.log('BuildGear.getGearAttributes - loaded', Object.keys(attrs).length, 'attributes from localStorage');
            BuildGear.gearAttributeOptions = attrs;
            BuildGear.isInitialized = true;
          }
        } else {
          console.log('BuildGear.getGearAttributes - no localStorage found');
        }
      } catch (error) {
        console.error('Error loading gear attributes from localStorage:', error);
      }
    }
    return BuildGear.gearAttributeOptions;
  }

  // Static method to get gear mod attributes (for mod slot), loading from localStorage if needed
  private static getGearModAttributes(): Record<string, number> {
    const attrs: Record<string, number> = {};
    try {
      const lookupStore = localStorage.getItem('lookup-store');
      if (lookupStore) {
        const parsed = JSON.parse(lookupStore);
        if (parsed.state?.gearModAttributes && Array.isArray(parsed.state.gearModAttributes)) {
          // gearModAttributes is stored as Map entries [[key, GearMod], ...]
          parsed.state.gearModAttributes.forEach((item: any) => {
            const mod = Array.isArray(item) ? item[1] : item;
            if (mod && mod.attribute && mod.max !== undefined) {
              attrs[mod.attribute] = typeof mod.max === 'number' ? mod.max : parseFloat(mod.max) || 0;
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading gear mod attributes from localStorage:', error);
    }
    return attrs;
  }

  constructor(item: Gearset | Brandset | NamedGear, gearType?: GearType) {
    // Check if it's a GearItem (Gearset, Brandset, or NamedGear)
    if (this.isGearset(item)) {
      if (!gearType) {
        throw new Error(`Cannot create BuildGear from Gearset "${item.name}" without specifying a gear type. Gearsets must be assigned to a specific gear slot.`);
      }
      this.name = item.name;
      this.source = GearSource.Gearset;
      this.type = gearType;
      this.icon = item.logo;
      this.core = [this.mapCore(item.core)];
      
      // Get gear attributes (will load from localStorage if not initialized)
      const gearAttrs = BuildGear.getGearAttributes();
      const firstKey = Object.keys(gearAttrs)[0];
      const firstValue = gearAttrs[firstKey] || 0;
      
      this.minor1 = new GearModValue(gearAttrs, undefined, firstKey, firstValue);
      this.minor2 = null;
      
      // For mask, backpack, or chest, load gear mods and assign the first one to minor3
      if (this.type === GearType.Mask || this.type === GearType.Backpack || this.type === GearType.Chest) {
        const gearMods = BuildGear.getGearModAttributes();
        const modFirstKey = Object.keys(gearMods)[0];
        const modFirstValue = gearMods[modFirstKey] || 0;
        this.minor3 = new GearModValue(gearMods, undefined, modFirstKey, modFirstValue);
      } else {
        this.minor3 = null;
      }
    } else if (this.isBrandset(item)) {
      if (!gearType) {
        throw new Error(`Cannot create BuildGear from Brandset "${item.brand}" without specifying a gear type. Brandsets must be assigned to a specific gear slot.`);
      }
      this.name = item.brand;
      this.source = GearSource.Brandset;
      this.type = gearType;
      this.icon = item.icon;
      this.core = [this.mapCore(item.core)];
      
      // Get gear attributes (will load from localStorage if not initialized)
      const gearAttrs = BuildGear.getGearAttributes();
      const firstKey = Object.keys(gearAttrs)[0];
      const firstValue = gearAttrs[firstKey] || 0;
      const secondKey = Object.keys(gearAttrs)[1];
      const secondValue = gearAttrs[secondKey] || 0;
      this.minor1 = new GearModValue(gearAttrs, undefined, firstKey, firstValue);
      this.minor2 = new GearModValue(gearAttrs, undefined, secondKey, secondValue);
      
      // For mask, backpack, or chest, load gear mods and assign the first one to minor3
      if (this.type === GearType.Mask || this.type === GearType.Backpack || this.type === GearType.Chest) {
        const gearMods = BuildGear.getGearModAttributes();
        const modFirstKey = Object.keys(gearMods)[0];
        const modFirstValue = gearMods[modFirstKey] || 0;
        this.minor3 = new GearModValue(gearMods, undefined, modFirstKey, modFirstValue);
      } else {
        this.minor3 = null;
      }
    } else if (this.isNamedGear(item)) {
      this.name = item.name;
      this.source = item.isExotic ? GearSource.Exotic : GearSource.Named;
      this.type = item.type;
      this.icon = item.icon;
      this.core = [this.mapCore(item.core)];
      
      // Check if minor1 or minor2 contain armor or skill tiers
      const minor1Keys = typeof item.minor1 === 'object' && item.minor1 !== null && !Array.isArray(item.minor1) ? Object.keys(item.minor1) : [];
      const minor2Keys = typeof item.minor2 === 'object' && item.minor2 !== null && !Array.isArray(item.minor2) ? Object.keys(item.minor2) : [];
      
      const minor1IsCore = minor1Keys.includes('armor') || minor1Keys.includes('skill');
      const minor2IsCore = minor2Keys.includes('armor') || minor2Keys.includes('skill');
      
      // Add armor tier if found in minor1 or minor2
      if (minor1Keys.includes('armor') || minor2Keys.includes('armor')) {
        this.core.push({ type: CoreType.Armor, value: getDefaultCoreValue(CoreType.Armor) });
      }
      
      // Add skill tier if found in minor1 or minor2
      if (minor1Keys.includes('skill') || minor2Keys.includes('skill')) {
        this.core.push({ type: CoreType.SkillTier, value: getDefaultCoreValue(CoreType.SkillTier) });
      }
      
      // Set minor attributes to null if they were core attributes, otherwise map them
      this.minor1 = minor1IsCore ? null : this.mapMinorAttribute(item.minor1, 0);
      this.minor2 = minor2IsCore ? null : this.mapMinorAttribute(item.minor2, 1);
      
      // For mask, backpack, or chest, load gear mods and assign the first one to minor3
      if (this.type === GearType.Mask || this.type === GearType.Backpack || this.type === GearType.Chest) {
        const gearMods = BuildGear.getGearModAttributes();
        const firstKey = Object.keys(gearMods)[0];
        const firstValue = gearMods[firstKey] || 0;
        this.minor3 = new GearModValue(gearMods, undefined, firstKey, firstValue);
      } else {
        this.minor3 = this.mapMinorAttribute(item.minor3, 0);
      }
    } else {
      throw new Error('BuildGear constructor requires a Gearset, Brandset, or NamedGear item');
    }
  }

  private isGearset(item: any): item is Gearset {
    return item instanceof Gearset || ('logo' in item && 'twoPc' in item && 'fourPc' in item);
  }

  private isBrandset(item: any): item is Brandset {
    return item instanceof Brandset || ('brand' in item && 'onePc' in item && !('type' in item));
  }

  private isNamedGear(item: any): item is NamedGear {
    return item instanceof NamedGear || ('talent' in item && 'desc' in item && 'type' in item);
  }

  private mapCore(core: CoreType | Record<CoreType, string[]>): CoreValue {
    if (typeof core === 'object' && !Array.isArray(core) && !(core instanceof Object && 'type' in core)) {
      // It's a Record<CoreType, string[]> from Gearset - use the first key
      const coreType = Object.keys(core)[0] as CoreType;
      return { type: coreType, value: getDefaultCoreValue(coreType) };
    }
    const coreType = core as CoreType;
    return { type: coreType, value: getDefaultCoreValue(coreType) };
  }

  private mapMinorAttribute(minor: any, offset: number): GearModValue | null {
    if (!minor || minor === 'mod') {
      return null;
    }
    // Convert Record<string, number> to GearModValue
    if (typeof minor === 'object') {
      const entries = Object.entries(minor);
      if (entries.length > offset) {
        const [key, value] = entries[offset];
        return new GearModValue({ [key]: value as number }, undefined, key, value as number);
      }
    }
    return null;
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
    // Create a BuildGear instance by directly setting properties
    // This bypasses the constructor since we're deserializing saved data
    const gear = Object.create(BuildGear.prototype);
    
    gear.name = json.name || '';
    gear.source = parseGearSource(json.source);
    
    // Validate that type is not null
    if (!json.type) {
      throw new Error(`BuildGear type cannot be null for item: ${json.name || 'unknown'}`);
    }
    gear.type = parseGearType(json.type);
    gear.icon = json.icon || '';
    
    // Handle core as array of CoreValue objects
    if (json.core && Array.isArray(json.core)) {
      gear.core = json.core.map((coreValue: CoreValue) => ({
        type: parseCoreType(coreValue.type),
        value: coreValue.value
      }));
    } else if (json.core && typeof json.core === 'object' && 'type' in json.core && 'value' in json.core) {
      // Handle legacy single core value (convert to array)
      gear.core = [{
        type: parseCoreType((json.core as CoreValue).type),
        value: (json.core as CoreValue).value
      }];
    } else {
      // Default to Weapon Damage if core is missing or invalid
      gear.core = [{ type: CoreType.WeaponDamage, value: getDefaultCoreValue(CoreType.WeaponDamage) }];
    }
    
    gear.minor1 = json.minor1 || null;
    gear.minor2 = json.minor2 || null;
    gear.minor3 = json.minor3 || null;
    
    return gear;
  }
}

export default BuildGear;
