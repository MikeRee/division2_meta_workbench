import Stack from './Stack';

class Specialization {
  name: string;
  bonuses: Record<string, number>;
  stacks: Stack[];
  benefits: Record<string, string>;

  static readonly FIELD_TYPES = {
    name: 'string',
    bonuses: 'Record<string, number>',
    stacks: 'Stack[]',
    benefits: 'Record<string, string>',
  } as const;

  constructor(data: any = {}) {
    this.name = data.name || '';
    this.bonuses = data.bonuses && typeof data.bonuses === 'object' ? data.bonuses : {};
    this.stacks = Array.isArray(data.stacks) ? data.stacks : [];
    this.benefits = data.benefits && typeof data.benefits === 'object' ? data.benefits : {};
  }
}

export default Specialization;
