import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import 'blockly/javascript';
import { javascriptGenerator } from 'blockly/javascript';
import { useFormulaStore } from '../stores/useFormulaStore';
import { useLookupStore } from '../stores/useLookupStore';
import { useCleanDataStore } from '../stores/useCleanDataStore';
import useBuildStore from '../stores/useBuildStore';
import { Formula, FormulaType } from '../models/Formula';
import FormulaJsonModal from './FormulaJsonModal';
import Weapon from '../models/Weapon';
import BuildGear from '../models/BuildGear';
import { CoreType } from '../models/CoreValue';
import { MdAdd, MdDelete, MdEdit, MdArrowUpward, MdArrowDownward, MdCode, MdCheck, MdClose } from 'react-icons/md';
import './FormulaConfigOverlay.css';

interface FormulaConfigOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

// Build dropdown options from model static methods
const weaponProps = Weapon.blocklyProperties();
const gearProps = BuildGear.blocklyProperties();

// Module-level state for aggregated values that Blockly callbacks can access
let currentAggregatedValues: Record<string, number> = {};

// Function to update the aggregated values (called from React component)
function setBlocklyAggregatedValues(values: Record<string, number>) {
  currentAggregatedValues = values;
}

// Helper to format value for display in dropdown
function formatBlocklyValue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  if (!Number.isInteger(value)) return value.toFixed(1);
  return value.toString();
}

// Helper to get value suffix for a key (exact match only)
function getValueSuffix(key: string): string {
  const lowerKey = key.toLowerCase();
  const value = currentAggregatedValues[lowerKey];
  if (value !== undefined) {
    return ` [${formatBlocklyValue(value)}]`;
  }
  return '';
}

