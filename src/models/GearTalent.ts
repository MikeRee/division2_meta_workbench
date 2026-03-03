interface GearTalentData {
  piece?: string;
  icon?: string;
  talent?: string;
  perfectTalent?: string;
  description?: string;
  hint?: string;
}

class GearTalent {
  piece: string;
  icon: string;
  talent: string;
  perfectTalent: string;
  description: string;
  hint: string;

  constructor({
    piece = '',
    icon = '',
    talent = '',
    perfectTalent = '',
    description = '',
    hint = ''
  }: GearTalentData = {}) {
    this.piece = piece;
    this.icon = icon;
    this.talent = talent;
    this.perfectTalent = perfectTalent;
    this.description = description;
    this.hint = hint;
  }

  /**
   * Creates a GearTalent from a Google Sheets row
   * Row structure: [colA, colB, colC (icon), colD (talent), colE (perfectTalent), colF (description), colG (hint)]
   * @param row - The row data from sheets
   * @param piece - The piece type (chest or backpack)
   */
  static fromSheetRow(row: any[], piece: string): GearTalent {
    return new GearTalent({
      piece: piece,
      icon: row[2] || '',
      talent: (row[3] || '').trim(),
      perfectTalent: (row[4] || '').trim(),
      description: row[5] || '',
      hint: row[6] || ''
    });
  }

  toYAML(indent: number = 0): string {
    const spaces = ' '.repeat(indent);
    let yaml = '';
    yaml += `${spaces}piece: "${this.piece}"\n`;
    yaml += `${spaces}icon: "${this.icon}"\n`;
    yaml += `${spaces}talent: "${this.talent}"\n`;
    yaml += `${spaces}perfectTalent: "${this.perfectTalent}"\n`;
    yaml += `${spaces}description: "${this.description}"\n`;
    yaml += `${spaces}hint: "${this.hint}"\n`;
    return yaml;
  }

}

export default GearTalent;
