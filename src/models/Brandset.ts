import { CoreType, parseCoreType } from './CoreValue';
import { parseStatModifiers } from '../utils/mappingUtils';

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
    threePc: 'Record<string, number>',
  } as const;

  constructor({
    icon = '',
    brand = '',
    core = CoreType.WeaponDamage,
    onePc = {},
    twoPc = {},
    threePc = {},
  }: Partial<Brandset> = {}) {
    this.icon = icon;
    this.brand = brand;
    this.core = parseCoreType(core);
    this.onePc = parseStatModifiers(onePc);
    this.twoPc = parseStatModifiers(twoPc);
    this.threePc = parseStatModifiers(threePc);
  }
}

export default Brandset;
