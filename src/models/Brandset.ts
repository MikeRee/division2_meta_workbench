import { CoreType } from './CoreValue';
import StatModifier from './StatModifier';

interface BrandsetData {
  icon?: string;
  brand?: string;
  core?: CoreType;
  onePc?: StatModifier[];
  twoPc?: StatModifier[];
  threePc?: StatModifier[];
}

class Brandset {
  icon: string;
  brand: string;
  core: CoreType;
  onePc: StatModifier[];
  twoPc: StatModifier[];
  threePc: StatModifier[];

  constructor({
    icon = '',
    brand = '',
    core = CoreType.WeaponDamage,
    onePc = [],
    twoPc = [],
    threePc = []
  }: BrandsetData = {}) {
    this.icon = icon;
    this.brand = brand;
    this.core = this.normalizeCoreType(core);
    this.onePc = StatModifier.parseStatModifiers(onePc);
    this.twoPc = StatModifier.parseStatModifiers(twoPc);
    this.threePc = StatModifier.parseStatModifiers(threePc);
  }

  private normalizeCoreType(core: any): CoreType {
    if (typeof core === 'string') {
      const normalized = core.toLowerCase();
      if (Object.values(CoreType).includes(normalized as CoreType)) {
        return normalized as CoreType;
      }
    }
    return core;
  }

  /**
   * Creates a Brandset from a Google Sheets row
   * Row structure: [col A, col B (icon), col C (brand), col D, col E (core), col F (1pc), col G (2pc), col H (3pc)]
   */
  static fromSheetRow(row: any[]): Brandset {
    return new Brandset({
      icon: row[1] || '',
      brand: (row[2] || '').trim(),
      core: row[4] || CoreType.WeaponDamage,
      onePc: row[5] || '',
      twoPc: row[6] || '',
      threePc: row[7] || ''
    } as any);
  }

}

export default Brandset;
