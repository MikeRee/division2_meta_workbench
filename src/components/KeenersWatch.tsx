import { useMemo } from 'react';
import './KeenersWatch.css';
import { KeenersWatchStats } from '../models/KeenersWatchStats';
import { useLookupStore } from '../stores/useLookupStore';

interface KeenersWatchProps {
  stats: KeenersWatchStats | null;
  onChange: (stats: KeenersWatchStats) => void;
}

function KeenersWatch({ stats, onChange }: KeenersWatchProps) {
  const keenersWatchData = useLookupStore(state => state.keenersWatch);
  
  // Build default stats and max values from CSV data
  const { defaultStats, maxValues } = useMemo(() => {
    const defaults: KeenersWatchStats = {
      Offensive: {},
      Defensive: {},
      Utility: {},
      Handling: {},
    };
    const maxVals: Record<string, number> = {};
    
    if (keenersWatchData instanceof Map) {
      keenersWatchData.forEach((attr) => {
        // Capitalize the first letter of category to match KeenersWatchStats interface
        const rawCategory = attr.category;
        const category = rawCategory 
          ? (rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1)) as keyof KeenersWatchStats
          : null;
        const statName = attr.attribute;
        const maxValue = parseFloat(attr.max.toString().replace('%', '')) || 0;
        
        // Validate category exists in defaults before setting
        if (category && statName && defaults[category]) {
          defaults[category][statName] = maxValue;
          maxVals[statName] = maxValue;
        } else if (rawCategory && statName) {
          console.warn(`Invalid Keener's Watch category: "${rawCategory}" (normalized: "${category}") for stat "${statName}"`);
        }
      });
    }
    
    return { defaultStats: defaults, maxValues: maxVals };
  }, [keenersWatchData]);

  const currentStats = stats || defaultStats;

  const handleStatChange = (category: keyof KeenersWatchStats, stat: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const maxValue = maxValues[stat] || 10;
    const clampedValue = Math.min(Math.max(numValue, 0), maxValue);

    const newStats = {
      ...currentStats,
      [category]: {
        ...currentStats[category],
        [stat]: clampedValue,
      },
    };

    onChange(newStats);
  };

  const renderStatGroup = (category: keyof KeenersWatchStats, label: string) => {
    const categoryStats = currentStats[category];
    
    return (
      <div className={`watch-quadrant watch-${category.toLowerCase()}`}>
        <div className="quadrant-label">{label}</div>
        <div className="quadrant-stats">
          {Object.entries(categoryStats).map(([stat, value]) => (
            <div key={stat} className="watch-stat">
              <label className="stat-label">{stat}</label>
              <div className="stat-input-wrapper">
                <input
                  type="number"
                  min="0"
                  max={maxValues[stat] || 10}
                  step="0.1"
                  value={value}
                  onChange={(e) => handleStatChange(category, stat, e.target.value)}
                  className="stat-input"
                />
                <span className="stat-percent">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="keeners-watch-container">
      <div className="watch-header">
        <div className="watch-icon">⌚</div>
        <div className="watch-title">KEENER'S WATCH</div>
      </div>
      <div className="watch-grid">
        {renderStatGroup('Offensive', 'OFFENSIVE')}
        {renderStatGroup('Defensive', 'DEFENSIVE')}
        {renderStatGroup('Utility', 'UTILITY')}
        {renderStatGroup('Handling', 'HANDLING')}
      </div>
    </div>
  );
}

export default KeenersWatch;
