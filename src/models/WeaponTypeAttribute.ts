class WeaponTypeAttribute {
  weaponType: string;
  attribute: string;
  max: string;

  static readonly FIELD_TYPES = {
    weaponType: 'string',
    attribute: 'string',
    max: 'string',
  } as const;

  constructor(data: any = {}) {
    this.weaponType = data.weaponType || data.Weapon || '';
    this.attribute = data.attribute || data.Attribute || '';
    this.max = data.max || data.Max || '';
  }
}

export default WeaponTypeAttribute;
