/**
 * Utility functions for converting between Record<string, number> and
 * various serialized formats (arrays, strings, maps).
 *
 * Replaces the old StatModifier class with plain Record<string, number>.
 */

/** Shape of the legacy { stat, mod } objects stored in JSON files */
interface StatModEntry {
  stat: string;
  mod: number;
}

// ---------------------------------------------------------------------------
// Core converters
// ---------------------------------------------------------------------------

/** Convert a Record<string, number> to an array of { stat, mod } objects */
export function toArray(map: Record<string, number>): StatModEntry[] {
  return Object.entries(map).map(([stat, mod]) => ({ stat, mod }));
}

/** Convert an array of { stat, mod } objects to a Record<string, number> */
export function fromArray(arr: StatModEntry[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const { stat, mod } of arr) {
    result[stat] = mod;
  }
  return result;
}

/** Convert a Record<string, number> to a "key=value,key2=value2" string */
export function toMap(map: Record<string, number>): string {
  return Object.entries(map)
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
}

/** Convert a "key=value,key2=value2" string to a Record<string, number> */
export function fromMap(str: string): Record<string, number> {
  const result: Record<string, number> = {};
  if (!str || !str.trim()) return result;

  const pairs: string[] = [];
  let current = '';
  let bracketDepth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '[') bracketDepth++;
    else if (ch === ']') bracketDepth--;
    if (ch === ',' && bracketDepth === 0) {
      pairs.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) pairs.push(current);

  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.substring(0, eqIdx).trim();
    const valStr = pair.substring(eqIdx + 1).trim();
    const num = parseFloat(valStr);
    if (!isNaN(num)) {
      result[key] = num;
    }
  }
  return result;
}

/** Serialize a Record<string, number> to a JSON-friendly { stat, mod }[] */
export function to(map: Record<string, number>): StatModEntry[] {
  return toArray(map);
}

/** Deserialize any supported input into a Record<string, number> */
export function from(input: Record<string, number> | StatModEntry[] | string | any): Record<string, number> {
  return parseStatModifiers(input);
}

// ---------------------------------------------------------------------------
// Main parser – accepts every legacy format and returns Record<string, number>
// ---------------------------------------------------------------------------

/**
 * Parse stat modifiers from any supported format into Record<string, number>.
 *
 * Supported inputs:
 *  - Record<string, number>  (pass-through)
 *  - { stat, mod }[]         (legacy JSON)
 *  - "key=value,key2=value2" (map string)
 *  - "30% Incoming Repairs"  (percentage string)
 *  - Multi-line value/stat blocks
 */
export function parseStatModifiers(input: Record<string, number> | StatModEntry[] | string | any): Record<string, number> {
  // Already a plain record
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    // Verify it looks like Record<string, number> (not a class instance with .stat/.mod)
    if (!('stat' in input && 'mod' in input)) {
      const result: Record<string, number> = {};
      for (const [k, v] of Object.entries(input)) {
        result[k] = typeof v === 'number' ? v : parseFloat(String(v)) || 0;
      }
      return result;
    }
    // Single { stat, mod } object
    return { [input.stat]: input.mod };
  }

  // Array of { stat, mod } or Record<string, number>
  if (Array.isArray(input)) {
    if (input.length === 0) return {};
    const result: Record<string, number> = {};
    for (const item of input) {
      if (item && typeof item === 'object' && 'stat' in item && 'mod' in item) {
        result[item.stat] = item.mod;
      }
    }
    return result;
  }

  // String formats
  if (typeof input === 'string' && input.trim()) {
    // "key=value,key2=value2" format (may contain newlines from rule transforms)
    if (input.includes('=')) {
      const cleaned = input.replace(/\n/g, ',').replace(/,,+/g, ',');
      const parsed = fromMap(cleaned);
      if (Object.keys(parsed).length > 0) return parsed;
    }

    // Multi-line or percentage format
    const parts = input.split(/\n\s*\n/).filter(p => p.trim());
    const result: Record<string, number> = {};

    for (const part of parts) {
      const lines = part.split('\n').map(l => l.trim()).filter(l => l);

      if (lines.length >= 2) {
        // Multi-line: value on first line, stat on subsequent
        const value = parseFloat(lines[0].replace('%', '')) || 0;
        const stat = lines.slice(1).join(' ');
        result[stat] = value;
      } else if (lines.length === 1) {
        // "30% Incoming Repairs" or multiple "20% Burn Duration 15% Skill Health"
        const tokens = lines[0].split(/\s+(?=[\d.]+%?\s)/);
        for (const token of tokens) {
          const match = token.match(/^([\d.]+)%?\s+(.+)$/);
          if (match) {
            result[match[2].trim()] = parseFloat(match[1]) || 0;
          }
        }
      }
    }

    if (Object.keys(result).length > 0) return result;
  }

  return {};
}
