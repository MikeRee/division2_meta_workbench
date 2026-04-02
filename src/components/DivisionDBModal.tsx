import React, { useState } from 'react';
import './DivisionDBModal.css';
import { useCleanDataStore } from '../stores/useCleanDataStore';
import type { MainDataKey } from '../constants/dataKeys';
import DataTableEditor from './DataTableEditor';

/* Cloud bubble positions – hand-tuned percentages so nodes spread organically */
const CLOUD_NODES: { key: string; label: string; x: number; y: number }[] = [
  { key: 'weapons', label: 'Weapons', x: 14, y: 12 },
  { key: 'weaponMods', label: 'Weapon Mods', x: 52, y: 5 },
  { key: 'weaponAttributes', label: 'Weapon Attributes', x: 82, y: 10 },
  { key: 'talents', label: 'Talents', x: 35, y: 33 },
  { key: 'brandsets', label: 'Brandsets', x: 68, y: 30 },
  { key: 'gearsets', label: 'Gearsets', x: 90, y: 42 },
  { key: 'namedGear', label: 'Named / Exotic Gear', x: 10, y: 65 },
  { key: 'gearAttributes', label: 'Gear Attributes', x: 42, y: 60 },
  { key: 'gearMods', label: 'Gear Mods', x: 74, y: 62 },
  { key: 'specializations', label: 'Specializations', x: 12, y: 88 },
  { key: 'prompts', label: 'Prompts', x: 42, y: 88 },
  { key: 'keenersWatch', label: "Keener's Watch", x: 72, y: 88 },
];

const CONNECTIONS: [string, string][] = [
  ['weapons', 'weaponMods'],
  ['weapons', 'talents'],
  ['gearsets', 'talents'],
  ['namedGear', 'talents'],
];

