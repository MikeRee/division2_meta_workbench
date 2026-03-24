import React, { useState, useCallback } from 'react';
import './RecordOverlay.css';

interface RecordOverlayProps {
  title: string;
  record: Record<string, number>;
  nullable?: boolean;
  onSave: (updated: Record<string, number> | null) => void;
  onClose: () => void;
}

function RecordOverlay({ title, record, nullable, onSave, onClose }: RecordOverlayProps) {
  const [entries, setEntries] = useState<[string, number][]>(() =>
    Object.entries(record).map(([k, v]) => [k, v]),
  );

  const updateKey = useCallback((idx: number, newKey: string) => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? [newKey, e[1]] : e)));
  }, []);

  const updateValue = useCallback((idx: number, raw: string) => {
    const num = raw === '' ? 0 : Number(raw);
    setEntries((prev) => prev.map((e, i) => (i === idx ? [e[0], isNaN(num) ? e[1] : num] : e)));
  }, []);

  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, ['', 0]]);
  }, []);

  const removeEntry = useCallback((idx: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = useCallback(() => {
    const result: Record<string, number> = {};
    for (const [k, v] of entries) {
      if (k.trim()) result[k.trim()] = v;
    }
    onSave(result);
  }, [entries, onSave]);

  return (
    <div
      className="record-overlay-backdrop"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="record-overlay-content" onClick={(e) => e.stopPropagation()}>
        <div className="record-overlay-header">
          <h4>{title}</h4>
          <button className="record-overlay-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="record-overlay-body">
          {entries.map(([key, value], idx) => (
            <div className="record-overlay-row" key={idx}>
              <input
                className="record-overlay-key"
                value={key}
                onChange={(e) => updateKey(idx, e.target.value)}
                placeholder="key"
                aria-label={`Key ${idx + 1}`}
              />
              <span className="record-overlay-sep">:</span>
              <input
                className="record-overlay-value"
                type="number"
                value={value}
                onChange={(e) => updateValue(idx, e.target.value)}
                placeholder="0"
                aria-label={`Value ${idx + 1}`}
              />
              <button
                className="record-overlay-remove"
                onClick={() => removeEntry(idx)}
                aria-label={`Remove entry ${idx + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
          {entries.length === 0 && <div className="record-overlay-empty">No entries</div>}
        </div>
        <div className="record-overlay-footer">
          <button className="record-overlay-add" onClick={addEntry}>
            + Add Entry
          </button>
          <div className="record-overlay-actions">
            {nullable && (
              <button
                className="record-overlay-null-btn"
                onClick={() => onSave(null)}
                title="Mark this attribute as not settable"
              >
                Set Null
              </button>
            )}
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

export default RecordOverlay;
