import Weapon from '../models/Weapon';
import Gearset from '../models/Gearset';
import Skill from '../models/Skill';
import WeaponMod from '../models/WeaponMod';
import { CoreType } from '../models/CoreValue';

interface TextFormat {
  foregroundColor?: {
    red?: number;
    green?: number;
    blue?: number;
  };
}

interface CellData {
  formattedValue?: string;
  effectiveFormat?: {
    textFormat?: TextFormat;
    backgroundColor?: {
      red?: number;
      green?: number;
      blue?: number;
    };
  };
  userEnteredValue?: {
    formulaValue?: string;
    stringValue?: string;
    numberValue?: number;
  };
  effectiveValue?: {
    numberValue?: number;
    stringValue?: string;
  };
  rowSpan?: number;
  columnSpan?: number;
}

interface RowData {
  values?: CellData[];
}

interface GridData {
  rowData?: RowData[];
}

interface SheetData {
  values?: string[][];
}

/**
 * Determines flag based on text color
 * @param {TextFormat} textFormat - The text format object from Google Sheets
 * @param {string} weaponName - The weapon name for debugging
 * @returns {string|null} 'E' for red (exotic), 'N' for orange (named), null otherwise
 */
const getFlagFromColor = (textFormat: TextFormat, weaponName: string): string | null => {
  if (!textFormat || !textFormat.foregroundColor) {
    return null;
  }

  const color = textFormat.foregroundColor;
  const red = color.red || 0;
  const green = color.green || 0;
  const blue = color.blue || 0;

  // White/default text (no special flag)
  // RGB: (1, 1, 1) or close to it
  if (red > 0.95 && green > 0.95 && blue > 0.95) {
    return null;
  }

  // Orange color for Named weapons
  // RGB: (~0.92, ~0.64, ~0.07)
  // High red, medium-high green, very low blue
  if (red > 0.85 && green > 0.55 && green < 0.75 && blue < 0.15) {
    return 'N'; // Named
  }

  // Red/coral color for Exotic weapons
  // RGB: (1, ~0.44, ~0.21)
  // High red, medium green, low blue
  if (red > 0.9 && green > 0.35 && green < 0.55 && blue > 0.15 && blue < 0.35) {
    return 'E'; // Exotic
  }

  return null;
};

/**
 * Parses weapon data from Google Sheets API response with formatting
 * @param {GridData} gridData - The grid data from API response containing rowData
 * @returns {Weapon[]} Array of Weapon objects
 */
export const parseWeapons = (gridData: GridData): Weapon[] => {
  if (!gridData.rowData || gridData.rowData.length === 0) {
    return [];
  }

  const rowData = gridData.rowData;
  console.log('Total rows in spreadsheet:', rowData.length);

  // Extract headers from first row
  const headerRow = rowData[0];
  const headers = headerRow.values ? headerRow.values.map((cell) => cell.formattedValue || '') : [];

  let currentType = '';
  let currentVariant = '';

  const weaponList: Weapon[] = rowData
    .slice(1) // Skip header row
    .filter((rowObj) => rowObj.values && rowObj.values.length > 0)
    .map((rowObj) => {
      const cells = rowObj.values || [];

      // Extract values and detect flag from name cell (column C, index 2)
      const row = cells.map((cell) => cell.formattedValue || '');
      let flag: string | null = null;

      // Check text color of name cell (column C, index 2)
      if (cells[2] && cells[2].effectiveFormat && cells[2].effectiveFormat.textFormat) {
        flag = getFlagFromColor(cells[2].effectiveFormat.textFormat, row[2]);
      }

      // Skip completely empty rows
      if (!row[0] && !row[1] && !row[2]) {
        return null;
      }

      // If column A (type) is not empty, update the current type
      if (row[0] && row[0].trim()) {
        currentType = row[0].trim();
      }

      // If column B (variant) is not empty, update the current variant
      if (row[1] && row[1].trim()) {
        currentVariant = row[1].trim();
      }

      // Create a new row with the current type and variant filled in
      const rowWithDefaults = [...row];
      if (!rowWithDefaults[0] || !rowWithDefaults[0].trim()) {
        rowWithDefaults[0] = currentType;
      }
      if (!rowWithDefaults[1] || !rowWithDefaults[1].trim()) {
        rowWithDefaults[1] = currentVariant;
      }

      const weapon = Weapon.fromSheetRow(headers, rowWithDefaults);

      // Override rarety with color-detected value
      if (flag) {
        weapon.rarety = Weapon.parseRarety(flag);
      }

      return weapon;
    })
    .filter(
      (weapon): weapon is Weapon =>
        weapon !== null && weapon.name !== undefined && weapon.name.trim() !== '',
    ); // Only keep weapons with a name

  console.log('Weapons parsed:', weaponList.length);
  console.log('First 3 weapons:', weaponList.slice(0, 3));

  return weaponList;
};

