import React, { useState, useEffect } from 'react';
import './LoadModal.css';
import { useRawDataStore } from '../stores/useRawDataStore';
import { useCleanDataStore, getModelFields, CLASS_CONSTRUCTORS } from '../stores/useCleanDataStore';
import { useRulesStore, SYSTEM_RULES } from '../stores/useRulesStore';
import { MdDownload, MdSave, MdEditDocument, MdCleaningServices } from 'react-icons/md';
import StatModifier from '../models/StatModifier';

interface LoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadData: (dataType: string, pageName: string, isCSV?: boolean) => Promise<void>;
}

function LoadModal({ isOpen, onClose, onLoadData }: LoadModalProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [viewerData, setViewerData] = useState<any>(null);
  const [viewerType, setViewerType] = useState('');
  const [viewerMode, setViewerMode] = useState<'raw' | 'clean'>('raw');
  const [editedJson, setEditedJson] = useState('');
  const [dataExists, setDataExists] = useState<Record<string, boolean>>({});
  const [cleanDataExists, setCleanDataExists] = useState<Record<string, boolean>>({});
  const [dataCounts, setDataCounts] = useState<Record<string, number>>({});
  const [cleanDataCounts, setCleanDataCounts] = useState<Record<string, number>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [showRulesOverlay, setShowRulesOverlay] = useState(false);
  const [rulesDataKey, setRulesDataKey] = useState('');
  const [selectedRuleLabel, setSelectedRuleLabel] = useState('');
  const [ruleType, setRuleType] = useState<'replace' | 'match' | 'mapping'>('replace');
  const [newRuleLabel, setNewRuleLabel] = useState('');
  const [replaceMatch, setReplaceMatch] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [matchRegex, setMatchRegex] = useState('');
  const [mappingKey, setMappingKey] = useState('');
  const [mappingValue, setMappingValue] = useState('');
  const [bindingSource, setBindingSource] = useState('');
  const [bindingDestination, setBindingDestination] = useState('');
  const [bindingRule, setBindingRule] = useState('');
  const [editingBindingIndex, setEditingBindingIndex] = useState<number | null>(null);
  const [expandedBindings, setExpandedBindings] = useState<Record<number, boolean>>({});
  const [showExistingRules, setShowExistingRules] = useState(false);
  const [showBindingsJson, setShowBindingsJson] = useState(false);
  const [bindingsJsonText, setBindingsJsonText] = useState('');
  const [showMappingJson, setShowMappingJson] = useState(false);
  const [mappingJsonText, setMappingJsonText] = useState('');
  const [mappingJsonLabel, setMappingJsonLabel] = useState('');
  const [expandedMappings, setExpandedMappings] = useState<Record<string, boolean>>({});
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [showAllRulesJson, setShowAllRulesJson] = useState(false);
  const [allRulesJsonText, setAllRulesJsonText] = useState('');
  const [showTestValidate, setShowTestValidate] = useState(true);
  const [testItemIndex, setTestItemIndex] = useState(0);
  const [testAllPassed, setTestAllPassed] = useState<boolean | null>(null);
  
  // Subscribe to rules store for reactive updates
  const rulesStore = useRulesStore();
  
  const [pages, setPages] = useState<Record<string, string>>({
    weapons: 'Weapons',
    weaponTalents: 'Weapon Talents',
    exoticWeapons: 'Weapons: Named + Exotic',
    gearsets: 'Gearsets',
    brandsets: 'Brandsets',
    gearTalents: 'Gear Talents',
    namedGear: 'Gear: Named + Exotics',
    skills: 'Skill List',
    weaponMods: 'Weapon Mods'
  });

  const csvFiles = [
    { key: 'weaponAttributes', label: 'Weapon Attributes', filename: 'weapon_attributes.csv' },
    { key: 'weaponTypeAttributes', label: 'Weapon Type Attributes', filename: 'weapon_type_attributes.csv' },
    { key: 'gearAttributes', label: 'Gear Attributes', filename: 'gear_attributes.csv' },
    { key: 'gearMods', label: 'Gear Mods', filename: 'gear_mods.csv' },
    { key: 'keenersWatch', label: "Keener's Watch Stats", filename: 'keeners_watch_max_stats.csv' },
    { key: 'statusImmunities', label: 'Status Immunities', filename: 'status_immunities.csv' },
    { key: 'specializations', label: 'Specializations', filename: 'specializations.json' }
  ];

  useEffect(() => {
    const savedKey = localStorage.getItem('googleApiKey');
    if (savedKey) setApiKey(savedKey);
    
    const savedSpreadsheet = localStorage.getItem('division2GearSpreadsheet');
    if (savedSpreadsheet) setSpreadsheetUrl(savedSpreadsheet);

    // Check which data types have data in the store
    const checkDataExists = () => {
      const exists: Record<string, boolean> = {};
      const counts: Record<string, number> = {};
      const cleanExists: Record<string, boolean> = {};
      const cleanCounts: Record<string, number> = {};
      
      const rawStore = useRawDataStore.getState();
      const cleanStore = useCleanDataStore.getState();
      
      Object.keys(pages).forEach(dataType => {
        const data = rawStore.getRawData(dataType as any);
        exists[dataType] = data && data.length > 0;
        counts[dataType] = data ? data.length : 0;
        
        const cleanData = cleanStore.getCleanData(dataType as any);
        cleanExists[dataType] = cleanData && (Array.isArray(cleanData) ? cleanData.length > 0 : true);
        cleanCounts[dataType] = cleanData && Array.isArray(cleanData) ? cleanData.length : 0;
      });
      
      csvFiles.forEach(({ key }) => {
        const data = rawStore.getRawData(key as any);
        exists[key] = data && data.length > 0;
        counts[key] = data ? data.length : 0;
        
        const cleanData = cleanStore.getCleanData(key as any);
        cleanExists[key] = cleanData && (Array.isArray(cleanData) ? cleanData.length > 0 : true);
        cleanCounts[key] = cleanData && Array.isArray(cleanData) ? cleanData.length : 0;
      });
      
      setDataExists(exists);
      setDataCounts(counts);
      setCleanDataExists(cleanExists);
      setCleanDataCounts(cleanCounts);
    };

    if (isOpen) {
      checkDataExists();
    }
  }, [isOpen]);

  const handleSaveConfig = () => {
    localStorage.setItem('googleApiKey', apiKey);
    localStorage.setItem('division2GearSpreadsheet', spreadsheetUrl);
    setShowConfig(false);
  };

  const handlePageChange = (key: string, value: string) => {
    setPages(prev => ({ ...prev, [key]: value }));
  };

  const handleLoad = async (dataType: string) => {
    console.log(`[LoadModal] handleLoad called for: ${dataType}`);
    setLoadingStates(prev => {
      console.log(`[LoadModal] Setting loading state for ${dataType} to true`);
      return { ...prev, [dataType]: true };
    });
    try {
      console.log(`[LoadModal] About to call onLoadData for ${dataType} with page: ${pages[dataType]}`);
      await onLoadData(dataType, pages[dataType]);
      console.log(`[LoadModal] onLoadData completed for ${dataType}`);
    } catch (error) {
      console.error(`[LoadModal] Error in onLoadData for ${dataType}:`, error);
    } finally {
      setLoadingStates(prev => {
        console.log(`[LoadModal] Setting loading state for ${dataType} to false`);
        return { ...prev, [dataType]: false };
      });
      // Refresh data existence check after load
      const rawStore = useRawDataStore.getState();
      const data = rawStore.getRawData(dataType as any);
      setDataExists(prev => ({ ...prev, [dataType]: data && data.length > 0 }));
      setDataCounts(prev => ({ ...prev, [dataType]: data ? data.length : 0 }));
    }
  };

  const handleLoadCSV = async (csvKey: string, filename: string) => {
    console.log(`[LoadModal] handleLoadCSV called for: ${csvKey}`);
    setLoadingStates(prev => {
      console.log(`[LoadModal] Setting loading state for ${csvKey} to true`);
      return { ...prev, [csvKey]: true };
    });
    try {
      await onLoadData(csvKey, filename, true);
    } finally {
      setLoadingStates(prev => {
        console.log(`[LoadModal] Setting loading state for ${csvKey} to false`);
        return { ...prev, [csvKey]: false };
      });
      // Refresh data existence check after load
      const rawStore = useRawDataStore.getState();
      const data = rawStore.getRawData(csvKey as any);
      setDataExists(prev => ({ ...prev, [csvKey]: data && data.length > 0 }));
      setDataCounts(prev => ({ ...prev, [csvKey]: data ? data.length : 0 }));
    }
  };

  const handleSave = async (dataType: string) => {
    if (loadingStates[dataType]) return;
    
    const rawStore = useRawDataStore.getState();
    const data = rawStore.getRawData(dataType as any);
    
    if (!data || data.length === 0) {
      alert(`No data available for ${dataType}`);
      return;
    }

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataType}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleView = (dataType: string) => {
    if (loadingStates[dataType]) return;
    
    const rawStore = useRawDataStore.getState();
    const data = rawStore.getRawData(dataType as any);
    
    if (!data || data.length === 0) {
      alert(`No data available for ${dataType}`);
      return;
    }

    setViewerData(data);
    setViewerType(dataType);
    setViewerMode('raw');
    setEditedJson(JSON.stringify(data, null, 2));
  };

  const handleViewClean = (dataType: string) => {
    if (loadingStates[dataType]) return;
    
    const cleanStore = useCleanDataStore.getState();
    const data = cleanStore.getCleanData(dataType as any);
    
    // Allow viewing even if empty
    const displayData = data || [];

    setViewerData(displayData);
    setViewerType(dataType);
    setViewerMode('clean');
    setEditedJson(JSON.stringify(displayData, null, 2));
  };

  const handleCloseViewer = () => {
    setViewerData(null);
    setViewerType('');
    setViewerMode('raw');
    setEditedJson('');
  };

  const getLabel = (baseLabel: string, key: string) => {
    const count = dataCounts[key];
    return count > 0 ? `${baseLabel} (${count})` : baseLabel;
  };

  const handleUpdateJson = () => {
    try {
      const parsed = JSON.parse(editedJson);
      
      if (viewerMode === 'raw') {
        // Raw mode - expect array
        const dataArray = Array.isArray(parsed) ? parsed : Object.values(parsed);
        useRawDataStore.getState().setRawData(viewerType as any, dataArray);
        alert(`${viewerType} updated successfully in raw store!`);
      } else {
        // Clean mode - update clean data
        useCleanDataStore.getState().setCleanData(viewerType as any, parsed);
        alert(`${viewerType} updated successfully in clean store!`);
      }
      
      handleCloseViewer();
    } catch (error: any) {
      alert(`Invalid JSON: ${error.message}`);
    }
  };

  const handleImport = () => {
    if (!viewerType) return;
    
    const rawStore = useRawDataStore.getState();
    const cleanStore = useCleanDataStore.getState();
    const rulesStore = useRulesStore.getState();
    
    // Get raw data
    const rawData = rawStore.getRawData(viewerType as any);
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      alert('No raw data available to import');
      return;
    }
    
    // Get bindings for this data type
    const bindings = rulesStore.getBindings(viewerType as any);
    if (bindings.length === 0) {
      alert('No bindings configured. Please configure bindings in the Rules section first.');
      return;
    }
    
    // Apply bindings to transform raw data
    const processedData = rawData.map((item: any) => {
      const result: any = {};
      
      bindings.forEach(({ destination, source, rules }) => {
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
            try {
              const regex = new RegExp(match, 'gi');
              value = String(value).replace(regex, replace || '');
            } catch (error) {
              console.warn(`Invalid regex pattern in rule "${ruleLabel}": ${match}`, error);
            }
          }
          
          // Check if it's a match rule (validation)
          if (rulesStore.matchRules[ruleLabel]) {
            const pattern = rulesStore.matchRules[ruleLabel];
            try {
              const regex = new RegExp(pattern, 'i');
              if (!regex.test(String(value))) {
                console.warn(`Value "${value}" for ${destination} does not match rule "${ruleLabel}"`);
              }
            } catch (error) {
              console.warn(`Invalid regex pattern in rule "${ruleLabel}": ${pattern}`, error);
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
        
        // Type conversion based on actual destination field type
        const fieldType = getFieldType(viewerType, destination);
        
        // Check if destination expects an array
        if (fieldType === 'array') {
          if (typeof value === 'string') {
            value = value.split(',').map((s: string) => s.trim()).filter((s: string) => s);
          }
        }
        
        // Check if destination expects a number
        if (fieldType === 'number') {
          if (typeof value === 'string') {
            if (value.trim() === '') {
              value = 0;
            } else {
              const parsed = parseFloat(value);
              value = isNaN(parsed) ? value : parsed; // Keep original if can't parse
            }
          }
        }
        
        // object type stays as-is (already processed by rules)
        
        result[destination] = value;
      });
      
      return result;
    });
    
    // Instantiate model classes based on data type using CLASS_CONSTRUCTORS
    let modelInstances: any[];
    const Constructor = CLASS_CONSTRUCTORS[viewerType as keyof typeof CLASS_CONSTRUCTORS];
    
    if (Constructor) {
      modelInstances = processedData.map((data: any) => new Constructor(data));
    } else {
      // For data types without model classes, use plain objects
      modelInstances = processedData;
    }
    
    // Get existing clean data
    const existingCleanData = cleanStore.getCleanData(viewerType as any);
    
    // Compare with existing data
    if (existingCleanData && Array.isArray(existingCleanData) && existingCleanData.length > 0) {
      const existingJson = JSON.stringify(existingCleanData, null, 2);
      const newJson = JSON.stringify(modelInstances, null, 2);
      
      if (existingJson !== newJson) {
        const confirmed = confirm(
          `The processed data is different from the existing clean data.\n\n` +
          `Existing items: ${existingCleanData.length}\n` +
          `New items: ${modelInstances.length}\n\n` +
          `Do you want to replace the existing clean data with the newly processed data?`
        );
        
        if (!confirmed) {
          return;
        }
      }
    }
    
    // Update clean data store
    cleanStore.setCleanData(viewerType as any, modelInstances);
    
    // Update viewer to show new clean data
    setViewerData(modelInstances);
    setEditedJson(JSON.stringify(modelInstances, null, 2));
    
    // Update counts
    const cleanExists: Record<string, boolean> = {};
    const cleanCounts: Record<string, number> = {};
    cleanExists[viewerType] = modelInstances && modelInstances.length > 0;
    cleanCounts[viewerType] = modelInstances ? modelInstances.length : 0;
    setCleanDataExists(prev => ({ ...prev, ...cleanExists }));
    setCleanDataCounts(prev => ({ ...prev, ...cleanCounts }));
  };

  const handleRules = () => {
    setRulesDataKey(viewerType);
    setShowRulesOverlay(true);
  };

  const getAvailableFields = (): string[] => {
    const rawStore = useRawDataStore.getState();
    const data = rawStore.getRawData(rulesDataKey as any);
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Get all unique keys from the first few items
    const fields = new Set<string>();
    const sampleSize = Math.min(5, data.length);
    
    for (let i = 0; i < sampleSize; i++) {
      if (data[i] && typeof data[i] === 'object') {
        Object.keys(data[i]).forEach(key => fields.add(key));
      }
    }

    return Array.from(fields).sort();
  };

  const getDestinationFields = (): string[] => {
    // Derive fields directly from the model class
    return getModelFields(rulesDataKey as any);
  };

  const getFieldType = (dataKey: string, fieldName: string): 'string' | 'number' | 'array' | 'object' | 'unknown' => {
    // Map data types and their fields to TypeScript types
    const typeMap: Record<string, Record<string, 'string' | 'number' | 'array' | 'object'>> = {
      weapons: {
        type: 'string',
        variant: 'string',
        name: 'string',
        flag: 'string',
        rpm: 'number',
        baseMagSize: 'number',
        moddedMagSize: 'number',
        reload: 'number',
        damage: 'number',
        optimalRange: 'number',
        modSlots: 'array',
        hsd: 'number'
      },
      exoticWeapons: {
        type: 'string',
        variant: 'string',
        name: 'string',
        talentName: 'string',
        talentDesc: 'string',
        modSlots: 'object'
      },
      weaponMods: {
        type: 'string',
        slot: 'string',
        name: 'string',
        bonus: 'object',
        penalty: 'object'
      }
    };

    return typeMap[dataKey]?.[fieldName] || 'unknown';
  };

  const handleCloseRules = () => {
    setShowRulesOverlay(false);
    setRulesDataKey('');
    setSelectedRuleLabel('');
    setNewRuleLabel('');
    setReplaceMatch('');
    setReplaceValue('');
    setMatchRegex('');
    setMappingKey('');
    setMappingValue('');
    setBindingSource('');
    setBindingDestination('');
    setBindingRule('');
  };

  const handleCreateRule = () => {
    if (!newRuleLabel.trim()) {
      alert('Please enter a rule label');
      return;
    }

    const rulesStore = useRulesStore.getState();
    
    if (ruleType === 'replace') {
      if (!replaceMatch) {
        alert('Please enter a match pattern');
        return;
      }
      // replaceValue can be empty string (to remove matched text)
      rulesStore.setReplaceRule(newRuleLabel, replaceMatch, replaceValue);
      setNewRuleLabel('');
      setReplaceMatch('');
      setReplaceValue('');
    } else if (ruleType === 'match') {
      if (!matchRegex) {
        alert('Please enter a regex pattern');
        return;
      }
      rulesStore.setMatchRule(newRuleLabel, matchRegex);
      setNewRuleLabel('');
      setMatchRegex('');
    } else if (ruleType === 'mapping') {
      // For mapping, just create an empty mapping with the label
      // User will add key-value pairs separately
      if (!rulesStore.mappings[newRuleLabel]) {
        rulesStore.setMapping(newRuleLabel, {});
        alert(`Mapping rule "${newRuleLabel}" created! Now add key-value pairs to it.`);
        setNewRuleLabel('');
      } else {
        alert(`Mapping rule "${newRuleLabel}" already exists. Add key-value pairs to it below.`);
      }
    }
  };

  const handleAddMappingEntry = (ruleLabel: string) => {
    if (!mappingKey || !mappingValue) {
      alert('Please enter both key and value');
      return;
    }

    const rulesStore = useRulesStore.getState();
    const existingMapping = rulesStore.mappings[ruleLabel] || {};
    rulesStore.setMapping(ruleLabel, { ...existingMapping, [mappingKey]: mappingValue });
    
    setMappingKey('');
    setMappingValue('');
  };

  const handleAddBinding = () => {
    if (!bindingDestination || !bindingSource) {
      alert('Please fill in destination and source fields');
      return;
    }

    const rulesStore = useRulesStore.getState();
    
    if (editingBindingIndex !== null) {
      // Update existing binding
      const currentBindings = rulesStore.getBindings(rulesDataKey as any);
      const existingBinding = currentBindings[editingBindingIndex];
      
      if (!existingBinding) {
        alert('Error: Binding not found');
        setEditingBindingIndex(null);
        return;
      }
      
      rulesStore.updateBinding(rulesDataKey as any, editingBindingIndex, {
        destination: bindingDestination,
        source: bindingSource,
        rules: existingBinding.rules, // Keep existing rules
      });
      setEditingBindingIndex(null);
    } else {
      // Add new binding
      rulesStore.addBinding(rulesDataKey as any, {
        destination: bindingDestination,
        source: bindingSource,
        rules: [],
      });
    }

    setBindingSource('');
    setBindingDestination('');
    setBindingRule('');
  };

  const handleEditBinding = (index: number) => {
    const rulesStore = useRulesStore.getState();
    const bindings = rulesStore.getBindings(rulesDataKey as any);
    const binding = bindings[index];
    
    setBindingDestination(binding.destination);
    setBindingSource(binding.source);
    setEditingBindingIndex(index);
  };

  const handleCancelEditBinding = () => {
    setEditingBindingIndex(null);
    setBindingSource('');
    setBindingDestination('');
    setBindingRule('');
  };

  const handleAddRuleToBinding = (bindingIndex: number) => {
    if (!bindingRule) {
      alert('Please select a rule');
      return;
    }

    const rulesStore = useRulesStore.getState();
    const bindings = rulesStore.getBindings(rulesDataKey as any);
    const binding = bindings[bindingIndex];
    
    rulesStore.updateBinding(rulesDataKey as any, bindingIndex, {
      ...binding,
      rules: [...binding.rules, bindingRule],
    });
    
    setBindingRule('');
  };

  const handleRemoveRuleFromBinding = (bindingIndex: number, ruleIndex: number) => {
    const rulesStore = useRulesStore.getState();
    const bindings = rulesStore.getBindings(rulesDataKey as any);
    const binding = bindings[bindingIndex];
    
    const newRules = binding.rules.filter((_, i) => i !== ruleIndex);
    rulesStore.updateBinding(rulesDataKey as any, bindingIndex, {
      ...binding,
      rules: newRules,
    });
  };

  const handleMoveRuleInBinding = (bindingIndex: number, ruleIndex: number, direction: 'up' | 'down') => {
    const rulesStore = useRulesStore.getState();
    const bindings = rulesStore.getBindings(rulesDataKey as any);
    const binding = bindings[bindingIndex];
    
    const newIndex = direction === 'up' ? ruleIndex - 1 : ruleIndex + 1;
    if (newIndex < 0 || newIndex >= binding.rules.length) return;
    
    rulesStore.reorderBindingRules(rulesDataKey as any, bindingIndex, ruleIndex, newIndex);
  };

  const toggleBindingExpanded = (index: number) => {
    setExpandedBindings(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleRemoveBinding = (index: number) => {
    const rulesStore = useRulesStore.getState();
    rulesStore.removeBinding(rulesDataKey as any, index);
  };

  const handleDeleteRule = (label: string) => {
    if (confirm(`Delete rule "${label}"?`)) {
      const rulesStore = useRulesStore.getState();
      rulesStore.deleteRule(label);
    }
  };

  const handleDeleteMappingEntry = (ruleLabel: string, key: string) => {
    const rulesStore = useRulesStore.getState();
    const mapping = { ...rulesStore.mappings[ruleLabel] };
    delete mapping[key];
    if (Object.keys(mapping).length > 0) {
      rulesStore.setMapping(ruleLabel, mapping);
    } else {
      rulesStore.deleteRule(ruleLabel);
    }
  };

  const handleOpenBindingsJson = () => {
    try {
      console.log('Opening bindings JSON for:', rulesDataKey);
      const rulesStore = useRulesStore.getState();
      const bindings = rulesStore.getBindings(rulesDataKey as any);
      console.log('Bindings:', bindings);
      setBindingsJsonText(JSON.stringify(bindings, null, 2));
      setShowBindingsJson(true);
    } catch (error) {
      console.error('Error opening bindings JSON:', error);
      alert('Error opening bindings JSON: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleSaveBindingsJson = () => {
    try {
      const parsedBindings = JSON.parse(bindingsJsonText);
      
      // Validate that it's an array
      if (!Array.isArray(parsedBindings)) {
        alert('Invalid JSON: Must be an array of bindings');
        return;
      }
      
      // Validate each binding has required fields
      for (const binding of parsedBindings) {
        if (!binding.source || !binding.destination || !binding.rules) {
          alert('Invalid binding: Each binding must have source, destination, and rules fields');
          return;
        }
        // Ensure rules is an array
        if (!Array.isArray(binding.rules)) {
          alert('Invalid binding: rules must be an array');
          return;
        }
      }
      
      // Update the store
      const rulesStore = useRulesStore.getState();
      // Clear existing bindings and add new ones
      const currentBindings = rulesStore.getBindings(rulesDataKey as any);
      for (let i = currentBindings.length - 1; i >= 0; i--) {
        rulesStore.removeBinding(rulesDataKey as any, i);
      }
      
      // Add new bindings
      parsedBindings.forEach((binding: any) => {
        rulesStore.addBinding(rulesDataKey as any, binding);
      });
      
      setShowBindingsJson(false);
    } catch (error) {
      alert('Invalid JSON: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleOpenMappingJson = (label: string) => {
    try {
      const mapping = rulesStore.mappings[label] || {};
      setMappingJsonLabel(label);
      setMappingJsonText(JSON.stringify(mapping, null, 2));
      setShowMappingJson(true);
    } catch (error) {
      console.error('Error opening mapping JSON:', error);
      alert('Error opening mapping JSON: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleSaveMappingJson = () => {
    try {
      const parsedMapping = JSON.parse(mappingJsonText);
      
      // Validate that it's an object
      if (typeof parsedMapping !== 'object' || Array.isArray(parsedMapping)) {
        alert('Invalid JSON: Must be an object with key-value pairs');
        return;
      }
      
      // Update the store
      rulesStore.setMapping(mappingJsonLabel, parsedMapping);
      
      setShowMappingJson(false);
    } catch (error) {
      alert('Invalid JSON: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const toggleMappingExpanded = (label: string) => {
    setExpandedMappings(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const handleOpenAllRulesJson = () => {
    try {
      const allRules = {
        replaceRules: rulesStore.replaceRules,
        matchRules: rulesStore.matchRules,
        mappings: rulesStore.mappings
      };
      setAllRulesJsonText(JSON.stringify(allRules, null, 2));
      setShowAllRulesJson(true);
    } catch (error) {
      console.error('Error opening all rules JSON:', error);
      alert('Error opening all rules JSON: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleSaveAllRulesJson = () => {
    try {
      const parsed = JSON.parse(allRulesJsonText);
      
      // Validate structure
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        alert('Invalid JSON: Must be an object with replaceRules, matchRules, and mappings');
        return;
      }
      
      // Update the store
      if (parsed.replaceRules) {
        Object.entries(parsed.replaceRules).forEach(([label, value]: [string, any]) => {
          if (Array.isArray(value) && value.length === 2) {
            rulesStore.setReplaceRule(label, value[0], value[1]);
          }
        });
      }
      
      if (parsed.matchRules) {
        Object.entries(parsed.matchRules).forEach(([label, regex]: [string, any]) => {
          if (typeof regex === 'string') {
            rulesStore.setMatchRule(label, regex);
          }
        });
      }
      
      if (parsed.mappings) {
        Object.entries(parsed.mappings).forEach(([label, mapping]: [string, any]) => {
          if (typeof mapping === 'object' && !Array.isArray(mapping)) {
            rulesStore.setMapping(label, mapping);
          }
        });
      }
      
      setShowAllRulesJson(false);
    } catch (error) {
      alert('Invalid JSON: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Load / Process data</h2>
          <div className="header-controls">
            <button className="config-icon" onClick={() => setShowConfig(!showConfig)}>⚙️</button>
          </div>
        </div>

        {showConfig && (
          <div className="config-section">
            <div className="config-field">
              <label>Sheet URL</label>
              <input
                type="text"
                value={spreadsheetUrl}
                onChange={(e) => setSpreadsheetUrl(e.target.value)}
                placeholder="Google Sheets URL or ID"
              />
            </div>
            <div className="config-field">
              <label>Google API Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Google API Key"
              />
            </div>
            <button className="save-config-btn" onClick={handleSaveConfig}>Save Config</button>
          </div>
        )}

        <h3 className="section-heading">Extract</h3>
        
        <div className="extract-grid">
          <div className="grid-header">Label</div>
          <div className="grid-header">Page</div>
          <div className="grid-header">Actions</div>

          <div className="grid-label">{getLabel('Weapons', 'weapons')}</div>
          <input 
            className="grid-input" 
            value={pages.weapons} 
            onChange={(e) => handlePageChange('weapons', e.target.value)}
          />
          <div className="action-buttons">
            <button 
              className="icon-button" 
              onClick={() => handleLoad('weapons')} 
              title="Load"
              disabled={loadingStates.weapons}
            >
              {loadingStates.weapons ? '⏳' : <MdDownload />}
            </button>
            <button 
              className={`icon-button ${dataExists.weapons ? 'has-data' : 'no-data'}`} 
              onClick={() => handleSave('weapons')} 
              title="Save"
              disabled={!dataExists.weapons || loadingStates.weapons}
            >
              <MdSave />
            </button>
            <button 
              className={`icon-button ${dataExists.weapons ? 'has-data' : 'no-data'}`} 
              onClick={() => handleView('weapons')} 
              title="View"
              disabled={!dataExists.weapons || loadingStates.weapons}
            >
              <MdEditDocument />
            </button>
            <button 
              className={`icon-button ${cleanDataExists.weapons ? 'has-data' : 'no-data'}`} 
              onClick={() => handleViewClean('weapons')} 
              title="View Clean Data"
              disabled={loadingStates.weapons}
            >
              <MdCleaningServices />
            </button>
          </div>

          <div className="grid-label">{getLabel('Weapon Talents', 'weaponTalents')}</div>
          <input 
            className="grid-input" 
            value={pages.weaponTalents} 
            onChange={(e) => handlePageChange('weaponTalents', e.target.value)}
          />
          <div className="action-buttons">
            <button 
              className="icon-button" 
              onClick={() => handleLoad('weaponTalents')} 
              title="Load"
              disabled={loadingStates.weaponTalents}
            >
              {loadingStates.weaponTalents ? '⏳' : <MdDownload />}
            </button>
            <button 
              className={`icon-button ${dataExists.weaponTalents ? 'has-data' : 'no-data'}`} 
              onClick={() => handleSave('weaponTalents')} 
              title="Save"
              disabled={!dataExists.weaponTalents || loadingStates.weaponTalents}
            >
              <MdSave />
            </button>
            <button 
              className={`icon-button ${dataExists.weaponTalents ? 'has-data' : 'no-data'}`} 
              onClick={() => handleView('weaponTalents')} 
              title="View"
              disabled={!dataExists.weaponTalents || loadingStates.weaponTalents}
            >
              <MdEditDocument />
            </button>
            <button 
              className={`icon-button ${cleanDataExists.weaponTalents ? 'has-data' : 'no-data'}`} 
              onClick={() => handleViewClean('weaponTalents')} 
              title="View Clean Data"
              disabled={loadingStates.weaponTalents}
            >
              <MdCleaningServices />
            </button>
          </div>

          <div className="grid-label">{getLabel('Exotic Weapons', 'exoticWeapons')}</div>
          <input 
            className="grid-input" 
            value={pages.exoticWeapons} 
            onChange={(e) => handlePageChange('exoticWeapons', e.target.value)}
          />
          <div className="action-buttons">
            <button 
              className="icon-button" 
              onClick={() => handleLoad('exoticWeapons')} 
              title="Load"
              disabled={loadingStates.exoticWeapons}
            >
              {loadingStates.exoticWeapons ? '⏳' : <MdDownload />}
            </button>
            <button 
              className={`icon-button ${dataExists.exoticWeapons ? 'has-data' : 'no-data'}`} 
              onClick={() => handleSave('exoticWeapons')} 
              title="Save"
              disabled={!dataExists.exoticWeapons || loadingStates.exoticWeapons}
            >
              <MdSave />
            </button>
            <button 
              className={`icon-button ${dataExists.exoticWeapons ? 'has-data' : 'no-data'}`} 
              onClick={() => handleView('exoticWeapons')} 
              title="View"
              disabled={!dataExists.exoticWeapons || loadingStates.exoticWeapons}
            >
              <MdEditDocument />
            </button>
            <button 
              className={`icon-button ${cleanDataExists.exoticWeapons ? 'has-data' : 'no-data'}`} 
              onClick={() => handleViewClean('exoticWeapons')} 
              title="View Clean Data"
              disabled={loadingStates.exoticWeapons}
            >
              <MdCleaningServices />
            </button>
          </div>

          <div className="grid-label">{getLabel('Gearsets', 'gearsets')}</div>
          <input 
            className="grid-input" 
            value={pages.gearsets} 
            onChange={(e) => handlePageChange('gearsets', e.target.value)}
          />
          <div className="action-buttons">
            <button 
              className="icon-button" 
              onClick={() => handleLoad('gearsets')} 
              title="Load"
              disabled={loadingStates.gearsets}
            >
              {loadingStates.gearsets ? '⏳' : <MdDownload />}
            </button>
            <button 
              className={`icon-button ${dataExists.gearsets ? 'has-data' : 'no-data'}`} 
              onClick={() => handleSave('gearsets')} 
              title="Save"
              disabled={!dataExists.gearsets || loadingStates.gearsets}
            >
              <MdSave />
            </button>
            <button 
              className={`icon-button ${dataExists.gearsets ? 'has-data' : 'no-data'}`} 
              onClick={() => handleView('gearsets')} 
              title="View"
              disabled={!dataExists.gearsets || loadingStates.gearsets}
            >
              <MdEditDocument />
            </button>
            <button 
              className={`icon-button ${cleanDataExists.gearsets ? 'has-data' : 'no-data'}`} 
              onClick={() => handleViewClean('gearsets')} 
              title="View Clean Data"
              disabled={loadingStates.gearsets}
            >
              <MdCleaningServices />
            </button>
          </div>

          <div className="grid-label">{getLabel('Brandsets', 'brandsets')}</div>
          <input 
            className="grid-input" 
            value={pages.brandsets} 
            onChange={(e) => handlePageChange('brandsets', e.target.value)}
          />
          <div className="action-buttons">
            <button 
              className="icon-button" 
              onClick={() => handleLoad('brandsets')} 
              title="Load"
              disabled={loadingStates.brandsets}
            >
              {loadingStates.brandsets ? '⏳' : <MdDownload />}
            </button>
            <button 
              className={`icon-button ${dataExists.brandsets ? 'has-data' : 'no-data'}`} 
              onClick={() => handleSave('brandsets')} 
              title="Save"
              disabled={!dataExists.brandsets || loadingStates.brandsets}
            >
              <MdSave />
            </button>
            <button 
              className={`icon-button ${dataExists.brandsets ? 'has-data' : 'no-data'}`} 
              onClick={() => handleView('brandsets')} 
              title="View"
              disabled={!dataExists.brandsets || loadingStates.brandsets}
            >
              <MdEditDocument />
            </button>
            <button 
              className={`icon-button ${cleanDataExists.brandsets ? 'has-data' : 'no-data'}`} 
              onClick={() => handleViewClean('brandsets')} 
              title="View Clean Data"
              disabled={loadingStates.brandsets}
            >
              <MdCleaningServices />
            </button>
          </div>

          <div className="grid-label">{getLabel('Gear Talents', 'gearTalents')}</div>
          <input 
            className="grid-input" 
            value={pages.gearTalents} 
            onChange={(e) => handlePageChange('gearTalents', e.target.value)}
          />
          <div className="action-buttons">
            <button 
              className="icon-button" 
              onClick={() => handleLoad('gearTalents')} 
              title="Load"
              disabled={loadingStates.gearTalents}
            >
              {loadingStates.gearTalents ? '⏳' : <MdDownload />}
            </button>
            <button 
              className={`icon-button ${dataExists.gearTalents ? 'has-data' : 'no-data'}`} 
              onClick={() => handleSave('gearTalents')} 
              title="Save"
              disabled={!dataExists.gearTalents || loadingStates.gearTalents}
            >
              <MdSave />
            </button>
            <button 
              className={`icon-button ${dataExists.gearTalents ? 'has-data' : 'no-data'}`} 
              onClick={() => handleView('gearTalents')} 
              title="View"
              disabled={!dataExists.gearTalents || loadingStates.gearTalents}
            >
              <MdEditDocument />
            </button>
            <button 
              className={`icon-button ${cleanDataExists.gearTalents ? 'has-data' : 'no-data'}`} 
              onClick={() => handleViewClean('gearTalents')} 
              title="View Clean Data"
              disabled={loadingStates.gearTalents}
            >
              <MdCleaningServices />
            </button>
          </div>

          <div className="grid-label">{getLabel('Named/Exotic Gear', 'namedGear')}</div>
          <input 
            className="grid-input" 
            value={pages.namedGear} 
            onChange={(e) => handlePageChange('namedGear', e.target.value)}
          />
          <div className="action-buttons">
            <button 
              className="icon-button" 
              onClick={() => handleLoad('namedGear')} 
              title="Load"
              disabled={loadingStates.namedGear}
            >
              {loadingStates.namedGear ? '⏳' : <MdDownload />}
            </button>
            <button 
              className={`icon-button ${dataExists.namedGear ? 'has-data' : 'no-data'}`} 
              onClick={() => handleSave('namedGear')} 
              title="Save"
              disabled={!dataExists.namedGear || loadingStates.namedGear}
            >
              <MdSave />
            </button>
            <button 
              className={`icon-button ${dataExists.namedGear ? 'has-data' : 'no-data'}`} 
              onClick={() => handleView('namedGear')} 
              title="View"
              disabled={!dataExists.namedGear || loadingStates.namedGear}
            >
              <MdEditDocument />
            </button>
            <button 
              className={`icon-button ${cleanDataExists.namedGear ? 'has-data' : 'no-data'}`} 
              onClick={() => handleViewClean('namedGear')} 
              title="View Clean Data"
              disabled={loadingStates.namedGear}
            >
              <MdCleaningServices />
            </button>
          </div>

          <div className="grid-label">{getLabel('Skills', 'skills')}</div>
          <input 
            className="grid-input" 
            value={pages.skills} 
            onChange={(e) => handlePageChange('skills', e.target.value)}
          />
          <div className="action-buttons">
            <button 
              className="icon-button" 
              onClick={() => handleLoad('skills')} 
              title="Load"
              disabled={loadingStates.skills}
            >
              {loadingStates.skills ? '⏳' : <MdDownload />}
            </button>
            <button 
              className={`icon-button ${dataExists.skills ? 'has-data' : 'no-data'}`} 
              onClick={() => handleSave('skills')} 
              title="Save"
              disabled={!dataExists.skills || loadingStates.skills}
            >
              <MdSave />
            </button>
            <button 
              className={`icon-button ${dataExists.skills ? 'has-data' : 'no-data'}`} 
              onClick={() => handleView('skills')} 
              title="View"
              disabled={!dataExists.skills || loadingStates.skills}
            >
              <MdEditDocument />
            </button>
            <button 
              className={`icon-button ${cleanDataExists.skills ? 'has-data' : 'no-data'}`} 
              onClick={() => handleViewClean('skills')} 
              title="View Clean Data"
              disabled={loadingStates.skills}
            >
              <MdCleaningServices />
            </button>
          </div>

          <div className="grid-label">{getLabel('Weapon Mods', 'weaponMods')}</div>
          <input 
            className="grid-input" 
            value={pages.weaponMods} 
            onChange={(e) => handlePageChange('weaponMods', e.target.value)}
          />
          <div className="action-buttons">
            <button 
              className="icon-button" 
              onClick={() => handleLoad('weaponMods')} 
              title="Load"
              disabled={loadingStates.weaponMods}
            >
              {loadingStates.weaponMods ? '⏳' : <MdDownload />}
            </button>
            <button 
              className={`icon-button ${dataExists.weaponMods ? 'has-data' : 'no-data'}`} 
              onClick={() => handleSave('weaponMods')} 
              title="Save"
              disabled={!dataExists.weaponMods || loadingStates.weaponMods}
            >
              <MdSave />
            </button>
            <button 
              className={`icon-button ${dataExists.weaponMods ? 'has-data' : 'no-data'}`} 
              onClick={() => handleView('weaponMods')} 
              title="View"
              disabled={!dataExists.weaponMods || loadingStates.weaponMods}
            >
              <MdEditDocument />
            </button>
            <button 
              className={`icon-button ${cleanDataExists.weaponMods ? 'has-data' : 'no-data'}`} 
              onClick={() => handleViewClean('weaponMods')} 
              title="View Clean Data"
              disabled={loadingStates.weaponMods}
            >
              <MdCleaningServices />
            </button>
          </div>
        </div>

        <div className="csv-grid">
          {csvFiles.map(({ key, label, filename }) => (
            <div key={key} className="csv-item">
              <span className="csv-label">{getLabel(label, key)}</span>
              {/* No Load button for CSV files - they don't have a scraping page */}
              <div style={{ width: '32px' }}></div>
              <MdSave 
                className={`csv-icon ${dataExists[key] ? 'has-data' : 'no-data'}`} 
                onClick={() => !loadingStates[key] && dataExists[key] && handleSave(key)} 
                title="Save"
                style={{ opacity: (dataExists[key] && !loadingStates[key]) ? 1 : 0.3, cursor: (dataExists[key] && !loadingStates[key]) ? 'pointer' : 'not-allowed' }}
              />
              <MdEditDocument 
                className={`csv-icon ${dataExists[key] ? 'has-data' : 'no-data'}`} 
                onClick={() => !loadingStates[key] && dataExists[key] && handleView(key)} 
                title="View"
                style={{ opacity: (dataExists[key] && !loadingStates[key]) ? 1 : 0.3, cursor: (dataExists[key] && !loadingStates[key]) ? 'pointer' : 'not-allowed' }}
              />
              <MdCleaningServices 
                className={`csv-icon ${cleanDataExists[key] ? 'has-data' : 'no-data'}`} 
                onClick={() => !loadingStates[key] && handleViewClean(key)} 
                title="View Clean Data"
                style={{ opacity: !loadingStates[key] ? 1 : 0.3, cursor: !loadingStates[key] ? 'pointer' : 'not-allowed' }}
              />
            </div>
          ))}
        </div>

        {viewerData !== null && (
          <div className="json-viewer-overlay" onClick={handleCloseViewer}>
            <div className="json-viewer-content" onClick={(e) => e.stopPropagation()}>
              <div className="json-viewer-header">
                <h3>{viewerType} Data {viewerMode === 'clean' && '(Clean)'}</h3>
                <button className="close-viewer-btn" onClick={handleCloseViewer}>✕</button>
              </div>
              {viewerMode === 'clean' ? (
                <div className="clean-data-viewer">
                  {Array.isArray(viewerData) && viewerData.length === 0 ? (
                    <div className="empty-state">No clean data available. Use Import or Rules to populate.</div>
                  ) : (
                    <div className="object-list">
                      {Array.isArray(viewerData) ? (
                        viewerData.map((item, index) => (
                          <div key={index} className="object-item">
                            <div className="object-header">Item {index + 1}</div>
                            <div className="object-properties">
                              {Object.entries(item).map(([key, value]) => (
                                <div key={key} className="property-row">
                                  <span className="property-key">{key}:</span>
                                  <span className="property-value">
                                    {typeof value === 'object' && value !== null
                                      ? JSON.stringify(value, null, 2)
                                      : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="object-item">
                          <div className="object-properties">
                            {Object.entries(viewerData).map(([key, value]) => (
                              <div key={key} className="property-row">
                                <span className="property-key">{key}:</span>
                                <span className="property-value">
                                  {typeof value === 'object' && value !== null
                                    ? JSON.stringify(value, null, 2)
                                    : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  className="json-editor"
                  value={editedJson}
                  onChange={(e) => setEditedJson(e.target.value)}
                  spellCheck={false}
                />
              )}
              <div className="json-viewer-actions">
                {viewerMode === 'clean' && (
                  <>
                    <button className="import-btn" onClick={handleImport}>Import</button>
                    <button className="rules-btn" onClick={handleRules}>Rules</button>
                    <button className="cancel-btn" onClick={() => {
                      setViewerMode('raw');
                      setEditedJson(JSON.stringify(viewerData, null, 2));
                    }}>View JSON</button>
                  </>
                )}
                {viewerMode === 'raw' && (
                  <>
                    <button className="update-btn" onClick={handleUpdateJson}>Update</button>
                    <button className="cancel-btn" onClick={handleCloseViewer}>Cancel</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {showRulesOverlay && (
          <div className="rules-overlay" onClick={handleCloseRules}>
            <div className="rules-content" onClick={(e) => e.stopPropagation()}>
              <div className="rules-header">
                <h3>Rules Configuration - {rulesDataKey}</h3>
                <button className="close-viewer-btn" onClick={handleCloseRules}>✕</button>
              </div>
              
              <div className="rules-body">
                {/* Bindings Section - FIRST */}
                <div className="rules-section-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4>Mapping/Bindings for {rulesDataKey}</h4>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); handleOpenBindingsJson(); }}
                      style={{ fontSize: '0.9rem', color: '#3498db', textDecoration: 'none', cursor: 'pointer' }}
                    >
                      json
                    </a>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#7f8c8d', fontWeight: 'normal', marginTop: '0.25rem' }}>
                    Define destination fields and their source mappings. Add rules to transform data in order.
                  </div>
                </div>

                {(() => {
                  // Check if there are any available destinations
                  const bindings = rulesStore.getBindings(rulesDataKey as any);
                  const usedDestinations = bindings
                    .map((b, idx) => idx === editingBindingIndex ? null : b.destination)
                    .filter(d => d !== null);
                  const availableDestinations = getDestinationFields().filter(field => !usedDestinations.includes(field));
                  
                  // Hide selection fields if all destinations are mapped and not editing
                  if (availableDestinations.length === 0 && editingBindingIndex === null) {
                    return null;
                  }
                  
                  // Show selection fields if there are available destinations OR we're editing
                  return (
                    <div className="rule-row">
                      <select
                        className="rule-input"
                        value={bindingSource}
                        onChange={(e) => setBindingSource(e.target.value)}
                      >
                        <option value="">Select source field...</option>
                        {getAvailableFields().map(field => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                      <span className="arrow">→</span>
                      <select
                        className="rule-input"
                        value={bindingDestination}
                        onChange={(e) => setBindingDestination(e.target.value)}
                      >
                        <option value="">Select destination field...</option>
                        {getDestinationFields().filter(field => {
                          // Filter out destinations that are already used, except when editing
                          return !usedDestinations.includes(field);
                        }).map(field => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                      {availableDestinations.length > 0 ? (
                        <>
                          <button className="add-link" onClick={handleAddBinding}>
                            {editingBindingIndex !== null ? 'Update' : 'Add'}
                          </button>
                          {editingBindingIndex !== null && (
                            <button className="add-link" onClick={handleCancelEditBinding}>Cancel</button>
                          )}
                        </>
                      ) : editingBindingIndex !== null ? (
                        <>
                          <button className="add-link" onClick={handleAddBinding}>Update</button>
                          <button className="add-link" onClick={handleCancelEditBinding}>Cancel</button>
                        </>
                      ) : null}
                    </div>
                  );
                })()}

                <div className="bindings-list">
                  {rulesStore.getBindings(rulesDataKey as any).map((binding, index) => (
                    <div key={index} className="binding-item" style={{ 
                      border: '1px solid #ddd', 
                      borderRadius: '4px', 
                      padding: '0.5rem', 
                      marginBottom: '0.5rem',
                      backgroundColor: editingBindingIndex === index ? '#f0f8ff' : 'transparent'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div 
                          style={{ display: 'flex', alignItems: 'center', flex: 1, cursor: 'pointer' }}
                          onClick={() => toggleBindingExpanded(index)}
                        >
                          <span style={{ marginRight: '0.5rem', fontSize: '0.8rem' }}>
                            {expandedBindings[index] ? '▼' : '▶'}
                          </span>
                          <span>{binding.source}</span>
                          <span className="arrow" style={{ margin: '0 0.5rem' }}>→</span>
                          <span style={{ fontWeight: 'bold' }}>{binding.destination}</span>
                          <span style={{ 
                            marginLeft: '0.5rem', 
                            fontSize: '0.85rem', 
                            color: '#7f8c8d',
                            fontStyle: 'italic'
                          }}>
                            ({binding.rules.length} rule{binding.rules.length !== 1 ? 's' : ''})
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button 
                            className="icon-btn" 
                            onClick={() => handleEditBinding(index)}
                            title="Edit binding"
                            style={{ fontSize: '0.8rem', padding: '0.2rem 0.4rem' }}
                          >
                            ✎
                          </button>
                          <span 
                            className="remove-link" 
                            onClick={() => handleRemoveBinding(index)}
                            title="Delete binding"
                          >
                            ✕
                          </span>
                        </div>
                      </div>
                      
                      {expandedBindings[index] && (
                        <div style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                            Rules (applied in order):
                          </div>
                          
                          {binding.rules.length === 0 ? (
                            <div style={{ fontSize: '0.85rem', color: '#7f8c8d', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                              No rules applied - direct mapping
                            </div>
                          ) : (
                            <div style={{ marginBottom: '0.5rem' }}>
                              {binding.rules.map((rule, ruleIndex) => (
                                <div 
                                  key={ruleIndex} 
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem',
                                    padding: '0.25rem',
                                    backgroundColor: '#f9f9f9',
                                    borderRadius: '3px',
                                    marginBottom: '0.25rem'
                                  }}
                                >
                                  <span style={{ fontSize: '0.85rem', color: '#7f8c8d', minWidth: '1.5rem' }}>
                                    {ruleIndex + 1}.
                                  </span>
                                  <span style={{ flex: 1, fontSize: '0.9rem' }}>{rule}</span>
                                  <button 
                                    className="icon-btn" 
                                    onClick={() => handleMoveRuleInBinding(index, ruleIndex, 'up')}
                                    disabled={ruleIndex === 0}
                                    title="Move rule up"
                                    style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem' }}
                                  >
                                    ↑
                                  </button>
                                  <button 
                                    className="icon-btn" 
                                    onClick={() => handleMoveRuleInBinding(index, ruleIndex, 'down')}
                                    disabled={ruleIndex === binding.rules.length - 1}
                                    title="Move rule down"
                                    style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem' }}
                                  >
                                    ↓
                                  </button>
                                  <span 
                                    className="remove-link" 
                                    onClick={() => handleRemoveRuleFromBinding(index, ruleIndex)}
                                    title="Remove rule"
                                    style={{ fontSize: '0.8rem' }}
                                  >
                                    ✕
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <select
                              className="rule-input"
                              value={bindingRule}
                              onChange={(e) => setBindingRule(e.target.value)}
                              style={{ flex: 1, fontSize: '0.85rem' }}
                            >
                              <option value="">Add a rule...</option>
                              {Object.keys(SYSTEM_RULES).map(label => (
                                <option key={label} value={label}>{label} (system)</option>
                              ))}
                              {Object.keys(rulesStore.replaceRules).map(label => (
                                <option key={label} value={label}>{label} (replace)</option>
                              ))}
                              {Object.keys(rulesStore.matchRules).map(label => (
                                <option key={label} value={label}>{label} (match)</option>
                              ))}
                              {Object.keys(rulesStore.mappings).map(label => (
                                <option key={label} value={label}>{label} (mapping)</option>
                              ))}
                            </select>
                            <button 
                              className="add-link" 
                              onClick={() => handleAddRuleToBinding(index)}
                              style={{ fontSize: '0.85rem' }}
                            >
                              Add Rule
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Test/Validate Section */}
                <div 
                  className="rules-section-header" 
                  style={{ marginTop: '1.5rem', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setShowTestValidate(!showTestValidate)}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '0.5rem' }}>{showTestValidate ? '▼' : '▶'}</span>
                    <h4>Test/Validate</h4>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#7f8c8d', fontWeight: 'normal', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
                    Test your mappings with sample data from the source
                  </div>
                </div>

                {showTestValidate && (() => {
                  const rawStore = useRawDataStore.getState();
                  const rawData = rawStore.getRawData(rulesDataKey as any);
                  const bindings = rulesStore.getBindings(rulesDataKey as any);
                  
                  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
                    return (
                      <div style={{ fontSize: '0.85rem', color: '#7f8c8d', fontStyle: 'italic', padding: '0.5rem' }}>
                        No source data available. Load data first to test mappings.
                      </div>
                    );
                  }

                  if (bindings.length === 0) {
                    return (
                      <div style={{ fontSize: '0.85rem', color: '#7f8c8d', fontStyle: 'italic', padding: '0.5rem' }}>
                        No bindings configured. Add bindings above to test.
                      </div>
                    );
                  }

                  // Ensure testItemIndex is within bounds
                  const currentIndex = Math.min(testItemIndex, rawData.length - 1);
                  const sampleItem = rawData[currentIndex];
                  
                  // Helper function to apply a rule to a value, handling objects
                  const applyRuleToValue = (value: any, ruleFunction: (str: string) => string): any => {
                    // If value is an object, convert to JSON, apply rule, then parse back
                    if (typeof value === 'object' && value !== null) {
                      try {
                        const jsonString = JSON.stringify(value);
                        const transformed = ruleFunction(jsonString);
                        return JSON.parse(transformed);
                      } catch (error) {
                        // If parsing fails, return the transformed string
                        console.warn('Failed to parse object after rule application, returning string:', error);
                        try {
                          const jsonString = JSON.stringify(value);
                          return ruleFunction(jsonString);
                        } catch (e) {
                          return value;
                        }
                      }
                    }
                    // For primitives, convert to string, apply rule
                    return ruleFunction(String(value || ''));
                  };
                  
                  // Function to apply rules and get mapped value
                  const applyRulesToValue = (sourceValue: any, binding: any) => {
                    let mappedValue: any = sourceValue;
                    
                    binding.rules.forEach((ruleLabel: string) => {
                      // Check if it's a system rule first
                      if (ruleLabel in SYSTEM_RULES) {
                        mappedValue = SYSTEM_RULES[ruleLabel as keyof typeof SYSTEM_RULES](mappedValue);
                        return;
                      }
                      
                      if (rulesStore.replaceRules[ruleLabel]) {
                        const [match, replace] = rulesStore.replaceRules[ruleLabel];
                        try {
                          const regex = new RegExp(match, 'gi');
                          mappedValue = applyRuleToValue(mappedValue, (str) => str.replace(regex, replace || ''));
                        } catch (error) {
                          console.warn(`Invalid regex pattern in rule "${ruleLabel}": ${match}`, error);
                        }
                      }
                      
                      if (rulesStore.matchRules[ruleLabel]) {
                        const pattern = rulesStore.matchRules[ruleLabel];
                        try {
                          const regex = new RegExp(pattern, 'i');
                          // For match rules, we need to test the string representation
                          const testValue = typeof mappedValue === 'object' ? JSON.stringify(mappedValue) : String(mappedValue || '');
                          if (!regex.test(testValue)) {
                            // Just validation, don't modify value
                          }
                        } catch (error) {
                          console.warn(`Invalid regex pattern in rule "${ruleLabel}": ${pattern}`, error);
                        }
                      }
                      
                      if (rulesStore.mappings[ruleLabel]) {
                        const mapping = rulesStore.mappings[ruleLabel];
                        // For mappings, use string representation as key
                        const key = typeof mappedValue === 'object' ? JSON.stringify(mappedValue) : String(mappedValue);
                        const mappedVal = mapping[key];
                        if (mappedVal !== undefined) {
                          mappedValue = mappedVal;
                        }
                      }
                    });
                    
                    return mappedValue;
                  };
                  
                  // Function to construct model instance from mapped data
                  const constructModelInstance = (dataKey: string, mappedData: any) => {
                    try {
                      const Constructor = CLASS_CONSTRUCTORS[dataKey as keyof typeof CLASS_CONSTRUCTORS];
                      if (!Constructor) {
                        return mappedData;
                      }
                      
                      // Construct the model instance first (this may clean/transform the data)
                      const instance = new Constructor(mappedData);
                      
                      // Now validate enum fields on the constructed instance
                      const enumErrors = validateEnumFields(dataKey, instance);
                      if (enumErrors.length > 0) {
                        throw new Error(`Enum validation failed: ${enumErrors.join(', ')}`);
                      }
                      
                      return instance;
                    } catch (error) {
                      throw new Error(`Model construction failed: ${error instanceof Error ? error.message : String(error)}`);
                    }
                  };
                  
                  // Function to validate enum fields
                  const validateEnumFields = (dataKey: string, data: any): string[] => {
                    const errors: string[] = [];
                    
                    // Define enum metadata: field name -> valid values
                    const enumMetadata: Record<string, Record<string, string[]>> = {
                      // Models with CoreType enum
                      gearsets: {
                        core: ['weapon damage', 'armor', 'skill tier']
                      },
                      brandsets: {
                        core: ['weapon damage', 'armor', 'skill tier']
                      },
                      namedGear: {
                        core: ['weapon damage', 'armor', 'skill tier']
                      },
                      // Models with GearModClassification enum
                      gearMods: {
                        classification: ['offensive', 'defensive', 'skill']
                      },
                      // Models with GearSource enum
                      buildGear: {
                        source: ['brandset', 'gearset', 'named', 'exotic']
                      },
                      // Models with GearType enum
                      buildGear_type: {
                        type: ['mask', 'chest', 'holster', 'gloves', 'backpack', 'kneepads']
                      }
                    };
                    
                    // Get enum fields for this data type
                    const enumFields = enumMetadata[dataKey];
                    if (!enumFields) {
                      return errors; // No enum validation needed for this type
                    }
                    
                    // Validate each enum field
                    for (const [fieldName, validValues] of Object.entries(enumFields)) {
                      const fieldValue = data[fieldName];
                      
                      // Skip if field is not present or is null/undefined
                      if (fieldValue === null || fieldValue === undefined) {
                        continue;
                      }
                      
                      // Check if it's a string value (enums are strings at runtime)
                      if (typeof fieldValue === 'string') {
                        if (!validValues.includes(fieldValue)) {
                          errors.push(`${fieldName}="${fieldValue}" is not a valid enum value (expected: ${validValues.join(', ')})`);
                        }
                      } else if (typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
                        // Handle complex core types like Record<CoreType, string[]> in Gearset
                        // This is valid, so skip validation
                        continue;
                      } else {
                        // Field exists but is not a string - type mismatch
                        errors.push(`${fieldName} has type "${typeof fieldValue}" but expected enum string (one of: ${validValues.join(', ')})`);
                      }
                    }
                    
                    return errors;
                  };
                  
                  return (
                    <div style={{ marginTop: '0.5rem' }}>
                      {/* Pagination Controls */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        marginBottom: '0.75rem',
                        padding: '0.5rem',
                        backgroundColor: '#f9f9f9',
                        borderRadius: '4px',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => {
                              setTestItemIndex(Math.max(0, currentIndex - 1));
                              setTestAllPassed(null); // Reset test status when manually navigating
                            }}
                            disabled={currentIndex === 0}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: currentIndex === 0 ? '#bdc3c7' : '#3498db',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            ◀
                          </button>
                          
                          <select
                            value={currentIndex}
                            onChange={(e) => {
                              setTestItemIndex(parseInt(e.target.value));
                              setTestAllPassed(null); // Reset test status when manually navigating
                            }}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: '#fff',
                              border: '1px solid #ddd',
                              borderRadius: '3px',
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                          >
                            {rawData.map((_: any, idx: number) => (
                              <option key={idx} value={idx}>
                                Item {idx + 1} of {rawData.length}
                              </option>
                            ))}
                          </select>
                          
                          <button
                            onClick={() => {
                              setTestItemIndex(Math.min(rawData.length - 1, currentIndex + 1));
                              setTestAllPassed(null); // Reset test status when manually navigating
                            }}
                            disabled={currentIndex === rawData.length - 1}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: currentIndex === rawData.length - 1 ? '#bdc3c7' : '#3498db',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: currentIndex === rawData.length - 1 ? 'not-allowed' : 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            ▶
                          </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              
                              // Test all items
                              for (let i = 0; i < rawData.length; i++) {
                                const item = rawData[i];
                                let hasError = false;
                                
                                // Build mapped object
                                const mappedData: any = {};
                                for (const binding of bindings) {
                                  const sourceValue = item[binding.source];
                                  const mappedValue = applyRulesToValue(sourceValue, binding);
                                  mappedData[binding.destination] = mappedValue;
                                }
                                
                                // Try to construct model instance
                                try {
                                  constructModelInstance(rulesDataKey, mappedData);
                                } catch (error) {
                                  hasError = true;
                                }
                                
                                // If error found, navigate to that item and stop
                                if (hasError) {
                                  setTestItemIndex(i);
                                  setTestAllPassed(false);
                                  return;
                                }
                              }
                              
                              // All tests passed
                              setTestAllPassed(true);
                            }}
                            style={{
                              color: '#3498db',
                              fontSize: '0.85rem',
                              textDecoration: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            Test All
                          </a>
                          
                          {testAllPassed === true && (
                            <span style={{ 
                              color: '#27ae60', 
                              fontSize: '0.85rem',
                              fontWeight: 'bold'
                            }}>
                              ✓ All Tests Passed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Data Grid */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr auto 1fr auto', 
                        gap: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: '#f9f9f9',
                        borderRadius: '4px',
                        fontSize: '0.85rem'
                      }}>
                        <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Source</div>
                        <div></div>
                        <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Mapped (Model Instance)</div>
                        <div></div>
                        
                        {(() => {
                          // Build mapped object from all bindings first
                          const mappedData: any = {};
                          bindings.forEach((binding) => {
                            const sourceValue = sampleItem[binding.source];
                            const mappedValue = applyRulesToValue(sourceValue, binding);
                            mappedData[binding.destination] = mappedValue;
                          });
                          
                          // Try to construct model instance
                          let modelInstance: any = null;
                          let modelError: string | null = null;
                          
                          try {
                            modelInstance = constructModelInstance(rulesDataKey, mappedData);
                          } catch (error) {
                            modelError = error instanceof Error ? error.message : String(error);
                          }
                          
                          // Now render each binding with the model instance value
                          return bindings.map((binding, idx) => {
                            const sourceValue = sampleItem[binding.source];
                            
                            // Get the value from the constructed model instance
                            let displayValue: any;
                            let hasError = false;
                            let errorMessage = '';
                            let isEnumError = false;
                            
                            if (modelError) {
                              hasError = true;
                              errorMessage = modelError;
                              displayValue = '(model construction failed)';
                              // Check if this specific field has an enum error
                              if (modelError.includes(`${binding.destination}=`)) {
                                isEnumError = true;
                              }
                            } else if (modelInstance) {
                              displayValue = modelInstance[binding.destination];
                              
                              // Additional per-field enum validation
                              const fieldEnumErrors = validateEnumFields(rulesDataKey, { [binding.destination]: displayValue });
                              if (fieldEnumErrors.length > 0) {
                                hasError = true;
                                isEnumError = true;
                                errorMessage = fieldEnumErrors[0];
                              }
                            } else {
                              displayValue = '(no model)';
                            }
                            
                            return (
                              <React.Fragment key={`binding-${idx}`}>
                                <div style={{ 
                                  padding: '0.25rem', 
                                  backgroundColor: '#fff',
                                  borderRadius: '3px',
                                  border: '1px solid #ddd'
                                }}>
                                  <div style={{ fontSize: '0.75rem', color: '#7f8c8d', marginBottom: '0.15rem' }}>
                                    {binding.source}
                                  </div>
                                  <div style={{ wordBreak: 'break-word' }}>
                                    {String(sourceValue || '')}
                                  </div>
                                </div>
                                
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  color: '#3498db'
                                }}>
                                  →
                                </div>
                                
                                <div style={{ 
                                  padding: '0.25rem', 
                                  backgroundColor: hasError ? (isEnumError ? '#fff3e0' : '#ffe6e6') : '#fff',
                                  borderRadius: '3px',
                                  border: hasError ? (isEnumError ? '2px solid #e67e22' : '1px solid #e74c3c') : '1px solid #ddd',
                                  position: 'relative'
                                }}>
                                  <div style={{ fontSize: '0.75rem', color: '#7f8c8d', marginBottom: '0.15rem' }}>
                                    {binding.destination}
                                    {hasError && (
                                      <span 
                                        title={errorMessage}
                                        style={{ 
                                          marginLeft: '0.5rem',
                                          color: isEnumError ? '#e67e22' : '#e74c3c',
                                          cursor: 'help',
                                          fontSize: '1rem'
                                        }}
                                      >
                                        {isEnumError ? '🔴' : '⚠️'}
                                      </span>
                                    )}
                                    {hasError && isEnumError && (
                                      <span style={{ 
                                        marginLeft: '0.25rem', 
                                        color: '#e67e22', 
                                        fontSize: '0.65rem',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase'
                                      }}>
                                        ENUM
                                      </span>
                                    )}
                                    {!hasError && (
                                      <span style={{ marginLeft: '0.25rem', color: '#95a5a6', fontSize: '0.7rem' }}>
                                        ({typeof displayValue === 'object' && displayValue !== null ? (Array.isArray(displayValue) ? 'array' : 'object') : typeof displayValue})
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                    {hasError 
                                      ? String(displayValue)
                                      : (typeof displayValue === 'object' && displayValue !== null)
                                      ? JSON.stringify(displayValue, null, 2)
                                      : (displayValue === 0 ? '0' : String(displayValue ?? ''))}
                                  </div>
                                  {hasError && (
                                    <div style={{ 
                                      fontSize: '0.7rem', 
                                      color: isEnumError ? '#e67e22' : '#e74c3c', 
                                      marginTop: '0.25rem',
                                      fontStyle: 'italic',
                                      fontWeight: isEnumError ? 'bold' : 'normal'
                                    }}>
                                      {errorMessage}
                                    </div>
                                  )}
                                </div>
                                
                                <div>
                                  {/* Empty cell for alignment */}
                                </div>
                              </React.Fragment>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  );
                })()}

                {/* Create New Rule Section - SECOND */}
                <div 
                  className="rules-section-header"
                  style={{ cursor: 'pointer', userSelect: 'none', marginTop: '1.5rem' }}
                  onClick={() => setShowCreateRule(!showCreateRule)}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '0.5rem' }}>{showCreateRule ? '▼' : '▶'}</span>
                    <h4>Create New Rule</h4>
                  </div>
                </div>

                {showCreateRule && (
                  <>
                    <div className="rule-row">
                      <input
                        type="text"
                        className="rule-input"
                        placeholder="Rule Label"
                        value={newRuleLabel}
                        onChange={(e) => setNewRuleLabel(e.target.value)}
                      />
                      <select 
                        className="rule-input"
                        value={ruleType}
                        onChange={(e) => setRuleType(e.target.value as any)}
                      >
                        <option value="replace">Replace Rule</option>
                        <option value="match">Match Rule</option>
                        <option value="mapping">Mapping</option>
                      </select>
                    </div>

                    {ruleType === 'replace' && (
                      <div className="rule-row">
                        <input
                          type="text"
                          className="rule-input"
                          placeholder="Match (regex)"
                          value={replaceMatch}
                          onChange={(e) => setReplaceMatch(e.target.value)}
                        />
                        <input
                          type="text"
                          className="rule-input"
                          placeholder="Replace with"
                          value={replaceValue}
                          onChange={(e) => setReplaceValue(e.target.value)}
                        />
                      </div>
                    )}

                    {ruleType === 'match' && (
                      <div className="rule-row">
                        <input
                          type="text"
                          className="rule-input full-width"
                          placeholder="Regex pattern"
                          value={matchRegex}
                          onChange={(e) => setMatchRegex(e.target.value)}
                        />
                      </div>
                    )}

                    {ruleType === 'mapping' && (
                      <div style={{ fontSize: '0.85rem', color: '#7f8c8d', marginBottom: '0.5rem' }}>
                        Create a mapping rule first, then add key-value pairs to it below.
                      </div>
                    )}

                    <button className="save-rules-btn" onClick={handleCreateRule}>
                      {ruleType === 'mapping' ? 'Create Mapping Rule' : 'Create Rule'}
                    </button>
                  </>
                )}

                {/* Existing Rules Section - THIRD */}
                <div 
                  className="rules-section-header"
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setShowExistingRules(!showExistingRules)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: '0.5rem' }}>{showExistingRules ? '▼' : '▶'}</span>
                      <h4>Existing Rules</h4>
                    </div>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenAllRulesJson(); }}
                      style={{ fontSize: '0.9rem', color: '#3498db', textDecoration: 'none', cursor: 'pointer' }}
                    >
                      json
                    </a>
                  </div>
                </div>

                {showExistingRules && (
                  <>
                    <div className="rules-group-header">
                      <span>Replace Rules</span>
                    </div>
                    {Object.entries(useRulesStore.getState().replaceRules).map(([label, [match, replace]]) => (
                      <div key={label} className="rule-row">
                        <strong>{label}:</strong>
                        <span>{match}</span>
                        <span className="arrow">→</span>
                        <span>{replace}</span>
                        <span className="remove-link" onClick={() => handleDeleteRule(label)}>✕</span>
                      </div>
                    ))}
                {Object.keys(useRulesStore.getState().replaceRules).length === 0 && (
                  <div style={{ fontSize: '0.85rem', color: '#7f8c8d', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                    No replace rules yet
                  </div>
                )}

                <div className="rules-group-header">
                  <span>Match Rules</span>
                </div>
                {Object.entries(useRulesStore.getState().matchRules).map(([label, regex]) => (
                  <div key={label} className="rule-row">
                    <strong>{label}:</strong>
                    <span>{regex}</span>
                    <span className="remove-link" onClick={() => handleDeleteRule(label)}>✕</span>
                  </div>
                ))}
                {Object.keys(useRulesStore.getState().matchRules).length === 0 && (
                  <div style={{ fontSize: '0.85rem', color: '#7f8c8d', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                    No match rules yet
                  </div>
                )}

                <div className="rules-group-header">
                  <span>Mappings (Lookup Tables)</span>
                </div>
                {Object.entries(useRulesStore.getState().mappings).map(([label, mapping]) => {
                  const isExpanded = expandedMappings[label] || false;
                  const itemCount = Object.keys(mapping).length;
                  
                  return (
                    <div key={label} className="mapping-group">
                      <div 
                        className="mapping-label" 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        onClick={() => toggleMappingExpanded(label)}
                      >
                        <div>
                          <span style={{ marginRight: '0.5rem' }}>{isExpanded ? '▼' : '▶'}</span>
                          <strong>{label}:</strong>
                          {!isExpanded && (
                            <span style={{ fontSize: '0.85rem', color: '#7f8c8d', marginLeft: '0.5rem' }}>
                              [{itemCount} {itemCount === 1 ? 'item' : 'items'}]
                            </span>
                          )}
                          <a 
                            href="#" 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenMappingJson(label); }}
                            style={{ fontSize: '0.85rem', color: '#3498db', textDecoration: 'none', cursor: 'pointer', marginLeft: '0.5rem' }}
                          >
                            json
                          </a>
                        </div>
                        <span 
                          className="remove-link" 
                          onClick={(e) => { e.stopPropagation(); handleDeleteRule(label); }}
                        >
                          ✕
                        </span>
                      </div>
                      
                      {isExpanded && (
                        <>
                          {Object.entries(mapping).map(([key, value]) => (
                            <div key={key} className="rule-row mapping-entry">
                              <span>{key}</span>
                              <span className="arrow">→</span>
                              <span>{value}</span>
                              <span className="remove-link" onClick={() => handleDeleteMappingEntry(label, key)}>✕</span>
                            </div>
                          ))}
                          {Object.keys(mapping).length === 0 && (
                            <div style={{ fontSize: '0.8rem', color: '#7f8c8d', fontStyle: 'italic', paddingLeft: '1rem' }}>
                              No entries yet. Add key-value pairs below.
                            </div>
                          )}
                          <div className="rule-row mapping-entry" style={{ marginTop: '0.5rem' }}>
                            <input
                              type="text"
                              className="rule-input"
                              placeholder="Key"
                              value={selectedRuleLabel === label ? mappingKey : ''}
                              onFocus={() => setSelectedRuleLabel(label)}
                              onChange={(e) => {
                                setSelectedRuleLabel(label);
                                setMappingKey(e.target.value);
                              }}
                            />
                            <span className="arrow">→</span>
                            <input
                              type="text"
                              className="rule-input"
                              placeholder="Value"
                              value={selectedRuleLabel === label ? mappingValue : ''}
                              onFocus={() => setSelectedRuleLabel(label)}
                              onChange={(e) => {
                                setSelectedRuleLabel(label);
                                setMappingValue(e.target.value);
                              }}
                            />
                            <button 
                              className="add-link" 
                              onClick={() => handleAddMappingEntry(label)}
                              style={{ padding: '0.25rem 0.75rem', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Add
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                {Object.keys(useRulesStore.getState().mappings).length === 0 && (
                  <div style={{ fontSize: '0.85rem', color: '#7f8c8d', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                    No mapping rules yet. Create one above to start adding key-value pairs.
                  </div>
                )}
                  </>
                )}
              </div>

              <div className="rules-actions">
                <button className="save-rules-btn" onClick={() => {
                  useRulesStore.getState().saveToFile();
                  alert('Rules saved to file!');
                }}>
                  Export Rules
                </button>
                <button className="cancel-btn" onClick={handleCloseRules}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Bindings JSON Editor Modal */}
        {showBindingsJson && (
          <div className="overlay-backdrop" onClick={() => setShowBindingsJson(false)} style={{ zIndex: 10001 }}>
            <div className="overlay-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
              <h2>Edit Bindings JSON - {rulesDataKey}</h2>
              <textarea
                value={bindingsJsonText}
                onChange={(e) => setBindingsJsonText(e.target.value)}
                style={{
                  width: '100%',
                  height: '400px',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
              <div className="overlay-actions" style={{ marginTop: '1rem' }}>
                <button onClick={handleSaveBindingsJson}>Save</button>
                <button onClick={() => setShowBindingsJson(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Mapping JSON Editor Modal */}
        {showMappingJson && (
          <div className="overlay-backdrop" onClick={() => setShowMappingJson(false)} style={{ zIndex: 10001 }}>
            <div className="overlay-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
              <h2>Edit Mapping JSON - {mappingJsonLabel}</h2>
              <textarea
                value={mappingJsonText}
                onChange={(e) => setMappingJsonText(e.target.value)}
                style={{
                  width: '100%',
                  height: '400px',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
              <div className="overlay-actions" style={{ marginTop: '1rem' }}>
                <button onClick={handleSaveMappingJson}>Save</button>
                <button onClick={() => setShowMappingJson(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* All Rules JSON Editor Modal */}
        {showAllRulesJson && (
          <div className="overlay-backdrop" onClick={() => setShowAllRulesJson(false)} style={{ zIndex: 10001 }}>
            <div className="overlay-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
              <h2>Edit All Rules JSON</h2>
              <textarea
                value={allRulesJsonText}
                onChange={(e) => setAllRulesJsonText(e.target.value)}
                style={{
                  width: '100%',
                  height: '400px',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
              <div className="overlay-actions" style={{ marginTop: '1rem' }}>
                <button onClick={handleSaveAllRulesJson}>Save</button>
                <button onClick={() => setShowAllRulesJson(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoadModal;
