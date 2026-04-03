import { useMemo, useCallback } from 'react';
import './FormulaExplainer.css';
import type { Formula } from '../models/Formula';
import { FormulaType, CalculatedData } from '../models/Formula';
import type { CoreType } from '../models/CoreValue';
import { useBackButtonClose } from '../hooks/useBackButtonClose';

interface FormulaExplainerProps {
  isOpen: boolean;
  onClose: () => void;
  formula: Formula | null;
  result: number | null;
  aggregatedValues: Record<string, number>;
  weaponBaseValues: Record<string, number>;
  coreValues: Record<string, number>;
  calcValues: Record<string, CalculatedData>;
  coreSources: Partial<Record<CoreType, string[]>>;
}

/** Extract keys referenced in formula via sumAll/getBaseWeapon/getBaseGear/getCore/getWeaponTypeDamage calls */
function extractReferencedKeys(formulaStr: string) {
  const sumAllKeys: string[] = [];
  const weaponKeys: string[] = [];
  const gearKeys: string[] = [];
  const coreKeys: string[] = [];
  const hasWeaponTypeDamage = /getWeaponTypeDamage\s*\(\s*\)/i.test(formulaStr);

  const patterns: [RegExp, string[]][] = [
    [/sumAll\(\s*['"]([^'"]+)['"]\s*\)/gi, sumAllKeys],
    [/getBaseWeapon\(\s*['"]([^'"]+)['"]\s*\)/gi, weaponKeys],
    [/getBaseGear\(\s*['"]([^'"]+)['"]\s*\)/gi, gearKeys],
    [/getCore\(\s*['"]([^'"]+)['"]\s*\)/gi, coreKeys],
  ];

  for (const [regex, arr] of patterns) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(formulaStr)) !== null) {
      if (!arr.includes(m[1])) arr.push(m[1]);
    }
  }

  return { sumAllKeys, weaponKeys, gearKeys, coreKeys, hasWeaponTypeDamage };
}

function formatDisplay(value: number, type: FormulaType): string {
  if (type === FormulaType.Percent) {
    const pct = value * 100;
    return `${!Number.isInteger(pct) ? pct.toFixed(1) : pct}%`;
  }
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  if (!Number.isInteger(value)) return value.toFixed(2);
  return value.toString();
}

function formatRaw(value: number): string {
  if (value === 0) return '0';
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
  if (!Number.isInteger(value)) return value.toFixed(4);
  return value.toString();
}

/** A single resolved input to the formula with its breakdown */
interface ResolvedInput {
  /** Display name like sumAll("weapon damage") */
  call: string;
  /** The key used for lookup */
  key: string;
  /** The resolved numeric value */
  value: number;
  /** Category tag for coloring: sumAll | baseWeapon | baseGear | core */
  category: 'sumAll' | 'baseWeapon' | 'baseGear' | 'core';
  /** Individual contributions if available (from CalculatedData) */
  contributions: { label: string; value: number }[];
}

function buildResolvedInputs(
  formulaStr: string,
  aggregatedValues: Record<string, number>,
  weaponBaseValues: Record<string, number>,
  coreValues: Record<string, number>,
  calcValues: Record<string, CalculatedData>,
  coreSources: Partial<Record<CoreType, string[]>>,
): ResolvedInput[] {
  const { sumAllKeys, weaponKeys, gearKeys, coreKeys, hasWeaponTypeDamage } =
    extractReferencedKeys(formulaStr);
  const inputs: ResolvedInput[] = [];

  for (const key of sumAllKeys) {
    const val = aggregatedValues[key.toLowerCase()] ?? 0;
    const cd = calcValues[key.toLowerCase()];
    inputs.push({
      call: `sumAll("${key}")`,
      key,
      value: val,
      category: 'sumAll',
      contributions: cd ? cd.labels.map((l, i) => ({ label: l, value: cd.values[i] })) : [],
    });
  }

  for (const key of weaponKeys) {
    const val = weaponBaseValues[key] ?? 0;
    inputs.push({
      call: `getBaseWeapon("${key}")`,
      key,
      value: val,
      category: 'baseWeapon',
      contributions: [],
    });
  }

  for (const key of gearKeys) {
    const val = aggregatedValues[key.toLowerCase()] ?? 0;
    const cd = calcValues[key.toLowerCase()];
    inputs.push({
      call: `getBaseGear("${key}")`,
      key,
      value: val,
      category: 'baseGear',
      contributions: cd ? cd.labels.map((l, i) => ({ label: l, value: cd.values[i] })) : [],
    });
  }

  for (const key of coreKeys) {
    const val = coreValues[key.toLowerCase()] ?? 0;
    // Find matching core sources by comparing lowercase
    const sources: string[] = [];
    for (const [coreType, gearTypes] of Object.entries(coreSources)) {
      if (coreType.toLowerCase() === key.toLowerCase() && gearTypes) {
        sources.push(...gearTypes);
      }
    }
    inputs.push({
      call: `getCore("${key}")`,
      key,
      value: val,
      category: 'core',
      contributions: sources.map((gt) => ({ label: gt, value: 1 })),
    });
  }

  if (hasWeaponTypeDamage) {
    const wType = (weaponBaseValues['weaponType'] as unknown as string) || '';
    const weaponTypeToDamageStat = (t: string): string => {
      const lower = t.toLowerCase();
      if (lower === 'mr') return 'mmr damage';
      return lower + ' damage';
    };
    const statKey = wType ? weaponTypeToDamageStat(wType) : 'weapon type damage';
    const val = wType ? (aggregatedValues[statKey] ?? 0) : 0;
    const cd = wType ? calcValues[statKey] : undefined;
    inputs.push({
      call: `getWeaponTypeDamage()`,
      key: statKey,
      value: val,
      category: 'baseWeapon',
      contributions: cd ? cd.labels.map((l, i) => ({ label: l, value: cd.values[i] })) : [],
    });
  }

  return inputs;
}