interface DivisionDBModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function DivisionDBModal({ isOpen, onClose }: DivisionDBModalProps) {
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'table' | 'json' | 'prompts'>('json');
  const [editedJson, setEditedJson] = useState('');
  const [tableEditorData, setTableEditorData] = useState<any[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [promptsData, setPromptsData] = useState<Record<string, string>>({});
  const [editingPromptKey, setEditingPromptKey] = useState<string | null>(null);

  const TABLE_EDITOR_SUPPORTED = CLOUD_NODES.map((n) => n.key);

  const openEditor = (tableName: string) => {
    const data = useCleanDataStore.getState().getCleanData(tableName as MainDataKey);
    setEditingTable(tableName);

    if (tableName === 'prompts') {
      setEditMode('prompts');
      setPromptsData(
        data && typeof data === 'object' && !Array.isArray(data)
          ? { ...(data as Record<string, string>) }
          : {},
      );
      setEditingPromptKey(null);
      return;
    }

    if (TABLE_EDITOR_SUPPORTED.includes(tableName)) {
      setEditMode('table');
      if (data && Array.isArray(data)) {
        setTableEditorData(data.map((item: any) => ({ ...item })));
      } else if (data && typeof data === 'object') {
        // Record-style data (e.g. weaponAttributes) — wrap for table editor
        setTableEditorData(Object.entries(data).map(([k, v]) => ({ attribute: k, max: v })));
      } else {
        setTableEditorData([]);
      }
    } else {
      setEditMode('json');
      setEditedJson(JSON.stringify(data || [], null, 2));
    }
  };

  const handleTableSave = (updatedData: any[]) => {
    if (!editingTable) return;
    // For record-style data (e.g. weaponAttributes), convert back from array
    if (editingTable === 'weaponAttributes') {
      const record: Record<string, number> = {};
      updatedData.forEach((item: any) => {
        if (item.attribute)
          record[item.attribute] =
            typeof item.max === 'number' ? item.max : parseFloat(item.max) || 0;
      });
      useCleanDataStore.getState().setCleanData(editingTable as MainDataKey, record as any);
    } else {
      useCleanDataStore.getState().setCleanData(editingTable as MainDataKey, updatedData);
    }
    setEditingTable(null);
    setTableEditorData([]);
  };

  const handleSave = () => {
    if (!editingTable) return;
    try {
      const parsed = JSON.parse(editedJson);
      useCleanDataStore.getState().setCleanData(editingTable as MainDataKey, parsed);
      setEditingTable(null);
      setEditedJson('');
    } catch (err: any) {
      alert(`Invalid JSON: ${err.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingTable(null);
    setEditedJson('');
    setTableEditorData([]);
    setPromptsData({});
    setEditingPromptKey(null);
  };

  if (!isOpen) return null;

  const nodeMap = Object.fromEntries(CLOUD_NODES.map((n) => [n.key, n]));

  const isConnected = (key: string) =>
    hoveredNode
      ? CONNECTIONS.some(
          ([a, b]) =>
            (a === hoveredNode && b === key) ||
            (b === hoveredNode && a === key) ||
            key === hoveredNode,
        )
      : false;

  return (
    <div className="divisiondb-backdrop" onClick={onClose}>
      <div className="divisiondb-content" onClick={(e) => e.stopPropagation()}>
        <div className="divisiondb-header">
          <h2>DivisionDB</h2>
          <button className="divisiondb-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="divisiondb-body">
          <div className="divisiondb-cloud">
            {/* SVG connection lines */}
            <svg className="divisiondb-cloud-svg">
              {CONNECTIONS.map(([a, b]) => {
                const na = nodeMap[a];
                const nb = nodeMap[b];
                if (!na || !nb) return null;
                const highlighted = hoveredNode === a || hoveredNode === b;
                return (
                  <line
                    key={`${a}-${b}`}
                    x1={`${na.x + 4}%`}
                    y1={`${na.y + 3}%`}
                    x2={`${nb.x + 4}%`}
                    y2={`${nb.y + 3}%`}
                    className={`divisiondb-cloud-line${highlighted ? ' highlighted' : ''}`}
                  />
                );
              })}
            </svg>
            {/* Bubble nodes */}
            {CLOUD_NODES.map((node) => {
              const connected = isConnected(node.key);
              const dimmed = hoveredNode && !connected;
              return (
                <button
                  key={node.key}
                  className={`divisiondb-cloud-node${connected ? ' connected' : ''}${dimmed ? ' dimmed' : ''}`}
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  onClick={() => openEditor(node.key)}
                  onMouseEnter={() => setHoveredNode(node.key)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {node.label}
                </button>
              );
            })}
          </div>
          <p className="divisiondb-hint">Click a node to view and edit its data</p>
        </div>
      </div>

      {editingTable && editMode === 'table' && (
        <DataTableEditor
          tableName={editingTable}
          data={tableEditorData}
          onSave={handleTableSave}
          onCancel={handleCancelEdit}
        />
      )}

      {editingTable && editMode === 'json' && (
        <div className="divisiondb-edit-backdrop" onClick={handleCancelEdit}>
          <div className="divisiondb-edit-content" onClick={(e) => e.stopPropagation()}>
            <div className="divisiondb-edit-header">
              <h3>{editingTable}</h3>
              <button className="divisiondb-close" onClick={handleCancelEdit}>
                &times;
              </button>
            </div>
            <div className="divisiondb-edit-body">
              <textarea
                className="divisiondb-edit-json"
                value={editedJson}
                onChange={(e) => setEditedJson(e.target.value)}
                spellCheck={false}
              />
            </div>
            <div className="divisiondb-edit-actions">
              <button className="divisiondb-cancel-btn" onClick={handleCancelEdit}>
                Cancel
              </button>
              <button className="divisiondb-save-btn" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTable === 'prompts' && editMode === 'prompts' && (
        <div className="divisiondb-edit-backdrop" onClick={handleCancelEdit}>
          <div
            className="divisiondb-edit-content divisiondb-prompts-editor"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="divisiondb-edit-header">
              <h3>Prompts</h3>
              <button className="divisiondb-close" onClick={handleCancelEdit}>
                &times;
              </button>
            </div>
            <div className="divisiondb-edit-body">
              {editingPromptKey === null ? (
                <div className="divisiondb-prompts-list">
                  {Object.keys(promptsData).map((key) => (
                    <button
                      key={key}
                      className="divisiondb-prompt-item"
                      onClick={() => setEditingPromptKey(key)}
                    >
                      <span className="divisiondb-prompt-key">{key}</span>
                      <span className="divisiondb-prompt-preview">
                        {promptsData[key].slice(0, 80)}
                        {promptsData[key].length > 80 ? '…' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <div className="divisiondb-prompt-edit-header">
                    <button
                      className="divisiondb-cancel-btn"
                      onClick={() => setEditingPromptKey(null)}
                    >
                      ← Back
                    </button>
                    <span className="divisiondb-prompt-edit-label">{editingPromptKey}</span>
                  </div>
                  <textarea
                    className="divisiondb-edit-markdown"
                    value={promptsData[editingPromptKey] ?? ''}
                    onChange={(e) =>
                      setPromptsData((prev) => ({ ...prev, [editingPromptKey!]: e.target.value }))
                    }
                    spellCheck={false}
                  />
                </>
              )}
            </div>
            <div className="divisiondb-edit-actions">
              <button className="divisiondb-cancel-btn" onClick={handleCancelEdit}>
                Cancel
              </button>
              <button
                className="divisiondb-save-btn"
                onClick={() => {
                  useCleanDataStore.getState().setCleanData('prompts', promptsData);
                  handleCancelEdit();
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DivisionDBModal;
