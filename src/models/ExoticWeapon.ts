class ExoticWeaponMod {
  type: string;
  attribute: string;
  value: number;

  constructor(type: string = '', attribute: string = '', value: number = 0) {
    this.type = type;
    this.attribute = attribute;
    this.value = value;
  }
}

class ExoticWeapon {
  type: string;
  variant: string;
  name: string;
  talentName: string | null;
  talentDesc: string | null;
  modSlots: Record<string, ExoticWeaponMod>;

  constructor(data: Partial<ExoticWeapon> = {}) {
    this.type = data.type || '';
    this.variant = data.variant || '';
    this.name = data.name || '';
    this.talentName = data.talentName || null;
    this.talentDesc = data.talentDesc || null;
    this.modSlots = data.modSlots || {};
  }

}

export default ExoticWeapon;
