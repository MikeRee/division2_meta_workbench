import { useMemo, useState } from 'react';
import { MdSettings } from 'react-icons/md';
import './Stats.css';
import { CoreType } from '../models/CoreValue';
import { StatCalculator, FormulaType } from '../models/Formula';
import type { Formula } from '../models/Formula';
import useBuildStore from '../stores/useBuildStore';
import { useFormulaStore } from '../stores/useFormulaStore';
import FormulaConfigOverlay from './FormulaConfigOverlay';

function Stats() {
  const currentBuild = useBuildStore((state) => state.currentBuild);
  const formulas = useFormulaStore((s) => s.formulas);
  const [selectedWeaponSlot, setSelectedWeaponSlot] = useState<
    'primaryWeapon' | 'secondaryWeapon' | 'pistol'
  >('primaryWeapon');
  const [showFormulaConfig, setShowFormulaConfig] = useState(false);

  const calc = useMemo(() => {
    return StatCalculator.forBuild(currentBuild, selectedWeaponSlot);
  }, [currentBuild, selectedWeaponSlot]);

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
    } as Record<string, number>;
  }, [currentBuild, selectedWeaponSlot]);

  const aggregatedValues = useMemo(() => calc.toRecord(), [calc]);

  const offenseCount = coreValues[CoreType.WeaponDamage.toLowerCase()] ?? 0;
  const defenseCount = coreValues[CoreType.Armor.toLowerCase()] ?? 0;
  const skillCount = coreValues[CoreType.SkillTier.toLowerCase()] ?? 0;

  const getWeaponSlotLabel = (slot: 'primaryWeapon' | 'secondaryWeapon' | 'pistol'): string => {
    const weapon = currentBuild[slot];
    const label =
      slot === 'primaryWeapon' ? 'Primary' : slot === 'secondaryWeapon' ? 'Secondary' : 'Pistol';
    return weapon ? `${label}: ${weapon.weapon.name}` : `${label} (Empty)`;
  };

  const evaluateFormula = (formula: Formula): number | null => {
    if (!formula.formula || !formula.formula.trim()) return null;
    try {
      const cleanCode = formula.formula.trim().replace(/;+\s*$/, '');
      if (!cleanCode) return null;
      const sumAll = (attr: string) => aggregatedValues[attr.toLowerCase()] ?? 0;
      const getBaseWeapon = (prop: string) => weaponBaseValues[prop] ?? 0;
      const getBaseGear = (prop: string) => aggregatedValues[prop.toLowerCase()] ?? 0;
      const getCore = (core: string) => coreValues[core.toLowerCase()] ?? 0;
      const round = (value: number, decimals: number) => {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
      };
      const fn = new Function(
        'sumAll',
        'getBaseWeapon',
        'getBaseGear',
        'getCore',
        'round',
        `return (${cleanCode});`,
      );
      const result = fn(sumAll, getBaseWeapon, getBaseGear, getCore, round);
      if (typeof result === 'number' && isFinite(result)) return result;
      return null;
    } catch {
      return null;
    }
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

  const categories = Object.keys(formulas);

  return (
    <div className="stats-container">
      <div className="stats-header">
        <h2>BUILD STATS</h2>
        <div className="stats-header-controls">
          <select
            className="weapon-selector"
            value={selectedWeaponSlot}
            onChange={(e) =>
              setSelectedWeaponSlot(
                e.target.value as 'primaryWeapon' | 'secondaryWeapon' | 'pistol',
              )
            }
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
                  const result = evaluateFormula(formula);
                  return (
                    <div key={idx} className="stat-row">
                      <div className="stat-info">
                        <span className="stat-name">{formula.label}</span>
                        <div className="stat-bar">
                          <div className="stat-bar-fill formula" style={{ width: '100%' }} />
                        </div>
                      </div>
                      <span className="stat-value formula">
                        {result !== null ? formatValue(result, formula.type) : '—'}
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
    </div>
  );
}

export default Stats;
