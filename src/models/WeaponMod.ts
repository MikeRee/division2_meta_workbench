import { parseRecordField } from '../utils/recordParser';

class WeaponMod {
  type: string;
  slot: string;
  name: string;
  bonus: Record<string, number>;
  filters: string[];
  source?: string;

  static readonly FIELD_TYPES = {
    type: 'string',
    slot: 'string',
    name: 'string',
    bonus: 'Record<string, number>',
    source: 'string',
  } as const;

  constructor({
    type = '',
    slot = '',
    name = '',
    bonus = '',
    filters = [],
    source = '',
    __appliedRules = {},
  }: {
    type?: string;
    slot?: string;
    name?: string;
    bonus?: string | Record<string, number>;
    filters?: string[];
    source?: string;
    __appliedRules?: Record<string, string[]>;
  } = {}) {
    this.type = type;
    this.slot = slot;
    this.name = name;
    this.bonus = parseRecordField(bonus, __appliedRules?.bonus);
    this.filters = filters;
    this.source = source;
  }

  static fromSheetRow(row: any[], currentType: string, currentSlot: string): WeaponMod {
    return new WeaponMod({
      type: currentType,
      slot: currentSlot,
      name: row[2] || '',
      bonus: row[3] || '',
      source: row[5] || '',
    });
  }

  static distinctTypes(mods: WeaponMod[]): string[] {
    return [...new Set(mods.map((m) => m.type).filter(Boolean))];
  }
}

export default WeaponMod;