const CATEGORY_COLORS: Record<string, string> = {
  sumAll: '#4a9eff',
  baseWeapon: '#ff9500',
  baseGear: '#a0d8b0',
  core: '#e074c3',
};

function FormulaExplainer({
  isOpen,
  onClose,
  formula,
  result,
  aggregatedValues,
  weaponBaseValues,
  coreValues,
  calcValues,
  coreSources,
}: FormulaExplainerProps) {
  const stableOnClose = useCallback(() => onClose(), [onClose]);
  useBackButtonClose(isOpen, stableOnClose);

  const inputs = useMemo(() => {
    if (!formula) return [];
    return buildResolvedInputs(
      formula.formula,
      aggregatedValues,
      weaponBaseValues,
      coreValues,
      calcValues,
      coreSources,
    );
  }, [formula, aggregatedValues, weaponBaseValues, coreValues, calcValues, coreSources]);

  if (!isOpen || !formula) return null;

  return (
    <div className="formula-explainer-backdrop" onClick={onClose}>
      <div className="formula-explainer-content" onClick={(e) => e.stopPropagation()}>
        <div className="formula-explainer-header">
          <h3>{formula.label}</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="formula-explainer-body">
          {/* Result banner */}
          <div className="fe-result-banner">
            <span className="fe-result-label">Result</span>
            <span className="fe-result-value">
              {result !== null ? formatDisplay(result, formula.type) : '—'}
            </span>
          </div>

          {/* Formula expression */}
          <div className="fe-formula-code">{formula.formula}</div>

          {/* Inputs table — each input is a vertical block */}
          <div className="fe-inputs">
            {inputs.map((input, idx) => {
              const color = CATEGORY_COLORS[input.category] ?? '#999';
              const hasBreakdown = input.contributions.length > 0;

              return (
                <div key={idx} className="fe-input-block">
                  {/* Block header: the function call and its resolved value */}
                  <div className="fe-input-header" style={{ borderLeftColor: color }}>
                    <span className="fe-input-call" style={{ color }}>
                      {input.call}
                    </span>
                    <span className="fe-input-total">= {formatRaw(input.value)}</span>
                  </div>

                  {/* Contribution rows with running tally */}
                  {hasBreakdown && (
                    <table className="fe-breakdown-table">
                      <thead>
                        <tr>
                          <th className="fe-th-source">Source</th>
                          <th className="fe-th-value">Value</th>
                          <th className="fe-th-running">Running Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {input.contributions.map((c, ci) => {
                          // Running tally: sum of values[0..ci]
                          let running = 0;
                          for (let j = 0; j <= ci; j++) running += input.contributions[j].value;
                          return (
                            <tr key={ci}>
                              <td className="fe-td-source">{c.label}</td>
                              <td className="fe-td-value">
                                {c.value >= 0 ? '+' : ''}
                                {formatRaw(c.value)}
                              </td>
                              <td className="fe-td-running">{formatRaw(running)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FormulaExplainer;
