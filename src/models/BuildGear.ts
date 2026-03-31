import { CoreType, parseCoreType } from './CoreValue';
import { parseEnum } from '../utils/enumParser';
import Gearset from './Gearset';
import Brandset from './Brandset';
import useCleanDataStore from '../stores/useCleanDataStore';
import NamedExoticGear from './NamedExoticGear';

export enum GearSource {
  Brandset = 'brandset',
  Gearset = 'gearset',
  Named = 'named',
  Exotic = 'exotic',
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
  Kneepads = 'kneepads',
}

export enum WeaponType {
  Primary = 'primary',
  Secondary = 'secondary',
  Pistol = 'pistol',
}

export type WeaponOrGearType = GearType | WeaponType;

/**
 * Parse a string into GearType enum
 * @throws Error if value is not a valid GearType
 */
export function parseGearType(value: string | GearType): GearType {
  return parseEnum(value, GearType, 'GearType');
}

class BuildGear {
  // Static properties populated by initialize*() during the App boot sequence (Phase 3)
  // before any BuildGear instances are created.
  private static gearAttributeOptions: Record<string, number> = {};
  private static gearModAttributeOptions: Record<string, number> = {};

  get name(): string {
    return this.data.name;
  }
  source: GearSource;
  type: GearType;
  get icon(): string {
    return this.data.icon;
  }
  private _core?: CoreType;
  get core(): CoreType[] {
    if (this._core) return [this._core];
    if (this.data && 'core' in this.data) {
      if (Array.isArray(this.data.core)) {
        return this.data.core;
      }
      if (typeof this.data.core === 'object' && this.type) {
        const coreRecord = this.data.core as Record<CoreType, string[]>;
        return (Object.entries(coreRecord) as [CoreType, string[]][])
          .filter(([, gearTypes]) => gearTypes.includes(this.type!))
          .map(([coreType]) => coreType);
      }
      return [this.data.core as CoreType];
    }
    return [];
  }
  setCore(core: CoreType | undefined): string[] {
    if (this.source == GearSource.Exotic) {
      return ['Unable to set core type on exotic gear'];
    }
    this._core = core;
    return [];
  }
  private _attribute1?: Record<string, number> | null;
  get attribute1(): Record<string, number> | null {
    if (this._attribute1 !== undefined) return this._attribute1;
    if (this.data instanceof NamedExoticGear) {
      return this.data.attribute1;
    }
    return {};
  }
  setAttribute1(key: string, value: number): string[] {
    if (this.data instanceof NamedExoticGear) {
      if (this.data.attribute1 === null)
        return [`Unable to set attribute1 on ${this.data.name}: attribute slot not available`];
      if (this.data.isExotic || Object.keys(this.data.attribute1).length > 0)
        return [`Unable to set attribute1 on ${this.data.name}`];
    }
    this._attribute1 = { [key]: value };
    return [];
  }
  clearAttribute1(): void {
    this._attribute1 = null;
  }
  private _attribute2?: Record<string, number> | null;
  get attribute2(): Record<string, number> | null {
    if (this._attribute2 !== undefined) return this._attribute2;
    if (this.data instanceof NamedExoticGear) {
      return this.data.attribute2;
    }
    return {};
  }
  setAttribute2(key: string, value: number): string[] {
    if (this.data instanceof NamedExoticGear) {
      if (this.data.attribute2 === null)
        return [`Unable to set attribute2 on ${this.data.name}: attribute slot not available`];
      if (this.data.isExotic || Object.keys(this.data.attribute2).length > 0)
        return [`Unable to set attribute2 on ${this.data.name}`];
    }
    this._attribute2 = { [key]: value };
    return [];
  }
  clearAttribute2(): void {
    this._attribute2 = null;
  }
  private _modSlots: Record<number, Record<string, number>>;
  get maxModSlots(): number {
    if (this.source == GearSource.Brandset || this.source == GearSource.Gearset) {
      switch (this.type) {
        case GearType.Backpack:
        case GearType.Mask:
        case GearType.Chest:
          return 1;
      }
      return 0;
    }
    return (this.data as NamedExoticGear).modSlots;
  }
  setModSlot(index: number, key: string, value: number): string[] {
    if (index > this.maxModSlots)
      return [
        `Failed to set mod slot on ${this.type}: Attempted to assign slot ${index} of ${this.maxModSlots}`,
      ];
    this._modSlots[index] = { [key]: value };
    return [];
  }
  get modSlots(): Record<number, Record<string, number>> {
    return this._modSlots;
  }
  data: Gearset | Brandset | NamedExoticGear;

  // Called during App bootstrap Phase 3, after lookup attributes are loaded.
  static initializeGearAttributes(gearAttributes: Record<string, number>) {
    const validAttrs = Object.keys(gearAttributes).filter((key) => key !== '');
    if (validAttrs.length > 0) {
      BuildGear.gearAttributeOptions = gearAttributes;
    } else {
      console.warn(
        'BuildGear.initializeGearAttributes - received invalid attributes, skipping initialization',
      );
    }
  }

