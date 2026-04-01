import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import 'blockly/javascript';
import { javascriptGenerator } from 'blockly/javascript';
import { useFormulaStore } from '../stores/useFormulaStore';
import { useLookupStore } from '../stores/useLookupStore';
import { useCleanDataStore } from '../stores/useCleanDataStore';
import useBuildStore from '../stores/useBuildStore';
import { Formula, FormulaType, StatCalculator } from '../models/Formula';
import FormulaJsonModal from './FormulaJsonModal';
import Weapon from '../models/Weapon';
import BuildGear, { GearSource } from '../models/BuildGear';
import { CoreType } from '../models/CoreValue';
import {
  MdAdd,
  MdDelete,
  MdEdit,
  MdArrowUpward,
  MdArrowDownward,
  MdCode,
  MdCheck,
  MdClose,
} from 'react-icons/md';
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
// Module-level state for the selected weapon's base stats
let currentWeaponValues: Record<string, number> = {};
// Module-level ref to the active Blockly workspace for forcing re-renders
let activeBlocklyWorkspace: Blockly.WorkspaceSvg | null = null;

/**
 * BlockValueRef tracks which block fields are bound to which data keys.
 * When aggregated/weapon values change, we diff against previous values
 * and push label updates only to the blocks whose keys actually changed.
 */
interface BlockFieldBinding {
  blockId: string;
  fieldName: string;
  dataKey: string;
  source: 'aggregated' | 'weapon';
}

let blockFieldBindings: BlockFieldBinding[] = [];
let previousAggregatedValues: Record<string, number> = {};
let previousWeaponValues: Record<string, number> = {};

/** Register a binding between a placed block's field and a data key */
function registerBlockFieldBinding(
  blockId: string,
  fieldName: string,
  dataKey: string,
  source: 'aggregated' | 'weapon',
) {
  // Avoid duplicates
  const exists = blockFieldBindings.some((b) => b.blockId === blockId && b.fieldName === fieldName);
  if (!exists) {
    blockFieldBindings.push({ blockId, fieldName, dataKey, source });

    // If values already exist for this key, push an immediate update
    const value =
      source === 'weapon' ? currentWeaponValues[dataKey] : currentAggregatedValues[dataKey];
    if (value !== undefined && activeBlocklyWorkspace) {
      const block = activeBlocklyWorkspace.getBlockById(blockId);
      const field = block?.getField(fieldName);
      if (field) {
        const suffix = ` [${formatBlocklyValue(value)}]`;
        if (field instanceof Blockly.FieldDropdown) {
          field.getOptions(false);
          field.forceRerender();
        } else {
          field.setValue(`${dataKey}${suffix}`);
        }
      }
    }
  }
}

/** Remove all bindings for a block (e.g. when deleted) */
function unregisterBlockBindings(blockId: string) {
  blockFieldBindings = blockFieldBindings.filter((b) => b.blockId !== blockId);
}

