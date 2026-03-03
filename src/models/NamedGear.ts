import { CoreType } from './CoreValue';

export type MinorAttribute = Record<string, number> | 'mod';

interface NamedGearData {
  type?: string;
  brand?: string;
  name?: string;
  icon?: string;
  talent?: string;
  desc?: string;
  core?: CoreType;
  minor1?: MinorAttribute;
  minor2?: MinorAttribute;
  minor3?: MinorAttribute;
  notes?: string;
  isExotic?: boolean;
  icon2?: string;
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
    icon2 = ''
  }: NamedGearData = {}) {
    this.type = type;
    this.brand = brand;
    this.name = name;
    this.icon = icon;
    this.talent = talent;
    this.desc = desc;
    this.core = core;
    this.minor1 = minor1;
    this.minor2 = minor2;
    this.minor3 = minor3;
    this.notes = notes;
    this.isExotic = isExotic;
    this.icon2 = icon2;
  }


}

export default NamedGear;
