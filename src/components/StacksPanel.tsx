import { useMemo } from 'react';
import './StacksPanel.css';
import { StatCalculator } from '../models/Formula';
import useBuildStore from '../stores/useBuildStore';
import useCleanDataStore from '../stores/useCleanDataStore';
import Talent from '../models/Talent';

function StacksPanel({
  weaponSlot,
}: {
  weaponSlot: 'primaryWeapon' | 'secondaryWeapon' | 'pistol';
}) {
  const builds = useBuildStore((s) => s.builds);
  const activeBuildIndex = useBuildStore((s) => s.activeBuildIndex);
  const currentBuild = builds[activeBuildIndex];
  const stackValues = useBuildStore((s) => s.stackValues)[activeBuildIndex];
  const applyMaxStacks = useBuildStore((s) => s.applyMaxStacks);
  const setStackValue = useBuildStore((s) => s.setStackValue);
  const setApplyMaxStacks = useBuildStore((s) => s.setApplyMaxStacks);
  const talents = (useCleanDataStore((s) => s.data.talents) ?? []) as Talent[];

  const stacks = useMemo(
    () => StatCalculator.collectBuildStacks(currentBuild, talents, weaponSlot),
    [currentBuild, talents, weaponSlot],
  );

  const handleApplyMaxChange = (checked: boolean) => {
    setApplyMaxStacks(checked);
    if (checked) {
      // Set all stacks to max for current build
      stacks.forEach((stack) => setStackValue(stack.key, stack.max));
    }
  };

  const handleStackChange = (key: string, value: number, max: number) => {
    const clamped = Math.max(0, Math.min(value, max));
    setStackValue(key, clamped);
  };

  if (stacks.length === 0) {
    return (
      <div className="stacks-panel">
        <div className="stacks-empty">No stacks available for this build.</div>
      </div>
    );
  }

  return (
    <div className="stacks-panel">
      <label className="stacks-apply-max">
        <input
          type="checkbox"
          checked={applyMaxStacks}
          onChange={(e) => handleApplyMaxChange(e.target.checked)}
        />
        Apply Max
      </label>
      <div className="stacks-list">
        {stacks.map((stack) => {
          const assigned = applyMaxStacks ? stack.max : (stackValues[stack.key] ?? 0);
          return (
            <div key={stack.key} className="stack-item">
              <div className="stack-header">
                <span className="stack-source">{stack.source}</span>
                <span className="stack-talent">{stack.talentName}</span>
              </div>
              <div className="stack-controls">
                <input
                  type="number"
                  className="stack-input"
                  min={0}
                  max={stack.max}
                  value={assigned}
                  disabled={applyMaxStacks}
                  onChange={(e) =>
                    handleStackChange(stack.key, parseInt(e.target.value) || 0, stack.max)
                  }
                />
                <span className="stack-max">/ {stack.max}</span>
              </div>
              <div className="stack-effects">
                {Object.entries(stack.bonus).map(([stat, perStack]) => (
                  <span key={stat} className="stack-effect">
                    {stat}: {(perStack * assigned).toFixed(1).replace(/\.0$/, '')}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StacksPanel;
