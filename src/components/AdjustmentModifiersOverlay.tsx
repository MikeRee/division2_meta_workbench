import React, { useState } from 'react';
import useAdjustmentStore from '../stores/useAdjustmentStore';
import './AdjustmentModifiersOverlay.css';

interface AdjustmentModifiersOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

function AdjustmentModifiersOverlay({ isOpen, onClose }: AdjustmentModifiersOverlayProps) {
  const {
    personalAccuracy,
    headshotPercentage,
    modifiers,
    setPersonalAccuracy,
    setHeadshotPercentage,
    addModifier,
    updateModifier,
    removeModifier,
  } = useAdjustmentStore();

  const [newLabel, setNewLabel] = useState('');
  const [newStat, setNewStat] = useState('');
  const [newValue, setNewValue] = useState('');

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newLabel.trim() || !newStat.trim()) return;
    addModifier({ label: newLabel.trim(), stat: newStat.trim(), value: Number(newValue) || 0 });
    setNewLabel('');
    setNewStat('');
    setNewValue('');
  };

  return (
    <div className="adj-overlay-backdrop" onClick={onClose}>
      <div className="adj-overlay-content" onClick={(e) => e.stopPropagation()}>
        <div className="adj-overlay-header">
          <h2>Adjustment Modifiers</h2>
          <button className="adj-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="adj-overlay-body">
          {/* Personal Modifiers Section */}
          <div className="adj-section">
            <h3 className="adj-section-title">Personal Modifiers</h3>
            <div className="adj-personal-fields">
              <div className="adj-personal-field">
                <label htmlFor="personal-accuracy">Personal Accuracy</label>
                <div className="adj-pct-input">
                  <input
                    id="personal-accuracy"
                    type="number"
                    min={0}
                    max={100}
                    value={personalAccuracy}
                    onChange={(e) => setPersonalAccuracy(Number(e.target.value))}
                  />
                  <span className="adj-pct-symbol">%</span>
                </div>
              </div>
              <div className="adj-personal-field">
                <label htmlFor="headshot-pct">Headshot Percentage</label>
                <div className="adj-pct-input">
                  <input
                    id="headshot-pct"
                    type="number"
                    min={0}
                    max={100}
                    value={headshotPercentage}
                    onChange={(e) => setHeadshotPercentage(Number(e.target.value))}
                  />
                  <span className="adj-pct-symbol">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modifier List Section */}
          <div className="adj-section">
            <h3 className="adj-section-title">Modifiers</h3>

            <div className="adj-table-header">
              <span>Label</span>
              <span>Stat</span>
              <span>Value</span>
              <span></span>
            </div>

            {modifiers.map((mod) => (
              <div className="adj-table-row" key={mod.id}>
                <input
                  value={mod.label}
                  onChange={(e) => updateModifier(mod.id, { label: e.target.value })}
                  placeholder="Label"
                  aria-label="Modifier label"
                />
                <input
                  value={mod.stat}
                  onChange={(e) => updateModifier(mod.id, { stat: e.target.value })}
                  placeholder="Stat"
                  aria-label="Modifier stat"
                />
                <input
                  type="number"
                  value={mod.value}
                  onChange={(e) => updateModifier(mod.id, { value: Number(e.target.value) || 0 })}
                  placeholder="0"
                  aria-label="Modifier value"
                />
                <button
                  className="adj-remove-btn"
                  onClick={() => removeModifier(mod.id)}
                  aria-label="Remove modifier"
                >
                  ×
                </button>
              </div>
            ))}

            {/* Add new row */}
            <div className="adj-table-row adj-new-row">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label"
                aria-label="New modifier label"
              />
              <input
                value={newStat}
                onChange={(e) => setNewStat(e.target.value)}
                placeholder="Stat"
                aria-label="New modifier stat"
              />
              <input
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="0"
                aria-label="New modifier value"
              />
              <button className="adj-add-btn" onClick={handleAdd} aria-label="Add modifier">
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdjustmentModifiersOverlay;
