import { useState, useEffect } from 'react';
import './LoadModal.css';
import { useLookupStore } from '../stores/useLookupStore';
import { MdDownload, MdSave, MdEditDocument } from 'react-icons/md';

interface LoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadData: (dataType: string, pageName: string, isCSV?: boolean) => void;
}

function LoadModal({ isOpen, onClose, onLoadData }: LoadModalProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [viewerData, setViewerData] = useState<any>(null);
  const [viewerType, setViewerType] = useState('');
  const [editedJson, setEditedJson] = useState('');
  const [dataExists, setDataExists] = useState<Record<string, boolean>>({});
  
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
    { key: 'gearModAttributes', label: 'Gear Mod Attributes', filename: 'gear_mods.csv' },
    { key: 'keenersWatch', label: "Keener's Watch Stats", filename: 'keeners_watch_max_stats.csv' },
    { key: 'statusImmunities', label: 'Status Immunities', filename: 'status_immunities.csv' },
    { key: 'specializations', label: 'Specializations', filename: 'specialties.json' }
  ];

  useEffect(() => {
    const savedKey = localStorage.getItem('googleApiKey');
    if (savedKey) setApiKey(savedKey);
    
    const savedSpreadsheet = localStorage.getItem('division2GearSpreadsheet');
    if (savedSpreadsheet) setSpreadsheetUrl(savedSpreadsheet);

    // Check which data types have data in the store
    const checkDataExists = () => {
      const store = useLookupStore.getState() as any;
      const exists: Record<string, boolean> = {};
      
      Object.keys(pages).forEach(dataType => {
        const dataMap = store[dataType];
        exists[dataType] = dataMap && dataMap.size > 0;
      });
      
      // Check CSV files
      csvFiles.forEach(({ key }) => {
        const dataMap = store[key];
        exists[key] = dataMap && dataMap.size > 0;
      });
      
      setDataExists(exists);
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

  const handleLoad = (dataType: string) => {
    onLoadData(dataType, pages[dataType]);
  };

  const handleLoadCSV = (csvKey: string, filename: string) => {
    onLoadData(csvKey, filename, true); // Pass true to indicate it's a CSV file
  };

  const handleSave = async (dataType: string) => {
    const store = useLookupStore.getState() as any;
    const dataMap = store[dataType];
    
    if (!dataMap || dataMap.size === 0) {
      alert(`No data available for ${dataType}`);
      return;
    }

    // Convert Map to object with keys, converting class instances to plain objects
    const dataObject: Record<string, any> = {};
    dataMap.forEach((value: any, key: string) => {
      // Convert class instances to plain objects by spreading
      dataObject[key] = { ...value };
    });
    
    const jsonString = JSON.stringify(dataObject, null, 2);
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
    const store = useLookupStore.getState() as any;
    const dataMap = store[dataType];
    
    if (!dataMap || dataMap.size === 0) {
      alert(`No data available for ${dataType}`);
      return;
    }

    // Convert Map to object with keys, converting class instances to plain objects
    const dataObject: Record<string, any> = {};
    dataMap.forEach((value: any, key: string) => {
      // Convert class instances to plain objects by spreading
      dataObject[key] = { ...value };
    });
    
    setViewerData(dataObject);
    setViewerType(dataType);
    setEditedJson(JSON.stringify(dataObject, null, 2));
  };

  const handleCloseViewer = () => {
    setViewerData(null);
    setViewerType('');
    setEditedJson('');
  };

  const handleUpdateJson = () => {
    try {
      const parsed = JSON.parse(editedJson);
      
      // Convert object back to array for the setter
      let dataArray;
      if (Array.isArray(parsed)) {
        dataArray = parsed;
      } else {
        // If it's an object, convert to array of values
        dataArray = Object.values(parsed);
      }
      
      const setterName = `set${viewerType.charAt(0).toUpperCase() + viewerType.slice(1)}`;
      const setter = (useLookupStore.getState() as any)[setterName];
      
      if (setter) {
        setter(dataArray);
        alert(`${viewerType} updated successfully!`);
        handleCloseViewer();
      } else {
        alert(`Could not find setter for ${viewerType}`);
      }
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
          <button className="config-icon" onClick={() => setShowConfig(!showConfig)}>⚙️</button>
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

          <div className="grid-label">Weapons</div>
          <input 
            className="grid-input" 
            value={pages.weapons} 
            onChange={(e) => handlePageChange('weapons', e.target.value)}
          />
          <div className="action-buttons">
            <button className="icon-button" onClick={() => handleLoad('weapons')} title="Load">
              <MdDownload />
            </button>
            <button className={`icon-button ${dataExists.weapons ? 'has-data' : ''}`} onClick={() => handleSave('weapons')} title="Save">
              <MdSave />
            </button>
            <button className={`icon-button ${dataExists.weapons ? 'has-data' : ''}`} onClick={() => handleView('weapons')} title="View">
              <MdEditDocument />
            </button>
          </div>

          <div className="grid-label">Weapon Talents</div>
          <input 
            className="grid-input" 
            value={pages.weaponTalents} 
            onChange={(e) => handlePageChange('weaponTalents', e.target.value)}
          />
          <div className="action-buttons">
            <button className="icon-button" onClick={() => handleLoad('weaponTalents')} title="Load">
              <MdDownload />
            </button>
            <button className={`icon-button ${dataExists.weaponTalents ? 'has-data' : ''}`} onClick={() => handleSave('weaponTalents')} title="Save">
              <MdSave />
            </button>
            <button className={`icon-button ${dataExists.weaponTalents ? 'has-data' : ''}`} onClick={() => handleView('weaponTalents')} title="View">
              <MdEditDocument />
            </button>
          </div>

          <div className="grid-label">Exotic Weapons</div>
          <input 
            className="grid-input" 
            value={pages.exoticWeapons} 
            onChange={(e) => handlePageChange('exoticWeapons', e.target.value)}
          />
          <div className="action-buttons">
            <button className="icon-button" onClick={() => handleLoad('exoticWeapons')} title="Load">
              <MdDownload />
            </button>
            <button className={`icon-button ${dataExists.exoticWeapons ? 'has-data' : ''}`} onClick={() => handleSave('exoticWeapons')} title="Save">
              <MdSave />
            </button>
            <button className={`icon-button ${dataExists.exoticWeapons ? 'has-data' : ''}`} onClick={() => handleView('exoticWeapons')} title="View">
              <MdEditDocument />
            </button>
          </div>

          <div className="grid-label">Gearsets</div>
          <input 
            className="grid-input" 
            value={pages.gearsets} 
            onChange={(e) => handlePageChange('gearsets', e.target.value)}
          />
          <div className="action-buttons">
            <button className="icon-button" onClick={() => handleLoad('gearsets')} title="Load">
              <MdDownload />
            </button>
            <button className={`icon-button ${dataExists.gearsets ? 'has-data' : ''}`} onClick={() => handleSave('gearsets')} title="Save">
              <MdSave />
            </button>
            <button className={`icon-button ${dataExists.gearsets ? 'has-data' : ''}`} onClick={() => handleView('gearsets')} title="View">
              <MdEditDocument />
            </button>
          </div>

          <div className="grid-label">Brandsets</div>
          <input 
            className="grid-input" 
            value={pages.brandsets} 
            onChange={(e) => handlePageChange('brandsets', e.target.value)}
          />
          <div className="action-buttons">
            <button className="icon-button" onClick={() => handleLoad('brandsets')} title="Load">
              <MdDownload />
            </button>
            <button className={`icon-button ${dataExists.brandsets ? 'has-data' : ''}`} onClick={() => handleSave('brandsets')} title="Save">
              <MdSave />
            </button>
            <button className={`icon-button ${dataExists.brandsets ? 'has-data' : ''}`} onClick={() => handleView('brandsets')} title="View">
              <MdEditDocument />
            </button>
          </div>

          <div className="grid-label">Gear Talents</div>
          <input 
            className="grid-input" 
            value={pages.gearTalents} 
            onChange={(e) => handlePageChange('gearTalents', e.target.value)}
          />
          <div className="action-buttons">
            <button className="icon-button" onClick={() => handleLoad('gearTalents')} title="Load">
              <MdDownload />
            </button>
            <button className={`icon-button ${dataExists.gearTalents ? 'has-data' : ''}`} onClick={() => handleSave('gearTalents')} title="Save">
              <MdSave />
            </button>
            <button className={`icon-button ${dataExists.gearTalents ? 'has-data' : ''}`} onClick={() => handleView('gearTalents')} title="View">
              <MdEditDocument />
            </button>
          </div>

          <div className="grid-label">Named/Exotic Gear</div>
          <input 
            className="grid-input" 
            value={pages.namedGear} 
            onChange={(e) => handlePageChange('namedGear', e.target.value)}
          />
          <div className="action-buttons">
            <button className="icon-button" onClick={() => handleLoad('namedGear')} title="Load">
              <MdDownload />
            </button>
            <button className={`icon-button ${dataExists.namedGear ? 'has-data' : ''}`} onClick={() => handleSave('namedGear')} title="Save">
              <MdSave />
            </button>
            <button className={`icon-button ${dataExists.namedGear ? 'has-data' : ''}`} onClick={() => handleView('namedGear')} title="View">
              <MdEditDocument />
            </button>
          </div>

          <div className="grid-label">Skills</div>
          <input 
            className="grid-input" 
            value={pages.skills} 
            onChange={(e) => handlePageChange('skills', e.target.value)}
          />
          <div className="action-buttons">
            <button className="icon-button" onClick={() => handleLoad('skills')} title="Load">
              <MdDownload />
            </button>
            <button className={`icon-button ${dataExists.skills ? 'has-data' : ''}`} onClick={() => handleSave('skills')} title="Save">
              <MdSave />
            </button>
            <button className={`icon-button ${dataExists.skills ? 'has-data' : ''}`} onClick={() => handleView('skills')} title="View">
              <MdEditDocument />
            </button>
          </div>

          <div className="grid-label">Weapon Mods</div>
          <input 
            className="grid-input" 
            value={pages.weaponMods} 
            onChange={(e) => handlePageChange('weaponMods', e.target.value)}
          />
          <div className="action-buttons">
            <button className="icon-button" onClick={() => handleLoad('weaponMods')} title="Load">
              <MdDownload />
            </button>
            <button className={`icon-button ${dataExists.weaponMods ? 'has-data' : ''}`} onClick={() => handleSave('weaponMods')} title="Save">
              <MdSave />
            </button>
            <button className={`icon-button ${dataExists.weaponMods ? 'has-data' : ''}`} onClick={() => handleView('weaponMods')} title="View">
              <MdEditDocument />
            </button>
          </div>
        </div>

        <div className="csv-grid">
          {csvFiles.map(({ key, label, filename }) => (
            <div key={key} className="csv-item">
              <span className="csv-label">{label}</span>
              <MdDownload 
                className="csv-icon" 
                onClick={() => handleLoadCSV(key, filename)} 
                title="Load"
              />
              <MdSave 
                className={`csv-icon ${dataExists[key] ? 'has-data' : ''}`} 
                onClick={() => handleSave(key)} 
                title="Save"
              />
              <MdEditDocument 
                className={`csv-icon ${dataExists[key] ? 'has-data' : ''}`} 
                onClick={() => handleView(key)} 
                title="View"
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
