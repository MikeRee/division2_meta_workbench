/**
 * Data normalization utilities for cleaning up game data
 */

import Gearset from '../models/Gearset';

interface RegexPattern {
  match: string;
  replace?: string;
  values?: Record<string, number>;
  but?: string[];
  classification?: string;
}

interface RegexPatterns {
  core: {
    replace: RegexPattern[];
    validation: string[];
  };
  attributes: {
    cleanPass: RegexPattern[];
    any: RegexPattern[];
    mod: string[];
    is: string[];
    oneOf: RegexPattern[];
  };
}

/**
 * Loads and parses gear attributes from CSV content
 * @param csvContent - CSV file content as string
 * @returns Record of gear attributes
 */
export function loadGearAttributes(csvContent: string): Record<string, any> {
  const csvLines = csvContent.trim().split('\n');
  const headers = csvLines[0].split(',').map(h => h.trim().toLowerCase());
  
  const gearAttributes: Record<string, any> = {};
  for (let i = 1; i < csvLines.length; i++) {
    const values = csvLines[i].split(',');
    const row: Record<string, string | number> = {};
    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      // Convert to lowercase for classification and attribute
      if (header === 'classification' || header === 'attribute') {
        row[header] = value.toLowerCase();
      } else if (header === 'max') {
        // Parse max as number, removing all non-numeric characters except decimal point
        const numericValue = value.replace(/[^0-9.]/g, '');
        row[header] = parseFloat(numericValue) || 0;
      } else {
        row[header] = value;
      }
    });
    // Use the attribute name as the key
    const attributeKey = row['attribute'] as string || `row_${i}`;
    gearAttributes[attributeKey] = row;
  }
  
  return gearAttributes;
}

/**
 * Processes named gear data through normalization
 * @param rawData - Raw named gear data from sheet parser
 * @param patterns - Regex patterns for normalization
 * @param gearAttributes - Gear attributes from CSV
 * @returns Normalized named gear data
 */
export function processNamedGearData(
  rawData: Record<string, any>,
  patterns: RegexPatterns,
  gearAttributes: Record<string, any>
): Record<string, any> {
  const attributeFields = ['minor1', 'minor2', 'minor3'];
  const normalizedData: Record<string, any> = {};
  
  Object.keys(rawData).forEach(key => {
    let data = { ...rawData[key] };
    data = cleanCore(patterns.core, data);
    data = cleanAttributes(patterns.attributes, attributeFields, gearAttributes, data);
    normalizedData[key] = data;
  });
  
  return normalizedData;
}

/**
 * Processes gearset data through normalization
 * @param rawData - Raw gearset data from sheet parser
 * @param patterns - Regex patterns for normalization
 * @param gearAttributes - Gear attributes from CSV
 * @returns Normalized gearset data as Gearset instances
 */
export function processGearsetData(
  rawData: any[],
  patterns: RegexPatterns,
  gearAttributes: Record<string, any>
): any[] {
  const attributeFields = ['twoPc', 'threePc'];
  
  return rawData.map(gearset => {
    let data = { ...gearset };
    
    // Normalize core
    data = cleanCore(patterns.core, data);
    
    // Normalize piece bonuses (twoPc, threePc)
    data = cleanAttributes(patterns.attributes, attributeFields, gearAttributes, data);
    
    // Return as Gearset instance
    return new Gearset(data);
  });
}

/**
 * Processes brandset data through normalization
 * @param rawData - Raw brandset data from sheet parser
 * @param patterns - Regex patterns for normalization
 * @param gearAttributes - Gear attributes from CSV
 * @returns Normalized brandset data
 */
export function processBrandsetData(
  rawData: any[],
  patterns: RegexPatterns,
  gearAttributes: Record<string, any>
): any[] {
  const attributeFields = ['onePc', 'twoPc', 'threePc'];
  
  return rawData.map(brandset => {
    let data = { ...brandset };
    
    // Normalize core
    data = cleanCore(patterns.core, data);
    
    // Normalize piece bonuses (onePc, twoPc, threePc)
    data = cleanAttributes(patterns.attributes, attributeFields, gearAttributes, data);
    
    return data;
  });
}

