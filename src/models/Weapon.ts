class Weapon {
  type: string;
  variant: string;
  name: string;
  flag: string | null;
  rpm: number;
  baseMagSize: number;
  moddedMagSize: number;
  reload: number;
  damage: number;
  optimalRange: number;
  modSlots: string[];
  hsd: number;

  constructor(data: any = {}) {
    this.type = data.type || '';
    this.variant = data.variant || '';
    this.name = data.name || '';
    this.flag = data.flag || null;
    
    // Ensure numeric fields are numbers
    this.rpm = typeof data.rpm === 'number' ? data.rpm : (parseFloat(data.rpm) || 0);
    this.baseMagSize = typeof data.baseMagSize === 'number' ? data.baseMagSize : (parseFloat(data.baseMagSize) || 0);
    this.moddedMagSize = typeof data.moddedMagSize === 'number' ? data.moddedMagSize : (parseFloat(data.moddedMagSize) || 0);
    this.reload = typeof data.reload === 'number' ? data.reload : (parseFloat(data.reload) || 0);
    this.damage = typeof data.damage === 'number' ? data.damage : (parseFloat(data.damage) || 0);
    this.optimalRange = typeof data.optimalRange === 'number' ? data.optimalRange : (parseFloat(data.optimalRange) || 0);
    this.hsd = typeof data.hsd === 'number' ? data.hsd : (parseFloat(data.hsd) || 0);
    
    // Ensure modSlots is an array
    if (Array.isArray(data.modSlots)) {
      this.modSlots = data.modSlots;
    } else if (typeof data.modSlots === 'string') {
      this.modSlots = data.modSlots.split(',').map((s: string) => s.trim()).filter((s: string) => s);
    } else {
      this.modSlots = [];
    }
  }

  static fromSheetRow(headers: string[], row: any[]): Weapon {
    const data: any = {};
    headers.forEach((header, index) => {
      const key = this.normalizeHeaderKey(header, index);
      const value = row[index] || '';
      
      // Skip if this key was already set by a prioritized column
      if (key === 'name' && data.name && index !== 2) {
        return; // Column 2 (C) takes priority for name
      }
      
      // Handle special cases
      if (key === 'modSlots') {
        // Keep as string (column N, index 13)
        data[key] = String(value);
      } else if (key === 'hsd') {
        // Keep as string (column O, index 14)
        data[key] = String(value);
      } else if (key === 'flag') {
        // Normalize flag values
        const flagValue = String(value).toUpperCase();
        data[key] = (flagValue === 'N' || flagValue === 'E') ? flagValue : null;
      } else {
        (data as any)[key] = value;
      }
    });
    return new Weapon(data);
  }

  /** Returns the list of numeric property names available for Blockly dropdowns */
  static blocklyProperties(): [string, string][] {
    return [
      ['RPM', 'rpm'],
      ['Base Mag Size', 'baseMagSize'],
      ['Modded Mag Size', 'moddedMagSize'],
      ['Reload', 'reload'],
      ['Damage', 'damage'],
      ['Optimal Range', 'optimalRange'],
      ['HSD', 'hsd'],
    ];
  }

  static normalizeHeaderKey(header: string, columnIndex: number): string {
    // Handle specific column indices for known structure
    if (columnIndex === 0) return 'type'; // Column A is Type
    if (columnIndex === 2) return 'name'; // Column C is Name
    if (columnIndex === 6) return 'reload'; // Column G is Reload
    if (columnIndex === 7) return 'damage'; // Column H is Damage
    if (columnIndex === 12) return 'optimalRange'; // Column M is Optimal Range
    if (columnIndex === 13) return 'modSlots'; // Column N is Mod Slots
    if (columnIndex === 14) return 'hsd'; // Column O is HSD
    
    // Convert header names to camelCase property names
    const normalized = header
      .toLowerCase()
      .replace(/[^a-z0-9]+(.)/g, (_, char) => char.toUpperCase());
    
    // Map common variations to our property names
    const keyMap: Record<string, string> = {
      'weapon': 'name',
      'weapontype': 'type',
      'weaponname': 'name',
      'weaponvariant': 'variant',
      'roundsperminute': 'rpm',
      'firerate': 'rpm',
      'basemagazine': 'baseMagSize',
      'basemag': 'baseMagSize',
      'basemagsize': 'baseMagSize',
      'moddedmagazine': 'moddedMagSize',
      'moddedmag': 'moddedMagSize',
      'moddedmagsize': 'moddedMagSize',
      'magazinesize': 'baseMagSize',
      'magazine': 'baseMagSize',
      'emptyreloadsecs': 'reload',
      'reloadspeed': 'reload',
      'reloadtime': 'reload',
      'level40damage': 'damage',
      'range': 'optimalRange',
      'optimalrange': 'optimalRange',
      'modificationslots': 'modSlots',
      'mods': 'modSlots',
      'modslots': 'modSlots',
      'hsd': 'hsd',
      'headshotdamage': 'hsd',
    };

    return keyMap[normalized] || normalized;
  }

}

export default Weapon;
