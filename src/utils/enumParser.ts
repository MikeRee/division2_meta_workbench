/**
 * Parse a string value into an enum type
 * Throws an error if the value is not a valid enum value
 * 
 * @param value - String value to parse
 * @param enumObject - The enum object to validate against
 * @param enumName - Name of the enum for error messages
 * @returns The validated enum value
 * @throws Error if value is not a valid enum value
 */
export function parseEnum<T extends Record<string, string>>(
  value: string | any,
  enumObject: T,
  enumName: string
): T[keyof T] {
  // If already a valid enum value, return it
  const enumValues = Object.values(enumObject);
  if (enumValues.includes(value)) {
    return value as T[keyof T];
  }

  // Try to normalize and match
  const normalized = String(value).trim().toLowerCase();
  
  for (const enumValue of enumValues) {
    if (String(enumValue).toLowerCase() === normalized) {
      return enumValue as T[keyof T];
    }
  }

  // Value not found - throw error
  throw new Error(
    `Invalid ${enumName}: "${value}". Expected one of: ${enumValues.join(', ')}`
  );
}

/**
 * Parse a string value into an enum type with a default fallback
 * Returns the default value if parsing fails instead of throwing
 * 
 * @param value - String value to parse
 * @param enumObject - The enum object to validate against
 * @param defaultValue - Default value to return if parsing fails
 * @returns The validated enum value or default
 */
export function parseEnumWithDefault<T extends Record<string, string>>(
  value: string | any,
  enumObject: T,
  defaultValue: T[keyof T]
): T[keyof T] {
  try {
    return parseEnum(value, enumObject, 'enum');
  } catch {
    return defaultValue;
  }
}