  // Called during App bootstrap Phase 3, after lookup attributes are loaded.
  static initializeGearModAttributes(gearModAttributes: Record<string, number>) {
    BuildGear.gearModAttributeOptions = gearModAttributes;
  }

  private static getGearAttributes(): Record<string, number> {
    return BuildGear.gearAttributeOptions;
  }

  private static getGearModAttributes(): Record<string, number> {
    return BuildGear.gearModAttributeOptions;
  }

  constructor(item: Gearset | Brandset | NamedExoticGear, gearType?: GearType) {
    this._modSlots = {};
    // Check if it's a GearItem (Gearset, Brandset, or NamedExoticGear)
    if (item instanceof Gearset) {
      if (!gearType) {
        throw new Error(
          `Cannot create BuildGear from Gearset "${item.name}" without specifying a gear type. Gearsets must be assigned to a specific gear slot.`,
        );
      }
      this.source = GearSource.Gearset;
      this.type = gearType;
      this.data = item;
    } else if (item instanceof Brandset) {
      if (!gearType) {
        throw new Error(
          `Cannot create BuildGear from Brandset "${item.brand}" without specifying a gear type. Brandsets must be assigned to a specific gear slot.`,
        );
      }
      this.source = GearSource.Brandset;
      this.type = gearType;
      this.data = item;
    } else if (item instanceof NamedExoticGear) {
      this.source = item.isExotic ? GearSource.Exotic : GearSource.Named;
      this.type = item.type;
      this.data = item;
    } else {
      throw new Error(
        'BuildGear constructor requires a Gearset, Brandset, or NamedExoticGear item',
      );
    }
  }

  /** Returns the list of property names available for Blockly dropdowns */
  static blocklyProperties(): [string, string][] {
    return [
      ['Name', 'name'],
      ['Source', 'source'],
      ['Type', 'type'],
    ];
  }

  static fromJSON(json: Record<string, any>): BuildGear {
    // Create a BuildGear instance by directly setting properties
    // This bypasses the constructor since we're deserializing saved data
    const gear = Object.create(BuildGear.prototype);

    gear.source = parseGearSource(json.source);

    gear.type = json.type ? parseGearType(json.type) : null;

    // Handle core - supports CoreType string or legacy {type, value} object
    if (json.core && Array.isArray(json.core) && json.core.length > 0) {
      const first = json.core[0];
      gear._core = typeof first === 'string' ? parseCoreType(first) : parseCoreType(first.type);
    } else if (json.core && typeof json.core === 'string') {
      gear._core = parseCoreType(json.core);
    } else if (json.core && typeof json.core === 'object' && 'type' in json.core) {
      gear._core = parseCoreType(json.core.type);
    }

    // Restore attribute1/attribute2
    if ('_attribute1' in json) {
      gear._attribute1 = json._attribute1;
    }

    if ('_attribute2' in json) {
      gear._attribute2 = json._attribute2;
    }

    // Restore mod slots from minor3 if present (legacy format)
    if (json.minor3 && typeof json.minor3 === 'object' && json.minor3.key) {
      gear._modSlots[0] = { [json.minor3.key]: json.minor3.value ?? 0 };
    } else if (json._modSlots) {
      gear._modSlots = json._modSlots;
    }

    // Look up the source model from the clean data store.
    // `name` is a getter on BuildGear so it won't be serialized as an own property.
    // Extract the name from the serialized `data` object instead.
    const itemName =
      json.name ?? (gear.source === GearSource.Brandset ? json.data?.brand : json.data?.name);
    gear.data = BuildGear.lookupData(gear.source, itemName);

    if (!gear.data) {
      throw new Error(
        `BuildGear.fromJSON: could not resolve ${gear.source} "${itemName}" from clean data store`,
      );
    }

    return gear;
  }

  /**
   * Look up the source model (Gearset, Brandset, or NamedExoticGear) from the clean data store.
   */
  static lookupData(source: GearSource, name: string): Gearset | Brandset | NamedExoticGear | null {
    const storeState = useCleanDataStore.getState();

    switch (source) {
      case GearSource.Gearset: {
        const gearsets: Gearset[] = storeState.getCleanData('gearsets') || [];
        const match = gearsets.find((gs: Gearset) => gs.name === name);
        return match || null;
      }
      case GearSource.Brandset: {
        const brandsets: Brandset[] = storeState.getCleanData('brandsets') || [];
        const match = brandsets.find((bs: Brandset) => bs.brand === name);
        return match || null;
      }
      case GearSource.Named:
      case GearSource.Exotic: {
        const namedGear: NamedExoticGear[] = storeState.getCleanData('namedGear') || [];
        const match = namedGear.find((ng: NamedExoticGear) => ng.name === name);
        return match || null;
      }
      default:
        console.warn(`BuildGear.lookupData: unknown source "${source}" for "${name}"`);
        return null;
    }
  }
}

export default BuildGear;
