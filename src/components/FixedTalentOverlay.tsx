import React, { useState, useCallback, useMemo } from 'react';
import './RecordOverlay.css';

interface FixedTalentOverlayProps {
  title: string;
  talents: string[];
  availableTalents: string[];
  onSave: (updated: string[]) => void;
  onClose: () => void;
}

function FixedTalentOverlay({
  title,
  talents,
  availableTalents,
  onSave,
  onClose,
}: FixedTalentOverlayProps) {
  const [current, setCurrent] = useState<string[]>(() => [...talents]);
  const [selectedTalent, setSelectedTalent] = useState('');

  const addable = useMemo(
    () => availableTalents.filter((t) => !current.includes(t)),
    [availableTalents, current],
  );

  const handleAdd = useCallback(() => {
    if (!selectedTalent) return;
    setCurrent((prev) => [...prev, selectedTalent]);
    setSelectedTalent('');
  }, [selectedTalent]);

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
          {current.map((name, idx) => (
            <div className="record-overlay-row" key={idx}>
              <span className="modslots-label">{name}</span>
              <button
                className="record-overlay-remove"
                onClick={() => handleRemove(idx)}
                aria-label={`Remove ${name}`}
              >
                ✕
              </button>
            </div>
          ))}
          {current.length === 0 && <div className="record-overlay-empty">No fixed talents</div>}
        </div>
        <div className="record-overlay-footer">
          <div className="modslots-add-row">
            <select
              className="modslots-select"
              value={selectedTalent}
              onChange={(e) => setSelectedTalent(e.target.value)}
              disabled={addable.length === 0}
              aria-label="Select talent to add"
            >
              <option value="">— add talent —</option>
              {addable.map((t, i) => (
                <option key={`${i}-${t}`} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button className="record-overlay-add" onClick={handleAdd} disabled={!selectedTalent}>
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

export default FixedTalentOverlay;