// TODO: parseWeaponTalents removed — talent data now comes from talents.json
// This function needs to be migrated to use the unified Talent model if sheet parsing is needed.

/**
 * Parses exotic weapon talents from "Weapons: Named + Exotic" sheet
 * Returns raw data objects that need to be processed by dataNormalizer
 * @param {GridData} gridData - The grid data from API response containing rowData
 * @returns {Record<string, any>} Object with weapon names as keys and raw data as values
 */
export const parseExoticWeapons = (gridData: GridData): Record<string, any> => {
  if (!gridData.rowData || gridData.rowData.length === 0) {
    return {};
  }

  const rowData = gridData.rowData;
  console.log('Total rows in Weapons: Named + Exotic:', rowData.length);

  const exoticData: Record<string, any> = {};
  let currentType = '';

  for (let i = 1; i < rowData.length; i++) {
    const rowObj = rowData[i];
    if (!rowObj.values || rowObj.values.length === 0) continue;

    const cells = rowObj.values || [];
    const row = cells.map((cell) => cell.formattedValue || '');

    // Update category from column A
    if (row[0] && row[0].trim()) {
      currentType = row[0].trim();
    }

    // Separately check for exotic weapons - if column C has a weapon name
    if (row[2] && row[2].trim()) {
      // Check if column C (weapon name) has exotic color
      let hasExoticColor = false;
      if (cells[2] && cells[2].effectiveFormat && cells[2].effectiveFormat.textFormat) {
        const textFormat = cells[2].effectiveFormat.textFormat;
        const color = textFormat.foregroundColor || {};
        const red = color.red || 0;
        const green = color.green || 0;
        const blue = color.blue || 0;

        if (red > 0.9 && green > 0.35 && green < 0.55 && blue > 0.15 && blue < 0.35) {
          hasExoticColor = true;
        }
      }

      // If exotic color, process this weapon
      if (hasExoticColor) {
        const name = row[2].trim();

        // Extract icon from column D (index 3)
        let icon = '';
        if (cells[3]) {
          const iconCell = cells[3];
          // Check userEnteredValue for formula
          if (iconCell.userEnteredValue) {
            if (iconCell.userEnteredValue.formulaValue) {
              const formula = iconCell.userEnteredValue.formulaValue;
              if (formula.startsWith('=IMAGE(') || formula.startsWith('=image(')) {
                const match = formula.match(/=IMAGE\("([^"]+)"/i);
                if (match) {
                  icon = match[1];
                }
              }
            } else if (iconCell.userEnteredValue.stringValue) {
              icon = iconCell.userEnteredValue.stringValue;
            }
          }
          // Fallback to formatted value
          if (!icon) {
            icon = iconCell.formattedValue || '';
          }
        }

        // Look at the PREVIOUS row for variant, talent, and mods (exotic weapons span 2 rows)
        // Row 1: variant in col B, talent in col E, mods in col F
        // Row 2: weapon name in col C, icon in col D
        let variant = '';
        let talentName: string | null = null;
        let talentDesc: string | null = null;
        let modsInfo = '';

        if (i - 1 >= 0) {
          const prevRowObj = rowData[i - 1];
          if (prevRowObj.values && prevRowObj.values.length > 0) {
            const prevCells = prevRowObj.values || [];
            const prevRow = prevCells.map((cell) => cell.formattedValue || '');

            // Column B: variant
            variant = prevRow[1] || '';

            // Column E (index 4): talent info
            const talentInfo = prevRow[4] || '';
            if (talentInfo) {
              const lines = talentInfo.split('\n');
              if (lines.length > 0) {
                talentName = lines[0].trim();
                if (lines.length > 1) {
                  talentDesc = lines.slice(1).join('\n').trim();
                }
              }
            }

            // Column F (index 5): mod slots - keep as raw multiline string
            modsInfo = prevRow[5] || '';
          }
        }

        // Create raw data object (not ExoticWeapon yet)
        exoticData[name] = {
          type: currentType,
          variant: variant,
          name: name,
          icons: [],
          talentName: talentName,
          talentDesc: talentDesc,
          modsInfo: modsInfo,
        };

        // Skip the next row ONLY if it's not a category row
        // Check if next row has text in column A (category) - if so, don't skip
        if (i + 1 < rowData.length) {
          const nextRowObj = rowData[i + 1];
          if (nextRowObj.values && nextRowObj.values.length > 0) {
            const nextRow = nextRowObj.values.map((cell) => cell.formattedValue || '');
            // Only skip if column A is empty (not a category row)
            if (!nextRow[0] || !nextRow[0].trim()) {
              i++;
            }
          }
        }
      }
    }
  }

  console.log('Exotic weapons parsed:', Object.keys(exoticData).length);

  return exoticData;
};

