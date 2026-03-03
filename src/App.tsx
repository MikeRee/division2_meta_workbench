import React, { useState, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import BuildComponent from './components/Build';
import ChatWindow from './components/ChatWindow';
import useLookupStore from './stores/useLookupStore';
import Weapon from './models/Weapon';
import WeaponTalent from './models/WeaponTalent';
import ExoticWeapon from './models/ExoticWeapon';
import Gearset from './models/Gearset';
import Brandset from './models/Brandset';
import GearTalent from './models/GearTalent';
import NamedGear from './models/NamedGear';
import Skill from './models/Skill';
import WeaponMod from './models/WeaponMod';
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
    
    // Load CSV files on startup
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

    loadCSVData();
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

  return (
    <div className="app">
      <TitleBar onLoadData={handleLoadData} />
      <div className="main-content">
        <BuildComponent />
        <ChatWindow />
      </div>
    </div>
  );
}

export default App;