// Register custom blocks for stat formulas
function registerCustomBlocks() {
  if (Blockly.Blocks['base_weapon']) return; // already registered

  Blockly.Blocks['base_weapon'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('base weapon')
        .appendField(new Blockly.FieldDropdown(() => {
          return weaponProps.map(([label, value]) => [label + getValueSuffix(value), value] as [string, string]);
        }), 'PROP');
      this.setOutput(true, 'Number');
      this.setColour(30);
      this.setTooltip('Get a base weapon property value');
    }
  };
  javascriptGenerator.forBlock['base_weapon'] = function (block: Blockly.Block) {
    const prop = block.getFieldValue('PROP');
    return [`getBaseWeapon("${prop}")`, 0];
  };

  Blockly.Blocks['base_gear'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('base gear')
        .appendField(new Blockly.FieldDropdown(gearProps), 'PROP');
      this.setOutput(true, 'Number');
      this.setColour(60);
      this.setTooltip('Get a base gear property value');
    }
  };
  javascriptGenerator.forBlock['base_gear'] = function (block: Blockly.Block) {
    const prop = block.getFieldValue('PROP');
    return [`getBaseGear("${prop}")`, 0];
  };

  Blockly.Blocks['stat_constant'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('value')
        .appendField(new Blockly.FieldTextInput('0'), 'VALUE');
      this.setOutput(true, null);
      this.setColour(160);
      this.setTooltip('A constant value (number or string)');
    }
  };
  javascriptGenerator.forBlock['stat_constant'] = function (block: Blockly.Block) {
    const value = block.getFieldValue('VALUE');
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== '') {
      return [String(num), 0];
    }
    return [`"${value}"`, 0];
  };

  Blockly.Blocks['stat_add'] = {
    init(this: Blockly.Block) {
      this.appendValueInput('A').setCheck('Number');
      this.appendDummyInput().appendField('+');
      this.appendValueInput('B').setCheck('Number');
      this.setOutput(true, 'Number');
      this.setColour(120);
      this.setInputsInline(true);
      this.setTooltip('Add two values');
    }
  };
  javascriptGenerator.forBlock['stat_add'] = function (block: Blockly.Block) {
    const a = javascriptGenerator.valueToCode(block, 'A', 0) || '0';
    const b = javascriptGenerator.valueToCode(block, 'B', 0) || '0';
    return [`(${a} + ${b})`, 0];
  };

  Blockly.Blocks['stat_subtract'] = {
    init(this: Blockly.Block) {
      this.appendValueInput('A').setCheck('Number');
      this.appendDummyInput().appendField('−');
      this.appendValueInput('B').setCheck('Number');
      this.setOutput(true, 'Number');
      this.setColour(120);
      this.setInputsInline(true);
      this.setTooltip('Subtract two values');
    }
  };
  javascriptGenerator.forBlock['stat_subtract'] = function (block: Blockly.Block) {
    const a = javascriptGenerator.valueToCode(block, 'A', 0) || '0';
    const b = javascriptGenerator.valueToCode(block, 'B', 0) || '0';
    return [`(${a} - ${b})`, 0];
  };

  Blockly.Blocks['stat_multiply'] = {
    init(this: Blockly.Block) {
      this.appendValueInput('A').setCheck('Number');
      this.appendDummyInput().appendField('×');
      this.appendValueInput('B').setCheck('Number');
      this.setOutput(true, 'Number');
      this.setColour(120);
      this.setInputsInline(true);
      this.setTooltip('Multiply two values');
    }
  };
  javascriptGenerator.forBlock['stat_multiply'] = function (block: Blockly.Block) {
    const a = javascriptGenerator.valueToCode(block, 'A', 0) || '0';
    const b = javascriptGenerator.valueToCode(block, 'B', 0) || '0';
    return [`(${a} * ${b})`, 0];
  };

  Blockly.Blocks['stat_divide'] = {
    init(this: Blockly.Block) {
      this.appendValueInput('A').setCheck('Number');
      this.appendDummyInput().appendField('÷');
      this.appendValueInput('B').setCheck('Number');
      this.setOutput(true, 'Number');
      this.setColour(120);
      this.setInputsInline(true);
      this.setTooltip('Divide two values');
    }
  };
  javascriptGenerator.forBlock['stat_divide'] = function (block: Blockly.Block) {
    const a = javascriptGenerator.valueToCode(block, 'A', 0) || '0';
    const b = javascriptGenerator.valueToCode(block, 'B', 0) || '1';
    return [`(${a} / ${b})`, 0];
  };

  Blockly.Blocks['stat_sum_all'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('sum all')
        .appendField(new Blockly.FieldDropdown(() => {
          const lookupVocab = useLookupStore.getState().getAttributeVocabulary();
          const cleanVocab = useCleanDataStore.getState().getAttributeVocabulary();
          const merged = new Map<string, string>([...lookupVocab, ...cleanVocab]);
          const vocab = Array.from(merged.entries())
            .map(([k, v]) => [k + getValueSuffix(k), v] as [string, string])
            .sort((a, b) => a[0].localeCompare(b[0]));
          return vocab.length > 0 ? vocab : [['(no data loaded)', '']];
        }), 'ATTR');
      this.setOutput(true, 'Number');
      this.setColour(260);
      this.setTooltip('Sum all instances of an attribute across the build');
    }
  };
  javascriptGenerator.forBlock['stat_sum_all'] = function (block: Blockly.Block) {
    const attr = block.getFieldValue('ATTR');
    return [`sumAll("${attr}")`, 0];
  };

  Blockly.Blocks['stat_percent_all'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('percent all')
        .appendField(new Blockly.FieldDropdown(() => {
          const lookupVocab = useLookupStore.getState().getAttributeVocabulary();
          const cleanVocab = useCleanDataStore.getState().getAttributeVocabulary();
          const merged = new Map<string, string>([...lookupVocab, ...cleanVocab]);
          const vocab = Array.from(merged.entries())
            .map(([k, v]) => [k + getValueSuffix(k), v] as [string, string])
            .sort((a, b) => a[0].localeCompare(b[0]));
          return vocab.length > 0 ? vocab : [['(no data loaded)', '']];
        }), 'ATTR');
      this.setOutput(true, 'Number');
      this.setColour(290);
      this.setTooltip('Sum all instances of an attribute as a percentage (value / 100)');
    }
  };
  javascriptGenerator.forBlock['stat_percent_all'] = function (block: Blockly.Block) {
    const attr = block.getFieldValue('ATTR');
    return [`(sumAll("${attr}") / 100)`, 0];
  };

  const coreTypeOptions: [string, string][] = Object.entries(CoreType).map(
    ([label, value]) => [label.replace(/([A-Z])/g, ' $1').trim(), value]
  );

  Blockly.Blocks['stat_core'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('core')
        .appendField(new Blockly.FieldDropdown(() => {
          return coreTypeOptions.map(([label, value]) => [label + getValueSuffix(value), value] as [string, string]);
        }), 'CORE');
      this.setOutput(true, 'Number');
      this.setColour(0);
      this.setTooltip('Get the sum of a core attribute type across all gear');
    }
  };
  javascriptGenerator.forBlock['stat_core'] = function (block: Blockly.Block) {
    const core = block.getFieldValue('CORE');
    return [`getCore("${core}")`, 0];
  };

  // --- Logic blocks ---
  Blockly.Blocks['logic_if_then_else'] = {
    init(this: Blockly.Block) {
      this.appendValueInput('COND').setCheck('Boolean').appendField('if');
      this.appendValueInput('THEN').appendField('then');
      this.appendValueInput('ELSE').appendField('else');
      this.setOutput(true, null);
      this.setColour(210);
      this.setInputsInline(false);
      this.setTooltip('If condition is true, return then value, otherwise else value');
    }
  };
  javascriptGenerator.forBlock['logic_if_then_else'] = function (block: Blockly.Block) {
    const cond = javascriptGenerator.valueToCode(block, 'COND', 0) || 'false';
    const thenVal = javascriptGenerator.valueToCode(block, 'THEN', 0) || '0';
    const elseVal = javascriptGenerator.valueToCode(block, 'ELSE', 0) || '0';
    return [`(${cond} ? ${thenVal} : ${elseVal})`, 0];
  };

  Blockly.Blocks['logic_compare'] = {
    init(this: Blockly.Block) {
      this.appendValueInput('A');
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ['=', '==='],
          ['≠', '!=='],
          ['<', '<'],
          ['>', '>'],
          ['≤', '<='],
          ['≥', '>='],
        ]), 'OP');
      this.appendValueInput('B');
      this.setOutput(true, 'Boolean');
      this.setColour(210);
      this.setInputsInline(true);
      this.setTooltip('Compare two values');
    }
  };
  javascriptGenerator.forBlock['logic_compare'] = function (block: Blockly.Block) {
    const a = javascriptGenerator.valueToCode(block, 'A', 0) || '0';
    const op = block.getFieldValue('OP');
    const b = javascriptGenerator.valueToCode(block, 'B', 0) || '0';
    return [`(${a} ${op} ${b})`, 0];
  };

  Blockly.Blocks['logic_and_or'] = {
    init(this: Blockly.Block) {
      this.appendValueInput('A').setCheck('Boolean');
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ['and', '&&'],
          ['or', '||'],
        ]), 'OP');
      this.appendValueInput('B').setCheck('Boolean');
      this.setOutput(true, 'Boolean');
      this.setColour(210);
      this.setInputsInline(true);
      this.setTooltip('Combine two conditions with AND / OR');
    }
  };
  javascriptGenerator.forBlock['logic_and_or'] = function (block: Blockly.Block) {
    const a = javascriptGenerator.valueToCode(block, 'A', 0) || 'false';
    const op = block.getFieldValue('OP');
    const b = javascriptGenerator.valueToCode(block, 'B', 0) || 'false';
    return [`(${a} ${op} ${b})`, 0];
  };

  Blockly.Blocks['logic_not'] = {
    init(this: Blockly.Block) {
      this.appendValueInput('VAL').setCheck('Boolean').appendField('not');
      this.setOutput(true, 'Boolean');
      this.setColour(210);
      this.setInputsInline(true);
      this.setTooltip('Negate a condition');
    }
  };
  javascriptGenerator.forBlock['logic_not'] = function (block: Blockly.Block) {
    const val = javascriptGenerator.valueToCode(block, 'VAL', 0) || 'false';
    return [`(!${val})`, 0];
  };

  Blockly.Blocks['logic_boolean'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ['true', 'true'],
          ['false', 'false'],
        ]), 'BOOL');
      this.setOutput(true, 'Boolean');
      this.setColour(210);
      this.setTooltip('A boolean constant');
    }
  };
  javascriptGenerator.forBlock['logic_boolean'] = function (block: Blockly.Block) {
    return [block.getFieldValue('BOOL'), 0];
  };

  Blockly.Blocks['stat_round'] = {
    init(this: Blockly.Block) {
      this.appendValueInput('VALUE').setCheck('Number').appendField('round');
      this.appendDummyInput()
        .appendField('to')
        .appendField(new Blockly.FieldNumber(0, 0, 10), 'DECIMALS')
        .appendField('decimals');
      this.setOutput(true, 'Number');
      this.setColour(160);
      this.setInputsInline(true);
      this.setTooltip('Round a value to N decimal places');
    }
  };
  javascriptGenerator.forBlock['stat_round'] = function (block: Blockly.Block) {
    const value = javascriptGenerator.valueToCode(block, 'VALUE', 0) || '0';
    const decimals = block.getFieldValue('DECIMALS');
    return [`round(${value}, ${decimals})`, 0];
  };
}