/**
 * Extracts spreadsheet ID from URL or returns the ID as-is
 * @param {string} spreadsheetIdOrUrl - Spreadsheet ID or full URL
 * @returns {string} Extracted spreadsheet ID
 */
export const extractSpreadsheetId = (spreadsheetIdOrUrl: string): string => {
  const match = spreadsheetIdOrUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : spreadsheetIdOrUrl;
};

/**
 * Parses gearset data from Google Sheets API response
 * Each gearset takes up 2 rows
 * @param {GridData} gridData - The grid data from API response containing rowData with formatting
 * @returns {any[]} Array of raw gearset data objects (not Gearset instances yet)
 */
export const parseGearsets = (gridData: GridData): any[] => {
  if (!gridData.rowData || gridData.rowData.length === 0) {
    return [];
  }

  const rowData = gridData.rowData;
  const gearsetList: any[] = [];

  console.log('Total rows in Gearsets:', rowData.length);

  // Helper function to get cell background color
  const getCellColor = (cell?: CellData) => {
    if (!cell || !cell.effectiveFormat || !cell.effectiveFormat.backgroundColor) {
      return null;
    }
    const color = cell.effectiveFormat.backgroundColor;
    return {
      red: color.red || 0,
      green: color.green || 0,
      blue: color.blue || 0,
    };
  };

  // Helper function to determine CoreType from color
  const getCoreTypeFromColor = (color: any) => {
    if (!color) return null;

    const { red, green, blue } = color;

    // Red color for Weapon Damage (~0.64, ~0.23, ~0.23)
    if (red > 0.55 && red < 0.75 && green > 0.15 && green < 0.35 && blue > 0.15 && blue < 0.35) {
      return CoreType.WeaponDamage;
    }

    // Blue color for Armor (~0.27, ~0.38, ~0.56)
    if (red > 0.2 && red < 0.35 && green > 0.3 && green < 0.45 && blue > 0.5 && blue < 0.65) {
      return CoreType.Armor;
    }

    // Yellow/Orange color for Skill Tier (~1.0, ~0.84, ~0.4)
    if (red > 0.95 && green > 0.75 && green < 0.9 && blue > 0.3 && blue < 0.5) {
      return CoreType.SkillTier;
    }

    return null;
  };

  // Skip header row and process in pairs
  for (let i = 1; i < rowData.length; i += 2) {
    const rowObj1 = rowData[i];
    const rowObj2 = rowData[i + 1];

    if (!rowObj1 || !rowObj1.values) continue;

    const cells1 = rowObj1.values || [];
    const cells2 = rowObj2 && rowObj2.values ? rowObj2.values : [];

    const row1 = cells1.map((cell) => cell.formattedValue || '');
    const row2 = cells2.map((cell) => cell.formattedValue || '');

    // Skip if both rows are empty
    if (row1.length === 0 && row2.length === 0) continue;

    // Extract logo URL from =IMAGE() formula if present
    let logo = row1[0] || '';
    if (logo.startsWith('=IMAGE(') || logo.startsWith('=image(')) {
      const match = logo.match(/=IMAGE\("([^"]+)"/i);
      if (match) {
        logo = match[1];
      }
    }

    const name = (row2[0] || '').trim();

    // Only add if it has a name
    if (name) {
      const coreValue1 = row1[2] || '';
      const coreCell1 = cells1[2];
      const coreValue2 = row2[2] || '';
      const coreCell2 = cells2[2];
      let core: any;

      // Check cell color for row 1
      const coreColor1 = getCellColor(coreCell1);
      const coreType1 = getCoreTypeFromColor(coreColor1);

      // Check cell color for row 2
      const coreColor2 = getCellColor(coreCell2);
      const coreType2 = getCoreTypeFromColor(coreColor2);

      // Debug logging for Refactor
      if (name === 'Refactor') {
        console.log('Refactor row1 core value:', coreValue1);
        console.log('Refactor row1 core color:', coreColor1);
        console.log('Refactor row1 core type:', coreType1);
        console.log('Refactor row2 core value:', coreValue2);
        console.log('Refactor row2 core color:', coreColor2);
        console.log('Refactor row2 core type:', coreType2);
      }

      // Debug logging for System Corruption
      if (name.includes('System Corruption')) {
        console.log('System Corruption row1 core value:', coreValue1);
        console.log('System Corruption row1 core color:', coreColor1);
        console.log('System Corruption row1 core type:', coreType1);
        console.log('System Corruption row2 core value:', coreValue2);
        console.log('System Corruption row2 core color:', coreColor2);
        console.log('System Corruption row2 core type:', coreType2);
      }

      if (coreType1 || coreType2) {
        // At least one color detected - this gearset has multiple core types
        core = {};

        if (coreType1 && coreValue1) {
          const pieces1 = coreValue1
            .split('\n')
            .map((p) => p.trim())
            .filter((p) => p);
          core[coreType1] = pieces1;
        }

        if (coreType2 && coreValue2) {
          const pieces2 = coreValue2
            .split('\n')
            .map((p) => p.trim())
            .filter((p) => p);
          core[coreType2] = pieces2;
        }
      } else {
        // No color detected - treat as standard core type string (spanned cell)
        core = coreValue1;
      }

      // Create plain object (not Gearset instance)
      gearsetList.push({
        logo: logo,
        name: name,
        core: core,
        twoPc: row1[3] || '',
        threePc: row1[4] || '',
        fourPc: row1[5] || '',
        chest: row1[6] || '',
        chestDesc: row1[7] || '',
        backpack: row1[8] || '',
        backpackDesc: row1[9] || '',
        hint: row1[10] || '',
      });
    }
  }

  console.log('Gearsets parsed:', gearsetList.length);
  console.log('First 3 gearsets:', gearsetList.slice(0, 3));

  // Debug: Check if any gearset has "mask" as core
  const maskCore = gearsetList.find(
    (g) => g.core && g.core.toLowerCase && g.core.toLowerCase().includes('mask'),
  );
  if (maskCore) {
    console.log('Found gearset with "mask" in core:', maskCore);
  }

  return gearsetList;
};