/**
 * Applies a list of regex replacements to normalize data
 * @param corePatterns - Core patterns object with replace and validation arrays
 * @param data - The data object to normalize
 * @returns Normalized data
 */
export function cleanCore(corePatterns: RegexPatterns['core'], data: any): any {
  // If core is an object (Record<CoreType, string[]>), lowercase the values
  if (typeof data["core"] === 'object' && !Array.isArray(data["core"])) {
    const normalizedCore: any = {};
    for (const [key, values] of Object.entries(data["core"])) {
      if (Array.isArray(values)) {
        normalizedCore[key] = values.map((v: any) => 
          typeof v === 'string' ? v.toLowerCase() : v
        );
      } else {
        normalizedCore[key] = values;
      }
    }
    data["core"] = normalizedCore;
    return data;
  }
  
  // Apply each regex replacement for string cores
  corePatterns.replace.forEach(({ match, replace }) => {
    const pattern = new RegExp(match, 'g');
    data["core"] = data["core"].toLowerCase().replace(pattern, replace || '');
  });

  // Validate that the core matches at least one validation pattern
  const hasValidMatch = corePatterns.validation.some(pattern => {
    const validationRegex = new RegExp(pattern);
    return validationRegex.test(data["core"]);
  });

  if (!hasValidMatch) {
    const itemName = data.name || data.brand || 'Unknown';
    console.error(`Validation failed for "${itemName}": core data "${data["core"].replace(/\n/g, '\\n')}" does not match any validation patterns`);
  }

  return data;
}

/**
 * Applies attribute normalization patterns to data
 * @param attributePatterns - Attribute patterns object with cleanPass, any, is, and oneOf arrays
 * @param gearAttributes - Record of valid gear attributes from CSV
 * @param data - The data object to normalize
 * @returns Normalized data
 */
