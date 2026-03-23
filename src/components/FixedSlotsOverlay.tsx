import React, { useState, useCallback, useMemo } from 'react';
import { useCleanDataStore } from '../stores/useCleanDataStore';
import WeaponMod from '../models/WeaponMod';
import './RecordOverlay.css';

interface FixedSlotsOverlayProps {
  title: string;
  slots: Record<string, Record<string, number>>;
  onSave: (updated: Record<string, Record<string, number>>) => void;
  onClose: () => void;
}

type ViewMode = 'list' | 'addExisting' | 'createNew';

function FixedSlotsOverlay({ title, slots, onSave, onClose }: FixedSlotsOverlayProps) {
  // Internal state: array of { slotType, bonuses } for easy editing
  const [entries, setEntries] = useState<{ slotType: string; bonuses: Record<string, number> }[]>(
    () =>
      Object.entries(slots).map(([slotType, bonuses]) => ({
        slotType,
        bonuses: { ...bonuses },
      })),
  );
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [newSlotType, setNewSlotType] = useState('');
  const [newBonusRaw, setNewBonusRaw] = useState('{}');

  // Get available weapon mods from clean data store
  const availableMods = useMemo(() => {
    const mods = useCleanDataStore.getState().getCleanData('weaponMods');
    return (mods || []) as WeaponMod[];
  }, []);

  const modTypes = useMemo(() => WeaponMod.distinctTypes(availableMods), [availableMods]);

  // Slot types already added
  const selectedTypes = useMemo(
    () => new Set(entries.map((e) => e.slotType.toUpperCase())),
    [entries],
  );

  // Filter available mods for the "add existing" view
  const filteredMods = useMemo(() => {
    // Group mods by slot type, pick one representative per type
    const bySlot = new Map<string, WeaponMod>();
    for (const m of availableMods) {
      const key = m.slot || m.type;
      if (!selectedTypes.has(key.toUpperCase()) && !bySlot.has(key.toUpperCase())) {
        bySlot.set(key.toUpperCase(), m);
      }
    }
    let result = Array.from(bySlot.values());
    if (filterType) {
      result = result.filter((m) => m.type === filterType);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(lower) ||
          m.slot.toLowerCase().includes(lower) ||
          Object.keys(m.bonus).some((k) => k.toLowerCase().includes(lower)),
      );
    }
    return result;
  }, [availableMods, selectedTypes, filterType, searchTerm]);

  const updateBonuses = useCallback((idx: number, raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, bonuses: parsed } : e)));
      }
    } catch {
      /* ignore invalid JSON while typing */
    }
  }, []);

  const addExistingMod = useCallback((mod: WeaponMod) => {
    const slotType = mod.slot || mod.type;
    setEntries((prev) => [
      ...prev,
      { slotType: slotType.toUpperCase(), bonuses: { ...mod.bonus } },
    ]);
    setViewMode('list');
    setSearchTerm('');
    setFilterType('');
  }, []);

  const addNewSlot = useCallback(() => {
    if (!newSlotType.trim()) return;
    let bonuses: Record<string, number> = {};
    try {
      const parsed = JSON.parse(newBonusRaw);
      if (typeof parsed === 'object' && !Array.isArray(parsed)) bonuses = parsed;
    } catch {
      /* use empty */
    }
    setEntries((prev) => [...prev, { slotType: newSlotType.toUpperCase(), bonuses }]);
    setNewSlotType('');
    setNewBonusRaw('{}');
    setViewMode('list');
  }, [newSlotType, newBonusRaw]);

  const removeEntry = useCallback(
    (idx: number) => {
      setEntries((prev) => prev.filter((_, i) => i !== idx));
      if (expandedIdx === idx) setExpandedIdx(null);
    },
    [expandedIdx],
  );

  const handleSave = useCallback(() => {
    const result: Record<string, Record<string, number>> = {};
    for (const { slotType, bonuses } of entries) {
      if (slotType) result[slotType] = bonuses || {};
    }
    onSave(result);
  }, [entries, onSave]);

  return (
    <div className="record-overlay-backdrop" onClick={onClose}>
      <div
        className="record-overlay-content"
        style={{ width: 560 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="record-overlay-header">
          <h4>
            {viewMode === 'list' && title}
            {viewMode === 'addExisting' && 'Add From Existing Mods'}
            {viewMode === 'createNew' && 'Add New Slot'}
          </h4>
          {viewMode !== 'list' ? (
            <button
              className="record-overlay-close"
              onClick={() => {
                setViewMode('list');
                setSearchTerm('');
                setFilterType('');
              }}
              aria-label="Back to list"
            >
              ←
            </button>
          ) : (
            <button className="record-overlay-close" onClick={onClose}>
              &times;
            </button>
          )}
        </div>

        {/* ── LIST VIEW ── */}
        {viewMode === 'list' && (
          <>
            <div className="record-overlay-body">
              {entries.map((entry, idx) => (
                <div
                  key={idx}
                  style={{ borderBottom: '1px solid #2a2a2a', paddingBottom: '0.5rem' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  >
                    <span style={{ color: '#ccc', fontSize: '0.85rem' }}>
                      {entry.slotType || `Slot ${idx + 1}`}
                      {Object.keys(entry.bonuses).length > 0 && (
                        <span
                          style={{ color: '#a0d8b0', fontSize: '0.75rem', marginLeft: '0.5rem' }}
                        >
                          {Object.entries(entry.bonuses)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ')}
                        </span>
                      )}
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span style={{ color: '#666', fontSize: '0.75rem' }}>
                        {expandedIdx === idx ? '▼' : '▶'}
                      </span>
                      <button
                        className="record-overlay-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEntry(idx);
                        }}
                        aria-label={`Remove slot ${idx + 1}`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {expandedIdx === idx && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        marginTop: '0.4rem',
                      }}
                    >
                      <div className="record-overlay-row">
                        <label style={{ flex: '0 0 80px', color: '#888', fontSize: '0.8rem' }}>
                          slot type
                        </label>
                        <input
                          className="record-overlay-key"
                          value={entry.slotType}
                          onChange={(e) =>
                            setEntries((prev) =>
                              prev.map((ent, i) =>
                                i === idx ? { ...ent, slotType: e.target.value } : ent,
                              ),
                            )
                          }
                          placeholder="e.g. OPTICS RAIL"
                          aria-label={`Slot type for entry ${idx + 1}`}
                        />
                      </div>
                      <div className="record-overlay-row">
                        <label style={{ flex: '0 0 80px', color: '#888', fontSize: '0.8rem' }}>
                          bonuses
                        </label>
                        <input
                          className="record-overlay-key"
                          defaultValue={JSON.stringify(entry.bonuses)}
                          onBlur={(e) => updateBonuses(idx, e.target.value)}
                          placeholder='{"key": 0}'
                          aria-label={`Bonuses for entry ${idx + 1}`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {entries.length === 0 && <div className="record-overlay-empty">No fixed slots</div>}
            </div>
            <div className="record-overlay-footer">
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button className="record-overlay-add" onClick={() => setViewMode('addExisting')}>
                  + Add From Mods
                </button>
                <button className="record-overlay-add" onClick={() => setViewMode('createNew')}>
                  + Add New
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
          </>
        )}

        {/* ── ADD EXISTING MOD VIEW ── */}
        {viewMode === 'addExisting' && (
          <>
            <div
              style={{
                padding: '0.5rem 1rem',
                display: 'flex',
                gap: '0.4rem',
                borderBottom: '1px solid #2a2a2a',
              }}
            >
              <input
                className="record-overlay-key"
                style={{ flex: 1 }}
                placeholder="Search mods..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                aria-label="Search weapon mods"
              />
              <select
                className="modslots-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                aria-label="Filter by mod type"
              >
                <option value="">All types</option>
                {modTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="record-overlay-body" style={{ maxHeight: '50vh' }}>
              {filteredMods.length === 0 && (
                <div className="record-overlay-empty">No mods found</div>
              )}
              {filteredMods.map((mod, idx) => (
                <div
                  key={`${mod.type}-${mod.slot}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.4rem 0',
                    borderBottom: '1px solid #1a1a1a',
                    cursor: 'pointer',
                  }}
                  onClick={() => addExistingMod(mod)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addExistingMod(mod);
                  }}
                  aria-label={`Add ${mod.slot || mod.type}`}
                >
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', flex: 1 }}
                  >
                    <span style={{ color: '#ccc', fontSize: '0.85rem', fontWeight: 600 }}>
                      {mod.slot || mod.type}
                    </span>
                    <span style={{ color: '#888', fontSize: '0.75rem' }}>{mod.type}</span>
                    {Object.keys(mod.bonus).length > 0 && (
                      <span style={{ color: '#a0d8b0', fontSize: '0.75rem' }}>
                        {Object.entries(mod.bonus)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')}
                      </span>
                    )}
                  </div>
                  <span style={{ color: '#d4af37', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                    +
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── CREATE NEW SLOT VIEW ── */}
        {viewMode === 'createNew' && (
          <>
            <div className="record-overlay-body">
              <div className="record-overlay-row">
                <label style={{ flex: '0 0 80px', color: '#888', fontSize: '0.8rem' }}>
                  slot type
                </label>
                <input
                  className="record-overlay-key"
                  value={newSlotType}
                  onChange={(e) => setNewSlotType(e.target.value)}
                  placeholder="e.g. OPTICS RAIL"
                  autoFocus
                  aria-label="New slot type"
                />
              </div>
              <div className="record-overlay-row">
                <label style={{ flex: '0 0 80px', color: '#888', fontSize: '0.8rem' }}>
                  bonuses
                </label>
                <input
                  className="record-overlay-key"
                  value={newBonusRaw}
                  onChange={(e) => setNewBonusRaw(e.target.value)}
                  placeholder='{"key": 0}'
                  aria-label="New slot bonuses"
                />
              </div>
            </div>
            <div className="record-overlay-footer">
              <div />
              <div className="record-overlay-actions">
                <button className="divisiondb-cancel-btn" onClick={() => setViewMode('list')}>
                  Cancel
                </button>
                <button
                  className="divisiondb-save-btn"
                  onClick={addNewSlot}
                  disabled={!newSlotType.trim()}
                >
                  Add
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default FixedSlotsOverlay;
