class Weapon {
  type: string;
  variant: string;
  name: string;
  flag: string | null;
  rpm?: number;
  baseMagSize?: number;
  moddedMagSize?: number;
  reload?: number;
  damage?: number;
  optimalRange?: number;
  modSlots: string;
  hsd: string;

  constructor(data: any = {}) {
    this.type = data.type || ''; // e.g., "Assault Rifles"
    this.variant = data.variant || ''; // e.g., "aug"
    this.name = data.name || ''; // e.g., "FAL"
    this.flag = data.flag || null; // "N" (Named), "E" (Exotic), or null
    this.rpm = data.rpm;
    this.baseMagSize = data.baseMagSize;
    this.moddedMagSize = data.moddedMagSize;
    this.reload = data.reload;
    this.damage = data.damage;
    this.optimalRange = data.optimalRange;
    this.modSlots = data.modSlots || ''; // String from column N
    this.hsd = data.hsd || ''; // String from column O
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
