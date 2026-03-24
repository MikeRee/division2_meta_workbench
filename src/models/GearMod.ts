import { CoreType } from './CoreValue';
import { parseEnum } from '../utils/enumParser';

/**
 * Classification enum for gear mods
 */
export enum GearModClassification {
  Offensive = 'offensive',
  Defensive = 'defensive',
  Skill = 'skill',
}

/**
 * Parse a string into GearModClassification enum
 * @throws Error if value is not a valid GearModClassification
 */
export function parseGearModClassification(
  value: string | GearModClassification,
): GearModClassification {
  return parseEnum(value, GearModClassification, 'GearModClassification');
}

/**
 * GearMod model representing a gear modification type
 */
class GearMod {
  classification: GearModClassification;
  attribute: string;
  max: number;

  static readonly FIELD_TYPES = {
    classification: 'GearModClassification',
    attribute: 'string',
    max: 'number',
  } as const;

  constructor({
    classification,
    attribute,
    max,
  }: {
    classification?: string;
    attribute?: string;
    max?: string | number;
  }) {
    // Parse classification - will throw error if invalid
    this.classification = parseGearModClassification(classification || 'offensive');
    this.attribute = (attribute || '').toLowerCase();
    this.max = typeof max === 'number' ? max : parseFloat(max || '0');
  }

  /**
   * Creates a GearMod from a CSV row
   * @param {string[]} row - CSV row data [Classification, Attribute, Max]
   * @returns {GearMod}
   */
  static fromCSVRow(row: string[]): GearMod {
    // Parse max value by removing all non-numeric characters except decimal point
    const maxValue = row[2] || '0';
    const numericValue = maxValue.replace(/[^0-9.]/g, '');

    return new GearMod({
      classification: (row[0] || '').toLowerCase(),
      attribute: (row[1] || '').toLowerCase(),
      max: parseFloat(numericValue) || 0,
    });
  }

  /**
   * Gets a unique key for this gear mod
   */
  getKey(): string {
    return `${this.classification} - ${this.attribute}`;
  }
}

/**
 * GearModValue model representing a gear mod instance with a specific value
 */
class GearModValue {
  options: Record<string, number>;
  classification?: GearModClassification;
  isAttribute: boolean;
  core?: CoreType;
  key?: string;
  value?: number;

  constructor(
    options: Record<string, number>,
    type?: GearModClassification | CoreType,
    key?: string,
    value?: number,
  ) {
    this.options = options;

    // Check if type is CoreType, assign to core, otherwise classification
    if (type && Object.values(CoreType).includes(type as CoreType)) {
      this.core = type as CoreType;
    } else {
      this.classification = type as GearModClassification;
    }

    this.isAttribute = true;
    this.key = key;
    this.value = value;
  }

  /**
   * Checks if this is a mod (has no core attribute)
   */
  isMod(): boolean {
    return this.classification == null && this.core == null;
  }

  isCore(): boolean {
    return this.core != null;
  }

  /**
   * Gets the percentage of max value
   */
  getPercentOfMax(): number {
    if (this.key == null || this.value == null || this.options[this.key] === 0) return 0;
    return (this.value / this.options[this.key]) * 100;
  }

  /**
   * Checks if the value is at maximum
   */
  isMaxRoll(): boolean {
    if (this.key == null || this.value == null) return false;
    return this.value >= this.options[this.key];
  }
}

export function getGearColors(type: GearModClassification): [string, string] {
  let color1 = '#9E9E9E';
  let color2 = '#424242';
  switch (type) {
    case GearModClassification.Offensive:
      color1 = '#e85a5a';
      color2 = '#7a3e3e';
      break;
    case GearModClassification.Defensive:
      color1 = '#7FB5F5';
      color2 = '#4D586B';
      break;
    case GearModClassification.Skill:
      color1 = '#F0D082';
      color2 = '#6B5339';
      break;
  }

  return [color1, color2];
}