/**
 * Parses brandset data from Google Sheets API response
 * @param {SheetData} data - The API response data containing values
 * @returns {any[]} Array of brandset objects
 */
export const parseBrandsets = (data: SheetData): any[] => {
  if (!data.values || data.values.length === 0) {
    return [];
  }

  const rows = data.values;
  const brandsetList: any[] = [];

  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];

    // Skip empty rows - check column C (brand name)
    if (row.length === 0 || !row[2] || !row[2].trim()) continue;

    // Extract icon URL from =IMAGE() formula in column B (index 1)
    let icon = row[1] || '';
    if (icon.startsWith('=IMAGE(') || icon.startsWith('=image(')) {
      const match = icon.match(/=IMAGE\("([^"]+)"/i);
      if (match) {
        icon = match[1];
      }
    }

    const brandset = {
      icon,
      brand: (row[2] || '').trim(),
      core: row[4] || '',
      onePc: row[5] || '',
      twoPc: row[6] || '',
      threePc: row[7] || '',
    };

    // Only add if it has a brand name
    if (brandset.brand && brandset.brand.trim()) {
      brandsetList.push(brandset);
    }
  }

  console.log(`✓ Brandsets parsed: ${brandsetList.length} items`);

  return brandsetList;
};

// TODO: parseGearTalents removed — talent data now comes from talents.json
// This function needs to be migrated to use the unified Talent model if sheet parsing is needed.

