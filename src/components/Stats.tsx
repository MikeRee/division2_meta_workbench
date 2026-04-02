import { useMemo, useState } from 'react';
import { MdSettings } from 'react-icons/md';
import './Stats.css';
import { CoreType } from '../models/CoreValue';
import { StatCalculator, FormulaType } from '../models/Formula';
import type { Formula } from '../models/Formula';
import useBuildStore from '../stores/useBuildStore';
import { useFormulaStore } from '../stores/useFormulaStore';
import useAdjustmentStore from '../stores/useAdjustmentStore';
import { topologicalSort } from '../utils/formulaDeps';
import FormulaConfigOverlay from './FormulaConfigOverlay';
import FormulaExplainer from './FormulaExplainer';

const BUILD_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6'] as const;

type WeaponSlot = 'primaryWeapon' | 'secondaryWeapon' | 'pistol';

/** Map a weapon type string to its corresponding damage stat name in the aggregated values */
function weaponTypeToDamageStat(weaponType: string): string {
  const t = weaponType.toLowerCase();
  if (t === 'mr') return 'mmr damage';
  return t + ' damage';
}

/** Evaluate a formula against a given set of aggregated values, weapon base values, and core values */
function evaluateFormulaWith(
  formula: Formula,
  aggregatedValues: Record<string, number>,
  weaponBaseValues: Record<string, number>,
  coreValues: Record<string, number>,
  calcCache: Record<string, number> = {},
  personalValues: Record<string, number> = {},
): number | null {
  if (!formula.formula || !formula.formula.trim()) return null;
  try {
    const cleanCode = formula.formula.trim().replace(/;+\s*$/, '');
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
    const getCalculation = (label: string) => calcCache[label] ?? 0;
    const getPersonal = (prop: string) => personalValues[prop.toLowerCase()] ?? 0;
    const fn = new Function(
      'sumAll',
      'getBaseWeapon',
      'getBaseGear',
      'getCore',
      'getWeaponTypeDamage',
      'round',
      'getCalculation',
      'getPersonal',
      `return (${cleanCode});`,
    );
    const result = fn(
      sumAll,
      getBaseWeapon,
      getBaseGear,
      getCore,
      getWeaponTypeDamage,
      round,
      getCalculation,
      getPersonal,
    );
    if (typeof result === 'number' && isFinite(result)) return result;
    return null;
  } catch {
    return null;
  }
}

/** Determine which weapon slot to use for a given build based on what weapons it has */
function pickWeaponSlot(
  build: { primaryWeapon: any; secondaryWeapon: any; pistol: any },
  preferred: WeaponSlot,
): WeaponSlot {
  if (build[preferred]) return preferred;
  if (build.primaryWeapon) return 'primaryWeapon';
  if (build.secondaryWeapon) return 'secondaryWeapon';
  if (build.pistol) return 'pistol';
  return preferred;
}

interface BuildFormulaResults {
  buildIndex: number;
  color: string;
  isActive: boolean;
  results: Map<string, number | null>; // formula label -> result
  weaponSlotUsed: WeaponSlot;
}

