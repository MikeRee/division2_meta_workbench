import React, { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import RecordOverlay from './RecordOverlay';
import FixedSlotsOverlay from './FixedSlotsOverlay';
import ModSlotsOverlay from './ModSlotsOverlay';
import StacksOverlay from './StacksOverlay';
import FixedTalentOverlay from './FixedTalentOverlay';
import WeaponMod from '../models/WeaponMod';
import {
  useCleanDataStore,
  getModelFields,
  getModelFieldTypes,
  CLASS_CONSTRUCTORS,
} from '../stores/useCleanDataStore';
import type { MainDataKey } from '../constants/dataKeys';
import './DataTableEditor.css';

interface DataTableEditorProps {
  tableName: string;
  data: any[];
  onSave: (data: any[]) => void;
  onCancel: () => void;
}

/** Check if a value is a Record<string, number> (plain object with all-number values) */
function isRecordField(val: unknown): val is Record<string, number> {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
  return Object.values(val).every((v) => typeof v === 'number');
}

/** Check if a value is an array of objects (e.g. WeaponMod[]) */
function isObjectArrayField(val: unknown): val is Record<string, any>[] {
  if (!Array.isArray(val)) return false;
  return val.length === 0 || val.every((v) => v && typeof v === 'object' && !Array.isArray(v));
}

/** Check if a value is a nested record: Record<string, Record<string, number>> */
function isNestedRecordField(val: unknown): val is Record<string, Record<string, number>> {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
  return Object.values(val).every(
    (v) =>
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      Object.values(v).every((n) => typeof n === 'number'),
  );
}

/** Render a Record<string, number> as bold key: value spans */
function RecordCell({ record }: { record: Record<string, number> }) {
  const entries = Object.entries(record);
  if (entries.length === 0) return <span className="dt-record-empty">—</span>;
  return (
    <span className="dt-record-cell">
      {entries.map(([k, v], i) => (
        <span key={k}>
          {i > 0 && ', '}
          <b>{k}:</b> {v}
        </span>
      ))}
    </span>
  );
}

/** Render an array-of-objects field as a summary */
function ObjectArrayCell({ items }: { items: Record<string, any>[] }) {
  if (items.length === 0) return <span className="dt-record-empty">—</span>;
  return (
    <span className="dt-record-cell">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && ', '}
          {item.name || `[${i}]`}
        </span>
      ))}
    </span>
  );
}

/** Render a nested Record<string, Record<string, number>> as a summary */
function NestedRecordCell({ record }: { record: Record<string, Record<string, number>> }) {
  const keys = Object.keys(record);
  if (keys.length === 0) return <span className="dt-record-empty">—</span>;
  return (
    <span className="dt-record-cell">
      {keys.map((k, i) => (
        <span key={k}>
          {i > 0 && ', '}
          <b>{k}</b>
        </span>
      ))}
    </span>
  );
}

/** Check if a value is a string[] (array where every element is a string) */
function isStringArrayField(val: unknown): val is string[] {
  if (!Array.isArray(val)) return false;
  return val.length === 0 || val.every((v) => typeof v === 'string');
}