const TOOLBOX: Blockly.utils.toolbox.ToolboxDefinition = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Data',
      colour: '230',
      contents: [
        { kind: 'block', type: 'base_weapon' },
        { kind: 'block', type: 'base_gear' },
        { kind: 'block', type: 'stat_sum_all' },
        { kind: 'block', type: 'stat_percent_all' },
        { kind: 'block', type: 'stat_core' },
      ],
    },
    {
      kind: 'category',
      name: 'Math',
      colour: '120',
      contents: [
        { kind: 'block', type: 'stat_add' },
        { kind: 'block', type: 'stat_subtract' },
        { kind: 'block', type: 'stat_multiply' },
        { kind: 'block', type: 'stat_divide' },
        { kind: 'block', type: 'stat_round' },
        { kind: 'block', type: 'stat_constant' },
      ],
    },
    {
      kind: 'category',
      name: 'Logic',
      colour: '210',
      contents: [
        { kind: 'block', type: 'logic_if_then_else' },
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_and_or' },
        { kind: 'block', type: 'logic_not' },
        { kind: 'block', type: 'logic_boolean' },
      ],
    },
  ],
};


// --- Blockly Editor for a single formula ---
interface BlocklyEditorProps {
  formula: Formula;
  onSave: (formula: Formula) => void;
  onCancel: () => void;
}