/** Diff values and update only the block fields whose keys changed */
function pushChangedLabels() {
  if (!activeBlocklyWorkspace) {
    return;
  }

  const aggChanges = new Set<string>();
  const wpnChanges = new Set<string>();

  // Detect which aggregated keys changed
  const allAggKeys = new Set([
    ...Object.keys(currentAggregatedValues),
    ...Object.keys(previousAggregatedValues),
  ]);
  for (const key of allAggKeys) {
    if (currentAggregatedValues[key] !== previousAggregatedValues[key]) {
      aggChanges.add(key);
    }
  }

  // Detect which weapon keys changed
  const allWpnKeys = new Set([
    ...Object.keys(currentWeaponValues),
    ...Object.keys(previousWeaponValues),
  ]);
  for (const key of allWpnKeys) {
    if (currentWeaponValues[key] !== previousWeaponValues[key]) {
      wpnChanges.add(key);
    }
  }

  if (aggChanges.size === 0 && wpnChanges.size === 0) {
    return;
  }

  for (const binding of blockFieldBindings) {
    const changed =
      (binding.source === 'aggregated' && aggChanges.has(binding.dataKey)) ||
      (binding.source === 'weapon' && wpnChanges.has(binding.dataKey));
    if (!changed) continue;

    const block = activeBlocklyWorkspace.getBlockById(binding.blockId);
    if (!block) continue;

    const field = block.getField(binding.fieldName);
    if (!field) continue;

    const prevValue =
      binding.source === 'weapon'
        ? previousWeaponValues[binding.dataKey]
        : previousAggregatedValues[binding.dataKey];
    const newValue =
      binding.source === 'weapon'
        ? currentWeaponValues[binding.dataKey]
        : currentAggregatedValues[binding.dataKey];

    const suffix = newValue !== undefined ? ` [${formatBlocklyValue(newValue)}]` : '';
    // For dropdown fields, the selected value stays the same — we just force
    // a re-render so the dynamic label generator picks up the new suffix.
    if (field instanceof Blockly.FieldDropdown) {
      field.getOptions(false);
      // Re-set the value to itself so Blockly re-resolves the display text
      // from the updated options list — forceRerender alone doesn't do this.
      const currentVal = field.getValue();
      field.setValue(null as any);
      field.setValue(currentVal);
    } else {
      // For plain label fields, push the new text directly
      field.setValue(`${binding.dataKey}${suffix}`);
    }
  }
}

// Force all blocks in the workspace to re-render their dropdown labels
function refreshBlocklyDropdowns() {
  if (!activeBlocklyWorkspace) return;
  const allBlocks = activeBlocklyWorkspace.getAllBlocks(false);
  allBlocks.forEach((block) => {
    block.inputList.forEach((input) => {
      input.fieldRow.forEach((field) => {
        if (field instanceof Blockly.FieldDropdown && field.isOptionListDynamic()) {
          // Bust the cached options then force re-render of the field text
          field.getOptions(false);
          field.forceRerender();
        }
      });
    });
  });
}

// Function to update the aggregated values (called from React component)
function setBlocklyAggregatedValues(values: Record<string, number>) {
  previousAggregatedValues = { ...currentAggregatedValues };
  currentAggregatedValues = values;
  pushChangedLabels();
  refreshBlocklyDropdowns();
}

