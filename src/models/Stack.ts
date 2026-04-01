import Talent from './Talent';

class Stack {
  name?: string;
  size: number;
  talent: Talent;
  bonus: Record<string, number>;
  duration: number;
  cooldown: number;

  constructor(
    size = 0,
    talent = new Talent(),
    bonus: Record<string, number> = {},
    duration = 0,
    cooldown = 0,
    name?: string,
  ) {
    this.name = name;
    this.size = size;
    this.talent = talent;
    this.bonus = bonus;
    this.duration = duration;
    this.cooldown = cooldown;
  }
}

export default Stack;
