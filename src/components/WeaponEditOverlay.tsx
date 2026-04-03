import React, { useState, useMemo, useCallback } from 'react';
import { BuildWeapon } from '../models/BuildWeapon';
import { useCleanDataStore } from '../stores/useCleanDataStore';
import WeaponMod from '../models/WeaponMod';
import Talent from '../models/Talent';
import './GearEditOverlay.css';
import { useBackButtonClose } from '../hooks/useBackButtonClose';

interface WeaponEditOverlayProps {
  buildWeapon: BuildWeapon;
  onSave: (updated: BuildWeapon) => void;
  onRemove: () => void;
  onClose: () => void;
}

function WeaponEditOverlay({ buildWeapon, onSave, onRemove, onClose }: WeaponEditOverlayProps) {
  useBackButtonClose(true, onClose);

  // From clean data store — weapon attributes as Record<string, number>
  const weaponAttributesRecord = useCleanDataStore((s) => s.data.weaponAttributes) ?? {};

  // From clean data store — filter talents to weapon type only
  const allTalents = (useCleanDataStore((s) => s.data.talents) ?? []) as Talent[];
  const weaponTalents = allTalents.filter((t) => t.type === 'weapon');
  const weaponMods = (useCleanDataStore((s) => s.data.weaponMods) ?? []) as WeaponMod[];

  // Available weapon attributes for dropdowns
  const weaponAttrs = useMemo(() => {
    if (!weaponAttributesRecord || typeof weaponAttributesRecord !== 'object') return [];
    return Object.entries(weaponAttributesRecord).map(([key, max]) => ({
      key,
      max,
    }));
  }, [weaponAttributesRecord]);

  // Primary Attribute 1 — always derived, read-only
  const pa1 = buildWeapon.primaryAttribute1;
  const pa1Key = Object.keys(pa1)[0] ?? '';

  // Primary Attribute 2 — null for pistols
  const pa2 = buildWeapon.primaryAttribute2;
  const pa2Key = pa2 ? (Object.keys(pa2)[0] ?? '') : '';
  const [sel2Key, setSel2Key] = useState(pa2Key);
  const [sel2Val, setSel2Val] = useState(pa2 ? (pa2[pa2Key] ?? 0) : 0);

  // Secondary Attribute
  const sa = buildWeapon.secondaryAttribute;
  const saKey = Object.keys(sa)[0] ?? '';
  const [selSaKey, setSelSaKey] = useState(saKey);
  const [selSaVal, setSelSaVal] = useState(sa[saKey] ?? 0);

  // Talent
  const currentTalent = buildWeapon.talents[0] ?? '';
  const [selTalent, setSelTalent] = useState(currentTalent);

  // Mod slots — keyed by slot name (e.g. "muzzle", "optics")
  const availableSlots = buildWeapon.weapon.modSlots; // string[]
  const currentMods = buildWeapon.modSlots; // Record<string, Record<string, number>>
  // Reverse-lookup: find the mod name whose bonus matches the equipped stats for a slot
  const findModNameForSlot = useCallback(
    (slotName: string, bonus: Record<string, number>): string => {
      const bonusKey = Object.keys(bonus)[0];
      if (!bonusKey) return '';
      const match = weaponMods.find(
        (m) =>
          (m.slot.toLowerCase() === slotName.toLowerCase() ||
            m.type.toLowerCase() === slotName.toLowerCase()) &&
          Object.keys(m.bonus)[0] === bonusKey,
      );
      return match?.name ?? '';
    },
    [weaponMods],
  );

  const [modSelections, setModSelections] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const slot of availableSlots) {
      const equipped = currentMods[slot];
      init[slot] =
        equipped && Object.keys(equipped).length > 0 ? findModNameForSlot(slot, equipped) : '';
    }
    return init;
  });

  // Filter mods by slot type
  const getModsForSlot = useCallback(
    (slotName: string) => {
      return weaponMods.filter(
        (m) =>
          m.slot.toLowerCase() === slotName.toLowerCase() ||
          m.type.toLowerCase() === slotName.toLowerCase(),
      );
    },
    [weaponMods],
  );

  const autoMax = useCallback(
    (key: string) => weaponAttrs.find((a) => a.key === key)?.max ?? 0,
    [weaponAttrs],
  );

  const handleSave = useCallback(() => {
    const clone = new BuildWeapon(buildWeapon.weapon);

    // Primary Attribute 2
    if (pa2 !== null && sel2Key) {
      clone.setPrimaryAttribute2(sel2Key, sel2Val);
    }

    // Secondary Attribute
    if (selSaKey) {
      clone.setSecondaryAttribute(selSaKey, selSaVal);
    }

    // Talent
    if (selTalent) {
      clone.setTalent(selTalent);
    }

    // Mod slots
    const slots: Record<string, Record<string, number>> = {};
    for (const [slotName, modName] of Object.entries(modSelections)) {
      if (modName) {
        const mod = weaponMods.find((m) => m.name === modName);
        if (mod) {
          slots[slotName] = { ...mod.bonus };
        }
      }
    }
    if (Object.keys(slots).length > 0) {
      clone.setModSlots(slots);
    }

    onSave(clone);
  }, [
    buildWeapon,
    pa2,
    sel2Key,
    sel2Val,
    selSaKey,
    selSaVal,
    selTalent,
    modSelections,
    weaponMods,
    onSave,
  ]);

  return (
    <div className="gear-edit-backdrop" onClick={onClose}>
      <div className="gear-edit-panel" onClick={(e) => e.stopPropagation()}>
        <div className="gear-edit-header">
          <h4>{buildWeapon.weapon.name}</h4>
          <button className="gear-edit-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="gear-edit-body">
          {/* Primary Attribute 1 — read-only */}
          <div className="gear-edit-section">
            <span className="gear-edit-label">Primary Attribute 1</span>
            <div className="gear-edit-fixed">
              {pa1Key}: {pa1[pa1Key]}
            </div>
          </div>

          {/* Primary Attribute 2 */}
          {pa2 !== null && (
            <div className="gear-edit-section">
              <span className="gear-edit-label">Primary Attribute 2</span>
              <div className="gear-edit-attr-row">
                <select
                  className="gear-edit-select"
                  value={sel2Key}
                  onChange={(e) => {
                    setSel2Key(e.target.value);
                    setSel2Val(autoMax(e.target.value));
                  }}
                  aria-label="Primary attribute 2"
                >
                  <option value="">Select...</option>
                  {weaponAttrs.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.key}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={sel2Val}
                  onChange={(e) => setSel2Val(parseFloat(e.target.value) || 0)}
                  aria-label="Primary attribute 2 value"
                />
              </div>
            </div>
          )}

          {/* Secondary Attribute */}
          <div className="gear-edit-section">
            <span className="gear-edit-label">Secondary Attribute</span>
            <div className="gear-edit-attr-row">
              <select
                className="gear-edit-select"
                value={selSaKey}
                onChange={(e) => {
                  setSelSaKey(e.target.value);
                  setSelSaVal(autoMax(e.target.value));
                }}
                aria-label="Secondary attribute"
              >
                <option value="">Select...</option>
                {weaponAttrs.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.key}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={selSaVal}
                onChange={(e) => setSelSaVal(parseFloat(e.target.value) || 0)}
                aria-label="Secondary attribute value"
              />
            </div>
          </div>

          {/* Talent */}
          <div className="gear-edit-section">
            <span className="gear-edit-label">Talent</span>
            {buildWeapon.weapon.fixedTalent.length > 0 ? (
              <div className="gear-edit-fixed">{buildWeapon.weapon.fixedTalent.join(', ')}</div>
            ) : (
              <select
                className="gear-edit-select"
                value={selTalent}
                onChange={(e) => setSelTalent(e.target.value)}
                aria-label="Weapon talent"
              >
                <option value="">Select...</option>
                {weaponTalents.map((t, idx) => (
                  <option key={`${t.name}-${idx}`} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Mod Slots */}
          {availableSlots.length > 0 && (
            <div className="gear-edit-section">
              <span className="gear-edit-label">Mod Slots</span>
              {availableSlots.map((slotName) => (
                <div
                  key={slotName}
                  className="gear-edit-attr-row"
                  style={{ marginBottom: '0.3rem' }}
                >
                  <span style={{ flex: '0 0 80px', color: '#888', fontSize: '0.8rem' }}>
                    {slotName}
                  </span>
                  <select
                    className="gear-edit-select"
                    value={modSelections[slotName] ?? ''}
                    onChange={(e) =>
                      setModSelections((prev) => ({ ...prev, [slotName]: e.target.value }))
                    }
                    aria-label={`${slotName} mod`}
                  >
                    <option value="">None</option>
                    {getModsForSlot(slotName).map((m) => {
                      const bonusStr = Object.entries(m.bonus)
                        .map(([k, v]) => `${k} ${v}${v < 1000 ? '%' : '/s'}`)
                        .join(', ');
                      return (
                        <option key={m.name} value={m.name}>
                          {m.name}
                          {bonusStr ? ` — ${bonusStr}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ))}
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

export default WeaponEditOverlay;
