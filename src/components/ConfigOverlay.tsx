import React, { useState, useEffect, useCallback } from 'react';
import './ConfigOverlay.css';
import { useBackButtonClose } from '../hooks/useBackButtonClose';

interface ConfigOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

function ConfigOverlay({ isOpen, onClose }: ConfigOverlayProps) {
  const stableOnClose = useCallback(() => onClose(), [onClose]);
  useBackButtonClose(isOpen, stableOnClose);

  const [apiKey, setApiKey] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('googleApiKey');
    if (savedKey) {
      setApiKey(savedKey);
    }
    const savedSpreadsheet = localStorage.getItem('division2GearSpreadsheet');
    if (savedSpreadsheet) {
      setSpreadsheetId(savedSpreadsheet);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('googleApiKey', apiKey);

    // Extract spreadsheet ID from URL if full URL is provided
    let cleanSpreadsheetId = spreadsheetId;
    const match = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      cleanSpreadsheetId = match[1];
    }

    localStorage.setItem('division2GearSpreadsheet', cleanSpreadsheetId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
        <h2>Config</h2>
        <div className="config-field">
          <label htmlFor="apiKey">Google API Key</label>
          <input
            id="apiKey"
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Google API Key"
          />
        </div>
        <div className="config-field">
          <label htmlFor="spreadsheetId">Division 2 Gear Spreadsheet</label>
          <input
            id="spreadsheetId"
            type="text"
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            placeholder="Enter spreadsheet ID"
          />
        </div>
        <div className="overlay-actions">
          <button onClick={handleSave}>Save</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default ConfigOverlay;