// TODO: convertGearTalentsToYaml removed — was coupled to the old GearTalent model.

/**
 * Parses named gear data from "Gear: Named + Exotics" sheet
 * Returns raw data objects that need to be processed by dataNormalizer
 * @param {GridData} gridData - The grid data from API response containing rowData
 * @returns {Record<string, any>} Object with gear names as keys and raw data as values
 */
export const parseNamedGear = (gridData: GridData): Record<string, any> => {
  if (!gridData.rowData || gridData.rowData.length === 0) {
    return {};
  }

  const rowData = gridData.rowData;
  const namedGearData: Record<string, any> = {};
  let currentType = '';
  let isExoticSection = false;

  // Helper function to extract icon URL from cell
  const extractIcon = (cell?: CellData) => {
    if (!cell) return '';

    // First check if there's a userEnteredValue with a formula
    if (cell.userEnteredValue && cell.userEnteredValue.formulaValue) {
      const formula = cell.userEnteredValue.formulaValue;
      if (formula.startsWith('=IMAGE(') || formula.startsWith('=image(')) {
        const match = formula.match(/=IMAGE\("([^"]+)"/i);
        if (match) {
          return match[1];
        }
      }
    }

    // Otherwise return formatted value
    return cell.formattedValue || '';
  };

  for (let i = 1; i < rowData.length; i++) {
    const rowObj = rowData[i];
    if (!rowObj.values || rowObj.values.length === 0) continue;

    const cells = rowObj.values || [];
    const row = cells.map((cell) => cell.formattedValue || '');

    // Check if we've hit the EXOTICS section marker
    if (row[1] && row[1].trim().toUpperCase() === 'EXOTICS') {
      isExoticSection = true;
      continue;
    }

    // Update type from column A (multirow cell)
    if (row[0] && row[0].trim()) {
      currentType = row[0].trim();
    }

    if (isExoticSection) {
      // Exotic items: 2 rows each
      // Row 1: col f=icon, col g=talent, col h=desc, col i=core, col j-l=minor1-3, col n=notes
      // Row 2: col e=name, col f=icon2 (optional)

      // Check if next row exists and has a name in col E
      if (i + 1 < rowData.length) {
        const nextRowObj = rowData[i + 1];
        if (nextRowObj.values && nextRowObj.values.length > 0) {
          const nextCells = nextRowObj.values || [];
          const nextRow = nextCells.map((cell) => cell.formattedValue || '');

          // If next row has a name in col E, this is an exotic item
          if (nextRow[4] && nextRow[4].trim()) {
            const name = nextRow[4].trim();

            // Extract icons from formulas
            const icon = extractIcon(cells[5]); // Col F row 1
            const icon2 = extractIcon(nextCells[5]); // Col F row 2

            // Create raw data object (not NamedGear yet)
            namedGearData[name] = {
              type: currentType,
              brand: '',
              name: name,
              icon: icon,
              icon2: icon2,
              talent: row[6] || '',
              desc: row[7] || '',
              core: row[8] || '',
              minor1: row[9] || '',
              minor2: row[10] || '',
              modSlots: parseInt(row[11]) || 0,
              notes: row[13] || '',
              isExotic: true,
            };

            i++; // Skip the next row since we processed it
            continue;
          }
        }
      }
    } else {
      // Named items: 1 row each
      // col c=brand, col e=name, col f=icon, col g=talent, col h=desc, col i=core, col j-l=minor1-3, col n=notes

      // Check if this row has a name in col E
      if (row[4] && row[4].trim()) {
        const name = row[4].trim();

        // Extract icon from formula
        const icon = extractIcon(cells[5]); // Col F

        // Create raw data object (not NamedGear yet)
        namedGearData[name] = {
          type: currentType,
          brand: row[2] || '',
          name: name,
          icon: icon,
          icon2: '',
          talent: row[6] || '',
          desc: row[7] || '',
          core: row[8] || '',
          minor1: row[9] || '',
          minor2: row[10] || '',
          modSlots: parseInt(row[11]) || 0,
          notes: row[13] || '',
          isExotic: false,
        };
      }
    }
  }

  return namedGearData;
};