function Stats() {
  const builds = useBuildStore((state) => state.builds);
  const activeBuildIndex = useBuildStore((state) => state.activeBuildIndex);
  const currentBuild = builds[activeBuildIndex];
  const formulas = useFormulaStore((s) => s.formulas);
  const adjustmentModifiers = useAdjustmentStore((s) => s.modifiers);
  const personalAccuracy = useAdjustmentStore((s) => s.personalAccuracy);
  const headshotPercentage = useAdjustmentStore((s) => s.headshotPercentage);
  const [selectedWeaponSlot, setSelectedWeaponSlot] = useState<WeaponSlot>('primaryWeapon');
  const [showFormulaConfig, setShowFormulaConfig] = useState(false);
  const [explainerFormula, setExplainerFormula] = useState<{
    formula: Formula;
    result: number | null;
  } | null>(null);

  const personalValues = useMemo(
    () => ({
      accuracy: personalAccuracy / 100,
      'headshot percentage': headshotPercentage / 100,
    }),
    [personalAccuracy, headshotPercentage],
  );

  // Helper: inject adjustment modifiers into a StatCalculator so they appear in breakdowns
  const injectModifiers = (calc: StatCalculator): void => {
    for (const mod of adjustmentModifiers) {
      calc.add(mod.stat.toLowerCase(), 'Adjustment', mod.label, mod.value);
    }
  };

  // Compute stats for all builds that have data
  const allBuildResults = useMemo(() => {
    const allFormulas = Object.values(formulas).flat();
    const evalOrder = topologicalSort(formulas);
    const formulaByLabel = new Map<string, Formula>();
    allFormulas.forEach((f) => formulaByLabel.set(f.label, f));
    const results: BuildFormulaResults[] = [];

    builds.forEach((build, i) => {
      if (build.isEmpty()) return;

      const slot = pickWeaponSlot(build, selectedWeaponSlot);
      const calc = StatCalculator.forBuild(build, slot);
      injectModifiers(calc);

      const cores: Record<string, number> = {};
      for (const [type, gearTypes] of Object.entries(calc.cores)) {
        cores[type.toLowerCase()] = gearTypes?.length ?? 0;
      }

      const agg = calc.toRecord();

      const buildWeapon = build[slot];
      const wpnBase: Record<string, number> = {};
      if (buildWeapon) {
        const base = buildWeapon.weapon;
        wpnBase.rpm = base.rpm || 0;
        wpnBase.baseMagSize = base.baseMagSize || 0;
        wpnBase.moddedMagSize = base.moddedMagSize || 0;
        wpnBase.reload = base.reload || 0;
        wpnBase.damage = base.damage || 0;
        wpnBase.optimalRange = base.optimalRange || 0;
        wpnBase.hsd = base.hsd || 0;
        (wpnBase as any).weaponType = base.type || '';
      }

      // Evaluate in topological order so dependencies resolve first
      const calcCache: Record<string, number> = {};
      const formulaResults = new Map<string, number | null>();
      for (const label of evalOrder) {
        const f = formulaByLabel.get(label);
        if (!f) continue;
        const result = evaluateFormulaWith(f, agg, wpnBase, cores, calcCache, personalValues);
        formulaResults.set(label, result);
        if (result !== null) calcCache[label] = result;
      }
      // Also evaluate any formulas not in the topo sort (shouldn't happen, but safety)
      allFormulas.forEach((f) => {
        if (!formulaResults.has(f.label)) {
          formulaResults.set(
            f.label,
            evaluateFormulaWith(f, agg, wpnBase, cores, calcCache, personalValues),
          );
        }
      });

      results.push({
        buildIndex: i,
        color: BUILD_COLORS[i],
        isActive: i === activeBuildIndex,
        results: formulaResults,
        weaponSlotUsed: slot,
      });
    });

    return results;
  }, [builds, activeBuildIndex, formulas, selectedWeaponSlot, adjustmentModifiers, personalValues]);

  // Active build calc for core counts and the displayed value
  const calc = useMemo(() => {
    const c = StatCalculator.forBuild(currentBuild, selectedWeaponSlot);
    injectModifiers(c);
    return c;
  }, [currentBuild, selectedWeaponSlot, adjustmentModifiers]);

  const coreValues = useMemo(() => {
    const cores: Record<string, number> = {};
    for (const [type, gearTypes] of Object.entries(calc.cores)) {
      cores[type.toLowerCase()] = gearTypes?.length ?? 0;
    }
    return cores;
  }, [calc]);

  const weaponBaseValues = useMemo(() => {
    const buildWeapon = currentBuild[selectedWeaponSlot];
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

  const aggregatedValues = useMemo(() => calc.toRecord(), [calc]);

  // Build a calculation cache for the active build (for inline evaluation in render)
  const activeCalcCache = useMemo(() => {
    const evalOrder = topologicalSort(formulas);
    const allFormulas = Object.values(formulas).flat();
    const formulaByLabel = new Map<string, Formula>();
    allFormulas.forEach((f) => formulaByLabel.set(f.label, f));
    const cache: Record<string, number> = {};
    for (const label of evalOrder) {
      const f = formulaByLabel.get(label);
      if (!f) continue;
      const result = evaluateFormulaWith(
        f,
        aggregatedValues,
        weaponBaseValues,
        coreValues,
        cache,
        personalValues,
      );
      if (result !== null) cache[label] = result;
    }
    return cache;
  }, [formulas, aggregatedValues, weaponBaseValues, coreValues, personalValues]);

  const offenseCount = coreValues[CoreType.WeaponDamage.toLowerCase()] ?? 0;
  const defenseCount = coreValues[CoreType.Armor.toLowerCase()] ?? 0;
  const skillCount = coreValues[CoreType.SkillTier.toLowerCase()] ?? 0;

  const getWeaponSlotLabel = (slot: WeaponSlot): string => {
    const weapon = currentBuild[slot];
    const label =
      slot === 'primaryWeapon' ? 'Primary' : slot === 'secondaryWeapon' ? 'Secondary' : 'Pistol';
    return weapon ? `${label}: ${weapon.weapon.name}` : `${label} (Empty)`;
  };

  const formatValue = (value: number, type: FormulaType): string => {
    if (type === FormulaType.Percent) {
      const pct = value * 100;
      return `${!Number.isInteger(pct) ? pct.toFixed(1) : pct}%`;
    }
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    if (!Number.isInteger(value)) return value.toFixed(1);
    return value.toString();
  };

  // Compute max value per formula across all builds for relative bar widths
  const formulaMaxValues = useMemo(() => {
    const maxes = new Map<string, number>();
    allBuildResults.forEach((br) => {
      br.results.forEach((val, key) => {
        if (val !== null && val > 0) {
          maxes.set(key, Math.max(maxes.get(key) ?? 0, Math.abs(val)));
        }
      });
    });
    return maxes;
  }, [allBuildResults]);

  const getWeaponSlotAbbrev = (slot: WeaponSlot): string => {
    switch (slot) {
      case 'primaryWeapon':
        return 'P';
      case 'secondaryWeapon':
        return 'S';
      case 'pistol':
        return 'H';
    }
  };

  const categories = Object.keys(formulas);

  return (
    <div className="stats-container">
      <div className="stats-header">
        <h2>BUILD STATS</h2>
        <div className="stats-header-controls">
          <select
            className="weapon-selector"
            value={selectedWeaponSlot}
            onChange={(e) => setSelectedWeaponSlot(e.target.value as WeaponSlot)}
          >
            <option value="primaryWeapon">{getWeaponSlotLabel('primaryWeapon')}</option>
            <option value="secondaryWeapon">{getWeaponSlotLabel('secondaryWeapon')}</option>
            <option value="pistol">{getWeaponSlotLabel('pistol')}</option>
          </select>
          <button
            className="stats-config-btn"
            onClick={() => setShowFormulaConfig(true)}
            title="Configure Stat Formulas"
          >
            <MdSettings />
          </button>
        </div>
      </div>

      {/* Core Attribute Summary */}
      <div className="core-summary">
        <div className="core-summary-card offense">
          <span className="core-summary-label">OFFENSE</span>
          <span className="core-summary-value">{offenseCount}</span>
          <div className="core-summary-bar" />
        </div>
        <div className="core-summary-card defense">
          <span className="core-summary-label">DEFENSE</span>
          <span className="core-summary-value">{defenseCount}</span>
          <div className="core-summary-bar" />
        </div>
        <div className="core-summary-card skill">
          <span className="core-summary-label">SKILL</span>
          <span className="core-summary-value">{skillCount}</span>
          <div className="core-summary-bar" />
        </div>
      </div>

      <div className="stats-content">
        {categories.length === 0 && (
          <div className="stats-empty">
            No formulas configured. Click <MdSettings /> to add stat formulas.
          </div>
        )}
        {categories.map((category) => {
          const categoryFormulas = formulas[category] || [];
          if (categoryFormulas.length === 0) return null;
          return (
            <div key={category} className="stat-category">
              <div className="stat-category-header">
                <h3>{category}</h3>
              </div>
              <div className="stat-category-content">
                {categoryFormulas.map((formula, idx) => {
                  const activeResult = evaluateFormulaWith(
                    formula,
                    aggregatedValues,
                    weaponBaseValues,
                    coreValues,
                    activeCalcCache,
                    personalValues,
                  );
                  const maxVal = formulaMaxValues.get(formula.label) || 1;

                  return (
                    <div
                      key={idx}
                      className="stat-row"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExplainerFormula({ formula, result: activeResult })}
                    >
                      <div className="stat-info">
                        <span className="stat-name">{formula.label}</span>
                        <div className="stat-bars-container">
                          {allBuildResults.map((br) => {
                            const val = br.results.get(formula.label);
                            const pct =
                              val !== null && val !== undefined && maxVal > 0
                                ? Math.min((Math.abs(val) / maxVal) * 100, 100)
                                : 0;
                            return (
                              <div
                                key={br.buildIndex}
                                className={`stat-bar-multi ${br.isActive ? 'active' : 'inactive'}`}
                                style={{ background: `${br.color}20` }}
                                title={`Build ${br.buildIndex + 1} (${getWeaponSlotAbbrev(br.weaponSlotUsed)}): ${val !== null && val !== undefined ? formatValue(val, formula.type) : '—'}`}
                              >
                                <div
                                  className="stat-bar-multi-fill"
                                  style={{
                                    width: `${pct}%`,
                                    background: br.color,
                                    boxShadow: `0 0 4px ${br.color}66`,
                                  }}
                                />
                                {pct > 0 && (
                                  <span className="stat-bar-spec">
                                    {getWeaponSlotAbbrev(br.weaponSlotUsed)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <span className="stat-value formula">
                        {activeResult !== null ? formatValue(activeResult, formula.type) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <FormulaConfigOverlay
        isOpen={showFormulaConfig}
        onClose={() => setShowFormulaConfig(false)}
      />
      <FormulaExplainer
        isOpen={explainerFormula !== null}
        onClose={() => setExplainerFormula(null)}
        formula={explainerFormula?.formula ?? null}
        result={explainerFormula?.result ?? null}
        aggregatedValues={aggregatedValues}
        weaponBaseValues={weaponBaseValues}
        coreValues={coreValues}
        calcValues={calc.values}
        coreSources={calc.cores}
      />
    </div>
  );
}

export default Stats;
