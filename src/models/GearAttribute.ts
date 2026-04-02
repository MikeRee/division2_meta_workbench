class GearAttribute {
  classification: string;
  attribute: string;
  max: string;

  static readonly FIELD_TYPES = {
    classification: 'string',
    attribute: 'string',
    max: 'string',
  } as const;

  constructor(data: any = {}) {
    this.classification = data.classification || data.Classification || '';
    this.attribute = data.attribute || data.Attribute || '';
    this.max = data.max || data.Max || '';
  }
}

export default GearAttribute;
