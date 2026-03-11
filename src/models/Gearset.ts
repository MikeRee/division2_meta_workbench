import { CoreType } from './CoreValue';
import StatModifier from './StatModifier';

class Gearset {
  logo: string;
  name: string;
  core: CoreType | Record<CoreType, string[]>;
  twoPc: StatModifier[];
  threePc: StatModifier[];
  fourPc: string;
  chest: string;
  chestDesc: string;
  backpack: string;
  backpackDesc: string;
  hint: string;

  constructor({
    logo = '',
    name = '',
    core = CoreType.WeaponDamage,
    twoPc = [],
    threePc = [],
    fourPc = '',
    chest = '',
    chestDesc = '',
    backpack = '',
    backpackDesc = '',
    hint = ''
  }: {
    logo?: string;
    name?: string;
    core?: CoreType | Record<CoreType, string[]>;
    twoPc?: StatModifier[] | string;
    threePc?: StatModifier[] | string;
    fourPc?: string;
    chest?: string;
    chestDesc?: string;
    backpack?: string;
    backpackDesc?: string;
    hint?: string;
  } = {}) {
    this.logo = logo;
    this.name = name;
    this.core = core;
    this.twoPc = StatModifier.parseStatModifiers(twoPc);
    this.threePc = StatModifier.parseStatModifiers(threePc);
    this.fourPc = fourPc;
    this.chest = chest;
    this.chestDesc = chestDesc;
    this.backpack = backpack;
    this.backpackDesc = backpackDesc;
    this.hint = hint;
  }
}

export default Gearset;
