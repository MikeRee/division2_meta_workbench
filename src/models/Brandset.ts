import { CoreType } from './CoreValue';

interface BrandsetData {
  icon?: string;
  brand?: string;
  core?: CoreType;
  onePc?: Record<string, number>;
  twoPc?: Record<string, number>;
  threePc?: Record<string, number>;
}

class Brandset {
  icon: string;
  brand: string;
  core: CoreType;
  onePc: Record<string, number>;
  twoPc: Record<string, number>;
  threePc: Record<string, number>;

  constructor({
    icon = '',
    brand = '',
    core = CoreType.WeaponDamage,
    onePc = {},
    twoPc = {},
    threePc = {}
  }: BrandsetData = {}) {
    this.icon = icon;
    this.brand = brand;
    this.core = core;
    this.onePc = onePc;
    this.twoPc = twoPc;
    this.threePc = threePc;
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