/**
 * Parses skill data from Google Sheets API response
 * Column A: skill type (spans multiple rows)
 * Column B: skill name (header) and icon (spans rows below)
 * Columns C-K: table data with keys in column C and headers in row 1
 * @param {SheetData} data - The API response data containing values
 * @returns {Skill[]} Array of Skill objects
 */
export const parseSkills = (data: SheetData): Skill[] => {
  if (!data.values || data.values.length === 0) {
    return [];
  }

  const rows = data.values;
  const skillList: Skill[] = [];

  // Extract headers from row 1 (columns C onwards)
  const headers = rows[0] || [];
  const headerMap: Record<number, string> = {};
  for (let i = 2; i < headers.length; i++) {
    // Start from column C (index 2)
    if (headers[i] && headers[i].trim()) {
      let headerName = headers[i].trim();

      // Clean up tier names
      if (headerName.includes('Base Stats') || headerName.includes('Skill Tier 0')) {
        headerName = '0';
      } else if (headerName === 'Skill Tier 1') {
        headerName = '1';
      } else if (headerName === 'Skill Tier 2') {
        headerName = '2';
      } else if (headerName === 'Skill Tier 3') {
        headerName = '3';
      } else if (headerName === 'Skill Tier 4') {
        headerName = '4';
      } else if (headerName === 'Skill Tier 5') {
        headerName = '5';
      } else if (headerName === 'Skill Tier 6') {
        headerName = '6';
      } else if (headerName.includes('Overcharge')) {
        headerName = '7';
      }

      headerMap[i] = headerName;
    }
  }

  let currentType = '';
  let i = 1; // Start from row 2 (skip header row)

  while (i < rows.length) {
    const row = rows[i] || [];

    // Update type from column A if present
    if (row[0] && row[0].trim()) {
      currentType = row[0].trim();
    }

    // Check if column B has a skill name (not an icon URL or formula)
    const colB = row[1] || '';
    const colA = row[0] || '';

    if (
      colB &&
      colB.trim() &&
      !colB.startsWith('http') &&
      !colB.startsWith('=IMAGE') &&
      !colB.startsWith('=image')
    ) {
      const skillName = colB.trim();

      // Check if column A in the SAME row has an icon formula
      let icon = '';

      console.log(
        `[parseSkills] Found skill "${skillName}" at row ${i}, colA="${colA.substring(0, 80)}"`,
      );

      // Extract icon URL from =IMAGE() formula in column A
      if (colA && (colA.startsWith('=IMAGE(') || colA.startsWith('=image('))) {
        const match = colA.match(/=IMAGE\("([^"]+)"/i);
        if (match) {
          icon = match[1];
          console.log(`[parseSkills] ✓ Found icon in colA for "${skillName}": ${icon}`);
        } else {
          console.log(`[parseSkills] ✗ Failed to extract URL from colA formula: ${colA}`);
        }
      } else if (colA && colA.startsWith('http')) {
        icon = colA;
        console.log(`[parseSkills] ✓ Found icon URL in colA for "${skillName}": ${icon}`);
      } else {
        console.log(`[parseSkills] ✗ No icon formula found in colA for "${skillName}"`);
      }

      if (!icon) {
        console.log(`[parseSkills] ⚠ No icon found for "${skillName}"`);
      }

      // Now collect data rows - they span from current row until we hit another skill name
      // Data is in columns C onwards, with keys in column C
      const skillData: Record<string, Record<string, string>> = {};

      // Start collecting data from the row AFTER the skill name row
      // because the skill name row doesn't have data keys in column C
      let dataRowIndex = i + 1;

      // Determine the end of this skill's data block
      let endRowIndex = dataRowIndex;
      while (endRowIndex < rows.length) {
        const checkRow = rows[endRowIndex] || [];
        // Stop if we hit a new skill name in column B or new type in column A
        if (
          (checkRow[0] && checkRow[0].trim()) ||
          (checkRow[1] &&
            checkRow[1].trim() &&
            !checkRow[1].startsWith('http') &&
            !checkRow[1].startsWith('=IMAGE') &&
            !checkRow[1].startsWith('=image'))
        ) {
          break;
        }
        endRowIndex++;
      }

      // Collect data from all rows in this skill's block
      // Structure: { header1: { key1: value1, key2: value2 }, header2: { key1: value1 } }
      for (let dataRow = dataRowIndex; dataRow < endRowIndex; dataRow++) {
        const dataRowData = rows[dataRow] || [];
        const key = dataRowData[2] || ''; // Column C - should contain labels like "Radius", "Cooldown"

        if (key && key.trim() && key.trim() !== '') {
          const keyName = key.trim();

          // Collect values from columns D onwards based on headers
          for (let col = 3; col < dataRowData.length; col++) {
            const headerName = headerMap[col];
            if (headerName) {
              const value = dataRowData[col] || '';

              // Initialize header map if it doesn't exist
              if (!skillData[headerName]) {
                skillData[headerName] = {};
              }

              // Store value under header -> key
              skillData[headerName][keyName] = value;
            }
          }
        }
      }

      // Create skill object
      const skill = new Skill({
        type: currentType,
        name: skillName,
        icon: icon,
        data: skillData,
      });

      skillList.push(skill);

      // Move to the end of this skill's block
      i = endRowIndex;
      continue;
    }

    i++;
  }

  return skillList;
};

