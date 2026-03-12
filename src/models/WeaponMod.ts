import { parseRecordField } from '../utils/recordParser';

class WeaponMod {
  type: string;
  slot: string;
  name: string;
  bonus: Record<string, number>;
  penalty: Record<string, number>;
  source: string;

  static readonly FIELD_TYPES = {
    type: 'string',
    slot: 'string',
    name: 'string',
    bonus: 'Record<string, number>',
    penalty: 'Record<string, number>',
    source: 'string'
  } as const;

  constructor({
    type = '',
    slot = '',
    name = '',
    bonus = '',
    penalty = '',
    source = '',
    __appliedRules = {}
  }: {
    type?: string;
    slot?: string;
    name?: string;
    bonus?: string | Record<string, number>;
    penalty?: string | Record<string, number>;
    source?: string;
    __appliedRules?: Record<string, string[]>;
  } = {}) {
    this.type = type;
    this.slot = slot;
    this.name = name;
    this.bonus = parseRecordField(bonus, __appliedRules?.bonus);
    this.penalty = parseRecordField(penalty, __appliedRules?.penalty);
    this.source = source;
  }

  static fromSheetRow(row: any[], currentType: string, currentSlot: string): WeaponMod {
    return new WeaponMod({
      type: currentType,
      slot: currentSlot,
      name: row[2] || '',
      bonus: row[3] || '',
      penalty: row[4] || '',
      source: row[5] || ''
    });
  }

}

export default WeaponMod;
