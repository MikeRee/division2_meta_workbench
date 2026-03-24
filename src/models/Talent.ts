import Stack from './Stack';

enum TalentType {
  GEAR = 'gear',
  WEAPON = 'weapon',
}

class Talent {
  name: string;
  type: TalentType;
  perfectName?: string;
  icon: string;
  description: string;
  perfectDescription?: string;
  exclusiveTo: string[];
  stacks: Stack[];
  perfectStacks: Stack[];
  bonus: Record<string, number>;
  perfectBonus?: Record<string, number>;

  static readonly FIELD_TYPES = {
    name: 'string',
    type: 'string',
    perfectName: 'string',
    icon: 'string',
    description: 'string',
    perfectDescription: 'string',
    exclusiveTo: 'string[]',
    stacks: 'Stack[]',
    perfectStacks: 'Stack[]',
    bonus: 'Record<string, number>',
    perfectBonus: 'Record<string, number>',
  } as const;

  constructor(data: any = {}) {
    this.name = data.name || '';
    this.type = data.type || '';
    this.perfectName = data.perfectName || '';
    this.icon = data.icon || '';
    this.description = data.description || '';
    this.perfectDescription = data.perfectDescription || '';
    this.exclusiveTo = Array.isArray(data.exclusiveTo) ? data.exclusiveTo : [];
    this.stacks = Array.isArray(data.stacks) ? data.stacks : [];
    this.perfectStacks = Array.isArray(data.perfect) ? data.perfect : [];
    this.bonus = data.bonus && typeof data.bonus === 'object' ? data.bonus : {};
    this.perfectBonus =
      data.perfectBonus && typeof data.perfectBonus === 'object' ? data.perfectBonus : {};
  }

  addStack(stack: Stack) {
    this.stacks.push(stack);
  }

  addPerfect(stack: Stack) {
    this.perfectStacks.push(stack);
  }
}

export default Talent;
