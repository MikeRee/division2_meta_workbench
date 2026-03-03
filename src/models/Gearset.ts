import { CoreType } from './CoreValue';

class Gearset {
  logo: string;
  name: string;
  core: CoreType | Record<CoreType, string[]>;
  twoPc: Record<string, number>;
  threePc: Record<string, number>;
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
    twoPc = {},
    threePc = {},
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
    twoPc?: Record<string, number>;
    threePc?: Record<string, number>;
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
    this.twoPc = twoPc;
    this.threePc = threePc;
    this.fourPc = fourPc;
    this.chest = chest;
    this.chestDesc = chestDesc;
    this.backpack = backpack;
    this.backpackDesc = backpackDesc;
    this.hint = hint;
  }

}

export default Gearset;
