import { CoreType, parseCoreType } from './CoreValue';
import { parseStatModifiers } from '../utils/mappingUtils';

interface BrandsetData {
  icon?: string;
  brand?: string;
  core?: CoreType | string;
  onePc?: Record<string, number> | any;
  twoPc?: Record<string, number> | any;
  threePc?: Record<string, number> | any;
}

class Brandset {
  icon: string;
  brand: string;
  core: CoreType;
  onePc: Record<string, number>;
  twoPc: Record<string, number>;
  threePc: Record<string, number>;

  static readonly FIELD_TYPES = {
    icon: 'string',
    brand: 'string',
    core: 'CoreType',
    onePc: 'Record<string, number>',
    twoPc: 'Record<string, number>',
    threePc: 'Record<string, number>'
  } as const;

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
    this.core = parseCoreType(core);
    this.onePc = parseStatModifiers(onePc);
    this.twoPc = parseStatModifiers(twoPc);
    this.threePc = parseStatModifiers(threePc);
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