/** Render a string[] as bold, comma-separated labels */
function StringArrayCell({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="dt-record-empty">—</span>;
  return (
    <span className="dt-string-array-cell">
      {items.map((s, i) => (
        <span key={i}>
          {i > 0 && ', '}
          <b>{s}</b>
        </span>
      ))}
    </span>
  );
}

function DataTableEditor({ tableName, data, onSave, onCancel }: DataTableEditorProps) {
  const [tableData, setTableData] = useState<any[]>(() =>
    data.map((row, i) => ({ ...row, __rowId: i })),
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [editingCell, setEditingCell] = useState<{ rowId: number; colId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showJsonViewer, setShowJsonViewer] = useState(false);
  const [jsonViewerValue, setJsonViewerValue] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  // Record overlay state
  const [recordOverlay, setRecordOverlay] = useState<{
    rowId: number;
    colId: string;
    record: Record<string, number>;
  } | null>(null);
  // Fixed slots overlay state
  const [fixedSlotsOverlay, setFixedSlotsOverlay] = useState<{
    rowId: number;
    colId: string;
    slots: Record<string, Record<string, number>>;
  } | null>(null);
  // String array (modSlots) overlay state
  const [modSlotsOverlay, setModSlotsOverlay] = useState<{
    rowId: number;
    colId: string;
    slots: string[];
  } | null>(null);
  // Stacks overlay state
  const [stacksOverlay, setStacksOverlay] = useState<{
    rowId: number;
    colId: string;
    stacks: any[];
  } | null>(null);
  // Fixed talent overlay state
  const [fixedTalentOverlay, setFixedTalentOverlay] = useState<{
    rowId: number;
    colId: string;
    talents: string[];
  } | null>(null);

  // Get available mod types from clean data store
  const availableModTypes = useMemo(() => {
    const mods = useCleanDataStore.getState().getCleanData('weaponMods');
    return mods ? WeaponMod.distinctTypes(mods) : [];
  }, []);

  // Available talent names for the fixedTalent overlay
  const availableTalentNames = useMemo(() => {
    if (tableName !== 'weapons') return [];
    const talents = useCleanDataStore.getState().getCleanData('talents');
    if (!talents) return [];
    return [...new Set(talents.map((t: any) => t.name).filter(Boolean))].sort() as string[];
  }, [tableName]);

  // Columns that should use a talent-name dropdown (gearsets: fourPc, chest, backpack)
  const TALENT_REF_COLUMNS = new Set(
    tableName === 'gearsets' ? ['fourPc', 'chest', 'backpack'] : [],
  );

  // All available talent names for gearset talent-ref dropdowns (from talents + gearTalents)
  const allTalentOptions = useMemo(() => {
    if (tableName !== 'gearsets') return [] as string[];
    const names = new Set<string>();
    const talents = useCleanDataStore.getState().getCleanData('talents');
    if (talents)
      talents.forEach((t: any) => {
        if (t.name) names.add(t.name);
      });
    const gearTalents = useCleanDataStore.getState().getCleanData('gearTalents');
    if (gearTalents)
      gearTalents.forEach((t: any) => {
        if (t.talent) names.add(t.talent);
      });
    // Also include any existing values from the data itself (gearset-specific talent names)
    for (const row of tableData) {
      for (const col of ['fourPc', 'chest', 'backpack']) {
        if (row[col] && typeof row[col] === 'string') names.add(row[col]);
      }
    }
    return [...names].sort();
  }, [tableName, tableData]);

  // Columns that are always treated as object arrays even when all rows are empty
  const KNOWN_OBJECT_ARRAY_COLUMNS = new Set(['stacks', 'perfectStacks']);

  // Columns that are always treated as nested records (Record<string, Record<string, number>>)
  const KNOWN_NESTED_RECORD_COLUMNS = new Set(['fixedSlots']);

  // Model field types — the source of truth for column type detection
  const modelFieldTypes = useMemo(() => getModelFieldTypes(tableName as MainDataKey), [tableName]);

  // Columns that are always treated as Record<string, number>
  const KNOWN_RECORD_COLUMNS = new Set(['fixedPrimary1', 'fixedPrimary2', 'fixedSecondary']);

  // Detect which columns are Record<string, number>
  const recordColumns = useMemo(() => {
    const cols = new Set<string>();
    for (const [key, type] of Object.entries(modelFieldTypes)) {
      if (type === 'Record<string, number>') cols.add(key);
    }
    // Fallback for models without FIELD_TYPES
    if (!Object.keys(modelFieldTypes).length && tableData.length) {
      for (const key of Object.keys(tableData[0])) {
        if (key === '__rowId') continue;
        if (
          KNOWN_RECORD_COLUMNS.has(key) ||
          tableData.slice(0, 5).every((row) => isRecordField(row[key]))
        ) {
          cols.add(key);
        }
      }
    }
    return cols;
  }, [modelFieldTypes, tableData]);

  // Columns that should use the stacks overlay
  const KNOWN_STACKS_COLUMNS = new Set(['stacks', 'perfectStacks']);

  // Detect which columns are arrays of objects (e.g. stacks)
  const objectArrayColumns = useMemo(() => {
    const cols = new Set<string>();
    for (const [key, type] of Object.entries(modelFieldTypes)) {
      if (type === 'Stack[]' || type === 'object[]') cols.add(key);
    }
    // Fallback for models without FIELD_TYPES
    if (!Object.keys(modelFieldTypes).length && tableData.length) {
      for (const key of Object.keys(tableData[0])) {
        if (key === '__rowId') continue;
        const sample = tableData.slice(0, 20);
        const allArrays = sample.every((row) => Array.isArray(row[key]));
        if (!allArrays) continue;
        const hasObjectRow = sample.some(
          (row) =>
            Array.isArray(row[key]) &&
            row[key].length > 0 &&
            row[key].every((v: any) => v && typeof v === 'object' && !Array.isArray(v)),
        );
        if (hasObjectRow || KNOWN_OBJECT_ARRAY_COLUMNS.has(key)) {
          cols.add(key);
        }
      }
    }
    return cols;
  }, [modelFieldTypes, tableData]);

  // Detect which columns are nested records: Record<string, Record<string, number>>
  const nestedRecordColumns = useMemo(() => {
    const cols = new Set<string>();
    for (const [key, type] of Object.entries(modelFieldTypes)) {
      if (type.includes('Record<string, Record<string, number>>')) cols.add(key);
    }
    // Fallback for models without FIELD_TYPES
    if (!Object.keys(modelFieldTypes).length && tableData.length) {
      for (const key of Object.keys(tableData[0])) {
        if (key === '__rowId') continue;
        if (objectArrayColumns.has(key)) continue;
        const sample = tableData.slice(0, 20);
        const hasNestedRecord = sample.some(
          (row) => isNestedRecordField(row[key]) && Object.keys(row[key]).length > 0,
        );
        if (hasNestedRecord || KNOWN_NESTED_RECORD_COLUMNS.has(key)) {
          cols.add(key);
        }
      }
    }
    return cols;
  }, [modelFieldTypes, tableData, objectArrayColumns]);

  // Detect which columns are string arrays
  const stringArrayColumns = useMemo(() => {
    const cols = new Set<string>();
    for (const [key, type] of Object.entries(modelFieldTypes)) {
      if (type === 'string[]' || type === 'CoreType[]') cols.add(key);
    }
    // Fallback for models without FIELD_TYPES
    if (!Object.keys(modelFieldTypes).length && tableData.length) {
      for (const key of Object.keys(tableData[0])) {
        if (key === '__rowId') continue;
        if (objectArrayColumns.has(key)) continue;
        const sample = tableData.slice(0, 20);
        const allArrays = sample.every((row) => Array.isArray(row[key]));
        const hasStringRow = sample.some(
          (row) =>
            Array.isArray(row[key]) &&
            row[key].length > 0 &&
            row[key].every((v: any) => typeof v === 'string'),
        );
        if (allArrays && hasStringRow) {
          cols.add(key);
        }
      }
    }
    return cols;
  }, [modelFieldTypes, tableData, objectArrayColumns]);

  // Detect boolean columns
  const booleanColumns = useMemo(() => {
    const cols = new Set<string>();
    for (const [key, type] of Object.entries(modelFieldTypes)) {
      if (type === 'boolean') cols.add(key);
    }
    // Fallback for models without FIELD_TYPES
    if (!Object.keys(modelFieldTypes).length && tableData.length) {
      for (const key of Object.keys(tableData[0])) {
        if (key === '__rowId') continue;
        if (tableData.slice(0, 20).every((row) => typeof row[key] === 'boolean')) {
          cols.add(key);
        }
      }
    }
    return cols;
  }, [tableData]);

  // Detect enum-like columns: string columns with a small set of distinct values
  const enumColumns = useMemo<Map<string, string[]>>(() => {
    const MAX_DISTINCT = 20;
    const result = new Map<string, string[]>();
    if (!tableData.length) return result;
    for (const key of Object.keys(tableData[0])) {
      if (key === '__rowId') continue;
      if (
        recordColumns.has(key) ||
        objectArrayColumns.has(key) ||
        nestedRecordColumns.has(key) ||
        stringArrayColumns.has(key)
      )
        continue;
      const vals = new Set<string>();
      let allStringsOrNull = true;
      for (const row of tableData) {
        const v = row[key];
        if (v === null || v === undefined) continue;
        if (typeof v !== 'string') {
          allStringsOrNull = false;
          break;
        }
        vals.add(v);
        if (vals.size > MAX_DISTINCT) {
          allStringsOrNull = false;
          break;
        }
      }
      if (allStringsOrNull && vals.size >= 2 && vals.size <= MAX_DISTINCT) {
        result.set(key, Array.from(vals).sort());
      }
    }
    return result;
  }, [tableData, recordColumns, objectArrayColumns, nestedRecordColumns, stringArrayColumns]);

  // Derive columns from data keys
  const columns = useMemo<ColumnDef<any, any>[]>(() => {
    let keys: string[];
    const modelFields = getModelFields(tableName as MainDataKey);
    if (modelFields.length) {
      // Use model-defined fields as the source of truth so stray JSON properties don't leak through
      keys = modelFields;
    } else if (data.length) {
      keys = Object.keys(data[0]).filter((k) => k !== '__rowId');
    } else {
      keys = [];
    }
    if (!keys.length) return [];
    const helper = createColumnHelper<any>();

    return keys.map((key) =>
      helper.accessor(key, {
        header: key,
        cell: (info) => {
          const val = info.getValue();
          if (recordColumns.has(key) && isRecordField(val)) {
            return <RecordCell record={val} />;
          }
          if (objectArrayColumns.has(key) && isObjectArrayField(val)) {
            return <ObjectArrayCell items={val} />;
          }
          if (nestedRecordColumns.has(key)) {
            const record = val && typeof val === 'object' && !Array.isArray(val) ? val : {};
            return <NestedRecordCell record={record} />;
          }
          if (stringArrayColumns.has(key) && isStringArrayField(val)) {
            return <StringArrayCell items={val} />;
          }
          if (TALENT_REF_COLUMNS.has(key)) {
            return <b className="dt-talent-ref">{String(val ?? '')}</b>;
          }
          if (enumColumns.has(key)) {
            return <b>{String(val ?? '')}</b>;
          }
          if (booleanColumns.has(key)) {
            return (
              <input
                type="checkbox"
                checked={!!val}
                readOnly
                className="dt-bool-checkbox"
                aria-label={key}
              />
            );
          }
          if (val && typeof val === 'object') return JSON.stringify(val);
          return String(val ?? '');
        },
      }),
    );
  }, [data, recordColumns, enumColumns]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => String(row.__rowId),
  });

  const startEditing = useCallback((rowId: number, colId: string, currentValue: any) => {
    setEditingCell({ rowId, colId });
    if (currentValue && typeof currentValue === 'object') {
      setEditValue(JSON.stringify(currentValue));
    } else {
      setEditValue(String(currentValue ?? ''));
    }
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const { rowId, colId } = editingCell;

    setTableData((prev) =>
      prev.map((row) => {
        if (row.__rowId !== rowId) return row;
        let newVal: any = editValue;
        try {
          const parsed = JSON.parse(editValue);
          if (typeof parsed === 'object') newVal = parsed;
        } catch {
          if (editValue !== '' && !isNaN(Number(editValue))) {
            newVal = Number(editValue);
          }
        }
        return { ...row, [colId]: newVal };
      }),
    );
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    },
    [commitEdit, cancelEdit],
  );

  const handleCellClick = useCallback(
    (rowId: number, colId: string, value: any) => {
      if (recordColumns.has(colId) && isRecordField(value)) {
        setRecordOverlay({ rowId, colId, record: { ...value } });
      } else if (KNOWN_STACKS_COLUMNS.has(colId) && isObjectArrayField(value)) {
        setStacksOverlay({
          rowId,
          colId,
          stacks: value.map((s: any) => ({ ...s, bonus: { ...(s.bonus || {}) } })),
        });
      } else if (nestedRecordColumns.has(colId)) {
        const slots =
          value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
        setFixedSlotsOverlay({
          rowId,
          colId,
          slots,
        });
      } else if (colId === 'fixedTalent' && stringArrayColumns.has(colId)) {
        const arr = Array.isArray(value) ? [...value] : [];
        setFixedTalentOverlay({ rowId, colId, talents: arr });
      } else if (stringArrayColumns.has(colId)) {
        const arr = Array.isArray(value) ? [...value] : [];
        setModSlotsOverlay({ rowId, colId, slots: arr });
      }
    },
    [recordColumns, objectArrayColumns, nestedRecordColumns, stringArrayColumns],
  );

  const handleRecordSave = useCallback(
    (updated: Record<string, number>) => {
      if (!recordOverlay) return;
      const { rowId, colId } = recordOverlay;
      setTableData((prev) =>
        prev.map((row) => (row.__rowId === rowId ? { ...row, [colId]: updated } : row)),
      );
      setRecordOverlay(null);
    },
    [recordOverlay],
  );

  const handleFixedSlotsSave = useCallback(
    (updated: Record<string, Record<string, number>>) => {
      if (!fixedSlotsOverlay) return;
      const { rowId, colId } = fixedSlotsOverlay;
      setTableData((prev) =>
        prev.map((row) => (row.__rowId === rowId ? { ...row, [colId]: updated } : row)),
      );
      setFixedSlotsOverlay(null);
    },
    [fixedSlotsOverlay],
  );

  const handleModSlotsSave = useCallback(
    (updated: string[]) => {
      if (!modSlotsOverlay) return;
      const { rowId, colId } = modSlotsOverlay;
      setTableData((prev) =>
        prev.map((row) => (row.__rowId === rowId ? { ...row, [colId]: updated } : row)),
      );
      setModSlotsOverlay(null);
    },
    [modSlotsOverlay],
  );

  const handleStacksSave = useCallback(
    (updated: any[]) => {
      if (!stacksOverlay) return;
      const { rowId, colId } = stacksOverlay;
      setTableData((prev) =>
        prev.map((row) => (row.__rowId === rowId ? { ...row, [colId]: updated } : row)),
      );
      setStacksOverlay(null);
    },
    [stacksOverlay],
  );

  const handleFixedTalentSave = useCallback(
    (updated: string[]) => {
      if (!fixedTalentOverlay) return;
      const { rowId, colId } = fixedTalentOverlay;
      setTableData((prev) =>
        prev.map((row) => (row.__rowId === rowId ? { ...row, [colId]: updated } : row)),
      );
      setFixedTalentOverlay(null);
    },
    [fixedTalentOverlay],
  );

  const openJsonViewer = useCallback(() => {
    const cleaned = tableData.map(({ __rowId, ...rest }) => rest);
    setJsonViewerValue(JSON.stringify(cleaned, null, 2));
    setJsonError(null);
    setShowJsonViewer(true);
  }, [tableData]);

  const handleJsonSave = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonViewerValue);
      if (!Array.isArray(parsed)) {
        setJsonError('JSON must be an array');
        return;
      }
      // Update table data with new __rowIds and trigger save through onSave
      // which goes through setCleanData → restoreClassInstances for rehydration
      const rehydrated = parsed.map((row: any, i: number) => ({ ...row, __rowId: i }));
      setTableData(rehydrated);
      setShowJsonViewer(false);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message);
    }
  }, [jsonViewerValue]);

  const addRow = useCallback(() => {
    let template: Record<string, any>;
    if (data.length) {
      template = Object.keys(data[0]).reduce(
        (acc, key) => {
          const sample = data[0][key];
          if (typeof sample === 'object' && sample !== null) {
            acc[key] = Array.isArray(sample) ? [] : {};
          } else if (typeof sample === 'number') {
            acc[key] = 0;
          } else {
            acc[key] = '';
          }
          return acc;
        },
        {} as Record<string, any>,
      );
    } else {
      const Constructor = CLASS_CONSTRUCTORS[tableName as MainDataKey];
      if (Constructor) {
        const instance = new Constructor({});
        template = Object.keys(instance).reduce(
          (acc, key) => {
            const val = (instance as any)[key];
            if (Array.isArray(val)) acc[key] = [];
            else if (val && typeof val === 'object') acc[key] = {};
            else if (typeof val === 'number') acc[key] = 0;
            else acc[key] = '';
            return acc;
          },
          {} as Record<string, any>,
        );
      } else {
        const fields = getModelFields(tableName as MainDataKey);
        if (!fields.length) return;
        template = fields.reduce(
          (acc, key) => {
            acc[key] = '';
            return acc;
          },
          {} as Record<string, any>,
        );
      }
    }
    const newId = Math.max(...tableData.map((r) => r.__rowId), 0) + 1;
    setTableData((prev) => [...prev, { ...template, __rowId: newId }]);
  }, [data, tableData, tableName]);

  const deleteRow = useCallback((rowId: number) => {
    setTableData((prev) => prev.filter((r) => r.__rowId !== rowId));
  }, []);

  const handleSave = useCallback(() => {
    const cleaned = tableData.map(({ __rowId, ...rest }) => rest);
    onSave(cleaned);
  }, [tableData, onSave]);

  return (
    <div className="dt-editor-backdrop" onClick={onCancel}>
      <div className="dt-editor-content" onClick={(e) => e.stopPropagation()}>
        <div className="dt-editor-header">
          <h3>{tableName}</h3>
          <div className="dt-editor-toolbar">
            <input
              className="dt-editor-search"
              type="text"
              placeholder="Search..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              aria-label="Search table"
            />
            <button className="dt-editor-add-btn" onClick={addRow}>
              + Add Row
            </button>
            <button
              className="dt-editor-json-btn"
              onClick={openJsonViewer}
              title="View/Edit as JSON"
              aria-label="View JSON"
            >
              {'{ }'}
            </button>
          </div>
          <button className="divisiondb-close" onClick={onCancel}>
            &times;
          </button>
        </div>
        <div className="dt-editor-body">
          <table className="dt-editor-table">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={header.column.getIsSorted() ? 'dt-sorted' : ''}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as string] ?? ''}
                    </th>
                  ))}
                  <th className="dt-actions-col">Actions</th>
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const rowId = row.original.__rowId;
                    const colId = cell.column.id;
                    const value = row.original[colId];
                    const isRecord = recordColumns.has(colId) && isRecordField(value);
                    const isObjArray = objectArrayColumns.has(colId) && isObjectArrayField(value);
                    const isNestedRecord = nestedRecordColumns.has(colId);
                    const isStrArray = stringArrayColumns.has(colId) && isStringArrayField(value);
                    const isEnum = enumColumns.has(colId);
                    const isTalentRef = TALENT_REF_COLUMNS.has(colId);
                    const isBool = booleanColumns.has(colId);
                    const isClickable = isRecord || isObjArray || isNestedRecord || isStrArray;
                    const isEditing = editingCell?.rowId === rowId && editingCell?.colId === colId;

                    return (
                      <td
                        key={cell.id}
                        className={
                          isRecord || isObjArray || isNestedRecord
                            ? 'dt-record-td'
                            : isStrArray
                              ? 'dt-string-array-td'
                              : isBool
                                ? 'dt-bool-td'
                                : ''
                        }
                        onClick={
                          isClickable
                            ? () => handleCellClick(rowId, colId, value)
                            : isBool
                              ? () =>
                                  setTableData((prev) =>
                                    prev.map((row) =>
                                      row.__rowId === rowId ? { ...row, [colId]: !value } : row,
                                    ),
                                  )
                              : undefined
                        }
                        onDoubleClick={
                          !isClickable && !isBool
                            ? () => startEditing(rowId, colId, value)
                            : undefined
                        }
                      >
                        {isEditing && isTalentRef ? (
                          <select
                            className="dt-cell-input"
                            value={editValue}
                            onChange={(e) => {
                              setEditValue(e.target.value);
                              setTableData((prev) =>
                                prev.map((row) =>
                                  row.__rowId === rowId ? { ...row, [colId]: e.target.value } : row,
                                ),
                              );
                              setEditingCell(null);
                              setEditValue('');
                            }}
                            onBlur={cancelEdit}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            aria-label={`Edit ${colId}`}
                          >
                            <option value="">— select talent —</option>
                            {allTalentOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : isEditing && isEnum ? (
                          <select
                            className="dt-cell-input"
                            value={editValue}
                            onChange={(e) => {
                              setEditValue(e.target.value);
                              setTableData((prev) =>
                                prev.map((row) =>
                                  row.__rowId === rowId ? { ...row, [colId]: e.target.value } : row,
                                ),
                              );
                              setEditingCell(null);
                              setEditValue('');
                            }}
                            onBlur={cancelEdit}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            aria-label={`Edit ${colId}`}
                          >
                            {enumColumns.get(colId)!.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : isEditing ? (
                          <input
                            className="dt-cell-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            aria-label={`Edit ${colId}`}
                          />
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </td>
                    );
                  })}
                  <td className="dt-actions-col">
                    <button
                      className="dt-delete-btn"
                      onClick={() => deleteRow(row.original.__rowId)}
                      aria-label="Delete row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {table.getRowModel().rows.length === 0 && <div className="dt-empty">No data</div>}
        </div>
        <div className="dt-editor-actions">
          <span className="dt-row-count">{tableData.length} rows</span>
          <div className="dt-editor-buttons">
            <button className="divisiondb-cancel-btn" onClick={onCancel}>
              Cancel
            </button>
            <button className="divisiondb-save-btn" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>

      {recordOverlay && (
        <RecordOverlay
          title={recordOverlay.colId}
          record={recordOverlay.record}
          onSave={handleRecordSave}
          onClose={() => setRecordOverlay(null)}
        />
      )}

      {fixedSlotsOverlay && (
        <FixedSlotsOverlay
          title={fixedSlotsOverlay.colId}
          slots={fixedSlotsOverlay.slots}
          onSave={handleFixedSlotsSave}
          onClose={() => setFixedSlotsOverlay(null)}
        />
      )}

      {modSlotsOverlay && (
        <ModSlotsOverlay
          title={modSlotsOverlay.colId}
          slots={modSlotsOverlay.slots}
          availableTypes={availableModTypes}
          onSave={handleModSlotsSave}
          onClose={() => setModSlotsOverlay(null)}
        />
      )}

      {stacksOverlay && (
        <StacksOverlay
          title={stacksOverlay.colId}
          stacks={stacksOverlay.stacks}
          onSave={handleStacksSave}
          onClose={() => setStacksOverlay(null)}
        />
      )}

      {fixedTalentOverlay && (
        <FixedTalentOverlay
          title={fixedTalentOverlay.colId}
          talents={fixedTalentOverlay.talents}
          availableTalents={availableTalentNames}
          onSave={handleFixedTalentSave}
          onClose={() => setFixedTalentOverlay(null)}
        />
      )}

      {showJsonViewer && (
        <div className="dt-json-backdrop" onClick={() => setShowJsonViewer(false)}>
          <div className="dt-json-content" onClick={(e) => e.stopPropagation()}>
            <div className="dt-json-header">
              <h3>{tableName} — JSON</h3>
              <button className="divisiondb-close" onClick={() => setShowJsonViewer(false)}>
                &times;
              </button>
            </div>
            <div className="dt-json-body">
              <textarea
                className="dt-json-textarea"
                value={jsonViewerValue}
                onChange={(e) => {
                  setJsonViewerValue(e.target.value);
                  setJsonError(null);
                }}
                spellCheck={false}
              />
              {jsonError && <div className="dt-json-error">Invalid JSON: {jsonError}</div>}
            </div>
            <div className="dt-json-actions">
              <button className="divisiondb-cancel-btn" onClick={() => setShowJsonViewer(false)}>
                Cancel
              </button>
              <button className="divisiondb-save-btn" onClick={handleJsonSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTableEditor;
