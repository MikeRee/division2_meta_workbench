import React, { useState, useCallback, useMemo } from 'react';
import './RecordOverlay.css';

interface ModSlotsOverlayProps {
  title: string;
  slots: string[];
  availableTypes: string[];
  onSave: (updated: string[]) => void;
  onClose: () => void;
}

function ModSlotsOverlay({ title, slots, availableTypes, onSave, onClose }: ModSlotsOverlayProps) {
  const [current, setCurrent] = useState<string[]>(() => [...slots]);
  const [selectedType, setSelectedType] = useState('');

  const addableTypes = useMemo(
    () => availableTypes.filter((t) => !current.includes(t)),
    [availableTypes, current],
  );

  const handleAdd = useCallback(() => {
    if (!selectedType) return;
    setCurrent((prev) => [...prev, selectedType]);
    setSelectedType('');
  }, [selectedType]);

  const handleRemove = useCallback((idx: number) => {
    setCurrent((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = useCallback(() => {
    onSave(current);
  }, [current, onSave]);

  return (
    <div className="record-overlay-backdrop" onClick={onClose}>
      <div className="record-overlay-content" onClick={(e) => e.stopPropagation()}>
        <div className="record-overlay-header">
          <h4>{title}</h4>
          <button className="record-overlay-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="record-overlay-body">
          {current.map((slot, idx) => (
            <div className="record-overlay-row" key={idx}>
              <span className="modslots-label">{slot}</span>
              <button
                className="record-overlay-remove"
                onClick={() => handleRemove(idx)}
                aria-label={`Remove ${slot}`}
              >
                ✕
              </button>
            </div>
          ))}
          {current.length === 0 && <div className="record-overlay-empty">No mod slots</div>}
        </div>
        <div className="record-overlay-footer">
          <div className="modslots-add-row">
            <select
              className="modslots-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              disabled={addableTypes.length === 0}
              aria-label="Select mod type to add"
            >
              <option value="">— add slot —</option>
              {addableTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button className="record-overlay-add" onClick={handleAdd} disabled={!selectedType}>
              + Add
            </button>
          </div>
          <div className="record-overlay-actions">
            <button className="divisiondb-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="divisiondb-save-btn" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModSlotsOverlay;
