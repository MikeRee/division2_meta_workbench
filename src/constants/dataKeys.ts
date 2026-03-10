/**
 * Shared data keys used across Raw and Clean data stores
 */
export const DATA_KEYS = [
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
  'weaponAttributes',
  'weaponTypeAttributes',
  'gearAttributes',
  'gearMods',
  'keenersWatch',
  'statusImmunities',
] as const;

export type DataKey = typeof DATA_KEYS[number];