export function cleanAttributes(attributePatterns: RegexPatterns['attributes'], attributeFields: string[], gearAttributes: Record<string, any>, data: any): any {
  
  attributeFields.forEach(field => {
    if (!data[field]) return;
    
    let originalValue = data[field];
    
    // Check if the value contains "\n\n" and split if needed
    if (originalValue.includes('\n\n')) {
      const parts = originalValue.split('\n\n').filter((part: string) => part.trim());
      const results: any[] = [];
      
      // Process each part separately
      parts.forEach((part: string) => {
        const tempData = { [field]: part };
        
        // Apply cleanPass patterns
        attributePatterns.cleanPass.forEach(({ match, replace }) => {
          const regex = new RegExp(match, 'gi');
          tempData[field] = tempData[field].toLowerCase().replace(regex, replace || '');
        });
        
        // Apply 'is' patterns
        for (const match of attributePatterns.is) {
          const pattern = new RegExp(match, 'g');
          const matchResult = pattern.exec(tempData[field]);
          
          if (matchResult && matchResult.length === 3) {
            let key = matchResult[1];
            let value = matchResult[2];
            
            const group1IsNumber = /^\d+\.?\d*$/.test(key);
            const group2IsNumber = /^\d+\.?\d*$/.test(value);
            
            if (group1IsNumber && !group2IsNumber) {
              [key, value] = [value, key];
            }
            
            const numericValue = parseFloat(value) || 0;
            results.push({[key.toLowerCase()]: numericValue});
            return;
          }
        }
        
        // If no 'is' pattern matched, add the processed value
        results.push(tempData[field]);
      });
      
      // Combine results - if all are objects, merge them
      if (results.every(r => typeof r === 'object' && !Array.isArray(r))) {
        data[field] = Object.assign({}, ...results);
      } else {
        data[field] = results;
      }
      return;
    }
    
    // Apply cleanPass patterns (simple string replacements)
    attributePatterns.cleanPass.forEach(({ match, replace }) => {
      const regex = new RegExp(match, 'gi');
      data[field] = data[field].toLowerCase().replace(regex, replace || '');
    });
    
    // Apply 'is' patterns (regex matching with capture groups)
    for (const match of attributePatterns.is) {
      const pattern = new RegExp(match, 'g');
      const matchResult = pattern.exec(data[field]);
      
      if (matchResult && matchResult.length === 3) {
        // We have 2 capture groups
        let key = matchResult[1];
        let value = matchResult[2];
        
        // Check if group 1 is a number and group 2 is text (reversed order)
        const group1IsNumber = /^\d+\.?\d*$/.test(key);
        const group2IsNumber = /^\d+\.?\d*$/.test(value);
        
        if (group1IsNumber && !group2IsNumber) {
          // Swap them - group 1 is value, group 2 is key
          [key, value] = [value, key];
        }
        
        const numericValue = parseFloat(value) || 0;
        data[field] = {[key.toLowerCase()]: numericValue};
        return; // Stop processing this field
      }
    }
    
    // Check if value matches 'any' patterns
    for (const { match, but } of attributePatterns.any) {
      const regex = new RegExp(match, 'i');
      const matches = regex.test(data[field]);
      
      if (matches) {
        // If there's a 'but' exclusion list, create object with all attributes except excluded ones
        if (but && but.length > 0) {
          const allowedAttributes: Record<string, string> = {};
          Object.keys(gearAttributes).forEach(attrKey => {
            const attribute = gearAttributes[attrKey];
            const attributeName = attribute.attribute || attrKey;
            
            // Check if this attribute is in the exclusion list
            const isExcluded = but.some(excluded => {
              const excludeRegex = new RegExp(excluded, 'i');
              return excludeRegex.test(attributeName);
            });
            
            if (!isExcluded) {
              allowedAttributes[attributeName] = attribute.max || 0;
            }
          });
          
          data[field] = allowedAttributes;
          return; // Stop processing this field
        } else {
          // No exclusions, include all attributes
          const allAttributes: Record<string, string> = {};
          Object.keys(gearAttributes).forEach(attrKey => {
            const attribute = gearAttributes[attrKey];
            const attributeName = attribute.attribute || attrKey;
            allAttributes[attributeName] = attribute.max || 0;
          });
          
          data[field] = allAttributes;
          return; // Stop processing this field
        }
      }
    }
    
    // Check if value matches 'mod' patterns
    for (const pattern of attributePatterns.mod) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(data[field])) {
        data[field] = "mod";
        return; // Stop processing this field
      }
    }
    
    // Check if value matches 'oneOf' patterns
    for (const { match, values, classification } of attributePatterns.oneOf) {
      const regex = new RegExp(match, 'i');
      if (regex.test(originalValue)) {
        // If there's a classification, filter gear attributes by that classification
        if (classification) {
          const classifiedAttributes: Record<string, string> = {};
          Object.keys(gearAttributes).forEach(attrKey => {
            const attribute = gearAttributes[attrKey];
            if (attribute.classification === classification) {
              const attributeName = attribute.attribute || attrKey;
              classifiedAttributes[attributeName] = attribute.max || '';
            }
          });
          data[field] = classifiedAttributes;
        } else {
          // Use the values array if provided
          data[field] =values || {} ;
        }
        return; // Stop processing this field
      }
    }

    // Try to match against gear attributes
    const matchedAttribute = Object.keys(gearAttributes).find(attrKey => {
      const attribute = gearAttributes[attrKey];
      const attributeName = (attribute.attribute || attrKey).toLowerCase();
      const fieldValue = data[field].toLowerCase();
      return attributeName === fieldValue || fieldValue.includes(attributeName);
    });
    
    if (matchedAttribute) {
      const attribute = gearAttributes[matchedAttribute];
      const attributeName = attribute.attribute || matchedAttribute;
      const attributeMax = attribute.max || '';
      data[field] = { [attributeName]: attributeMax };
      return; // Stop processing this field
    }

    // Final validation: data[field] must be either an object of Record<string, number> or the string "mod"
    if (typeof data[field] === 'string' && data[field] !== 'mod') {
      const itemName = data.name || data.brand || 'Unknown';
      console.error(`Final validation failed for "${itemName}" field "${field}": "${data[field].replace(/\n/g, '\\n')}" must be either an object or "mod"`);
    } else if (typeof data[field] === 'object' && data[field] !== null) {
      // Validate that all values in the object are numbers
      const invalidValues = Object.entries(data[field]).filter(([key, value]) => typeof value !== 'number');
      if (invalidValues.length > 0) {
        const itemName = data.name || data.brand || 'Unknown';
        console.error(`Final validation failed for "${itemName}" field "${field}": object contains non-numeric values: ${invalidValues.map(([k, v]) => `${k}: ${v}`).join(', ')}`);
      }
    }

    
    // If we reach here, none of the patterns matched
    if (data[field].trim() !== '') {
      const itemName = data.name || data.brand || 'Unknown';
      console.error(`Validation failed for "${itemName}" field "${field}": "${data[field].replace(/\n/g, '\\n')}" does not match any attribute patterns`);
    }
  });
  
  return data;
}

