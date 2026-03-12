import { parseEnum } from '../utils/enumParser';

export enum CoreType {
  WeaponDamage = 'weapon damage',
  Armor = 'armor',
  SkillTier = 'skill tier'
}

/**
 * Parse a string into CoreType enum
 * @throws Error if value is not a valid CoreType
 */
export function parseCoreType(value: string | CoreType): CoreType {
  return parseEnum(value, CoreType, 'CoreType');
}

export interface CoreValue {
  type: CoreType;
  value: number;
}

export function getDefaultCoreValue(type: CoreType): number {
  switch (type) {
    case CoreType.WeaponDamage:
      return 15;
    case CoreType.Armor:
      return 170000;
    case CoreType.SkillTier:
      return 1;
  }
}

export function getDefaultMinorAttributes(coreType: CoreType): { minor1: string; minor2: string } {
  switch (coreType) {
    case CoreType.WeaponDamage:
      return {
        minor1: 'critical hit chance',
        minor2: 'critical hit damage'
      };
    case CoreType.Armor:
      return {
        minor1: 'hazard protection',
        minor2: 'explosive resistance'
      };
    case CoreType.SkillTier:
      return {
        minor1: 'skill haste',
        minor2: 'skill damage'
      };
    default:
      throw new Error(`Invalid CoreType: "${coreType}". Expected one of: ${Object.values(CoreType).join(', ')}`);
  }
}

export function getDefaultCoreImage(type: CoreType): string {
  switch (type) {
    case CoreType.WeaponDamage:
      return `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="soften" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
    </filter>
  </defs>

  <g filter="url(#soften)">
    <circle cx="100" cy="100" r="72.5" fill="#e85a5a" />
    <circle cx="100" cy="100" r="60" fill="#7a3e3e" />
    <path d="M100,25 
             A75,75 0 0,1 175,100 M175,100 
             A75,75 0 0,1 100,175 M100,175 
             A75,75 0 0,1 25,100 M25,100 
             A75,75 0 0,1 100,25" 
          fill="none" 
          stroke="#e85a5a" 
          stroke-width="20" 
          stroke-linecap="round"
          stroke-dasharray="88, 40" 
          stroke-dashoffset="44"
          transform="rotate(-45 100 100)" />
  </g>
</svg>`;
    case CoreType.Armor:
      return `<svg width="100" height="100" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 10 H90 V70 L50 110 L10 70 Z" fill="#6B96C3" stroke="#4A6583" stroke-width="8" stroke-linejoin="round"/>
              </svg>`;
    case CoreType.SkillTier:
      return `<svg width="100" height="100" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
                <rect x="20" y="20" width="60" height="90" rx="4" fill="#FCE9B6" stroke="#D4A017" stroke-width="6"/>
                <path d="M40 20 V10 H60 V20" fill="#FCE9B6" stroke="#D4A017" stroke-width="6" stroke-linejoin="round"/>
                <rect x="28" y="85" width="44" height="18" fill="#F4C542"/>
              </svg>`;
    default:
      return ''; // Good practice: handle cases where 'type' might not match
  }
}
