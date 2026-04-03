import React, { useState, useCallback, useMemo } from 'react';
import './RecordOverlay.css';
import TalentPickerModal from './TalentPickerModal';
import type Talent from '../models/Talent';
import { useCleanDataStore } from '../stores/useCleanDataStore';
import { useBackButtonClose } from '../hooks/useBackButtonClose';

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
  useBackButtonClose(true, onClose);

  const [current, setCurrent] = useState<string[]>(() => [...talents]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const allTalents = useMemo(() => {
    const raw = useCleanDataStore.getState().getCleanData('talents');
    return (raw ?? []) as Talent[];
  }, []);

  const pickableTalents = useMemo(
    () =>
      allTalents.filter((t) => !current.includes(t.name) && !current.includes(t.perfectName ?? '')),
    [allTalents, current],
  );

  const handlePick = useCallback((talent: Talent, isPerfect: boolean) => {
    const name = isPerfect ? (talent.perfectName ?? talent.name) : talent.name;
    setCurrent((prev) => [...prev, name]);
    setPickerOpen(false);
  }, []);

  const handleRemove = useCallback((idx: number) => {
    setCurrent((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = useCallback(() => {
    onSave(current);
  }, [current, onSave]);

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
            <button
              className="record-overlay-add"
              onClick={() => setPickerOpen(true)}
              disabled={pickableTalents.length === 0}
            >
              + Add Talent
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

      <TalentPickerModal
        isOpen={pickerOpen}
        talents={pickableTalents}
        onSelect={handlePick}
        onClose={() => setPickerOpen(false)}
        title="Add Fixed Talent"
      />
    </div>
  );
}

export default FixedTalentOverlay;