/**
 * Processes exotic weapon data through normalization
 * @param rawData - Raw exotic weapon data from sheet parser
 * @param patterns - Regex patterns for normalization (exoticWeapons.clean and exoticWeapons.is)
 * @returns Normalized exotic weapon data
 */
export function processExoticWeaponData(
  rawData: Record<string, any>,
  patterns: { clean?: Array<{ match: string; replace: string }>; is: string[] }
): Record<string, any> {
  const normalizedData: Record<string, any> = {};
  
  Object.keys(rawData).forEach(key => {
    const data = { ...rawData[key] };
    
    // Process modsInfo field
    if (data.modsInfo && typeof data.modsInfo === 'string') {
      data.modSlots = normalizeExoticWeaponMods(data.modsInfo, patterns.clean || [], patterns.is);
      delete data.modsInfo; // Remove raw modsInfo after processing
    } else {
      data.modSlots = {};
    }
    
    normalizedData[key] = data;
  });
  
  return normalizedData;
}

/**
 * Normalizes exotic weapon mod slots using regex patterns
 * @param modsInfo - The raw multiline string from the sheet
 * @param cleanPatterns - Array of clean patterns to apply to each line
 * @param isPatterns - Array of regex patterns to match mod data
 * @returns Normalized object with slot types as keys and mod objects as values
 */
function normalizeExoticWeaponMods(
  modsInfo: string,
  cleanPatterns: Array<{ match: string; replace: string }>,
  isPatterns: string[]
): Record<string, { type: string; attribute: string; value: number }> {
  const result: Record<string, { type: string; attribute: string; value: number }> = {};
  
  // If empty, return empty object
  if (!modsInfo || !modsInfo.trim()) {
    return result;
  }
  
  // Step 1: Split by newlines to handle multiple mod slots
  const lines = modsInfo.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    // Step 2: Trim whitespace and convert to lowercase
    let cleanLine = line.trim().toLowerCase();
    
    // Skip if line is empty
    if (!cleanLine) {
      continue;
    }
    
    // Step 3: Apply clean patterns (match/replace) to this line
    for (const { match, replace } of cleanPatterns) {
      const regex = new RegExp(match, 'gi');
      cleanLine = cleanLine.replace(regex, replace);
    }
    
    // Trim again after cleaning
    cleanLine = cleanLine.trim();
    
    // Skip if line is now empty after cleaning
    if (!cleanLine) {
      continue;
    }
    
    let matched = false;
    
    // Step 4: Try each "is" pattern
    // Pattern format: "^(.*?):\\s*\\+(\\d+)%?\\s+(.*)$"
    // This should match: "type: +value attribute"
    for (const pattern of isPatterns) {
      const regex = new RegExp(pattern, 'i');
      const match = regex.exec(cleanLine);
      
      if (match && match.length === 4) {
        // We have 3 capture groups: type, value, attribute
        const type = match[1].trim();
        const value = parseFloat(match[2]) || 0;
        const attribute = match[3].trim();
        
        result[type] = {
          type: type,
          attribute: attribute,
          value: value
        };
        
        matched = true;
        break;
      }
    }
    
    if (!matched && cleanLine) {
      console.error(`Exotic weapon mod normalization failed for: "${cleanLine}"`);
    }
  }
  
  return result;
}

