interface WeaponTalentData {
  weaponCategory?: string;
  name?: string;
  icon?: string;
  perfect?: string;
  description?: string;
}

class WeaponTalent {
  weaponCategory: string;
  name: string;
  icon: string;
  perfect: string;
  description: string;

  constructor(data: WeaponTalentData = {}) {
    this.weaponCategory = data.weaponCategory || ''; // The weapon category (from col B when col A is empty)
    this.name = data.name || ''; // Column B when Column A has an icon
    this.icon = data.icon || ''; // Column A - Icon
    this.perfect = data.perfect || ''; // Column C - Perfect version
    this.description = data.description || ''; // Column D - Description
  }

  static fromSheetRow(row: any[], currentWeaponCategory: string): WeaponTalent {
    return new WeaponTalent({
      weaponCategory: currentWeaponCategory,
      name: row[1] || '',
      icon: row[0] || '',
      perfect: row[2] || '',
      description: row[3] || '',
    });
  }

}

export default WeaponTalent;
