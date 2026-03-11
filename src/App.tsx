import React, { useState, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import BuildComponent from './components/Build';
import ChatWindow from './components/ChatWindow';
import useLookupStore from './stores/useLookupStore';
import useRawDataStore from './stores/useRawDataStore';
import Weapon from './models/Weapon';
import WeaponTalent from './models/WeaponTalent';
import ExoticWeapon from './models/ExoticWeapon';
import Gearset from './models/Gearset';
import Brandset from './models/Brandset';
import GearTalent from './models/GearTalent';
import NamedGear from './models/NamedGear';
import Skill from './models/Skill';
import WeaponMod from './models/WeaponMod';
import Attribute from './models/Attribute';
import GearMod from './models/GearMod';
import StatusImmunity from './models/StatusImmunity';
import { 
  parseWeapons, 
  parseWeaponTalents, 
  parseExoticWeapons,
  convertToExoticWeaponObjects,
  parseGearsets,
  parseBrandsets,
  parseGearTalents,
  parseNamedGear,
  convertToNamedGearObjects,
  parseSkills,
  parseWeaponMods,
  extractSpreadsheetId 
} from './utils/sheetParser';
import {
  loadCSVFile,
  parseWeaponAttributes,
  parseWeaponTypeAttributes,
  parseGearAttributes,
  parseGearMods,
  parseKeenersWatch,
  parseStatusImmunities
} from './utils/csvParser';
import { processNamedGearData, loadGearAttributes, processBrandsetData, processGearsetData, processWeaponModData, processExoticWeaponData } from './utils/dataNormalizer';
import './App.css';

function App() {
  const [, setDisplayContent] = useState<string>('');
  const [, setWeapons] = useState<Weapon[]>([]);
  const [, setWeaponTalents] = useState<WeaponTalent[]>([]);
  const [, setExoticWeapons] = useState<ExoticWeapon[]>([]);
  const [, setGearsets] = useState<Gearset[]>([]);
  const [, setBrandsets] = useState<Brandset[]>([]);
  const [, setGearTalents] = useState<GearTalent[]>([]);
  const [, setNamedGear] = useState<NamedGear[]>([]);
  const [, setSkills] = useState<Skill[]>([]);
  const [, setWeaponMods] = useState<WeaponMod[]>([]);

  // Load JSON data on app startup
  useEffect(() => {
    const loadJsonData = async () => {
      const dataFiles: Record<string, string> = {
        weapons: '/data/weapons.json',
        weaponTalents: '/data/weaponTalents.json',
        exoticWeapons: '/data/exoticWeapons.json',
        gearsets: '/data/gearsets.json',
        brandsets: '/data/brandsets.json',
        gearTalents: '/data/gearTalents.json',
        namedGear: '/data/namedGear.json',
        skills: '/data/skills.json',
        weaponMods: '/data/weaponMods.json',
        specializations: '/data/specialties.json',
        missingMappings: '/data/missingMappings.json'
      };

      const store = useLookupStore.getState() as any;

      for (const [dataType, filePath] of Object.entries(dataFiles)) {
        try {
          const response = await fetch(filePath);
          if (response.ok) {
            const data = await response.json();
            
            // Special handling for specializations - convert object to array with names
            let dataArray;
            if (dataType === 'specializations') {
              dataArray = Object.entries(data).map(([name, spec]) => ({
                name,
                ...(spec as object)
              }));
            } else if (dataType === 'missingMappings') {
              // missingMappings is a Record<string, GearModClassification>, not an array
              const setterName = `set${dataType.charAt(0).toUpperCase() + dataType.slice(1)}`;
              if (store[setterName]) {
                store[setterName](data);
                console.log(`Loaded ${dataType} from ${filePath}`);
              }
              continue; // Skip the array handling below
            } else {
              // Convert object to array if needed
              dataArray = Array.isArray(data) ? data : Object.values(data);
            }
            
            // Set data in store using the appropriate setter
            const setterName = `set${dataType.charAt(0).toUpperCase() + dataType.slice(1)}`;
            if (store[setterName]) {
              store[setterName](dataArray);
              console.log(`Loaded ${dataType} from ${filePath}`);
            }
          }
        } catch (error) {
          // Silently fail if file doesn't exist
          console.log(`No data file found for ${dataType}`);
        }
      }
    };

    loadJsonData();
    
    // Load lookup data from lookups.json
    const loadLookupData = async () => {
      try {
        const response = await fetch('/clean/lookups.json');
        if (!response.ok) {
          console.log('No lookups.json file found, falling back to CSV files');
          // Fallback to CSV loading
          await loadCSVData();
          return;
        }

        const lookups = await response.json();
        const store = useLookupStore.getState() as any;

        // Load weapon attributes
        if (lookups.weaponAttributes) {
          const attrs = Object.entries(lookups.weaponAttributes).map(([name, max]) => 
            new Attribute({ Attribute: name, Max: `${max}%` })
          );
          store.setWeaponAttributes(attrs);
          console.log('Loaded weaponAttributes from lookups.json');
        }

        // Load weapon type attributes
        if (lookups.weaponTypeAttributes) {
          const attrs = Object.entries(lookups.weaponTypeAttributes).flatMap(([weapon, attrObj]: [string, any]) =>
            Object.entries(attrObj).map(([attr, max]) =>
              new Attribute({ Weapon: weapon, Attribute: attr, Max: `${max}%` })
            )
          );
          store.setWeaponTypeAttributes(attrs);
          console.log('Loaded weaponTypeAttributes from lookups.json');
        }

        // Load gear attributes
        if (lookups.gearAttributes) {
          const attrs = Object.entries(lookups.gearAttributes).flatMap(([classification, attrObj]: [string, any]) =>
            Object.entries(attrObj).map(([attr, max]) =>
              new GearMod({ Classification: classification, Attribute: attr, Max: typeof max === 'number' ? (max < 100 ? `${max}%` : `${max}`) : max })
            )
          );
          store.setGearAttributes(attrs);
          console.log('Loaded gearAttributes from lookups.json');
        }

        // Load gear mod attributes
        if (lookups.gearMods) {
          const attrs = Object.entries(lookups.gearMods).flatMap(([classification, attrObj]: [string, any]) =>
            Object.entries(attrObj).map(([attr, max]) =>
              new GearMod({ Classification: classification, Attribute: attr, Max: typeof max === 'number' ? (max < 100 ? `${max}%` : `${max}`) : max })
            )
          );
          store.setGearModAttributes(attrs);
          console.log('Loaded gearMods from lookups.json');
        }

        // Load Keener's Watch
        if (lookups.keenersWatch) {
          const attrs = Object.entries(lookups.keenersWatch).flatMap(([category, attrObj]: [string, any]) =>
            Object.entries(attrObj).map(([attr, max]) =>
              new Attribute({ Category: category, Attribute: attr, 'Max Bonus': `${max}%` })
            )
          );
          store.setKeenersWatch(attrs);
          console.log('Loaded keenersWatch from lookups.json');
        }

        // Load status immunities
        if (lookups.statusImmunities) {
          const immunities = Object.entries(lookups.statusImmunities).map(([statusEffect, required]) =>
            new StatusImmunity({ 'Status Effect': statusEffect, 'Required %': `${required}%` })
          );
          store.setStatusImmunities(immunities);
          console.log('Loaded statusImmunities from lookups.json');
        }
      } catch (error) {
        console.error('Error loading lookups.json:', error);
        // Fallback to CSV loading
        await loadCSVData();
      }
    };

    // Fallback CSV loading function
    const loadCSVData = async () => {
      const csvFiles = [
        { key: 'weaponAttributes', filename: 'weapon_attributes.csv', parser: parseWeaponAttributes, setter: 'setWeaponAttributes' },
        { key: 'weaponTypeAttributes', filename: 'weapon_type_attributes.csv', parser: parseWeaponTypeAttributes, setter: 'setWeaponTypeAttributes' },
        { key: 'gearAttributes', filename: 'gear_attributes.csv', parser: parseGearAttributes, setter: 'setGearAttributes' },
        { key: 'gearModAttributes', filename: 'gear_mods.csv', parser: parseGearMods, setter: 'setGearModAttributes' },
        { key: 'keenersWatch', filename: 'keeners_watch_max_stats.csv', parser: parseKeenersWatch, setter: 'setKeenersWatch' },
        { key: 'statusImmunities', filename: 'status_immunities.csv', parser: parseStatusImmunities, setter: 'setStatusImmunities' }
      ];

      const store = useLookupStore.getState() as any;

      for (const { key, filename, parser, setter } of csvFiles) {
        try {
          const csvText = await loadCSVFile(filename);
          const parsedData = parser(csvText);
          
          if (store[setter]) {
            store[setter](parsedData);
            console.log(`Loaded ${key} from ${filename}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(`No CSV file found for ${key}: ${errorMessage}`);
        }
      }
    };

    loadLookupData();

    // Load all raw JSON files from /raw directory
    const loadRawFiles = async () => {
      try {
        await useRawDataStore.getState().loadAllRawFiles();
        console.log('Loaded all raw JSON files from /raw directory');
      } catch (error) {
        console.error('Error loading raw files:', error);
      }
    };

    loadRawFiles();
  }, []);

  const handleLoadWeapons = async () => {
    const apiKey = localStorage.getItem('googleApiKey');
    let spreadsheetId = localStorage.getItem('division2GearSpreadsheet');

    if (!apiKey || !spreadsheetId) {
      setDisplayContent('Error: Please configure Google API Key and Spreadsheet ID in Config');
      return;
    }

    // Extract spreadsheet ID from URL if full URL is provided
    spreadsheetId = extractSpreadsheetId(spreadsheetId);
    localStorage.setItem('division2GearSpreadsheet', spreadsheetId);

    setDisplayContent('Loading weapons...');

    try {
      // Fetch with formatting data to get text colors
      const url = `/api/sheets/v4/spreadsheets/${spreadsheetId}?key=${apiKey}&ranges=Weapons&includeGridData=true`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      
      if (!data.sheets || data.sheets.length === 0 || !data.sheets[0].data || !data.sheets[0].data[0].rowData) {
        setDisplayContent('No data found in Weapons tab');
        return;
      }

      // Parse data into Weapon objects
      const weaponList = parseWeapons(data.sheets[0].data[0]);
      setWeapons(weaponList);
      
      // Store in lookup store
      useLookupStore.getState().setWeapons(weaponList);
      
      // Convert to JSON for display
      const weaponData = weaponList.map((w: any) => ({ ...w }));
      setDisplayContent(JSON.stringify(weaponData, null, 2));
    } catch (error) {
      console.error('Full error:', error);
      const errorMessageText = error instanceof Error ? error.message : String(error);
      let errorMessage = `Error loading weapons: ${errorMessageText}\n\n`;
      errorMessage += `Spreadsheet ID: ${spreadsheetId}\n`;
      errorMessage += `API Key configured: ${apiKey ? 'Yes' : 'No'}\n\n`;
      errorMessage += 'Troubleshooting:\n';
      errorMessage += '1. Make sure the spreadsheet is shared publicly or with "Anyone with the link"\n';
      errorMessage += '2. Verify the Google API Key has Google Sheets API enabled\n';
      errorMessage += '3. Check that the "Weapons" tab exists in the spreadsheet\n';
      errorMessage += '4. Ensure the spreadsheet ID is correct (from the URL)';
      setDisplayContent(errorMessage);
    }
  };

  const handleLoadWeaponTalents = async () => {
    const apiKey = localStorage.getItem('googleApiKey');
    let spreadsheetId = localStorage.getItem('division2GearSpreadsheet');

    if (!apiKey || !spreadsheetId) {
      setDisplayContent('Error: Please configure Google API Key and Spreadsheet ID in Config');
      return;
    }

    // Extract spreadsheet ID from URL if full URL is provided
    spreadsheetId = extractSpreadsheetId(spreadsheetId);
    localStorage.setItem('division2GearSpreadsheet', spreadsheetId);

    setDisplayContent('Loading weapon talents...');

    try {
      const url = `/api/sheets/v4/spreadsheets/${spreadsheetId}/values/Weapon Talents?key=${apiKey}&valueRenderOption=FORMULA`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      
      if (!data.values || data.values.length === 0) {
        setDisplayContent('No data found in Weapon Talents tab');
        return;
      }

      // Parse weapon talents
      const talentList = parseWeaponTalents(data);
      setWeaponTalents(talentList);
      
      // Store in lookup store
      useLookupStore.getState().setWeaponTalents(talentList);
      
      // Convert to JSON for display
      const talentData = talentList.map((t: any) => ({ ...t }));
      setDisplayContent(JSON.stringify(talentData, null, 2));
    } catch (error) {
      console.error('Full error:', error);
      const errorMessageText = error instanceof Error ? error.message : String(error);
      let errorMessage = `Error loading weapon talents: ${errorMessageText}\n\n`;
      errorMessage += `Spreadsheet ID: ${spreadsheetId}\n`;
      errorMessage += `API Key configured: ${apiKey ? 'Yes' : 'No'}\n\n`;
      errorMessage += 'Troubleshooting:\n';
      errorMessage += '1. Make sure the spreadsheet is shared publicly or with "Anyone with the link"\n';
      errorMessage += '2. Verify the Google API Key has Google Sheets API enabled\n';
      errorMessage += '3. Check that the "Weapon Talents" tab exists in the spreadsheet';
      setDisplayContent(errorMessage);
    }
  };

  const handleLoadExoticWeapons = async () => {
    const apiKey = localStorage.getItem('googleApiKey');
    let spreadsheetId = localStorage.getItem('division2GearSpreadsheet');

    if (!apiKey || !spreadsheetId) {
      setDisplayContent('Error: Please configure Google API Key and Spreadsheet ID in Config');
      return;
    }

    // Extract spreadsheet ID from URL if full URL is provided
    spreadsheetId = extractSpreadsheetId(spreadsheetId);
    localStorage.setItem('division2GearSpreadsheet', spreadsheetId);

    setDisplayContent('Loading exotic weapons...');

    try {
      // First, fetch all sheets to find the correct sheet name/index
      const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;
      const metaResponse = await fetch(metaUrl);
      
      if (!metaResponse.ok) {
        throw new Error(`Failed to fetch spreadsheet metadata: ${metaResponse.status}`);
      }
      
      const metaData = await metaResponse.json();
      const targetSheet = metaData.sheets.find((sheet: any) => 
        sheet.properties.title.includes('Named') && sheet.properties.title.includes('Exotic')
      );
      
      if (!targetSheet) {
        setDisplayContent('Error: Could not find "Weapons: Named + Exotic" sheet. Available sheets: ' + 
          metaData.sheets.map((s: any) => s.properties.title).join(', '));
        return;
      }
      
      const sheetName = targetSheet.properties.title;
      console.log('Found sheet:', sheetName);
      
      // Fetch with formatting data to get text colors using the exact sheet name
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}&ranges=${encodeURIComponent(sheetName)}&includeGridData=true`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      
      if (!data.sheets || data.sheets.length === 0 || !data.sheets[0].data || !data.sheets[0].data[0].rowData) {
        setDisplayContent('No data found in Weapons: Named + Exotic tab');
        return;
      }

      // Parse data into raw objects
      const rawExoticData = parseExoticWeapons(data.sheets[0].data[0]);
      
      // Load regex patterns for normalization
      const patternsResponse = await fetch('/data/regexPatterns.json');
      const patterns = await patternsResponse.json();
      
      // Normalize the data
      const normalizedExoticData = processExoticWeaponData(rawExoticData, patterns.exoticWeapons);
      
      // Convert to ExoticWeapon objects
      const exoticList = convertToExoticWeaponObjects(normalizedExoticData);
      setExoticWeapons(exoticList);
      
      // Store in lookup store
      useLookupStore.getState().setExoticWeapons(exoticList);
      
      // Convert to JSON for display
      const exoticData = exoticList.map((e: any) => ({ ...e }));
      setDisplayContent(JSON.stringify(exoticData, null, 2));
    } catch (error) {
      console.error('Full error:', error);
      const errorMessageText = error instanceof Error ? error.message : String(error);
      let errorMessage = `Error loading exotic weapons: ${errorMessageText}\n\n`;
      errorMessage += `Spreadsheet ID: ${spreadsheetId}\n`;
      errorMessage += `API Key configured: ${apiKey ? 'Yes' : 'No'}\n\n`;
      errorMessage += 'Troubleshooting:\n';
      errorMessage += '1. Make sure the spreadsheet is shared publicly or with "Anyone with the link"\n';
      errorMessage += '2. Verify the Google API Key has Google Sheets API enabled\n';
      errorMessage += '3. Check that the "Weapons: Named + Exotic" tab exists in the spreadsheet';
      setDisplayContent(errorMessage);
    }
  };

  const handleLoadGearsets = async () => {
    const apiKey = localStorage.getItem('googleApiKey');
    let spreadsheetId = localStorage.getItem('division2GearSpreadsheet');

    if (!apiKey || !spreadsheetId) {
      setDisplayContent('Error: Please configure Google API Key and Spreadsheet ID in Config');
      return;
    }

    spreadsheetId = extractSpreadsheetId(spreadsheetId);
    localStorage.setItem('division2GearSpreadsheet', spreadsheetId);

    setDisplayContent('Loading gearsets...');

    try {
      const url = `/api/sheets/v4/spreadsheets/${spreadsheetId}?ranges=Gearsets&key=${apiKey}&includeGridData=true`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const result = await response.json();
      const gridData = result.sheets && result.sheets[0] && result.sheets[0].data && result.sheets[0].data[0];
      
      if (!gridData || !gridData.rowData || gridData.rowData.length === 0) {
        setDisplayContent('No data found in Gearsets tab');
        return;
      }

      const gearsetList = parseGearsets(gridData);
      
      // Load patterns and gear attributes for normalization
      const patternsResponse = await fetch('/data/regexPatterns.json');
      const patterns = await patternsResponse.json();
      
      const gearAttributes = useLookupStore.getState().getAllGearAttributes();
      
      // Normalize the gearset data
      const normalizedGearsets = processGearsetData(gearsetList, patterns, gearAttributes);
      
      setGearsets(normalizedGearsets);
      
      // Store in lookup store
      useLookupStore.getState().setGearsets(normalizedGearsets);
      
      const gearsetData = normalizedGearsets.map((g: any) => ({ ...g }));
      setDisplayContent(JSON.stringify(gearsetData, null, 2));
    } catch (error) {
      console.error('Full error:', error);
      const errorMessageText = error instanceof Error ? error.message : String(error);
      let errorMessage = `Error loading gearsets: ${errorMessageText}\n\n`;
      errorMessage += `Spreadsheet ID: ${spreadsheetId}\n`;
      errorMessage += `API Key configured: ${apiKey ? 'Yes' : 'No'}\n\n`;
      errorMessage += 'Troubleshooting:\n';
      errorMessage += '1. Make sure the spreadsheet is shared publicly or with "Anyone with the link"\n';
      errorMessage += '2. Verify the Google API Key has Google Sheets API enabled\n';
      errorMessage += '3. Check that the "Gearsets" tab exists in the spreadsheet';
      setDisplayContent(errorMessage);
    }
  };

  const handleLoadBrandsets = async () => {
    const apiKey = localStorage.getItem('googleApiKey');
    let spreadsheetId = localStorage.getItem('division2GearSpreadsheet');

    if (!apiKey || !spreadsheetId) {
      setDisplayContent('Error: Please configure Google API Key and Spreadsheet ID in Config');
      return;
    }

    spreadsheetId = extractSpreadsheetId(spreadsheetId);
    localStorage.setItem('division2GearSpreadsheet', spreadsheetId);

    setDisplayContent('Loading brandsets...');

    try {
      const url = `/api/sheets/v4/spreadsheets/${spreadsheetId}/values/Brandsets?key=${apiKey}&valueRenderOption=FORMULA`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      
      if (!data.values || data.values.length === 0) {
        setDisplayContent('No data found in Brandsets tab');
        return;
      }

      const brandsetList = parseBrandsets(data);
      
      // Load regex patterns and gear attributes for normalization
      const patternsResponse = await fetch('/data/regexPatterns.json');
      const patterns = await patternsResponse.json();
      
      const gearAttributes = useLookupStore.getState().getAllGearAttributes();
      
      // Normalize the brandset data
      const normalizedBrandsets = processBrandsetData(brandsetList, patterns, gearAttributes);
      
      setBrandsets(normalizedBrandsets);
      
      // Store in lookup store
      useLookupStore.getState().setBrandsets(normalizedBrandsets);
      
      const brandsetData = normalizedBrandsets.map((b: any) => ({ ...b }));
      setDisplayContent(JSON.stringify(brandsetData, null, 2));
    } catch (error) {
      console.error('Full error:', error);
      const errorMessageText = error instanceof Error ? error.message : String(error);
      let errorMessage = `Error loading brandsets: ${errorMessageText}\n\n`;
      errorMessage += `Spreadsheet ID: ${spreadsheetId}\n`;
      errorMessage += `API Key configured: ${apiKey ? 'Yes' : 'No'}\n\n`;
      errorMessage += 'Troubleshooting:\n';
      errorMessage += '1. Make sure the spreadsheet is shared publicly or with "Anyone with the link"\n';
      errorMessage += '2. Verify the Google API Key has Google Sheets API enabled\n';
      errorMessage += '3. Check that the "Brandsets" tab exists in the spreadsheet';
      setDisplayContent(errorMessage);
    }
  };

  const handleLoadGearTalents = async () => {
    const apiKey = localStorage.getItem('googleApiKey');
    let spreadsheetId = localStorage.getItem('division2GearSpreadsheet');

    if (!apiKey || !spreadsheetId) {
      setDisplayContent('Error: Please configure Google API Key and Spreadsheet ID in Config');
      return;
    }

    spreadsheetId = extractSpreadsheetId(spreadsheetId);
    localStorage.setItem('division2GearSpreadsheet', spreadsheetId);

    setDisplayContent('Loading gear talents...');

    try {
      const url = `/api/sheets/v4/spreadsheets/${spreadsheetId}/values/Gear Talents?key=${apiKey}&valueRenderOption=FORMULA`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      
      if (!data.values || data.values.length === 0) {
        setDisplayContent('No data found in Gear Talents tab');
        return;
      }

      const talentList = parseGearTalents(data);
      setGearTalents(talentList);
      
      // Store in lookup store
      useLookupStore.getState().setGearTalents(talentList);
      
      const talentData = talentList.map((t: any) => ({ ...t }));
      setDisplayContent(JSON.stringify(talentData, null, 2));
    } catch (error) {
      console.error('Full error:', error);
      const errorMessageText = error instanceof Error ? error.message : String(error);
      let errorMessage = `Error loading gear talents: ${errorMessageText}\n\n`;
      errorMessage += `Spreadsheet ID: ${spreadsheetId}\n`;
      errorMessage += `API Key configured: ${apiKey ? 'Yes' : 'No'}\n\n`;
      errorMessage += 'Troubleshooting:\n';
      errorMessage += '1. Make sure the spreadsheet is shared publicly or with "Anyone with the link"\n';
      errorMessage += '2. Verify the Google API Key has Google Sheets API enabled\n';
      errorMessage += '3. Check that the "Gear Talents" tab exists in the spreadsheet';
      setDisplayContent(errorMessage);
    }
  };

  const handleLoadNamedGear = async () => {
    const apiKey = localStorage.getItem('googleApiKey');
    let spreadsheetId = localStorage.getItem('division2GearSpreadsheet');

    if (!apiKey || !spreadsheetId) {
      setDisplayContent('Error: Please configure Google API Key and Spreadsheet ID in Config');
      return;
    }

    spreadsheetId = extractSpreadsheetId(spreadsheetId);
    localStorage.setItem('division2GearSpreadsheet', spreadsheetId);

    setDisplayContent('Loading named gear...');

    try {
      const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;
      const metaResponse = await fetch(metaUrl);
      
      if (!metaResponse.ok) {
        throw new Error(`Failed to fetch spreadsheet metadata: ${metaResponse.status}`);
      }
      
      const metaData = await metaResponse.json();
      const targetSheet = metaData.sheets.find((sheet: any) => 
        sheet.properties.title.toLowerCase().includes('gear') && 
        sheet.properties.title.toLowerCase().includes('named') && 
        sheet.properties.title.toLowerCase().includes('exotic')
      );
      
      if (!targetSheet) {
        setDisplayContent('Error: Could not find "Gear: Named + Exotics" sheet. Available sheets: ' + 
          metaData.sheets.map((s: any) => s.properties.title).join(', '));
        return;
      }
      
      const sheetName = targetSheet.properties.title;
      console.log('Found sheet:', sheetName);
      
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}&ranges=${encodeURIComponent(sheetName)}&includeGridData=true`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      
      if (!data.sheets || data.sheets.length === 0 || !data.sheets[0].data || !data.sheets[0].data[0].rowData) {
        setDisplayContent('No data found in Gear: Named + Exotics tab');
        return;
      }

      // Parse raw data from sheet
      const rawNamedGearData = parseNamedGear(data.sheets[0].data[0]);
      
      // Load regex patterns and gear attributes
      const patternsResponse = await fetch('/data/regexPatterns.json');
      const patterns = await patternsResponse.json();
      
      const gearAttributes = useLookupStore.getState().getAllGearAttributes();
      
      // Normalize the data
      const normalizedData = processNamedGearData(rawNamedGearData, patterns, gearAttributes);
      
      // Convert to NamedGear objects
      const namedGearList = convertToNamedGearObjects(normalizedData);
      
      setNamedGear(namedGearList);
      
      // Store in lookup store
      useLookupStore.getState().setNamedGear(namedGearList);
      
      // Display the normalized JSON data
      setDisplayContent(JSON.stringify(normalizedData, null, 2));
    } catch (error) {
      console.error('Full error:', error);
      const errorMessageText = error instanceof Error ? error.message : String(error);
      let errorMessage = `Error loading named gear: ${errorMessageText}\n\n`;
      errorMessage += `Spreadsheet ID: ${spreadsheetId}\n`;
      errorMessage += `API Key configured: ${apiKey ? 'Yes' : 'No'}\n\n`;
      errorMessage += 'Troubleshooting:\n';
      errorMessage += '1. Make sure the spreadsheet is shared publicly or with "Anyone with the link"\n';
      errorMessage += '2. Verify the Google API Key has Google Sheets API enabled\n';
      errorMessage += '3. Check that the "Gear: Named + Exotics" tab exists in the spreadsheet';
      setDisplayContent(errorMessage);
    }
  };

  const handleLoadSkills = async () => {
    const apiKey = localStorage.getItem('googleApiKey');
    let spreadsheetId = localStorage.getItem('division2GearSpreadsheet');

    if (!apiKey || !spreadsheetId) {
      setDisplayContent('Error: Please configure Google API Key and Spreadsheet ID in Config');
      return;
    }

    spreadsheetId = extractSpreadsheetId(spreadsheetId);
    localStorage.setItem('division2GearSpreadsheet', spreadsheetId);

    setDisplayContent('Loading skills...');

    try {
      const url = `/api/sheets/v4/spreadsheets/${spreadsheetId}/values/Skill List?key=${apiKey}&valueRenderOption=FORMULA`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      
      if (!data.values || data.values.length === 0) {
        setDisplayContent('No data found in Skill List tab');
        return;
      }

      const skillList = parseSkills(data);
      setSkills(skillList);
      
      // Store in lookup store
      useLookupStore.getState().setSkills(skillList);
      
      const skillData = skillList.map((s: any) => ({ ...s }));
      setDisplayContent(JSON.stringify(skillData, null, 2));
    } catch (error) {
      console.error('Full error:', error);
      const errorMessageText = error instanceof Error ? error.message : String(error);
      let errorMessage = `Error loading skills: ${errorMessageText}\n\n`;
      errorMessage += `Spreadsheet ID: ${spreadsheetId}\n`;
      errorMessage += `API Key configured: ${apiKey ? 'Yes' : 'No'}\n\n`;
      errorMessage += 'Troubleshooting:\n';
      errorMessage += '1. Make sure the spreadsheet is shared publicly or with "Anyone with the link"\n';
      errorMessage += '2. Verify the Google API Key has Google Sheets API enabled\n';
      errorMessage += '3. Check that the "Skill List" tab exists in the spreadsheet';
      setDisplayContent(errorMessage);
    }
  };

  const handleLoadWeaponMods = async () => {
    const apiKey = localStorage.getItem('googleApiKey');
    let spreadsheetId = localStorage.getItem('division2GearSpreadsheet');

    if (!apiKey || !spreadsheetId) {
      setDisplayContent('Error: Please configure Google API Key and Spreadsheet ID in Config');
      return;
    }

    spreadsheetId = extractSpreadsheetId(spreadsheetId);
    localStorage.setItem('division2GearSpreadsheet', spreadsheetId);

    setDisplayContent('Loading weapon mods...');

    try {
      const sheetName = encodeURIComponent('Weapon Mods');
      const url = `/api/sheets/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?key=${apiKey}`;
      
      console.log('Fetching weapon mods from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      console.log('Weapon mods data received:', data);
      
      if (!data.values || data.values.length === 0) {
        setDisplayContent('No data found in Weapon Mods tab');
        return;
      }

      // Load regex patterns for normalization
      const patternsResponse = await fetch('/data/regexPatterns.json');
      const patterns = await patternsResponse.json();

      // Parse and normalize weapon mods
      const rawWeaponModList = parseWeaponMods(data);
      const weaponModList = processWeaponModData(rawWeaponModList, patterns.weaponMods);
      
      setWeaponMods(weaponModList);
      
      // Store in lookup store
      useLookupStore.getState().setWeaponMods(weaponModList);
      
      const weaponModData = weaponModList.map((m: any) => ({ ...m }));
      setDisplayContent(JSON.stringify(weaponModData, null, 2));
    } catch (error) {
      console.error('Full error:', error);
      const errorMessageText = error instanceof Error ? error.message : String(error);
      let errorMessage = `Error loading weapon mods: ${errorMessageText}\n\n`;
      errorMessage += `Spreadsheet ID: ${spreadsheetId}\n`;
      errorMessage += `API Key configured: ${apiKey ? 'Yes' : 'No'}\n\n`;
      errorMessage += 'Troubleshooting:\n';
      errorMessage += '1. Make sure the spreadsheet is shared publicly or with "Anyone with the link"\n';
      errorMessage += '2. Verify the Google API Key has Google Sheets API enabled\n';
      errorMessage += '3. Check that the "Weapon Mods" tab exists in the spreadsheet';
      setDisplayContent(errorMessage);
    }
  };

  // CSV file loading handlers
  const handleLoadCSV = async (csvKey: string, filename: string) => {
    try {
      setDisplayContent(`Loading ${filename}...`);
      
      const csvText = await loadCSVFile(filename);
      let parsedData: any[] = [];
      let setterName = '';
      
      switch (csvKey) {
        case 'weaponAttributes':
          parsedData = parseWeaponAttributes(csvText);
          setterName = 'setWeaponAttributes';
          break;
        case 'weaponTypeAttributes':
          parsedData = parseWeaponTypeAttributes(csvText);
          setterName = 'setWeaponTypeAttributes';
          break;
        case 'gearAttributes':
          parsedData = parseGearAttributes(csvText);
          setterName = 'setGearAttributes';
          break;
        case 'gearModAttributes':
          parsedData = parseGearMods(csvText);
          setterName = 'setGearModAttributes';
          break;
        case 'keenersWatch':
          parsedData = parseKeenersWatch(csvText);
          setterName = 'setKeenersWatch';
          break;
        case 'statusImmunities':
          parsedData = parseStatusImmunities(csvText);
          setterName = 'setStatusImmunities';
          break;
        default:
          setDisplayContent(`Unknown CSV type: ${csvKey}`);
          return;
      }
      
      // Store in lookup store
      const setter = (useLookupStore.getState() as any)[setterName];
      if (setter) {
        setter(parsedData);
      }
      
      // Display as YAML
      let yaml = `${csvKey}:\n`;
      parsedData.forEach((item, index) => {
        yaml += `  - item_${index + 1}:\n`;
        yaml += item.toYAML(6);
      });
      
      setDisplayContent(yaml);
    } catch (error) {
      const errorMessageText = error instanceof Error ? error.message : String(error);
      console.error('Error loading CSV:', error);
      setDisplayContent(`Error loading ${filename}: ${errorMessageText}`);
    }
  };

  const handleLoadData = (dataType: string, pageName: string, isCSV: boolean = false) => {
    if (isCSV) {
      handleLoadCSV(dataType, pageName);
      return;
    }
    
    const loadHandlers: Record<string, () => Promise<void>> = {
      weapons: handleLoadWeapons,
      weaponTalents: handleLoadWeaponTalents,
      exoticWeapons: handleLoadExoticWeapons,
      gearsets: handleLoadGearsets,
      brandsets: handleLoadBrandsets,
      gearTalents: handleLoadGearTalents,
      namedGear: handleLoadNamedGear,
      skills: handleLoadSkills,
      weaponMods: handleLoadWeaponMods
    };

    const handler = loadHandlers[dataType];
    if (handler) {
      handler();
    }
  };

  // Helper function to normalize weapon header keys (same logic as Weapon.normalizeHeaderKey)
  const normalizeWeaponHeaderKey = (header: string, columnIndex: number): string => {
    // Handle specific column indices for known structure
    if (columnIndex === 0) return 'type';
    if (columnIndex === 2) return 'name';
    if (columnIndex === 6) return 'reload';
    if (columnIndex === 7) return 'damage';
    if (columnIndex === 12) return 'optimalRange';
    
    // Convert header names to camelCase property names
    const normalized = header
      .toLowerCase()
      .replace(/[^a-z0-9]+(.)/g, (_, char) => char.toUpperCase());
    
    // Map common variations to property names
    const keyMap: Record<string, string> = {
      'weapon': 'name',
      'weapontype': 'type',
      'weaponname': 'name',
      'weaponvariant': 'variant',
      'variant': 'variant',
      'roundsperminute': 'rpm',
      'rpm': 'rpm',
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
      'flag': 'flag',
    };

    return keyMap[normalized] || normalized;
  };

  // Load2 handlers - Load raw data without normalization
  const handleLoad2Data = async (dataType: string, pageName: string, isCSV: boolean = false) => {
    const startTime = performance.now();
    console.log(`[${dataType}] Starting data scrape...`);
    
    const apiKey = localStorage.getItem('googleApiKey');
    let spreadsheetId = localStorage.getItem('division2GearSpreadsheet');

    if (!apiKey || !spreadsheetId) {
      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`[${dataType}] ✗ Aborted after ${duration}s - Missing config (apiKey: ${!!apiKey}, spreadsheetId: ${!!spreadsheetId})`);
      
      const missingItems = [];
      if (!apiKey) missingItems.push('Google API Key');
      if (!spreadsheetId) missingItems.push('Spreadsheet ID');
      
      alert(`Missing configuration: ${missingItems.join(' and ')}\n\nPlease click the gear icon (⚙️) to configure your Google API Key and Spreadsheet ID.`);
      setDisplayContent('Error: Please configure Google API Key and Spreadsheet ID in Config');
      return;
    }

    console.log(`[${dataType}] Config found, proceeding with scrape`);
    spreadsheetId = extractSpreadsheetId(spreadsheetId);
    localStorage.setItem('division2GearSpreadsheet', spreadsheetId);

    if (isCSV) {
      // Load CSV as raw data
      try {
        setDisplayContent(`Loading raw ${pageName}...`);
        const csvText = await loadCSVFile(pageName);
        
        // Parse CSV into raw array of objects
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const rawData = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = values[index] || '';
          });
          return obj;
        });
        
        useRawDataStore.getState().setRawData(dataType as any, rawData);
        
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`[${dataType}] ✓ Completed in ${duration}s (${rawData.length} items)`);
        
        setDisplayContent(JSON.stringify(rawData, null, 2));
      } catch (error) {
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.error(`[${dataType}] ✗ Failed after ${duration}s:`, error);
        
        const errorMessageText = error instanceof Error ? error.message : String(error);
        setDisplayContent(`Error loading raw ${pageName}: ${errorMessageText}`);
      }
      return;
    }

    setDisplayContent(`Loading raw ${dataType}...`);

    try {
      let url: string;
      let useGridData = ['weapons', 'exoticWeapons', 'gearsets', 'namedGear', 'skills'].includes(dataType);
      
      if (useGridData) {
        // For sheets that need grid data (color formatting, etc.)
        if (dataType === 'exoticWeapons' || dataType === 'namedGear') {
          // Find the correct sheet name first
          const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;
          const metaResponse = await fetch(metaUrl);
          if (!metaResponse.ok) throw new Error(`Failed to fetch spreadsheet metadata`);
          
          const metaData = await metaResponse.json();
          const targetSheet = metaData.sheets.find((sheet: any) => {
            const title = sheet.properties.title.toLowerCase();
            if (dataType === 'exoticWeapons') {
              return title.includes('weapon') && title.includes('named') && title.includes('exotic');
            } else {
              return title.includes('gear') && title.includes('named') && title.includes('exotic');
            }
          });
          
          if (!targetSheet) throw new Error(`Could not find sheet for ${dataType}`);
          pageName = targetSheet.properties.title;
        }
        
        url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}&ranges=${encodeURIComponent(pageName)}&includeGridData=true`;
      } else {
        // For sheets that only need values
        // Use FORMULA render option to get =IMAGE() formulas for icon extraction
        url = `/api/sheets/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(pageName)}?key=${apiKey}&valueRenderOption=FORMULA`;
      }
      
      console.log(`[${dataType}] Fetching from: ${url.substring(0, 100)}...`);
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      console.log(`[${dataType}] Fetch response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorText}`);
      }

      console.log(`[${dataType}] Parsing response...`);
      const data = await response.json();
      let rawData: any[];

      if (useGridData) {
        // Extract raw grid data
        if (!data.sheets || data.sheets.length === 0 || !data.sheets[0].data || !data.sheets[0].data[0].rowData) {
          throw new Error('No data found');
        }
        
        const gridData = data.sheets[0].data[0];
        
        if (dataType === 'weapons') {
          // Use the original parseWeapons function
          const weaponList = parseWeapons(gridData);
          rawData = weaponList.map((w: any) => ({ ...w }));
        } else if (dataType === 'exoticWeapons') {
          // For exotic weapons, we need formulas for icons
          // Make a second call with FORMULA option
          console.log(`[${dataType}] Fetching formulas for icon extraction...`);
          const formulaUrl = `/api/sheets/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(pageName)}?key=${apiKey}&valueRenderOption=FORMULA`;
          const formulaResponse = await fetch(formulaUrl);
          const formulaData = await formulaResponse.json();
          
          console.log(`[${dataType}] Formula data rows:`, formulaData.values?.length);
          
          // Use the original parseExoticWeapons function with grid data
          const exoticDataWithoutIcons = parseExoticWeapons(gridData);
          
          console.log(`[${dataType}] Parsed exotic weapons:`, Object.keys(exoticDataWithoutIcons));
          
          // Extract icons from formula data
          if (formulaData.values) {
            const formulaValues = formulaData.values;
            
            for (let i = 1; i < formulaValues.length; i++) {
              const row = formulaValues[i] || [];
              const colC = row[2] || '';
              const colD = row[3] || '';
              
              // Check if column C has a weapon name (not a formula)
              if (colC && colC.trim() && !colC.startsWith('=')) {
                const weaponName = colC.trim();
                
                console.log(`[${dataType}] Row ${i}: name="${weaponName}", colD="${colD.substring(0, 50)}"`);
                
                // Check if this weapon exists in our parsed exotic weapons
                if (exoticDataWithoutIcons[weaponName]) {
                  const icons: string[] = [];
                  
                  // Check PREVIOUS row for first icon in column D
                  if (i - 1 >= 0) {
                    const prevRow = formulaValues[i - 1] || [];
                    const prevColD = prevRow[3] || '';
                    
                    console.log(`[${dataType}] Row ${i-1} (prev): colD="${prevColD.substring(0, 50)}"`);
                    
                    if (prevColD && prevColD.trim() && (prevColD.startsWith('=IMAGE(') || prevColD.startsWith('=image('))) {
                      let icon1 = prevColD.trim();
                      const match = icon1.match(/=IMAGE\("([^"]+)"/i);
                      if (match) {
                        icon1 = match[1];
                        icons.push(icon1);
                        console.log(`[${dataType}] Found first icon for ${weaponName}:`, icon1);
                      }
                    }
                  }
                  
                  // Extract second icon from column D of current row (where the name is)
                  if (colD && colD.trim() && (colD.startsWith('=IMAGE(') || colD.startsWith('=image('))) {
                    let icon2 = colD.trim();
                    const match = icon2.match(/=IMAGE\("([^"]+)"/i);
                    if (match) {
                      icon2 = match[1];
                      icons.push(icon2);
                      console.log(`[${dataType}] Found second icon for ${weaponName}:`, icon2);
                    }
                  }
                  
                  exoticDataWithoutIcons[weaponName].icons = icons;
                  console.log(`[${dataType}] Set ${icons.length} icon(s) for ${weaponName}:`, icons);
                }
              }
            }
          }
          
          rawData = Object.values(exoticDataWithoutIcons);
        } else if (dataType === 'namedGear') {
          // For named gear, we need formulas for icons
          // Make a second call with FORMULA option
          console.log(`[${dataType}] Fetching formulas for icon extraction...`);
          const formulaUrl = `/api/sheets/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(pageName)}?key=${apiKey}&valueRenderOption=FORMULA`;
          const formulaResponse = await fetch(formulaUrl);
          const formulaData = await formulaResponse.json();
          
          // Use the original parseNamedGear function
          const namedGearData = parseNamedGear(gridData);
          
          // Extract icons from formula data
          if (formulaData.values) {
            const formulaValues = formulaData.values;
            
            for (let i = 1; i < formulaValues.length; i++) {
              const row = formulaValues[i] || [];
              const colE = row[4] || ''; // Name is in column E
              const colF = row[5] || ''; // Icon is in column F
              
              const name = colE.trim();
              if (name && !name.startsWith('=') && namedGearData[name]) {
                // Extract icon from column F
                let icon = colF;
                if (icon && (icon.startsWith('=IMAGE(') || icon.startsWith('=image('))) {
                  const match = icon.match(/=IMAGE\("([^"]+)"/i);
                  if (match) {
                    icon = match[1];
                    namedGearData[name].icon = icon;
                    console.log(`[${dataType}] Set icon for ${name}:`, icon);
                  }
                }
              }
            }
          }
          
          rawData = Object.values(namedGearData);
        } else if (dataType === 'gearsets') {
          // For gearsets, we need formulas for logos
          // Make a second call with FORMULA option
          console.log(`[${dataType}] Fetching formulas for logo extraction...`);
          const formulaUrl = `/api/sheets/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(pageName)}?key=${apiKey}&valueRenderOption=FORMULA`;
          const formulaResponse = await fetch(formulaUrl);
          const formulaData = await formulaResponse.json();
          
          // Use the original parseGearsets function
          const gearsets = parseGearsets(gridData);
          
          // Extract logos from formula data
          if (formulaData.values) {
            const formulaValues = formulaData.values;
            
            // Process in pairs (gearsets span 2 rows)
            for (let i = 1; i < formulaValues.length; i += 2) {
              const row1 = formulaValues[i] || [];
              const row2 = formulaValues[i + 1] || [];
              
              const colA_row1 = row1[0] || '';
              const name = (row2[0] || '').trim();
              
              if (name) {
                // Extract logo from row1 column A
                let logo = colA_row1;
                if (logo.startsWith('=IMAGE(') || logo.startsWith('=image(')) {
                  const match = logo.match(/=IMAGE\("([^"]+)"/i);
                  if (match) {
                    logo = match[1];
                    
                    // Find the gearset in our parsed data and update the logo
                    const gearset = gearsets.find((g: any) => g.name === name);
                    if (gearset) {
                      gearset.logo = logo;
                      console.log(`[${dataType}] Set logo for ${name}:`, logo);
                    }
                  }
                }
              }
            }
          }
          
          // Post-process: simplify single-value cores
          rawData = gearsets.map((gearset: any) => {
            if (gearset.core && typeof gearset.core === 'object') {
              const keys = Object.keys(gearset.core);
              // If there's only one key and it has only one value
              if (keys.length === 1) {
                const key = keys[0];
                const values = gearset.core[key];
                if (Array.isArray(values) && values.length === 1) {
                  // Check if the value matches the key (case-insensitive)
                  if (values[0].toLowerCase() === key.toLowerCase()) {
                    return { ...gearset, core: key };
                  }
                }
              }
            }
            return gearset;
          });
        } else if (dataType === 'skills') {
          // For skills, we need formulas for icons
          // Make a second call with FORMULA option
          console.log(`[${dataType}] Processing skills with grid data...`);
          
          // Check for over-grid images in the grid data
          console.log(`[${dataType}] Checking for over-grid images...`);
          console.log(`[${dataType}] Grid data structure:`, Object.keys(gridData));
          
          // Over-grid images might be in gridData.rowMetadata or a separate property
          if (data.sheets && data.sheets[0]) {
            const sheet = data.sheets[0];
            console.log(`[${dataType}] Sheet properties:`, Object.keys(sheet));
            
            // Check for images in sheet-level data
            if (sheet.images) {
              console.log(`[${dataType}] Found sheet.images:`, sheet.images);
            }
            if (sheet.overlays) {
              console.log(`[${dataType}] Found sheet.overlays:`, sheet.overlays);
            }
          }
          
          console.log(`[${dataType}] Fetching formulas for icon extraction...`);
          const formulaUrl = `/api/sheets/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(pageName)}?key=${apiKey}&valueRenderOption=FORMULA`;
          const formulaResponse = await fetch(formulaUrl);
          const formulaData = await formulaResponse.json();
          
          console.log(`[${dataType}] Formula data rows:`, formulaData.values?.length);
          
          // Use the original parseSkills function
          const skillsData = parseSkills({ values: formulaData.values || [] });
          
          rawData = skillsData;
        }
      } else {
        // Extract raw values
        if (!data.values || data.values.length === 0) {
          throw new Error('No data found');
        }
        
        const values = data.values;
        
        // Special handling for weapon talents
        if (dataType === 'weaponTalents') {
          // Use the original parseWeaponTalents function
          rawData = parseWeaponTalents({ values });
        } else if (dataType === 'brandsets') {
          // Use the original parseBrandsets function
          rawData = parseBrandsets({ values });
        } else if (dataType === 'gearTalents') {
          // Use the original parseGearTalents function
          rawData = parseGearTalents({ values });
        } else if (dataType === 'weaponMods') {
          // Extract raw weapon mods data without using the model
          let currentType = '';
          let currentSlot = '';
          
          rawData = [];
          
          // Skip header row
          for (let i = 1; i < values.length; i++) {
            const row = values[i] || [];
            
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
              rawData.push({
                type: currentType,
                slot: currentSlot,
                name: row[2] || '',
                bonus: row[3] || '',
                penalty: row[4] || '',
                source: row[5] || ''
              });
            }
          }
        } else {
          // For other data types, convert 2D array to objects with headers
          const headers = values[0] || [];
          rawData = values.slice(1).map((row: any[]) => {
            const obj: any = {};
            row.forEach((value: any, index: number) => {
              const key = headers[index]?.trim() || `col_${index}`;
              obj[key] = value || '';
            });
            return obj;
          });
        }
      }
      
      // Store in raw data store using generic setRawData
      useRawDataStore.getState().setRawData(dataType as any, rawData);
      
      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`[${dataType}] ✓ Completed in ${duration}s (${rawData.length} items)`);
      
      setDisplayContent(JSON.stringify(rawData, null, 2));
    } catch (error) {
      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      console.error(`[${dataType}] ✗ Failed after ${duration}s:`, error);
      
      console.error('Full error:', error);
      const errorMessageText = error instanceof Error ? error.message : String(error);
      setDisplayContent(`Error loading raw ${dataType}: ${errorMessageText}`);
    }
  };

  return (
    <div className="app">
      <TitleBar onLoadData={handleLoad2Data} />
      <div className="main-content">
        <BuildComponent />
        <ChatWindow />
      </div>
    </div>
  );
}

export default App;