function BlocklyEditor({ formula, onSave, onCancel }: BlocklyEditorProps) {
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [label, setLabel] = useState(formula.label);
  const [formulaType, setFormulaType] = useState<FormulaType>(formula.type);

  useEffect(() => {
    registerCustomBlocks();
    if (!blocklyDiv.current) return;

    const workspace = Blockly.inject(blocklyDiv.current, {
      toolbox: TOOLBOX,
      grid: { spacing: 20, length: 3, colour: '#333', snap: true },
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3 },
      trashcan: true,
      theme: Blockly.Theme.defineTheme('dark', {
        name: 'dark',
        base: Blockly.Themes.Classic,
        componentStyles: {
          workspaceBackgroundColour: '#1e1e1e',
          toolboxBackgroundColour: '#252526',
          toolboxForegroundColour: '#ccc',
          flyoutBackgroundColour: '#2d2d2d',
          flyoutForegroundColour: '#ccc',
          flyoutOpacity: 0.9,
          scrollbarColour: '#555',
          scrollbarOpacity: 0.6,
        },
      }),
    });

    workspaceRef.current = workspace;

    // Load existing block state
    if (formula.block) {
      try {
        Blockly.serialization.workspaces.load(formula.block, workspace);
      } catch (e) {
        console.warn('Failed to load block state:', e);
      }
    }

    return () => {
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, []);

  const handleSave = () => {
    if (!workspaceRef.current || !label.trim()) return;
    const blockState = Blockly.serialization.workspaces.save(workspaceRef.current);
    let code = '';
    try {
      code = javascriptGenerator.workspaceToCode(workspaceRef.current);
    } catch (e) {
      console.warn('Failed to generate code:', e);
    }
    onSave({
      label: label.trim(),
      block: blockState,
      type: formulaType,
      formula: code,
    });
  };

  return (
    <div className="blockly-editor">
      <div className="blockly-editor-header">
        <input
          className="blockly-label-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Formula label..."
        />
        <select
          className="blockly-type-select"
          value={formulaType}
          onChange={(e) => setFormulaType(e.target.value as FormulaType)}
        >
          <option value={FormulaType.Number}>Number</option>
          <option value={FormulaType.Percent}>Percent</option>
          <option value={FormulaType.PerSec}>Per/Sec</option>
        </select>
        <button className="blockly-save-btn" onClick={handleSave} title="Save">
          <MdCheck />
        </button>
        <button className="blockly-cancel-btn" onClick={onCancel} title="Cancel">
          <MdClose />
        </button>
      </div>
      <div ref={blocklyDiv} className="blockly-workspace" />
    </div>
  );
}


// Format an aggregated value for display
function formatAggValue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  if (!Number.isInteger(value)) return value.toFixed(1);
  return value.toString();
}

