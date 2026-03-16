/**
 * Format a map/object value as a key=value string.
 * Arrays are formatted as key=[val1,val2].
 * Useful for converting object source values into a flat string representation
 * that rules can operate on.
 */
export function formatMapAsString(value: any): string {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return String(value ?? '');
  }
  return Object.entries(value)
    .map(([k, v]) => {
      if (Array.isArray(v)) {
        return `${k}=[${v.join(',')}]`;
      }
      return `${k}=${v}`;
    })
    .join(',');
}

/**
 * Parse a string or Record into Record<string, number>
 * Expected string format: "optimal range=50,weapon damage=30"
 * Also supports array values: "skill=[one,two],armor=[three,four]"
 * 
 * @param value - String in format "key=value,key2=value2" or existing Record
 * @param appliedRules - Optional array of rule names that were applied to this value
 * @returns Parsed Record<string, number>
 */
export function parseRecordField(value: Record<string, number> | string | any, appliedRules?: string[]): Record<string, number> {
  // If already an object, return as-is
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value;
  }

  // If string, parse it
  if (typeof value === 'string') {
    const result: Record<string, number> = {};
    
    if (!value || value.trim() === '') {
      return result;
    }

    // Split by comma, but respect brackets (don't split inside [...])
    const pairs: string[] = [];
    let current = '';
    let bracketDepth = 0;
    for (let i = 0; i < value.length; i++) {
      const ch = value[i];
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
      const trimmedPair = pair.trim();
      if (!trimmedPair) continue;
      
      // Split by = to get key and value
      const equalIndex = trimmedPair.indexOf('=');
      if (equalIndex === -1) {
        const rulesInfo = appliedRules && appliedRules.length > 0 
          ? `\nRules applied: ${appliedRules.join(', ')}` 
          : '';
        throw new Error(`Invalid format: "${trimmedPair}". Expected format: "key=value,key2=value2"${rulesInfo}`);
      }
      
      const key = trimmedPair.substring(0, equalIndex).trim();
      const valueStr = trimmedPair.substring(equalIndex + 1).trim();
      
      if (!key) {
        const rulesInfo = appliedRules && appliedRules.length > 0 
          ? `\nRules applied: ${appliedRules.join(', ')}` 
          : '';
        throw new Error(`Invalid format: "${trimmedPair}". Key cannot be empty${rulesInfo}`);
      }
      
      // Check if value is an array format [val1,val2] — skip numeric parse, store as 0 placeholder
      // (The actual array data is preserved in the string for display; numeric records ignore arrays)
      const numValue = parseFloat(valueStr);
      if (isNaN(numValue)) {
        // Non-numeric value — store 0 as placeholder so the record still parses
        result[key] = 0;
      } else {
        result[key] = numValue;
      }
    }
    
    return result;
  }

  // Default to empty object
  return {};
}
