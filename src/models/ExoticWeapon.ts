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
  icons: string[];
  talentName: string | null;
  talentDesc: string | null;
  modSlots: Record<string, ExoticWeaponMod>;

  constructor(data: any = {}) {
    this.type = data.type || '';
    this.variant = data.variant || '';
    this.name = data.name || '';
    
    // Handle icons - ensure it's an array
    if (Array.isArray(data.icons)) {
      this.icons = data.icons;
    } else if (typeof data.icons === 'string') {
      this.icons = data.icons.split(',').map((s: string) => s.trim()).filter((s: string) => s);
    } else {
      this.icons = [];
    }
    
    this.talentName = data.talentName || null;
    this.talentDesc = data.talentDesc || null;
    
    // Handle modSlots - parse string into Record<string, ExoticWeaponMod>
    if (typeof data.modSlots === 'string') {
      this.modSlots = this.parseModSlotsString(data.modSlots);
    } else if (typeof data.modSlots === 'object' && data.modSlots !== null) {
      this.modSlots = data.modSlots;
    } else {
      this.modSlots = {};
    }
  }

  private parseModSlotsString(modSlotsStr: string): Record<string, ExoticWeaponMod> {
    const result: Record<string, ExoticWeaponMod> = {};
    
    if (!modSlotsStr || modSlotsStr.trim() === '') {
      return result;
    }
    
    // Split by newline to get each mod slot entry
    const lines = modSlotsStr.split('\n').map(line => line.trim()).filter(line => line);
    
    for (const line of lines) {
      // Parse format: "SlotName: +value attribute" or "SlotName: value attribute"
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      
      const slotName = line.substring(0, colonIndex).trim();
      const modInfo = line.substring(colonIndex + 1).trim();
      
      // Extract value and attribute
      // Handle formats like "+15% Critical Hit Chance" or "+20 Rounds"
      const match = modInfo.match(/^([+\-]?\d+(?:\.\d+)?)\s*(%?)\s*(.+)$/);
      
      if (match) {
        const numValue = parseFloat(match[1]);
        const hasPercent = match[2] === '%';
        const attribute = match[3].trim();
        
        result[slotName] = new ExoticWeaponMod(
          slotName,
          attribute,
          hasPercent ? numValue : numValue
        );
      }
    }
    
    return result;
  }

}

export default ExoticWeapon;