// Function to update the weapon base values (called from React component)
function setBlocklyWeaponValues(values: Record<string, number>) {
  previousWeaponValues = { ...currentWeaponValues };
  currentWeaponValues = values;
  pushChangedLabels();
  refreshBlocklyDropdowns();
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

// Helper to get weapon value suffix for base_weapon dropdown
function getWeaponValueSuffix(key: string): string {
  const value = currentWeaponValues[key];
  if (value !== undefined) {
    return ` [${formatBlocklyValue(value)}]`;
  }
  return '';
}

const MATH_BLOCK_TYPES = ['stat_add', 'stat_subtract', 'stat_multiply', 'stat_divide'];

/**
 * Walk every math block in the active workspace, evaluate its sub-expression,
 * and push the result into the block's RESULT label field.
 */
function updateMathBlockResults(
  aggregatedValues: Record<string, number>,
  weaponBaseValues: Record<string, number>,
  coreValues: Record<string, number>,
) {
  if (!activeBlocklyWorkspace) return;
  for (const block of activeBlocklyWorkspace.getAllBlocks(false)) {
    if (!MATH_BLOCK_TYPES.includes(block.type)) continue;
    const resultField = block.getField('RESULT');
    if (!resultField) continue;
    try {
      const code = javascriptGenerator.blockToCode(block);
      const expr = Array.isArray(code) ? code[0] : code;
      const result = evaluateFormula(expr, aggregatedValues, weaponBaseValues, coreValues);
      resultField.setValue(result !== null ? `= ${formatBlocklyValue(result)}` : '= ?');
    } catch {
      resultField.setValue('= ?');
    }
  }
}

// Register custom blocks for stat formulas
function registerCustomBlocks() {
  if (Blockly.Blocks['base_weapon']) return; // already registered

  Blockly.Blocks['base_weapon'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('base weapon')
        .appendField(
          new Blockly.FieldDropdown(() => {
            return weaponProps.map(
              ([label, value]) => [label + getWeaponValueSuffix(value), value] as [string, string],
            );
          }),
          'PROP',
        );
      this.setOutput(true, 'Number');
      this.setColour(30);
      this.setTooltip('Get a base weapon property value');
    },
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
    },
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
    },
  };
  javascriptGenerator.forBlock['stat_constant'] = function (block: Blockly.Block) {
    const value = block.getFieldValue('VALUE');
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== '') {
      return [String(num), 0];
    }
    return [`"${value}"`, 0];
  };

  // --- SVG data URIs for +/− buttons on math blocks ---
  const PLUS_SVG =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">' +
        '<rect width="16" height="16" rx="3" fill="#3a3a3a"/>' +
        '<path d="M4 8h8M8 4v8" stroke="#d4af37" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>',
    );
  const MINUS_SVG =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">' +
        '<rect width="16" height="16" rx="3" fill="#3a3a3a"/>' +
        '<path d="M4 8h8" stroke="#d4af37" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>',
    );

  const OP_SYMBOLS: Record<string, string> = {
    stat_add: '+',
    stat_subtract: '−',
    stat_multiply: '×',
    stat_divide: '÷',
  };

  /** Rebuild inputs on a math block to match targetCount, preserving connections. */
  function rebuildMathInputs(block: any, targetCount: number): void {
    const symbol = OP_SYMBOLS[block.type] || '+';

    // Save existing connections
    const saved: (Blockly.Connection | null)[] = [];
    for (let i = 0; i < block.inputCount_; i++) {
      const input = block.getInput(`INPUT_${i}`);
      saved.push(input?.connection?.targetConnection ?? null);
    }

    // Remove result row
    if (block.getInput('RESULT_ROW')) block.removeInput('RESULT_ROW');

    // Remove all current value inputs
    for (let i = block.inputCount_ - 1; i >= 0; i--) {
      if (block.getInput(`INPUT_${i}`)) block.removeInput(`INPUT_${i}`);
    }

    // Create new inputs
    for (let i = 0; i < targetCount; i++) {
      const inp = block.appendValueInput(`INPUT_${i}`).setCheck('Number');
      if (i > 0) inp.appendField(symbol);
    }
    block.inputCount_ = targetCount;

    // Reconnect saved connections
    for (let i = 0; i < Math.min(saved.length, targetCount); i++) {
      if (saved[i]) {
        const input = block.getInput(`INPUT_${i}`);
        input?.connection?.connect(saved[i]);
      }
    }

    // Re-add result row with +/− buttons
    const resultRow = block.appendDummyInput('RESULT_ROW');
    resultRow.appendField(new Blockly.FieldLabel('= ?'), 'RESULT');
    resultRow.appendField(
      new Blockly.FieldImage(PLUS_SVG, 16, 16, '+', () => {
        rebuildMathInputs(block, block.inputCount_ + 1);
      }),
    );
    if (targetCount > 2) {
      resultRow.appendField(
        new Blockly.FieldImage(MINUS_SVG, 16, 16, '−', () => {
          if (block.inputCount_ > 2) {
            rebuildMathInputs(block, block.inputCount_ - 1);
          }
        }),
      );
    }
  }

  // Helper to create a math block definition with variable inputs
  function defineMathBlock(type: string, symbol: string, tooltip: string) {
    Blockly.Blocks[type] = {
      init(this: any) {
        this.inputCount_ = 2;
        this.appendValueInput('INPUT_0').setCheck('Number');
        this.appendValueInput('INPUT_1').setCheck('Number').appendField(symbol);
        const resultRow = this.appendDummyInput('RESULT_ROW');
        resultRow.appendField(new Blockly.FieldLabel('= ?'), 'RESULT');
        resultRow.appendField(
          new Blockly.FieldImage(PLUS_SVG, 16, 16, '+', () => {
            rebuildMathInputs(this, this.inputCount_ + 1);
          }),
        );
        this.setOutput(true, 'Number');
        this.setColour(120);
        this.setInputsInline(false);
        this.setTooltip(tooltip);
      },

      saveExtraState(this: any): { inputs: number } {
        return { inputs: this.inputCount_ };
      },

      loadExtraState(this: any, state: { inputs: number }): void {
        const count = state.inputs || 2;
        if (count !== this.inputCount_) {
          rebuildMathInputs(this, count);
        }
      },
    };
  }

  defineMathBlock('stat_add', '+', 'Add values');
  defineMathBlock('stat_subtract', '−', 'Subtract values');
  defineMathBlock('stat_multiply', '×', 'Multiply values');
  defineMathBlock('stat_divide', '÷', 'Divide values');

  // Helper to generate code for a variable-input math block
  function mathBlockGenerator(operator: string, defaultVal: string) {
    return function (block: any): [string, number] {
      const parts: string[] = [];
      for (let i = 0; i < block.inputCount_; i++) {
        const val = javascriptGenerator.valueToCode(block, `INPUT_${i}`, 0) || defaultVal;
        parts.push(val);
      }
      if (parts.length === 0) return [defaultVal, 0];
      return [`(${parts.join(` ${operator} `)})`, 0];
    };
  }

  javascriptGenerator.forBlock['stat_add'] = mathBlockGenerator('+', '0');
  javascriptGenerator.forBlock['stat_subtract'] = mathBlockGenerator('-', '0');
  javascriptGenerator.forBlock['stat_multiply'] = mathBlockGenerator('*', '0');
  javascriptGenerator.forBlock['stat_divide'] = mathBlockGenerator('/', '1');

  Blockly.Blocks['stat_sum_all'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('sum all')
        .appendField(
          new Blockly.FieldDropdown(() => {
            const lookupVocab = useLookupStore.getState().getAttributeVocabulary();
            const cleanVocab = useCleanDataStore.getState().getAttributeVocabulary();
            const merged = new Map<string, string>([...lookupVocab, ...cleanVocab]);
            const vocab = Array.from(merged.entries())
              .map(([k, v]) => [k + getValueSuffix(k), v] as [string, string])
              .sort((a, b) => a[0].localeCompare(b[0]));
            return vocab.length > 0 ? vocab : [['(no data loaded)', '']];
          }),
          'ATTR',
        );
      this.setOutput(true, 'Number');
      this.setColour(260);
      this.setTooltip('Sum all instances of an attribute across the build');
    },
  };
  javascriptGenerator.forBlock['stat_sum_all'] = function (block: Blockly.Block) {
    const attr = block.getFieldValue('ATTR');
    return [`sumAll("${attr}")`, 0];
  };

  Blockly.Blocks['stat_percent_all'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('percent all')
        .appendField(
          new Blockly.FieldDropdown(() => {
            const lookupVocab = useLookupStore.getState().getAttributeVocabulary();
            const cleanVocab = useCleanDataStore.getState().getAttributeVocabulary();
            const merged = new Map<string, string>([...lookupVocab, ...cleanVocab]);
            const vocab = Array.from(merged.entries())
              .map(([k, v]) => [k + getValueSuffix(k), v] as [string, string])
              .sort((a, b) => a[0].localeCompare(b[0]));
            return vocab.length > 0 ? vocab : [['(no data loaded)', '']];
          }),
          'ATTR',
        );
      this.setOutput(true, 'Number');
      this.setColour(290);
      this.setTooltip('Sum all instances of an attribute as a percentage (value / 100)');
    },
  };
  javascriptGenerator.forBlock['stat_percent_all'] = function (block: Blockly.Block) {
    const attr = block.getFieldValue('ATTR');
    return [`(sumAll("${attr}") / 100)`, 0];
  };

  const coreTypeOptions: [string, string][] = Object.entries(CoreType).map(([label, value]) => [
    label.replace(/([A-Z])/g, ' $1').trim(),
    value,
  ]);

  Blockly.Blocks['stat_core'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('core')
        .appendField(
          new Blockly.FieldDropdown(() => {
            return coreTypeOptions.map(
              ([label, value]) => [label + getValueSuffix(value), value] as [string, string],
            );
          }),
          'CORE',
        );
      this.setOutput(true, 'Number');
      this.setColour(0);
      this.setTooltip('Get the sum of a core attribute type across all gear');
    },
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
    },
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
      this.appendDummyInput().appendField(
        new Blockly.FieldDropdown([
          ['=', '==='],
          ['≠', '!=='],
          ['<', '<'],
          ['>', '>'],
          ['≤', '<='],
          ['≥', '>='],
        ]),
        'OP',
      );
      this.appendValueInput('B');
      this.setOutput(true, 'Boolean');
      this.setColour(210);
      this.setInputsInline(true);
      this.setTooltip('Compare two values');
    },
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
      this.appendDummyInput().appendField(
        new Blockly.FieldDropdown([
          ['and', '&&'],
          ['or', '||'],
        ]),
        'OP',
      );
      this.appendValueInput('B').setCheck('Boolean');
      this.setOutput(true, 'Boolean');
      this.setColour(210);
      this.setInputsInline(true);
      this.setTooltip('Combine two conditions with AND / OR');
    },
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
    },
  };
  javascriptGenerator.forBlock['logic_not'] = function (block: Blockly.Block) {
    const val = javascriptGenerator.valueToCode(block, 'VAL', 0) || 'false';
    return [`(!${val})`, 0];
  };

  Blockly.Blocks['logic_boolean'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField(
        new Blockly.FieldDropdown([
          ['true', 'true'],
          ['false', 'false'],
        ]),
        'BOOL',
      );
      this.setOutput(true, 'Boolean');
      this.setColour(210);
      this.setTooltip('A boolean constant');
    },
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
    },
  };
  javascriptGenerator.forBlock['stat_round'] = function (block: Blockly.Block) {
    const value = javascriptGenerator.valueToCode(block, 'VALUE', 0) || '0';
    const decimals = block.getFieldValue('DECIMALS');
    return [`round(${value}, ${decimals})`, 0];
  };

  Blockly.Blocks['weapon_type_damage'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField('weapon type damage');
      this.setOutput(true, 'Number');
      this.setColour(30);
      this.setTooltip(
        'Sum of the active weapon type damage bonus (e.g. assault rifle damage when an AR is selected)',
      );
    },
  };
  javascriptGenerator.forBlock['weapon_type_damage'] = function () {
    return [`getWeaponTypeDamage()`, 0];
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
        { kind: 'block', type: 'weapon_type_damage' },
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
  aggregatedValues: Record<string, number>;
  weaponBaseValues: Record<string, number>;
  coreValues: Record<string, number>;
}