/**
 * Processes weapon mod data through normalization
 * @param rawData - Raw weapon mod data from sheet parser
 * @param patterns - Regex patterns for normalization (weaponMods.clean and weaponMods.is)
 * @returns Normalized weapon mod data
 */
export function processWeaponModData(
  rawData: any[],
  patterns: { clean?: Array<{ match: string; replace: string }>; cleanType?: Array<{ match: string; replace: string }>; is: string[] }
): any[] {
  return rawData.map(mod => {
    const data = { ...mod };
    
    // Normalize type field
    if (data.type && typeof data.type === 'string') {
      let normalized = data.type.toLowerCase().trim();
      if (patterns.cleanType) {
        patterns.cleanType.forEach(({ match, replace }) => {
          normalized = normalized.replace(new RegExp(match, 'gi'), replace);
        });
      }
      data.type = normalized;
    }
    
    // Normalize bonus field
    if (data.bonus && typeof data.bonus === 'string') {
      data.bonus = normalizeWeaponModField(data.bonus, patterns.clean || [], patterns.is);
    }
    
    // Normalize penalty field
    if (data.penalty && typeof data.penalty === 'string') {
      data.penalty = normalizeWeaponModField(data.penalty, patterns.clean || [], patterns.is);
    }
    
    return data;
  });
}

/**
 * Normalizes a weapon mod field (bonus or penalty) using regex patterns
 * @param fieldValue - The raw field value from the sheet
 * @param cleanPatterns - Array of clean patterns to apply before matching
 * @param isPatterns - Array of regex patterns to match key-value pairs
 * @returns Normalized object with attribute names as keys and numeric values
 */
function normalizeWeaponModField(
  fieldValue: string,
  cleanPatterns: Array<{ match: string; replace: string }>,
  isPatterns: string[]
): Record<string, number> {
  const result: Record<string, number> = {};
  
  // If empty, return empty object
  if (!fieldValue || !fieldValue.trim()) {
    return result;
  }
  
  // Split by newlines to handle multiple attributes
  const lines = fieldValue.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    // Step 1: Trim whitespace and convert to lowercase
    let cleanLine = line.trim().toLowerCase();
    
    // Step 2: Apply clean patterns (match/replace)
    for (const { match, replace } of cleanPatterns) {
      const regex = new RegExp(match, 'gi');
      cleanLine = cleanLine.replace(regex, replace);
    }
    
    // Trim again after replacements
    cleanLine = cleanLine.trim();
    
    // Skip if line is now empty after cleaning
    if (!cleanLine) {
      continue;
    }
    
    let matched = false;
    
    // Step 3: Try each "is" pattern
    for (const pattern of isPatterns) {
      // Remove the trailing \\n[\\s\\S]*$ from pattern to match single lines
      const singleLinePattern = pattern.replace(/\\n\[\\\\s\\\\S\]\*\$/, '');
      const regex = new RegExp(singleLinePattern, 'i');
      const match = regex.exec(cleanLine);
      
      if (match && match.length === 3) {
        // We have 2 capture groups
        // For weaponMods pattern: group 1 is value, group 2 is attribute name
        let value = match[1];
        let key = match[2];
        
        const numericValue = parseFloat(value) || 0;
        result[key.trim()] = numericValue;
        matched = true;
        break;
      }
    }
    
    // If no pattern matched, try a simple fallback pattern for lines like "+30% Accuracy" or "-10% Reload Speed"
    if (!matched) {
      const fallbackMatch = cleanLine.match(/^([+-]?\d+\.?\d*)%?\s+(.+)$/i);
      if (fallbackMatch) {
        const value = fallbackMatch[1];
        const key = fallbackMatch[2];
        const numericValue = parseFloat(value) || 0;
        result[key.trim()] = numericValue;
        matched = true;
      }
    }
    
    if (!matched && cleanLine && !/^(no zoom|forced zoom|optional zoom|tab to toggle)/i.test(cleanLine)) {
      console.error(`Weapon mod field normalization failed for: "${cleanLine}"`);
    }
  }
  
  return result;
}

