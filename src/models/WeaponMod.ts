class WeaponMod {
  type: string;
  slot: string;
  name: string;
  bonus: Record<string, number>;
  penalty: Record<string, number>;
  source: string;

  constructor({
    type = '',
    slot = '',
    name = '',
    bonus = {},
    penalty = {},
    source = ''
  }: {
    type?: string;
    slot?: string;
    name?: string;
    bonus?: Record<string, number>;
    penalty?: Record<string, number>;
    source?: string;
  } = {}) {
    this.type = type;
    this.slot = slot;
    this.name = name;
    this.bonus = bonus;
    this.penalty = penalty;
    this.source = source;
  }

  static fromSheetRow(row: any[], currentType: string, currentSlot: string): WeaponMod {
    return new WeaponMod({
      type: currentType,
      slot: currentSlot,
      name: row[2] || '',
      bonus: row[3] || {},
      penalty: row[4] || {},
      source: row[5] || ''
    });
  }

}

export default WeaponMod;