// Helper function to compute aggregated attribute values from all gear + selected weapon slot
function useAggregatedValues(weaponSlot: 'primary' | 'secondary' | 'pistol') {
  const currentBuild = useBuildStore((s) => s.currentBuild);
  
  return useMemo(() => {
    const values: Record<string, number> = {};
    
    // Get the selected build weapon
    const buildWeapon = weaponSlot === 'primary' ? currentBuild.primaryWeapon
      : weaponSlot === 'secondary' ? currentBuild.secondaryWeapon
      : currentBuild.pistol;
    
    // Add weapon base stats from the selected slot
    if (buildWeapon) {
      const base = buildWeapon.weapon;
      values['weapon damage'] = base.damage || 0;
      values['rpm'] = base.rpm || 0;
      values['base mag size'] = base.baseMagSize || 0;
      values['modded mag size'] = base.moddedMagSize || 0;
      values['reload'] = base.reload || 0;
      values['optimal range'] = base.optimalRange || 0;
      values['hsd'] = base.hsd || 0;
      
      // Add weapon core/attrib values
      if (buildWeapon.core1?.key && buildWeapon.core1?.value !== undefined) {
        const key = buildWeapon.core1.key.toLowerCase();
        values[key] = (values[key] || 0) + buildWeapon.core1.value;
      }
      if (buildWeapon.core2?.key && buildWeapon.core2?.value !== undefined) {
        const key = buildWeapon.core2.key.toLowerCase();
        values[key] = (values[key] || 0) + buildWeapon.core2.value;
      }
      if (buildWeapon.attrib?.key && buildWeapon.attrib?.value !== undefined) {
        const key = buildWeapon.attrib.key.toLowerCase();
        values[key] = (values[key] || 0) + buildWeapon.attrib.value;
      }
      
      // Add weapon mod slot values
      if (buildWeapon.configuredModSlots) {
        Object.values(buildWeapon.configuredModSlots).forEach(modSlot => {
          Object.entries(modSlot).forEach(([statKey, statValue]) => {
            const key = statKey.toLowerCase();
            values[key] = (values[key] || 0) + statValue;
          });
        });
      }
    }
    
    // Aggregate values from all gear pieces
    const gearPieces = [
      currentBuild.mask,
      currentBuild.chest,
      currentBuild.holster,
      currentBuild.backpack,
      currentBuild.gloves,
      currentBuild.kneepads
    ];
    
    gearPieces.forEach(gear => {
      if (!gear) return;
      
      // Add core values
      if (gear.core) {
        gear.core.forEach(coreValue => {
          const key = coreValue.type.toLowerCase();
          values[key] = (values[key] || 0) + (coreValue.value || 0);
        });
      }
      
      // Add minor attributes
      [gear.minor1, gear.minor2, gear.minor3].forEach(minor => {
        if (minor?.key && minor?.value !== undefined) {
          const key = minor.key.toLowerCase();
          values[key] = (values[key] || 0) + minor.value;
        }
      });
    });
    
    return values;
  }, [currentBuild, weaponSlot]);
}

