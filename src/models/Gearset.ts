import { CoreType, parseCoreType } from './CoreValue';
import { parseStatModifiers } from '../utils/mappingUtils';
import { GearType } from './BuildGear';

class Gearset {
  logo: string;
  name: string;
  core: CoreType | Record<CoreType, GearType[]>;
  twoPc: Record<string, number>;
  threePc: Record<string, number>;
  fourPc: string;
  chest: string;
  backpack: string;
  hint: string;

  static readonly FIELD_TYPES = {
    logo: 'string',
    name: 'string',
    core: 'CoreType | Record<CoreType, GearType[]>',
    twoPc: 'Record<string, number>',
    threePc: 'Record<string, number>',
    fourPc: 'string',
    chest: 'string',
    backpack: 'string',
    hint: 'string',
  } as const;

  constructor({
    logo = '',
    name = '',
    core = CoreType.WeaponDamage,
    twoPc = {},
    threePc = {},
    fourPc = '',
    chest = '',
    backpack = '',
    hint = '',
  }: {
    logo?: string;
    name?: string;
    core?: CoreType | Record<CoreType, GearType[]>;
    twoPc?: Record<string, number> | string | any;
    threePc?: Record<string, number> | string | any;
    fourPc?: string;
    chest?: string;
    backpack?: string;
    hint?: string;
  } = {}) {
    this.logo = logo;
    this.name = name;

    // Parse core - can be CoreType string or Record
    if (typeof core === 'string') {
      if (core.includes('=[')) {
        this.core = Gearset.parseCoreMap(core);
      } else {
        this.core = parseCoreType(core);
      }
    } else {
      this.core = core;
    }

    this.twoPc = parseStatModifiers(twoPc);
    this.threePc = parseStatModifiers(threePc);
    this.fourPc = fourPc;
    this.chest = chest;
    this.backpack = backpack;
    this.hint = hint;
  }

  /**
   * Parse a core map string like "skill tier=[Mask,Chest,Holster],armor=[Backpack,Gloves,Kneepads]"
   * into Record<CoreType, string[]>
   */
  static parseCoreMap(value: string): Record<CoreType, GearType[]> {
    const result: Record<string, string[]> = {};
    let current = '';
    let bracketDepth = 0;
    const pairs: string[] = [];
    for (let i = 0; i < value.length; i++) {
      const ch = value[i];
      if (ch === '[') bracketDepth++;
      else if (ch === ']') bracketDepth--;
      if (ch === ',' && bracketDepth === 0) {
        pairs.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    if (current) pairs.push(current);

    for (const pair of pairs) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx === -1) continue;
      const key = pair.substring(0, eqIdx).trim();
      let valStr = pair.substring(eqIdx + 1).trim();
      if (valStr.startsWith('[') && valStr.endsWith(']')) {
        valStr = valStr.substring(1, valStr.length - 1);
      }
      const items = valStr.split(',').map((s) => s.trim().toLowerCase());
      const coreType = parseCoreType(key);
      result[coreType] = items;
    }
    return result as Record<CoreType, GearType[]>;
  }
}

export default Gearset;
