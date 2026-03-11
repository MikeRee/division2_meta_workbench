class StatModifier {
  stat: string;
  mod: number;

  constructor(stat: string, mod: number) {
    this.stat = stat;
    this.mod = mod;
  }

  static parseStatModifiers(input: StatModifier[] | string | any): StatModifier[] {
    // If already an array of StatModifiers, return as-is
    if (Array.isArray(input)) {
      if (input.length === 0) return [];
      if (input[0] instanceof StatModifier) return input;
      // If array of plain objects, convert to StatModifier instances
      return input.map(item => {
        if (item && typeof item === 'object' && 'stat' in item && 'mod' in item) {
          return new StatModifier(item.stat, item.mod);
        }
        return null;
      }).filter((m): m is StatModifier => m !== null);
    }

    // If string, parse it
    if (typeof input === 'string' && input.trim()) {
      const parts = input.split('\n\n').filter(p => p.trim());
      return parts.map(part => {
        const lines = part.split('\n').map(l => l.trim()).filter(l => l);
        
        // Multi-line format: value on first line, stat on subsequent lines
        if (lines.length >= 2) {
          const value = parseFloat(lines[0].replace('%', '')) || 0;
          const stat = lines.slice(1).join(' ');
          return new StatModifier(stat, value);
        }
        
        // Single-line format: "30% Incoming Repairs"
        if (lines.length === 1) {
          const match = lines[0].match(/^([\d.]+)%?\s+(.+)$/);
          if (match) {
            const value = parseFloat(match[1]) || 0;
            const stat = match[2];
            return new StatModifier(stat, value);
          }
        }
        
        return null;
      }).filter((m): m is StatModifier => m !== null);
    }

    // Default to empty array
    return [];
  }
}

export default StatModifier;
