/**
 * Main data keys for game content (used in Raw and Clean stores)
 */
export const MAIN_DATA_KEYS = [
  'weapons',
  'weaponTalents',
  'exoticWeapons',
  'gearsets',
  'brandsets',
  'gearTalents',
  'namedGear',
  'skills',
  'weaponMods',
  'specializations',
] as const;

/**
 * Lookup data keys for reference data (only used in Lookup store, loaded from lookups.json)
 */
export const LOOKUP_DATA_KEYS = [
  'weaponAttributes',
  'weaponTypeAttributes',
  'gearAttributes',
  'gearMods',
  'keenersWatch',
  'statusImmunities',
] as const;

/**
 * All data keys combined (for backwards compatibility)
 */
export const DATA_KEYS = [...MAIN_DATA_KEYS, ...LOOKUP_DATA_KEYS] as const;

export type MainDataKey = typeof MAIN_DATA_KEYS[number];
export type LookupDataKey = typeof LOOKUP_DATA_KEYS[number];
export type DataKey = typeof DATA_KEYS[number];
