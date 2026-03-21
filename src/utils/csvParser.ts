import Attribute from '../models/Attribute';
import StatusImmunity from '../models/StatusImmunity';
import GearMod from '../models/GearMod';
import { getBasePath } from './basePath';

/**
 * Parses CSV text into rows
 * @param {string} csvText - Raw CSV text
 * @returns {string[][]} Array of row arrays
 */
const parseCSV = (csvText: string): string[][] => {
  const lines = csvText.trim().split('\n');
  return lines.map((line) => {
    // Simple CSV parsing - handles quoted values with commas
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  });
};

/**
 * Loads and parses a CSV file from public/data
 * @param {string} filename - Name of the CSV file
 * @returns {Promise<string>} CSV text content
 */
export const loadCSVFile = async (filename: string): Promise<string> => {
  const response = await fetch(`${getBasePath()}/data/${filename}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${filename}`);
  }
  return await response.text();
};

/**
 * Parses weapon attributes CSV
 * @param {string} csvText - CSV text content
 * @returns {Attribute[]}
 */
export const parseWeaponAttributes = (csvText: string): Attribute[] => {
  const rows = parseCSV(csvText);
  return rows
    .slice(1) // Skip header
    .filter((row) => row[0] && row[0].trim())
    .map((row) => Attribute.fromCSVRow(row, 'weapon'));
};

/**
 * Parses weapon type attributes CSV
 * @param {string} csvText - CSV text content
 * @returns {Attribute[]}
 */
export const parseWeaponTypeAttributes = (csvText: string): Attribute[] => {
  const rows = parseCSV(csvText);
  return rows
    .slice(1) // Skip header
    .filter((row) => row[0] && row[0].trim())
    .map((row) => Attribute.fromCSVRow(row, 'weaponType'));
};

/**
 * Parses gear attributes CSV
 * @param {string} csvText - CSV text content
 * @returns {GearMod[]}
 */
export const parseGearAttributes = (csvText: string): GearMod[] => {
  const rows = parseCSV(csvText);
  return rows
    .slice(1) // Skip header
    .filter((row) => row[0] && row[0].trim())
    .map((row) => GearMod.fromCSVRow(row));
};

/**
 * Parses gear mods CSV
 * @param {string} csvText - CSV text content
 * @returns {GearMod[]}
 */
export const parseGearMods = (csvText: string): GearMod[] => {
  const rows = parseCSV(csvText);
  return rows
    .slice(1) // Skip header
    .filter((row) => row[0] && row[0].trim())
    .map((row) => GearMod.fromCSVRow(row));
};

/**
 * Parses Keener's Watch max stats CSV
 * @param {string} csvText - CSV text content
 * @returns {Attribute[]}
 */
export const parseKeenersWatch = (csvText: string): Attribute[] => {
  const rows = parseCSV(csvText);
  return rows
    .slice(1) // Skip header
    .filter((row) => row[0] && row[0].trim())
    .map((row) => Attribute.fromCSVRow(row, 'keenersWatch'));
};

/**
 * Parses status immunities CSV
 * @param {string} csvText - CSV text content
 * @returns {StatusImmunity[]}
 */
export const parseStatusImmunities = (csvText: string): StatusImmunity[] => {
  const rows = parseCSV(csvText);
  return rows
    .slice(1) // Skip header
    .filter((row) => row[0] && row[0].trim())
    .map((row) => StatusImmunity.fromCSVRow(row));
};
