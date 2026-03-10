import { useState, useEffect } from 'react';
import './LoadModal.css';
import { useRawDataStore } from '../stores/useRawDataStore';
import { useCleanDataStore } from '../stores/useCleanDataStore';
import { useRulesStore } from '../stores/useRulesStore';
import { MdDownload, MdSave, MdEditDocument, MdCleaningServices } from 'react-icons/md';

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
    alert('Import functionality coming soon!');
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
      if (!replaceMatch || !replaceValue) {
        alert('Please enter both match and replace values');
        return;
      }
      rulesStore.setReplaceRule(newRuleLabel, replaceMatch, replaceValue);
      setNewRuleLabel('');
      setReplaceMatch('');
      setReplaceValue('');
      alert('Replace rule created successfully!');
    } else if (ruleType === 'match') {
      if (!matchRegex) {
        alert('Please enter a regex pattern');
        return;
      }
      rulesStore.setMatchRule(newRuleLabel, matchRegex);
      setNewRuleLabel('');
      setMatchRegex('');
      alert('Match rule created successfully!');
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
    if (!bindingSource || !bindingDestination || !bindingRule) {
      alert('Please fill in all binding fields');
      return;
    }

    const rulesStore = useRulesStore.getState();
    rulesStore.addBinding(rulesDataKey as any, {
      source: bindingSource,
      destination: bindingDestination,
      rule: bindingRule,
    });

    setBindingSource('');
    setBindingDestination('');
    setBindingRule('');
    alert('Binding added successfully!');
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
                  </>
                )}
                {viewerMode === 'raw' && (
                  <button className="update-btn" onClick={handleUpdateJson}>Update</button>
                )}
                <button className="cancel-btn" onClick={handleCloseViewer}>Cancel</button>
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
                  <h4>Bindings for {rulesDataKey}</h4>
                  <div style={{ fontSize: '0.85rem', color: '#7f8c8d', fontWeight: 'normal', marginTop: '0.25rem' }}>
                    Define how rules are applied to transform data fields. Rules are applied in order.
                  </div>
                </div>

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
                  <input
                    type="text"
                    className="rule-input"
                    placeholder="Destination field"
                    value={bindingDestination}
                    onChange={(e) => setBindingDestination(e.target.value)}
                  />
                  <select
                    className="rule-input"
                    value={bindingRule}
                    onChange={(e) => setBindingRule(e.target.value)}
                  >
                    <option value="">Select rule...</option>
                    {Object.keys(useRulesStore.getState().replaceRules).map(label => (
                      <option key={label} value={label}>{label} (replace)</option>
                    ))}
                    {Object.keys(useRulesStore.getState().matchRules).map(label => (
                      <option key={label} value={label}>{label} (match)</option>
                    ))}
                    {Object.keys(useRulesStore.getState().mappings).map(label => (
                      <option key={label} value={label}>{label} (mapping)</option>
                    ))}
                  </select>
                  <button className="add-link" onClick={handleAddBinding}>Add</button>
                </div>

                <div className="bindings-list">
                  {useRulesStore.getState().getBindings(rulesDataKey as any).map((binding, index) => (
                    <div key={index} className="rule-row">
                      <span>{binding.source}</span>
                      <span className="arrow">→</span>
                      <span>{binding.destination}</span>
                      <span className="rule-badge">{binding.rule}</span>
                      <span className="remove-link" onClick={() => handleRemoveBinding(index)}>✕</span>
                    </div>
                  ))}
                </div>

                {/* Create New Rule Section - SECOND */}
                <div className="rules-section-header">
                  <h4>Create New Rule</h4>
                </div>

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

                {/* Existing Rules Section - THIRD */}
                <div className="rules-section-header">
                  <h4>Existing Rules</h4>
                </div>

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
                {Object.entries(useRulesStore.getState().mappings).map(([label, mapping]) => (
                  <div key={label} className="mapping-group">
                    <div className="mapping-label">
                      <strong>{label}:</strong>
                      <span className="remove-link" onClick={() => handleDeleteRule(label)}>✕</span>
                    </div>
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
                  </div>
                ))}
                {Object.keys(useRulesStore.getState().mappings).length === 0 && (
                  <div style={{ fontSize: '0.85rem', color: '#7f8c8d', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                    No mapping rules yet. Create one above to start adding key-value pairs.
                  </div>
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
      </div>
    </div>
  );
}

export default LoadModal;
