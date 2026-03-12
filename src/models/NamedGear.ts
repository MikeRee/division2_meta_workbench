import { CoreType, parseCoreType } from './CoreValue';
import { parseRecordField } from '../utils/recordParser';

export type MinorAttribute = Record<string, number> | 'mod';

interface NamedGearData {
  type?: string;
  brand?: string;
  name?: string;
  icon?: string;
  talent?: string;
  desc?: string;
  core?: CoreType | string;
  minor1?: MinorAttribute | string;
  minor2?: MinorAttribute | string;
  minor3?: MinorAttribute | string;
  notes?: string;
  isExotic?: boolean;
  icon2?: string;
  __appliedRules?: Record<string, string[]>;
}

class NamedGear {
  type: string;
  brand: string;
  name: string;
  icon: string;
  talent: string;
  desc: string;
  core: CoreType;
  minor1: MinorAttribute;
  minor2: MinorAttribute;
  minor3: MinorAttribute;
  notes: string;
  isExotic: boolean;
  icon2: string;

  static readonly FIELD_TYPES = {
    type: 'string',
    brand: 'string',
    name: 'string',
    icon: 'string',
    talent: 'string',
    desc: 'string',
    core: 'CoreType',
    minor1: 'Record<string, number> | "mod"',
    minor2: 'Record<string, number> | "mod"',
    minor3: 'Record<string, number> | "mod"',
    notes: 'string',
    isExotic: 'boolean',
    icon2: 'string'
  } as const;

  constructor({
    type = '',
    brand = '',
    name = '',
    icon = '',
    talent = '',
    desc = '',
    core = CoreType.WeaponDamage,
    minor1 = {},
    minor2 = {},
    minor3 = {},
    notes = '',
    isExotic = false,
    icon2 = '',
    __appliedRules = {}
  }: NamedGearData = {}) {
    this.type = type;
    this.brand = brand;
    this.name = name;
    this.icon = icon;
    this.talent = talent;
    this.desc = desc;
    this.core = parseCoreType(core);
    this.minor1 = this.parseMinorAttribute(minor1, __appliedRules?.minor1);
    this.minor2 = this.parseMinorAttribute(minor2, __appliedRules?.minor2);
    this.minor3 = this.parseMinorAttribute(minor3, __appliedRules?.minor3);
    this.notes = notes;
    this.isExotic = isExotic;
    this.icon2 = icon2;
  }

  /**
   * Parse minor attribute - can be 'mod', a Record, or a string to parse
   */
  private parseMinorAttribute(value: MinorAttribute | string | any, appliedRules?: string[]): MinorAttribute {
    if (value === 'mod') {
      return 'mod';
    }
    return parseRecordField(value, appliedRules);
  }


}

export default NamedGear;
