import React, { useEffect, useRef, useState } from 'react';
import Mermaid from 'react-mermaid2';
import './DivisionDBModal.css';
import { useCleanDataStore } from '../stores/useCleanDataStore';
import type { MainDataKey } from '../constants/dataKeys';
import DataTableEditor from './DataTableEditor';

const CHART = `graph LR
  weapons["Weapons"]
  weaponMods["WeaponMods"]
  talents["Talents"]
  gearsets["Gearsets"]
  brandsets["Brandsets"]
  namedGear["NamedExoticGear"]
  weapons --- weaponMods
  weapons --- talents
  gearsets --- talents
  namedGear --- talents
`;

const MERMAID_CONFIG = {
  startOnLoad: true,
  theme: 'dark' as const,
  securityLevel: 'loose' as const,
  flowchart: { htmlLabels: true, curve: 'basis' as const },
};

const TABLE_NAMES = ['weapons', 'weaponMods', 'talents', 'gearsets', 'brandsets', 'namedGear'];

interface DivisionDBModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function DivisionDBModal({ isOpen, onClose }: DivisionDBModalProps) {
  const diagramRef = useRef<HTMLDivElement>(null);
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'table' | 'json'>('json');
  const [editedJson, setEditedJson] = useState('');
  const [tableEditorData, setTableEditorData] = useState<any[]>([]);

  // Tables that support the TanStack Table editor
  const TABLE_EDITOR_SUPPORTED = [
    'weapons',
    'weaponMods',
    'talents',
    'gearsets',
    'brandsets',
    'namedGear',
  ];

  useEffect(() => {
    if (!isOpen || !diagramRef.current) return;

    // Wait for mermaid to render, then attach click handlers
    const timer = setTimeout(() => {
      const container = diagramRef.current;
      if (!container) return;

      for (const name of TABLE_NAMES) {
        const node = container.querySelector(`[id*="flowchart-${name}-"]`);
        if (node) {
          (node as HTMLElement).style.cursor = 'pointer';
          node.addEventListener('click', () => openEditor(name));
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const openEditor = (tableName: string) => {
    const data = useCleanDataStore.getState().getCleanData(tableName as MainDataKey);
    setEditingTable(tableName);

    if (TABLE_EDITOR_SUPPORTED.includes(tableName)) {
      setEditMode('table');
      setTableEditorData(data ? data.map((item: any) => ({ ...item })) : []);
    } else {
      setEditMode('json');
      setEditedJson(JSON.stringify(data || [], null, 2));
    }
  };

  const handleTableSave = (updatedData: any[]) => {
    if (!editingTable) return;
    useCleanDataStore.getState().setCleanData(editingTable as MainDataKey, updatedData);
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
  };

  if (!isOpen) return null;

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
          <div className="divisiondb-diagram" ref={diagramRef}>
            <Mermaid name="divisiondb" chart={CHART} config={MERMAID_CONFIG} />
          </div>
          <p className="divisiondb-hint">Click on a node to view and edit its data</p>
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
    </div>
  );
}

export default DivisionDBModal;