export function getDefaultAttrImage(type: GearModClassification): string {
  const [color1, color2] = getGearColors(type);

  switch (type) {
    case GearModClassification.Offensive:
      return `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="75" 
          fill="none" 
          stroke="${color1}" 
          stroke-width="15" 
          stroke-linecap="round"
          stroke-dasharray="87.8, 30" 
          stroke-dashoffset="10" 
          transform="rotate(67 100 100)" />

  <defs>
    <filter id="soften" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
    </filter>
  </defs>

  <g filter="url(#soften)" transform="scale(.66) translate(52, 52)">
    <circle cx="100" cy="100" r="72.5" fill="${color1}" />
    <circle cx="100" cy="100" r="60" fill="${color2}" />
    <path d="M100,25 
             A75,75 0 0,1 175,100 M175,100 
             A75,75 0 0,1 100,175 M100,175 
             A75,75 0 0,1 25,100 M25,100 
             A75,75 0 0,1 100,25" 
          fill="none" 
          stroke="${color1}" 
          stroke-width="20" 
          stroke-linecap="round"
          stroke-dasharray="88, 40" 
          stroke-dashoffset="44"
          transform="rotate(-45 100 100)" />
  </g>

          
</svg>`;
    case GearModClassification.Defensive:
      return `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="75" 
          fill="none" 
          stroke="${color1}" 
          stroke-width="15" 
          stroke-linecap="round"
          stroke-dasharray="87.8, 30" 
          stroke-dashoffset="10" 
          transform="rotate(67 100 100)" />
  
<path d="M10 10 H90 V70 L50 110 L10 70 Z" fill="${color2}" stroke="${color1}" stroke-width="8" stroke-linejoin="round" transform="scale(.9) translate(60, 55)"/>
          
</svg>`;
    case GearModClassification.Skill:
      return `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="75" 
          fill="none" 
          stroke="#D4A017" 
          stroke-width="15" 
          stroke-linecap="round"
          stroke-dasharray="87.8, 30" 
          stroke-dashoffset="10" 
          transform="rotate(67 100 100)" />

  <g  transform="scale(.9) translate(60, 45)">
                <rect x="20" y="20" width="60" height="90" rx="4" fill="#FCE9B6" stroke="#D4A017" stroke-width="6"/>
                <path d="M40 20 V10 H60 V20" fill="#FCE9B6" stroke="#D4A017" stroke-width="6" stroke-linejoin="round"/>
                <rect x="28" y="85" width="44" height="18" fill="#F4C542"/>
    </g>
</svg>`;
  }

  return '';
}

export function getDefaultModImage(type: GearModClassification): string {
  const [color1, color2] = getGearColors(type);

  return `<svg width="200" height="200" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(10, 10)">
    <circle r="7.2" fill="${color1}" />
    
    <g fill="${color1}">
      <rect x="-2" y="-9" width="4" height="4" rx="0.5" transform="rotate(0)" />
      <rect x="-2" y="-9" width="4" height="4" rx="0.5" transform="rotate(45)" />
      <rect x="-2" y="-9" width="4" height="4" rx="0.5" transform="rotate(90)" />
      <rect x="-2" y="-9" width="4" height="4" rx="0.5" transform="rotate(135)" />
      <rect x="-2" y="-9" width="4" height="4" rx="0.5" transform="rotate(180)" />
      <rect x="-2" y="-9" width="4" height="4" rx="0.5" transform="rotate(225)" />
      <rect x="-2" y="-9" width="4" height="4" rx="0.5" transform="rotate(270)" />
      <rect x="-2" y="-9" width="4" height="4" rx="0.5" transform="rotate(315)" />
    </g>

    <circle r="6" fill="${color2}" />
    <circle r="5" fill="${color1}" />
    <circle r="4" fill="${color2}" />
    
    <path d="M-2.5 0 H2.5 M0 -2.5 V2.5" stroke="${color1}" stroke-width="1" stroke-linecap="square" />
  </g>
</svg>`;
}

/**
 * GearModCollection manages a collection of gear mods
 */
class GearModCollection {
  private modsByAttribute: Map<string, GearMod>;

  constructor(mods: GearMod[]) {
    this.modsByAttribute = new Map();
    mods.forEach((mod) => {
      this.modsByAttribute.set(mod.attribute, mod);
    });
  }

  /**
   * Gets the classification for a given attribute
   */
  getClassification(attr: string): GearModClassification | undefined {
    return this.modsByAttribute.get(attr.toLowerCase())?.classification;
  }

  /**
   * Gets all gear mods with the specified classification
   */
  getAttributes(classification: GearModClassification): GearMod[] {
    return Array.from(this.modsByAttribute.values()).filter(
      (mod) => mod.classification === classification,
    );
  }

  /**
   * Converts to array for serialization
   */
  toArray(): GearMod[] {
    return Array.from(this.modsByAttribute.values());
  }
  /**
   * Gets all gear mods as a Record mapping attribute names to max values
   */
  getAll(): Record<string, number> {
    const result: Record<string, number> = {};
    this.modsByAttribute.forEach((mod, attribute) => {
      result[attribute] = mod.max;
    });
    return result;
  }
}

export default GearMod;
export { GearMod, GearModValue, GearModCollection };
