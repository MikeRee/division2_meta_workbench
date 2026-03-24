import React, { useState, useMemo, useCallback } from 'react';
import BuildGear, { GearSource } from '../models/BuildGear';
import { CoreType } from '../models/CoreValue';
import { useLookupStore } from '../stores/useLookupStore';
import './GearEditOverlay.css';

interface GearEditOverlayProps {
  buildGear: BuildGear;
  onSave: (updated: BuildGear) => void;
  onRemove: () => void;
  onClose: () => void;
}

function GearEditOverlay({ buildGear, onSave, onRemove, onClose }: GearEditOverlayProps) {
  const gearAttributes = useLookupStore((s) => s.gearAttributes);
  const gearModAttributesMap = useLookupStore((s) => s.gearModAttributes);

  const allAttrs = useMemo(() => {
    if (!gearAttributes) return [];
    return gearAttributes.toArray().map((m) => ({ key: m.attribute, max: m.max }));
  }, [gearAttributes]);

  const allModAttrs = useMemo(() => {
    if (!(gearModAttributesMap instanceof Map)) return [];
    return Array.from(gearModAttributesMap.values()).map((m) => ({ key: m.attribute, max: m.max }));
  }, [gearModAttributesMap]);

  // Core: exotic gear has 3 cores (all fixed)
  const coreFixed = buildGear.source === GearSource.Exotic || buildGear.core.length === 3;
  const [selectedCore, setSelectedCore] = useState<CoreType>(
    buildGear.core[0] ?? CoreType.WeaponDamage,
  );

  // Attribute 1: null means slot doesn't exist
  const attr1 = buildGear.attribute1;
  const attr1Key = attr1 ? (Object.keys(attr1)[0] ?? '') : '';
  const [sel1Key, setSel1Key] = useState(attr1Key);
  const [sel1Val, setSel1Val] = useState(attr1 ? (attr1[attr1Key] ?? 0) : 0);

  // Attribute 2: null means slot doesn't exist
  const attr2 = buildGear.attribute2;
  const attr2Key = attr2 ? (Object.keys(attr2)[0] ?? '') : '';
  const [sel2Key, setSel2Key] = useState(attr2Key);
  const [sel2Val, setSel2Val] = useState(attr2 ? (attr2[attr2Key] ?? 0) : 0);

  // Mod slot
  const hasModSlot = buildGear.maxModSlots > 0;
  const curMod = buildGear.modSlots[0] ?? {};
  const curModKey = Object.keys(curMod)[0] ?? '';
  const [selModKey, setSelModKey] = useState(curModKey);
  const [selModVal, setSelModVal] = useState(curMod[curModKey] ?? 0);

  const autoMax = useCallback(
    (key: string) => allAttrs.find((a) => a.key === key)?.max ?? 0,
    [allAttrs],
  );

  const autoModMax = useCallback(
    (key: string) => allModAttrs.find((a) => a.key === key)?.max ?? 0,
    [allModAttrs],
  );

  const handleSave = useCallback(() => {
    // Clone via constructor using source data + type
    const clone =
      buildGear.source === GearSource.Brandset || buildGear.source === GearSource.Gearset
        ? new BuildGear(buildGear.data, buildGear.type)
        : new BuildGear(buildGear.data);

    // Try setting each field — setters return errors if not allowed
    if (!coreFixed) {
      clone.setCore(selectedCore);
    }
    if (sel1Key) {
      clone.setAttribute1(sel1Key, sel1Val);
    } else if (attr1 !== null) {
      clone.clearAttribute1();
    }
    if (sel2Key) {
      clone.setAttribute2(sel2Key, sel2Val);
    } else if (attr2 !== null) {
      clone.clearAttribute2();
    }
    if (hasModSlot && selModKey) {
      clone.setModSlot(0, selModKey, selModVal);
    }

    onSave(clone);
  }, [
    buildGear,
    coreFixed,
    selectedCore,
    sel1Key,
    sel1Val,
    sel2Key,
    sel2Val,
    hasModSlot,
    selModKey,
    selModVal,
    onSave,
  ]);

  return (
    <div className="gear-edit-backdrop" onClick={onClose}>
      <div className="gear-edit-panel" onClick={(e) => e.stopPropagation()}>
        <div className="gear-edit-header">
          <h4>{buildGear.name}</h4>
          <button className="gear-edit-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="gear-edit-body">
          {/* Core */}
          <div className="gear-edit-section">
            <span className="gear-edit-label">Core Attribute</span>
            {coreFixed ? (
              <div className="gear-edit-fixed">{buildGear.core.join(', ')}</div>
            ) : (
              <select
                className="gear-edit-select"
                value={selectedCore}
                onChange={(e) => setSelectedCore(e.target.value as CoreType)}
                aria-label="Core attribute"
              >
                {Object.values(CoreType).map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Attribute 1 */}
          {attr1 !== null && (
            <div className="gear-edit-section">
              <span className="gear-edit-label">Attribute 1</span>
              <div className="gear-edit-attr-row">
                <select
                  className="gear-edit-select"
                  value={sel1Key}
                  onChange={(e) => {
                    setSel1Key(e.target.value);
                    setSel1Val(autoMax(e.target.value));
                  }}
                  aria-label="Attribute 1 name"
                >
                  <option value="">Select...</option>
                  {allAttrs.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.key}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={sel1Val}
                  onChange={(e) => setSel1Val(parseFloat(e.target.value) || 0)}
                  aria-label="Attribute 1 value"
                />
              </div>
            </div>
          )}

          {/* Attribute 2 */}
          {attr2 !== null && (
            <div className="gear-edit-section">
              <span className="gear-edit-label">Attribute 2</span>
              <div className="gear-edit-attr-row">
                <select
                  className="gear-edit-select"
                  value={sel2Key}
                  onChange={(e) => {
                    setSel2Key(e.target.value);
                    setSel2Val(autoMax(e.target.value));
                  }}
                  aria-label="Attribute 2 name"
                >
                  <option value="">Select...</option>
                  {allAttrs.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.key}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={sel2Val}
                  onChange={(e) => setSel2Val(parseFloat(e.target.value) || 0)}
                  aria-label="Attribute 2 value"
                />
              </div>
            </div>
          )}

          {/* Mod Slot */}
          {hasModSlot && (
            <div className="gear-edit-section">
              <span className="gear-edit-label">Mod Slot</span>
              <div className="gear-edit-attr-row">
                <select
                  className="gear-edit-select"
                  value={selModKey}
                  onChange={(e) => {
                    setSelModKey(e.target.value);
                    setSelModVal(autoModMax(e.target.value));
                  }}
                  aria-label="Mod slot attribute"
                >
                  <option value="">Select...</option>
                  {allModAttrs.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.key}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={selModVal}
                  onChange={(e) => setSelModVal(parseFloat(e.target.value) || 0)}
                  aria-label="Mod slot value"
                />
              </div>
            </div>
          )}
        </div>

        <div className="gear-edit-footer">
          <button className="gear-edit-replace" onClick={onRemove}>
            Remove
          </button>
          <button className="gear-edit-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="gear-edit-save" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default GearEditOverlay;