/**
 * Parses weapon mod data from Google Sheets API response
 * Column A: type (multi-row label)
 * Column B: slot (multi-row label)
 * Column C: name
 * Column D: bonus
 * Column E: penalty
 * Column F: source
 * @param {SheetData} data - The API response data containing values
 * @returns {WeaponMod[]} Array of WeaponMod objects
 */
export const parseWeaponMods = (data: SheetData): WeaponMod[] => {
  if (!data.values || data.values.length === 0) {
    return [];
  }

  const rows = data.values;
  const weaponModList: WeaponMod[] = [];
  let currentType = '';
  let currentSlot = '';

  console.log('Total rows in Weapon Mods:', rows.length);

  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];

    // Skip completely empty rows
    if (row.length === 0 || (!row[0] && !row[1] && !row[2])) continue;

    // Update type from column A if present
    if (row[0] && row[0].trim()) {
      currentType = row[0].trim();
    }

    // Update slot from column B if present
    if (row[1] && row[1].trim()) {
      currentSlot = row[1].trim();
    }

    // If column C (name) has content, this is a mod row
    if (row[2] && row[2].trim()) {
      const weaponMod = WeaponMod.fromSheetRow(row, currentType, currentSlot);
      weaponModList.push(weaponMod);
    }
  }

  console.log('Weapon mods parsed:', weaponModList.length);
  console.log('First 3 weapon mods:', weaponModList.slice(0, 3));

  return weaponModList;
};
