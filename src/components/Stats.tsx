import React, { useMemo, useState } from 'react';
import { MdSettings } from 'react-icons/md';
import './Stats.css';
import { Stats as StatsModel } from '../models/Stats';
import { BuildWeapon } from '../models/BuildWeapon';
import useBuildStore from '../stores/useBuildStore';
import FormulaConfigOverlay from './FormulaConfigOverlay';

function Stats() {
  const currentBuild = useBuildStore((state) => state.currentBuild);
  const [selectedWeaponSlot, setSelectedWeaponSlot] = useState<'primary' | 'secondary' | 'pistol'>('primary');
  const [showFormulaConfig, setShowFormulaConfig] = useState(false);

  const selectedWeapon = useMemo(() => {
    switch (selectedWeaponSlot) {
      case 'primary':
        return currentBuild.primaryWeapon;
      case 'secondary':
        return currentBuild.secondaryWeapon;
      case 'pistol':
        return currentBuild.pistol;
      default:
        return currentBuild.primaryWeapon;
    }
  }, [currentBuild, selectedWeaponSlot]);

  const stats = useMemo(() => {
    return StatsModel.BuildStats(currentBuild, selectedWeapon);
  }, [currentBuild, selectedWeapon]);

  const getWeaponLabel = (slot: 'primary' | 'secondary' | 'pistol'): string => {
    let weapon: BuildWeapon | null = null;
    switch (slot) {
      case 'primary':
        weapon = currentBuild.primaryWeapon;
        break;
      case 'secondary':
        weapon = currentBuild.secondaryWeapon;
        break;
      case 'pistol':
        weapon = currentBuild.pistol;
        break;
    }
    
    if (!weapon) {
      return `${slot.charAt(0).toUpperCase() + slot.slice(1)} (Empty)`;
    }
    
    return `${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${weapon.weapon.name}`;
  };

  const formatValue = (value: number): string => {
    // Check if it's a percentage (typically values between 0-100 or 100-200)
    if (value > 0 && value <= 500 && !Number.isInteger(value)) {
      return `${value.toFixed(1)}%`;
    }
    
    // Format large numbers
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    
    // Small numbers or integers
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
  };

  const renderStatCategory = (title: string, categoryStats: Record<string, number>, colorClass: string, showWeaponSelector: boolean = false) => {
    return (
      <div className="stat-category">
        <div className="stat-category-header">
          <h3>{title}</h3>
          {showWeaponSelector && (
            <select 
              className="weapon-selector"
              value={selectedWeaponSlot}
              onChange={(e) => setSelectedWeaponSlot(e.target.value as 'primary' | 'secondary' | 'pistol')}
            >
              <option value="primary">{getWeaponLabel('primary')}</option>
              <option value="secondary">{getWeaponLabel('secondary')}</option>
              <option value="pistol">{getWeaponLabel('pistol')}</option>
            </select>
          )}
        </div>
        <div className="stat-category-content">
          {Object.entries(categoryStats).map(([key, value]) => {
            const displayName = key
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, (str) => str.toUpperCase())
              .trim();
            
            return (
              <div key={key} className="stat-row">
                <div className="stat-info">
                  <span className="stat-name">{displayName}</span>
                  <div className="stat-bar">
                    <div 
                      className={`stat-bar-fill ${colorClass}`}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
                <span className={`stat-value ${colorClass}`}>
                  {formatValue(value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="stats-container">
      <div className="stats-header">
        <h2>BUILD STATS</h2>
        <button 
          className="stats-config-btn" 
          onClick={() => setShowFormulaConfig(true)}
          title="Configure Stat Formulas"
        >
          <MdSettings />
        </button>
      </div>
      <div className="stats-content">
        {renderStatCategory('Weapon Stats', stats.weapon, 'weapon', true)}
        {renderStatCategory('Offense Stats', stats.offense, 'offense')}
        {renderStatCategory('Defense Stats', stats.defense, 'defense')}
      </div>
      <FormulaConfigOverlay
        isOpen={showFormulaConfig}
        onClose={() => setShowFormulaConfig(false)}
      />
    </div>
  );
}

export default Stats;
