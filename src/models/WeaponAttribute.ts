class WeaponAttribute {
  attribute: string;
  max: string;

  static readonly FIELD_TYPES = {
    attribute: 'string',
    max: 'string',
  } as const;

  constructor(data: any = {}) {
    this.attribute = data.attribute || data.Attribute || '';
    this.max = data.max || data.Max || '';
  }
}

export default WeaponAttribute;
