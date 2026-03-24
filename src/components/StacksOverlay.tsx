import React, { useState, useCallback } from 'react';
import './RecordOverlay.css';

interface StackEntry {
  size: number;
  bonus: Record<string, number>;
  duration: number;
  cooldown: number;
}

const emptyStack = (): StackEntry => ({
  size: 0,
  bonus: {},
  duration: 0,
  cooldown: 0,
});

interface StacksOverlayProps {
  title: string;
  stacks: StackEntry[];
  onSave: (updated: StackEntry[]) => void;
  onClose: () => void;
}

type ViewMode = 'list' | 'createNew';

/** Inline key-value editor for Record<string, number> */
function BonusEditor({
  entries,
  onChange,
  label,
}: {
  entries: [string, number][];
  onChange: (updated: [string, number][]) => void;
  label: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ color: '#888', fontSize: '0.8rem' }}>{label}</label>
        <button
          className="record-overlay-add"
          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
          onClick={() => onChange([...entries, ['', 0]])}
        >
          + Add
        </button>
      </div>
      {entries.map(([key, value], i) => (
        <div className="record-overlay-row" key={i}>
          <input
            className="record-overlay-key"
            value={key}
            onChange={(e) => {
              const updated = [...entries] as [string, number][];
              updated[i] = [e.target.value, value];
              onChange(updated);
            }}
            placeholder="key"
            aria-label={`Bonus key ${i + 1}`}
          />
          <span className="record-overlay-sep">:</span>
          <input
            className="record-overlay-value"
            type="number"
            value={value}
            onChange={(e) => {
              const num = e.target.value === '' ? 0 : Number(e.target.value);
              if (isNaN(num)) return;
              const updated = [...entries] as [string, number][];
              updated[i] = [key, num];
              onChange(updated);
            }}
            placeholder="0"
            aria-label={`Bonus value ${i + 1}`}
          />
          <button
            className="record-overlay-remove"
            onClick={() => onChange(entries.filter((_, j) => j !== i))}
            aria-label={`Remove bonus ${i + 1}`}
          >
            ✕
          </button>
        </div>
      ))}
      {entries.length === 0 && (
        <span style={{ color: '#555', fontSize: '0.75rem', fontStyle: 'italic' }}>
          No bonus entries
        </span>
      )}
    </div>
  );
}

function entriesToRecord(entries: [string, number][]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [k, v] of entries) {
    if (k.trim()) result[k.trim()] = v;
  }
  return result;
}

function recordToEntries(record: Record<string, number>): [string, number][] {
  return Object.entries(record).map(([k, v]) => [k, v]);
}

function StacksOverlay({ title, stacks, onSave, onClose }: StacksOverlayProps) {
  const [entries, setEntries] = useState<StackEntry[]>(() =>
    stacks.map((s) => ({ ...s, bonus: { ...s.bonus } })),
  );
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [newStack, setNewStack] = useState<StackEntry>(emptyStack());
  const [newBonusEntries, setNewBonusEntries] = useState<[string, number][]>([]);

  const updateNumericField = useCallback(
    (idx: number, field: 'size' | 'duration' | 'cooldown', raw: string) => {
      const num = raw === '' ? 0 : Number(raw);
      if (isNaN(num)) return;
      setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: num } : e)));
    },
    [],
  );

  const updateBonusEntries = useCallback((idx: number, bonusEntries: [string, number][]) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, bonus: entriesToRecord(bonusEntries) } : e)),
    );
  }, []);

  const removeEntry = useCallback(
    (idx: number) => {
      setEntries((prev) => prev.filter((_, i) => i !== idx));
      if (expandedIdx === idx) setExpandedIdx(null);
    },
    [expandedIdx],
  );

  const addNewStack = useCallback(() => {
    setEntries((prev) => [...prev, { ...newStack, bonus: entriesToRecord(newBonusEntries) }]);
    setNewStack(emptyStack());
    setNewBonusEntries([]);
    setViewMode('list');
  }, [newStack, newBonusEntries]);

  const handleSave = useCallback(() => {
    onSave(
      entries.map(({ size, bonus, duration, cooldown }) => ({
        size,
        bonus: bonus || {},
        duration,
        cooldown,
      })),
    );
  }, [entries, onSave]);

  return (
    <div
      className="record-overlay-backdrop"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="record-overlay-content"
        style={{ width: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="record-overlay-header">
          <h4>{viewMode === 'list' ? title : 'Create Stack'}</h4>
          {viewMode !== 'list' ? (
            <button
              className="record-overlay-close"
              onClick={() => setViewMode('list')}
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

        {viewMode === 'list' && (
          <>
            <div className="record-overlay-body">
              {entries.map((stack, idx) => (
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
                      Stack {idx + 1} — size: {stack.size}
                      {Object.keys(stack.bonus).length > 0 && (
                        <span style={{ color: '#a0d8b0', marginLeft: '0.5rem' }}>
                          (
                          {Object.entries(stack.bonus)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ')}
                          )
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
                        aria-label={`Remove stack ${idx + 1}`}
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
                      {(['size', 'duration', 'cooldown'] as const).map((field) => (
                        <div key={field} className="record-overlay-row">
                          <label style={{ flex: '0 0 70px', color: '#888', fontSize: '0.8rem' }}>
                            {field}
                          </label>
                          <input
                            className="record-overlay-value"
                            type="number"
                            value={stack[field]}
                            onChange={(e) => updateNumericField(idx, field, e.target.value)}
                            aria-label={`${field} for stack ${idx + 1}`}
                          />
                        </div>
                      ))}
                      <BonusEditor
                        label="bonus"
                        entries={recordToEntries(stack.bonus)}
                        onChange={(updated) => updateBonusEntries(idx, updated)}
                      />
                    </div>
                  )}
                </div>
              ))}
              {entries.length === 0 && <div className="record-overlay-empty">No stacks</div>}
            </div>
            <div className="record-overlay-footer">
              <button className="record-overlay-add" onClick={() => setViewMode('createNew')}>
                + Add Stack
              </button>
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

        {viewMode === 'createNew' && (
          <>
            <div className="record-overlay-body">
              {(['size', 'duration', 'cooldown'] as const).map((field) => (
                <div key={field} className="record-overlay-row">
                  <label style={{ flex: '0 0 70px', color: '#888', fontSize: '0.8rem' }}>
                    {field}
                  </label>
                  <input
                    className="record-overlay-value"
                    type="number"
                    value={newStack[field]}
                    onChange={(e) => {
                      const num = e.target.value === '' ? 0 : Number(e.target.value);
                      if (!isNaN(num)) setNewStack((prev) => ({ ...prev, [field]: num }));
                    }}
                    aria-label={`New stack ${field}`}
                  />
                </div>
              ))}
              <BonusEditor label="bonus" entries={newBonusEntries} onChange={setNewBonusEntries} />
            </div>
            <div className="record-overlay-footer">
              <div />
              <div className="record-overlay-actions">
                <button className="divisiondb-cancel-btn" onClick={() => setViewMode('list')}>
                  Cancel
                </button>
                <button className="divisiondb-save-btn" onClick={addNewStack}>
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

export default StacksOverlay;
