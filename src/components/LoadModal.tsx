import { useState, useEffect } from 'react';
import './LoadModal.css';
import { useLookupStore } from '../stores/useLookupStore';
import { useRawDataStore } from '../stores/useRawDataStore';
import { MdDownload, MdSave, MdEditDocument } from 'react-icons/md';

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
  const [editedJson, setEditedJson] = useState('');
  const [dataExists, setDataExists] = useState<Record<string, boolean>>({});
  const [dataCounts, setDataCounts] = useState<Record<string, number>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  
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
      
      const rawStore = useRawDataStore.getState();
      Object.keys(pages).forEach(dataType => {
        const data = rawStore.getRawData(dataType as any);
        exists[dataType] = data && data.length > 0;
        counts[dataType] = data ? data.length : 0;
      });
      csvFiles.forEach(({ key }) => {
        const data = rawStore.getRawData(key as any);
        exists[key] = data && data.length > 0;
        counts[key] = data ? data.length : 0;
      });
      
      setDataExists(exists);
      setDataCounts(counts);
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
    setEditedJson(JSON.stringify(data, null, 2));
  };

  const handleCloseViewer = () => {
    setViewerData(null);
    setViewerType('');
    setEditedJson('');
  };

  const getLabel = (baseLabel: string, key: string) => {
    const count = dataCounts[key];
    return count > 0 ? `${baseLabel} (${count})` : baseLabel;
  };

  const handleUpdateJson = () => {
    try {
      const parsed = JSON.parse(editedJson);
      
      // Raw mode - expect array
      const dataArray = Array.isArray(parsed) ? parsed : Object.values(parsed);
      useRawDataStore.getState().setRawData(viewerType as any, dataArray);
      alert(`${viewerType} updated successfully in raw store!`);
      handleCloseViewer();
    } catch (error: any) {
      alert(`Invalid JSON: ${error.message}`);
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
            </div>
          ))}
        </div>

        {viewerData && (
          <div className="json-viewer-overlay" onClick={handleCloseViewer}>
            <div className="json-viewer-content" onClick={(e) => e.stopPropagation()}>
              <div className="json-viewer-header">
                <h3>{viewerType} Data</h3>
                <button className="close-viewer-btn" onClick={handleCloseViewer}>✕</button>
              </div>
              <textarea
                className="json-editor"
                value={editedJson}
                onChange={(e) => setEditedJson(e.target.value)}
                spellCheck={false}
              />
              <div className="json-viewer-actions">
                <button className="update-btn" onClick={handleUpdateJson}>Update</button>
                <button className="cancel-btn" onClick={handleCloseViewer}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoadModal;