function BlocklyEditor({
  formula,
  onSave,
  onCancel,
  aggregatedValues,
  weaponBaseValues,
  coreValues,
}: BlocklyEditorProps) {
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [label, setLabel] = useState(formula.label);
  const [formulaType, setFormulaType] = useState<FormulaType>(formula.type);
  const [liveResult, setLiveResult] = useState<number | null>(null);

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
    activeBlocklyWorkspace = workspace;

    // Load existing block state
    if (formula.block) {
      try {
        Blockly.serialization.workspaces.load(formula.block, workspace);
      } catch (e) {
        console.warn('Failed to load block state:', e);
      }
    }

    // Register bindings for all existing blocks after load
    const registerBindingsForBlock = (block: Blockly.Block) => {
      const type = block.type;
      if (type === 'base_weapon') {
        const prop = block.getFieldValue('PROP');
        if (prop) registerBlockFieldBinding(block.id, 'PROP', prop, 'weapon');
      } else if (type === 'stat_sum_all' || type === 'stat_percent_all') {
        const attr = block.getFieldValue('ATTR');
        if (attr) registerBlockFieldBinding(block.id, 'ATTR', attr.toLowerCase(), 'aggregated');
      } else if (type === 'stat_core') {
        const core = block.getFieldValue('CORE');
        if (core) registerBlockFieldBinding(block.id, 'CORE', core.toLowerCase(), 'aggregated');
      }
    };

    workspace.getAllBlocks(false).forEach(registerBindingsForBlock);

    // Listen for block changes to maintain bindings
    const bindingListener = (event: Blockly.Events.Abstract) => {
      if (event.type === Blockly.Events.BLOCK_DELETE) {
        const deleteEvent = event as Blockly.Events.BlockDelete;
        if (deleteEvent.blockId) {
          unregisterBlockBindings(deleteEvent.blockId);
        }
      } else if (event.type === Blockly.Events.BLOCK_CREATE) {
        const createEvent = event as Blockly.Events.BlockCreate;
        if (createEvent.blockId) {
          const block = workspace.getBlockById(createEvent.blockId);
          if (block) registerBindingsForBlock(block);
        }
      } else if (event.type === Blockly.Events.BLOCK_CHANGE) {
        const changeEvent = event as Blockly.Events.BlockChange;
        if (changeEvent.blockId && changeEvent.element === 'field') {
          // Re-register with the new field value
          const block = workspace.getBlockById(changeEvent.blockId);
          if (block) {
            unregisterBlockBindings(block.id);
            registerBindingsForBlock(block);
          }
        }
      }
    };
    workspace.addChangeListener(bindingListener);

    // Evaluate on every workspace change
    const updateLiveResult = () => {
      try {
        const code = javascriptGenerator.workspaceToCode(workspace);
        setLiveResult(evaluateFormula(code, aggregatedValues, weaponBaseValues, coreValues));
      } catch {
        setLiveResult(null);
      }
      updateMathBlockResults(aggregatedValues, weaponBaseValues, coreValues);
    };
    updateLiveResult();
    workspace.addChangeListener(updateLiveResult);

    return () => {
      workspace.removeChangeListener(updateLiveResult);
      workspace.removeChangeListener(bindingListener);
      // Clear bindings for all blocks in this workspace
      workspace.getAllBlocks(false).forEach((block) => unregisterBlockBindings(block.id));
      workspace.dispose();
      workspaceRef.current = null;
      if (activeBlocklyWorkspace === workspace) {
        activeBlocklyWorkspace = null;
      }
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
        {liveResult !== null ? (
          <span className="formula-item-result">
            {formatFormulaResult(liveResult, formulaType)}
          </span>
        ) : (
          <span className="formula-item-result formula-item-result-invalid">N/A</span>
        )}
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

function formatFormulaResult(value: number, type: FormulaType): string {
  if (type === FormulaType.Percent) {
    const pct = value * 100;
    return `${!Number.isInteger(pct) ? pct.toFixed(1) : pct}%`;
  }
  return formatAggValue(value);
}

/** Map a weapon type string to its corresponding damage stat name in the aggregated values */
function weaponTypeToDamageStat(weaponType: string): string {
  const t = weaponType.toLowerCase();
  if (t === 'mr') return 'mmr damage';
  return t + ' damage';
}

/**
 * Evaluate a Blockly-generated formula code string against the current build context.
 * Returns the numeric result, or null if the formula is empty/invalid.
 */
function evaluateFormula(
  formulaCode: string,
  aggregatedValues: Record<string, number>,
  weaponBaseValues: Record<string, number>,
  coreValues: Record<string, number>,
): number | null {
  if (!formulaCode || !formulaCode.trim()) return null;
  try {
    // Blockly's workspaceToCode may produce trailing semicolons/newlines — strip them
    const cleanCode = formulaCode.trim().replace(/;+\s*$/, '');
    if (!cleanCode) return null;
    const sumAll = (attr: string) => aggregatedValues[attr.toLowerCase()] ?? 0;
    const getBaseWeapon = (prop: string) => weaponBaseValues[prop] ?? 0;
    const getBaseGear = (prop: string) => aggregatedValues[prop.toLowerCase()] ?? 0;
    const getCore = (core: string) => coreValues[core.toLowerCase()] ?? 0;
    const getWeaponTypeDamage = () => {
      const wType = weaponBaseValues['weaponType'] as unknown as string;
      if (!wType) return 0;
      return aggregatedValues[weaponTypeToDamageStat(wType)] ?? 0;
    };
    const round = (value: number, decimals: number) => {
      const factor = Math.pow(10, decimals);
      return Math.round(value * factor) / factor;
    };
    const fn = new Function(
      'sumAll',
      'getBaseWeapon',
      'getBaseGear',
      'getCore',
      'getWeaponTypeDamage',
      'round',
      `return (${cleanCode});`,
    );
    const result = fn(sumAll, getBaseWeapon, getBaseGear, getCore, getWeaponTypeDamage, round);
    if (typeof result === 'number' && isFinite(result)) return result;
    return null;
  } catch {
    return null;
  }
}

// Helper function to compute aggregated attribute values from all gear + selected weapon slot
function useAggregatedValues(weaponSlot: 'primaryWeapon' | 'secondaryWeapon' | 'pistol') {
  const currentBuild = useBuildStore((s) => s.currentBuild);

  return useMemo(() => {
    if (!currentBuild) return new StatCalculator();
    return StatCalculator.forBuild(currentBuild, weaponSlot);
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
  const [editingFormula, setEditingFormula] = useState<{ category: string; index: number } | null>(
    null,
  );
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedWeaponSlot, setSelectedWeaponSlot] = useState<
    'primaryWeapon' | 'secondaryWeapon' | 'pistol'
  >('primaryWeapon');

  // Get aggregated values for display
  const aggregatedValues = useAggregatedValues(selectedWeaponSlot);

  // Sync aggregated values to module-level state for Blockly dropdown callbacks
  useEffect(() => {
    setBlocklyAggregatedValues(aggregatedValues.toRecord());
  }, [aggregatedValues]);

  // Compute and sync weapon base values for the base_weapon Blockly dropdown
  const weaponBaseValues = useMemo(() => {
    const buildWeapon =
      selectedWeaponSlot === 'primaryWeapon'
        ? currentBuild.primaryWeapon
        : selectedWeaponSlot === 'secondaryWeapon'
          ? currentBuild.secondaryWeapon
          : currentBuild.pistol;
    if (!buildWeapon) return {};
    const base = buildWeapon.weapon;
    return {
      rpm: base.rpm || 0,
      baseMagSize: base.baseMagSize || 0,
      moddedMagSize: base.moddedMagSize || 0,
      reload: base.reload || 0,
      damage: base.damage || 0,
      optimalRange: base.optimalRange || 0,
      hsd: base.hsd || 0,
      weaponType: base.type || '',
    } as unknown as Record<string, number>;
  }, [currentBuild, selectedWeaponSlot]);

  useEffect(() => {
    setBlocklyWeaponValues(weaponBaseValues);
  }, [weaponBaseValues]);

  // Compute core values (count of each core type across all gear)
  const coreValues = useMemo(() => {
    const calc = aggregatedValues;
    const cores: Record<string, number> = {};
    for (const [type, gearTypes] of Object.entries(calc.cores)) {
      cores[type.toLowerCase()] = gearTypes?.length ?? 0;
    }
    return cores;
  }, [aggregatedValues]);

  // Build weapon slot labels
  const getWeaponSlotLabel = (slot: 'primary' | 'secondary' | 'pistol'): string => {
    const weapon =
      slot === 'primary'
        ? currentBuild.primaryWeapon
        : slot === 'secondary'
          ? currentBuild.secondaryWeapon
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
    [updateFormula, addFormula],
  );

  const handleCancelEdit = () => {
    setEditingFormula(null);
    setAddingToCategory(null);
  };

  if (!isOpen) return null;

  const currentFormulas = selectedCategory ? formulas[selectedCategory] || [] : [];

  return (
    <div className="formula-overlay-backdrop" onClick={onClose}>
      <div className="formula-overlay-content" onClick={(e) => e.stopPropagation()}>
        <div className="formula-overlay-header">
          <h3>Stat Formula Configuration</h3>
          <div className="formula-overlay-header-actions">
            <select
              className="formula-weapon-select"
              value={selectedWeaponSlot}
              onChange={(e) =>
                setSelectedWeaponSlot(
                  e.target.value as 'primaryWeapon' | 'secondaryWeapon' | 'pistol',
                )
              }
            >
              <option value="primaryWeapon">{getWeaponSlotLabel('primary')}</option>
              <option value="secondaryWeapon">{getWeaponSlotLabel('secondary')}</option>
              <option value="pistol">{getWeaponSlotLabel('pistol')}</option>
            </select>
            <button
              className="formula-json-btn"
              onClick={() => setShowJsonModal(true)}
              title="View JSON"
            >
              <MdCode /> JSON
            </button>
            <button className="formula-close-btn" onClick={onClose}>
              ✕
            </button>
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameCategory(cat);
                        if (e.key === 'Escape') setEditingCategory(null);
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span className="formula-category-label">{cat}</span>
                      <div className="formula-category-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCategory(cat);
                            setEditCategoryName(cat);
                          }}
                          title="Rename"
                        >
                          <MdEdit />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(cat);
                          }}
                          title="Delete"
                        >
                          <MdDelete />
                        </button>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCategory();
                }}
              />
              <button onClick={handleAddCategory} title="Add Category">
                <MdAdd />
              </button>
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
                    onClick={() => {
                      setAddingToCategory(selectedCategory);
                      setEditingFormula(null);
                    }}
                    title="Add Formula"
                  >
                    <MdAdd /> Add Formula
                  </button>
                </div>

                {/* Existing formulas list */}
                <div className="formula-list">
                  {currentFormulas.map((f, idx) => (
                    <div key={idx} className="formula-list-item">
                      {editingFormula?.category === selectedCategory &&
                      editingFormula?.index === idx ? (
                        <BlocklyEditor
                          formula={f}
                          onSave={(updated) => handleSaveFormula(selectedCategory, idx, updated)}
                          onCancel={handleCancelEdit}
                          aggregatedValues={aggregatedValues.toRecord()}
                          weaponBaseValues={weaponBaseValues}
                          coreValues={coreValues}
                        />
                      ) : (
                        <div className="formula-list-item-row">
                          <div className="formula-list-item-info">
                            <span className="formula-item-label">{f.label}</span>
                            {(() => {
                              const result = evaluateFormula(
                                f.formula,
                                aggregatedValues.toRecord(),
                                weaponBaseValues,
                                coreValues,
                              );
                              return result !== null ? (
                                <span className="formula-item-result">
                                  {formatFormulaResult(result, f.type)}
                                </span>
                              ) : (
                                <span className="formula-item-result formula-item-result-invalid">
                                  N/A
                                </span>
                              );
                            })()}
                            <span className="formula-item-type">{f.type}</span>
                            {f.formula && <code className="formula-item-code">{f.formula}</code>}
                          </div>
                          <div className="formula-list-item-actions">
                            <button
                              disabled={idx === 0}
                              onClick={() => reorderFormula(selectedCategory, idx, idx - 1)}
                              title="Move Up"
                            >
                              <MdArrowUpward />
                            </button>
                            <button
                              disabled={idx === currentFormulas.length - 1}
                              onClick={() => reorderFormula(selectedCategory, idx, idx + 1)}
                              title="Move Down"
                            >
                              <MdArrowDownward />
                            </button>
                            <button
                              onClick={() =>
                                setEditingFormula({ category: selectedCategory, index: idx })
                              }
                              title="Edit"
                            >
                              <MdEdit />
                            </button>
                            <button
                              onClick={() => removeFormula(selectedCategory, idx)}
                              title="Delete"
                            >
                              <MdDelete />
                            </button>
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
                    aggregatedValues={aggregatedValues.toRecord()}
                    weaponBaseValues={weaponBaseValues}
                    coreValues={coreValues}
                  />
                )}
              </>
            ) : (
              <div className="formula-empty">Create a category to get started</div>
            )}
          </div>
        </div>

        <FormulaJsonModal isOpen={showJsonModal} onClose={() => setShowJsonModal(false)} />
      </div>
    </div>
  );
}

export default FormulaConfigOverlay;