/**
 * Applies rule bindings to transform raw data into clean data
 * @param rawData - Raw data object or array
 * @param bindings - Array of RuleBinding objects defining destination fields and their transformations
 * @param rulesStore - The rules store containing all rule definitions
 * @returns Transformed data with rules applied
 */
export function applyBindings(
  rawData: any,
  bindings: Array<{ destination: string; source: string; rules: string[] }>,
  rulesStore: {
    replaceRules: Record<string, string[]>;
    matchRules: Record<string, string>;
    mappings: Record<string, Record<string, string>>;
  }
): any {
  const isArray = Array.isArray(rawData);
  const dataArray = isArray ? rawData : [rawData];
  
  const processedData = dataArray.map((item: any) => {
    const result: any = {};
    
    // Process each binding
    bindings.forEach(({ destination, source, rules }) => {
      // Get the source value
      let value = item[source];
      
      // If source doesn't exist, skip this binding
      if (value === undefined || value === null) {
        return;
      }
      
      // Apply each rule in order
      rules.forEach((ruleLabel) => {
        // Check if it's a replace rule
        if (rulesStore.replaceRules[ruleLabel]) {
          const [match, replace] = rulesStore.replaceRules[ruleLabel];
          const regex = new RegExp(match, 'gi');
          value = String(value).replace(regex, replace || '');
        }
        
        // Check if it's a match rule (validation)
        if (rulesStore.matchRules[ruleLabel]) {
          const pattern = rulesStore.matchRules[ruleLabel];
          const regex = new RegExp(pattern, 'i');
          if (!regex.test(String(value))) {
            console.warn(`Value "${value}" for ${destination} does not match rule "${ruleLabel}"`);
          }
        }
        
        // Check if it's a mapping rule
        if (rulesStore.mappings[ruleLabel]) {
          const mapping = rulesStore.mappings[ruleLabel];
          const mappedValue = mapping[String(value)];
          if (mappedValue !== undefined) {
            value = mappedValue;
          }
        }
      });
      
      // Set the destination value
      result[destination] = value;
    });
    
    return result;
  });
  
  return isArray ? processedData : processedData[0];
}

/**
 * Processes weapon data using rule bindings
 * @param rawData - Raw weapon data
 * @param bindings - Array of RuleBinding objects for weapons
 * @param rulesStore - The rules store containing all rule definitions
 * @returns Array of Weapon instances
 */
export function processWeaponDataWithBindings(
  rawData: any[],
  bindings: Array<{ destination: string; source: string; rules: string[] }>,
  rulesStore: {
    replaceRules: Record<string, string[]>;
    matchRules: Record<string, string>;
    mappings: Record<string, Record<string, string>>;
  }
): any[] {
  return rawData.map((item) => {
    const processedItem: any = {};
    
    // Process each binding
    bindings.forEach(({ destination, source, rules }) => {
      // Get the source value
      let value = item[source];
      
      // If source doesn't exist, use empty string or appropriate default
      if (value === undefined || value === null) {
        value = '';
      }
      
      // Apply each rule in order
      rules.forEach((ruleLabel) => {
        // Check if it's a replace rule
        if (rulesStore.replaceRules[ruleLabel]) {
          const [match, replace] = rulesStore.replaceRules[ruleLabel];
          const regex = new RegExp(match, 'gi');
          value = String(value).replace(regex, replace || '');
        }
        
        // Check if it's a match rule (validation)
        if (rulesStore.matchRules[ruleLabel]) {
          const pattern = rulesStore.matchRules[ruleLabel];
          const regex = new RegExp(pattern, 'i');
          if (!regex.test(String(value))) {
            console.warn(`Value "${value}" for ${destination} does not match rule "${ruleLabel}"`);
          }
        }
        
        // Check if it's a mapping rule
        if (rulesStore.mappings[ruleLabel]) {
          const mapping = rulesStore.mappings[ruleLabel];
          const mappedValue = mapping[String(value)];
          if (mappedValue !== undefined) {
            value = mappedValue;
          }
        }
      });
      
      // Set the destination value
      processedItem[destination] = value;
    });
    
    return processedItem;
  });
}
