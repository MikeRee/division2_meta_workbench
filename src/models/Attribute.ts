/**
 * Attribute model for various attribute types (weapon, gear, etc.)
 */
interface AttributeData {
  classification?: string | null;
  attribute?: string;
  max?: string;
  category?: string | null;
  weaponType?: string | null;
}

class Attribute {
  classification: string | null;
  attribute: string;
  max: string;
  category: string | null;
  weaponType: string | null;

  constructor({ classification, attribute, max, category, weaponType }: AttributeData) {
    this.classification = classification || null; // For gear attributes/mods
    this.attribute = attribute || '';
    this.max = max || '';
    this.category = category || null; // For Keener's Watch
    this.weaponType = weaponType || null; // For weapon type attributes
  }

  /**
   * Creates an Attribute from a CSV row
   * @param {string[]} row - CSV row data
   * @param {string} type - Type of attribute (gear, gearMod, keenersWatch, weaponType, weapon)
   * @returns {Attribute}
   */
  static fromCSVRow(row: string[], type: string): Attribute {
    switch (type) {
      case 'gear':
      case 'gearMod':
        return new Attribute({
          classification: row[0] || '',
          attribute: row[1] || '',
          max: row[2] || ''
        });
      case 'keenersWatch':
        return new Attribute({
          category: row[0] || '',
          attribute: row[1] || '',
          max: row[2] || ''
        });
      case 'weaponType':
        return new Attribute({
          weaponType: row[0] || '',
          attribute: row[1] || '',
          max: row[2] || ''
        });
      case 'weapon':
        return new Attribute({
          attribute: row[0] || '',
          max: row[1] || ''
        });
      default:
        return new Attribute({
          attribute: row[0] || '',
          max: row[1] || ''
        });
    }
  }

  /**
   * Gets a unique key for this attribute
   */
  getKey(): string {
    const parts: string[] = [];
    if (this.classification) parts.push(this.classification);
    if (this.category) parts.push(this.category);
    if (this.weaponType) parts.push(this.weaponType);
    parts.push(this.attribute);
    return parts.join(' - ');
  }

}

export default Attribute;