// --- Main Overlay Component ---
function FormulaConfigOverlay({ isOpen, onClose }: FormulaConfigOverlayProps) {
  const formulas = useFormulaStore((s) => s.formulas);
  const addCategory = useFormulaStore((s) => s.addCategory);
  const renameCategory = useFormulaStore((s) => s.renameCategory);
  const clearCategory = useFormulaStore((s) => s.clearCategory);
  const addFormula = useFormulaStore((s) => s.addFormula);
  const updateFormula = useFormulaStore((s) => s.updateFormula);
  const removeFormula = useFormulaStore((s) => s.removeFormula);
  const reorderFormula = useFormulaStore((s) => s.reorderFormula);
  
  const currentBuild = useBuildStore((s) => s.currentBuild);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editingFormula, setEditingFormula] = useState<{ category: string; index: number } | null>(null);
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedWeaponSlot, setSelectedWeaponSlot] = useState<'primary' | 'secondary' | 'pistol'>('primary');
  
  // Get aggregated values for display
  const aggregatedValues = useAggregatedValues(selectedWeaponSlot);
  
  // Sync aggregated values to module-level state for Blockly dropdown callbacks
  useEffect(() => {
    setBlocklyAggregatedValues(aggregatedValues);
  }, [aggregatedValues]);
  
  // Build weapon slot labels
  const getWeaponSlotLabel = (slot: 'primary' | 'secondary' | 'pistol'): string => {
    const weapon = slot === 'primary' ? currentBuild.primaryWeapon
      : slot === 'secondary' ? currentBuild.secondaryWeapon
      : currentBuild.pistol;
    const label = slot === 'primary' ? 'Primary' : slot === 'secondary' ? 'Secondary' : 'Pistol';
    return weapon ? `${label}: ${weapon.weapon.name}` : `${label} (Empty)`;
  };

  const categories = Object.keys(formulas);

  // Auto-select first category
  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    addCategory(name);
    setNewCategoryName('');
    setSelectedCategory(name);
  };

  const handleRenameCategory = (oldName: string) => {
    const newName = editCategoryName.trim();
    if (!newName || newName === oldName) {
      setEditingCategory(null);
      return;
    }
    renameCategory(oldName, newName);
    if (selectedCategory === oldName) setSelectedCategory(newName);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (name: string) => {
    if (!confirm(`Delete category "${name}" and all its formulas?`)) return;
    clearCategory(name);
    if (selectedCategory === name) {
      const remaining = categories.filter((c) => c !== name);
      setSelectedCategory(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const handleSaveFormula = useCallback(
    (category: string, index: number | null, formula: Formula) => {
      if (index !== null) {
        updateFormula(category, index, formula);
      } else {
        addFormula(category, formula);
      }
      setEditingFormula(null);
      setAddingToCategory(null);
    },
    [updateFormula, addFormula]
  );

  const handleCancelEdit = () => {
    setEditingFormula(null);
    setAddingToCategory(null);
  };

  if (!isOpen) return null;

  const currentFormulas = selectedCategory ? formulas[selectedCategory] || [] : [];
  
  // Helper to find the aggregated value for a formula label
  const getValueForLabel = (label: string): string | null => {
    const lowerLabel = label.toLowerCase().trim();
    // Try exact match first
    if (aggregatedValues[lowerLabel] !== undefined) {
      return formatAggValue(aggregatedValues[lowerLabel]);
    }
    // Try partial match
    for (const [key, val] of Object.entries(aggregatedValues)) {
      if (lowerLabel.includes(key) || key.includes(lowerLabel)) {
        return formatAggValue(val);
      }
    }
    return null;
  };

  return (
    <div className="formula-overlay-backdrop" onClick={onClose}>
      <div className="formula-overlay-content" onClick={(e) => e.stopPropagation()}>
        <div className="formula-overlay-header">
          <h3>Stat Formula Configuration</h3>
          <div className="formula-overlay-header-actions">
            <select
              className="formula-weapon-select"
              value={selectedWeaponSlot}
              onChange={(e) => setSelectedWeaponSlot(e.target.value as 'primary' | 'secondary' | 'pistol')}
            >
              <option value="primary">{getWeaponSlotLabel('primary')}</option>
              <option value="secondary">{getWeaponSlotLabel('secondary')}</option>
              <option value="pistol">{getWeaponSlotLabel('pistol')}</option>
            </select>
            <button className="formula-json-btn" onClick={() => setShowJsonModal(true)} title="View JSON">
              <MdCode /> JSON
            </button>
            <button className="formula-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="formula-overlay-body">
          {/* Left sidebar: categories */}
          <div className="formula-categories-panel">
            <div className="formula-categories-header">
              <span>Categories</span>
            </div>
            <div className="formula-categories-list">
              {categories.map((cat) => (
                <div
                  key={cat}
                  className={`formula-category-item ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {editingCategory === cat ? (
                    <input
                      className="formula-category-rename-input"
                      value={editCategoryName}
                      onChange={(e) => setEditCategoryName(e.target.value)}
                      onBlur={() => handleRenameCategory(cat)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCategory(cat); if (e.key === 'Escape') setEditingCategory(null); }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span className="formula-category-label">{cat}</span>
                      <div className="formula-category-actions">
                        <button onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); setEditCategoryName(cat); }} title="Rename"><MdEdit /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }} title="Delete"><MdDelete /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="formula-add-category">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category..."
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
              />
              <button onClick={handleAddCategory} title="Add Category"><MdAdd /></button>
            </div>
          </div>

          {/* Right panel: formulas for selected category */}
          <div className="formula-detail-panel">
            {selectedCategory ? (
              <>
                <div className="formula-detail-header">
                  <span>{selectedCategory}</span>
                  <button
                    className="formula-add-btn"
                    onClick={() => { setAddingToCategory(selectedCategory); setEditingFormula(null); }}
                    title="Add Formula"
                  >
                    <MdAdd /> Add Formula
                  </button>
                </div>

                {/* Existing formulas list */}
                <div className="formula-list">
                  {currentFormulas.map((f, idx) => (
                    <div key={idx} className="formula-list-item">
                      {editingFormula?.category === selectedCategory && editingFormula?.index === idx ? (
                        <BlocklyEditor
                          formula={f}
                          onSave={(updated) => handleSaveFormula(selectedCategory, idx, updated)}
                          onCancel={handleCancelEdit}
                        />
                      ) : (
                        <div className="formula-list-item-row">
                          <div className="formula-list-item-info">
                            <span className="formula-item-label">
                              {f.label}
                              {(() => {
                                const val = getValueForLabel(f.label);
                                return val !== null ? <span className="formula-item-value"> [{val}]</span> : null;
                              })()}
                            </span>
                            <span className="formula-item-type">{f.type}</span>
                            {f.formula && <code className="formula-item-code">{f.formula}</code>}
                          </div>
                          <div className="formula-list-item-actions">
                            <button
                              disabled={idx === 0}
                              onClick={() => reorderFormula(selectedCategory, idx, idx - 1)}
                              title="Move Up"
                            ><MdArrowUpward /></button>
                            <button
                              disabled={idx === currentFormulas.length - 1}
                              onClick={() => reorderFormula(selectedCategory, idx, idx + 1)}
                              title="Move Down"
                            ><MdArrowDownward /></button>
                            <button
                              onClick={() => setEditingFormula({ category: selectedCategory, index: idx })}
                              title="Edit"
                            ><MdEdit /></button>
                            <button
                              onClick={() => removeFormula(selectedCategory, idx)}
                              title="Delete"
                            ><MdDelete /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* New formula editor */}
                {addingToCategory === selectedCategory && (
                  <BlocklyEditor
                    formula={{ label: '', block: null, type: FormulaType.Number, formula: '' }}
                    onSave={(f) => handleSaveFormula(selectedCategory, null, f)}
                    onCancel={handleCancelEdit}
                  />
                )}
              </>
            ) : (
              <div className="formula-empty">Create a category to get started</div>
            )}
          </div>
        </div>

        <FormulaJsonModal
          isOpen={showJsonModal}
          onClose={() => setShowJsonModal(false)}
        />
      </div>
    </div>
  );
}

export default FormulaConfigOverlay;
