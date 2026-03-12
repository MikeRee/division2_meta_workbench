/**
 * Parse a string or Record into Record<string, number>
 * Expected string format: "optimal range=50,weapon damage=30"
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

    // Split by comma to get individual key=value pairs
    const pairs = value.split(',');
    
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
      
      // Parse the numeric value
      const numValue = parseFloat(valueStr);
      if (isNaN(numValue)) {
        const rulesInfo = appliedRules && appliedRules.length > 0 
          ? `\nRules applied: ${appliedRules.join(', ')}` 
          : '';
        throw new Error(`Invalid format: "${trimmedPair}". Value "${valueStr}" is not a valid number${rulesInfo}`);
      }
      
      result[key] = numValue;
    }
    
    return result;
  }

  // Default to empty object
  return {};
}
