class KeenersWatchAttribute {
  category: string;
  attribute: string;
  max: string;

  static readonly FIELD_TYPES = {
    category: 'string',
    attribute: 'string',
    max: 'string',
  } as const;

  constructor(data: any = {}) {
    this.category = data.category || data.Category || '';
    this.attribute = data.attribute || data.Attribute || '';
    this.max = data.max || data.Max || data['Max Bonus'] || '';
  }
}

export default KeenersWatchAttribute;
