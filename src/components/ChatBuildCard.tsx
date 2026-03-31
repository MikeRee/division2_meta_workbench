import React, { useState } from 'react';
import './ChatBuildCard.css';
import Build from '../models/Build';
import BuildGear, { GearSource } from '../models/BuildGear';
import { BuildWeapon } from '../models/BuildWeapon';
import { CoreType } from '../models/CoreValue';
import { GearModClassification } from '../models/GearMod';
import NamedExoticGear from '../models/NamedExoticGear';
import { Rarety } from '../constants/dataKeys';
import useLookupStore from '../stores/useLookupStore';
import useBuildStore from '../stores/useBuildStore';

const BUILD_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6'] as const;

const GEAR_SLOTS = ['mask', 'chest', 'holster', 'backpack', 'gloves', 'kneepads'] as const;
const WEAPON_SLOTS = [
  { key: 'primaryWeapon', label: 'Primary' },
  { key: 'secondaryWeapon', label: 'Secondary' },
  { key: 'pistol', label: 'Pistol' },
] as const;

function getCoreIconClass(core: CoreType): string {
  switch (core) {
    case CoreType.WeaponDamage:
      return 'core-weapon';
    case CoreType.Armor:
      return 'core-armor';
    case CoreType.SkillTier:
      return 'core-skill';
    default:
      return 'core-weapon';
  }
}

function getClassificationClass(key: string): string {
  const classification = useLookupStore.getState().gearAttributes?.getClassification(key);
  switch (classification) {
    case GearModClassification.Defensive:
      return 'defensive';
    case GearModClassification.Skill:
      return 'skill';
    default:
      return 'offensive';
  }
}

function getWeaponAttrClass(key: string): string {
  const lower = key.toLowerCase();
  if (lower.includes('armor') || lower.includes('health') || lower.includes('hazard'))
    return 'defensive';
  if (lower.includes('skill') || lower.includes('status') || lower.includes('repair'))
    return 'skill';
  return 'offensive';
}

function formatValue(value: number): string {
  if (value >= 1000) return `${value}/s`;
  return `${value}%`;
}

function getSourceClass(source: GearSource | null): string {
  switch (source) {
    case GearSource.Brandset:
      return 'brandset';
    case GearSource.Gearset:
      return 'gearset';
    case GearSource.Named:
      return 'named';
    case GearSource.Exotic:
      return 'exotic';
    default:
      return '';
  }
}

function getNameClass(source: GearSource | null): string {
  if (source === GearSource.Named) return 'named-color';
  if (source === GearSource.Exotic) return 'exotic-color';
  return '';
}

function renderAttrTag(attrs: Record<string, number> | null, iconClass: string) {
  if (!attrs) return null;
  const entries = Object.entries(attrs);
  if (entries.length === 0) return null;
  const [key, value] = entries[0];
  const cls = iconClass === 'auto' ? getClassificationClass(key) : iconClass;
  return (
    <span className="chat-build-attr-tag">
      <span className={`attr-icon ${cls}`} />
      {key} <span className="chat-build-attr-value">{formatValue(value)}</span>
    </span>
  );
}

function renderWeaponAttrTag(attrs: Record<string, number> | null) {
  if (!attrs) return null;
  const entries = Object.entries(attrs);
  if (entries.length === 0) return null;
  const [key, value] = entries[0];
  return (
    <span className="chat-build-attr-tag">
      <span className={`attr-icon ${getWeaponAttrClass(key)}`} />
      {key} <span className="chat-build-attr-value">{formatValue(value)}</span>
    </span>
  );
}

function GearSlotRow({ slot, gear }: { slot: string; gear: BuildGear | null }) {
  if (!gear) {
    return (
      <div className="chat-build-slot empty">
        <div className="chat-build-slot-header">
          <span className="chat-build-slot-label">{slot}</span>
          <span className="chat-build-slot-name">Empty</span>
        </div>
      </div>
    );
  }

  const source = gear.source || null;
  const coreTypes = gear.core || [];
  const modSlots = gear.modSlots || [];
  const modEntry = modSlots[0] ? Object.entries(modSlots[0]) : [];
  // Talent lives on the underlying NamedExoticGear data
  const talent = gear.data instanceof NamedExoticGear ? gear.data.talent : [];

  return (
    <div className={`chat-build-slot ${getSourceClass(source)}`}>
      <div className="chat-build-slot-header">
        <span className="chat-build-slot-label">{slot}</span>
        <span className={`chat-build-slot-name ${getNameClass(source)}`}>{gear.name}</span>
      </div>
      <div className="chat-build-attrs">
        {coreTypes.map((core, i) => (
          <span key={`core-${i}`} className="chat-build-attr-tag">
            <span className={`attr-icon ${getCoreIconClass(core)}`} />
            {core}
          </span>
        ))}
        {renderAttrTag(gear.attribute1, 'auto')}
        {renderAttrTag(gear.attribute2, 'auto')}
        {modEntry.length > 0 && (
          <span className="chat-build-attr-tag">
            <span className="attr-icon mod" />
            {modEntry[0][0]}{' '}
            <span className="chat-build-attr-value">{formatValue(modEntry[0][1] as number)}</span>
          </span>
        )}
      </div>
      {talent && talent.length > 0 && <div className="chat-build-talent">{talent[0]}</div>}
    </div>
  );
}

function WeaponSlotRow({ label, weapon }: { label: string; weapon: BuildWeapon | null }) {
  if (!weapon || !weapon.weapon) {
    return (
      <div className="chat-build-slot empty">
        <div className="chat-build-slot-header">
          <span className="chat-build-slot-label">{label}</span>
          <span className="chat-build-slot-name">Empty</span>
        </div>
      </div>
    );
  }

  const w = weapon.weapon;
  const talents = weapon.talents || [];
  const equipped = weapon.modSlots || {};
  const modNames = Object.keys(equipped).filter(
    (k) => equipped[k] && Object.keys(equipped[k]).length > 0,
  );

  return (
    <div
      className={`chat-build-slot ${w.rarety === Rarety.EXOTIC ? 'exotic' : w.rarety === Rarety.NAMED ? 'named' : 'brandset'}`}
    >
      <div className="chat-build-slot-header">
        <span className="chat-build-slot-label">{label}</span>
        <span
          className={`chat-build-slot-name ${w.rarety === Rarety.EXOTIC ? 'exotic-color' : w.rarety === Rarety.NAMED ? 'named-color' : ''}`}
        >
          {w.name}
        </span>
      </div>
      <div className="chat-build-attrs">
        {renderWeaponAttrTag(weapon.primaryAttribute1)}
        {renderWeaponAttrTag(weapon.primaryAttribute2)}
        {renderWeaponAttrTag(weapon.secondaryAttribute)}
      </div>
      {talents.length > 0 && talents[0] && (
        <div className="chat-build-weapon-talent">{talents[0]}</div>
      )}
      {modNames.length > 0 && (
        <div className="chat-build-mods">
          {modNames.map((slot, i) => (
            <span key={i} className="chat-build-mod-tag">
              <span className="mod-dot" />
              {slot}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface ChatBuildCardProps {
  /** If provided, snapshot these values; otherwise read current build from store */
  buildSnapshot?: {
    mask: BuildGear | null;
    chest: BuildGear | null;
    holster: BuildGear | null;
    backpack: BuildGear | null;
    gloves: BuildGear | null;
    kneepads: BuildGear | null;
    primaryWeapon: BuildWeapon | null;
    secondaryWeapon: BuildWeapon | null;
    pistol: BuildWeapon | null;
  };
  /** The raw model JSON string for the JSON viewer */
  modelJson?: string;
  /** Callback to open the JSON viewer with the given JSON */
  onViewJson?: (json: string) => void;
}

const ChatBuildCard: React.FC<ChatBuildCardProps> = ({ buildSnapshot, modelJson, onViewJson }) => {
  const [expanded, setExpanded] = useState(true);

  const builds = useBuildStore((s) => s.builds);
  const setBuild = useBuildStore((s) => s.setBuild);
  const currentBuild = useBuildStore((s) => s.currentBuild);
  const build = buildSnapshot || currentBuild;

  const handleSendTo = (index: number) => {
    const target = builds[index];
    if (target && !target.isEmpty()) {
      if (!confirm(`Build slot ${index + 1} has data. Overwrite it?`)) return;
    }
    // Create a new Build from the snapshot data
    const newBuild = new Build({
      primaryWeapon: build.primaryWeapon,
      secondaryWeapon: build.secondaryWeapon,
      pistol: build.pistol,
      mask: build.mask,
      chest: build.chest,
      holster: build.holster,
      backpack: build.backpack,
      gloves: build.gloves,
      kneepads: build.kneepads,
    });
    setBuild(index, newBuild);
  };

  return (
    <div className="chat-build-card">
      <div className="chat-build-header">
        <span className="chat-build-title" onClick={() => setExpanded(!expanded)}>
          BUILD LOADOUT
        </span>
        <div className="chat-build-actions">
          <span className="chat-build-send-label">Send To</span>
          <div className="chat-build-slots">
            {builds.map((b, i) => (
              <button
                key={i}
                className="chat-build-slot-square"
                style={{
                  borderColor: BUILD_COLORS[i],
                  backgroundColor: b.isEmpty() ? 'transparent' : BUILD_COLORS[i],
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendTo(i);
                }}
                title={`Send to build slot ${i + 1}`}
                aria-label={`Send to build slot ${i + 1}`}
              />
            ))}
          </div>
          {modelJson && onViewJson && (
            <button
              className="chat-build-json-btn"
              onClick={(e) => {
                e.stopPropagation();
                onViewJson(modelJson);
              }}
              title="View JSON"
            >
              {'{ }'}
            </button>
          )}
          <span
            className={`chat-build-toggle ${expanded ? 'expanded' : ''}`}
            onClick={() => setExpanded(!expanded)}
          >
            ▼
          </span>
        </div>
      </div>
      {expanded && (
        <div className="chat-build-body">
          <div className="chat-build-section">Weapons</div>
          {WEAPON_SLOTS.map(({ key, label }) => (
            <WeaponSlotRow
              key={key}
              label={label}
              weapon={(build as any)[key] as BuildWeapon | null}
            />
          ))}
          <div className="chat-build-section">Gear</div>
          {GEAR_SLOTS.map((slot) => (
            <GearSlotRow key={slot} slot={slot} gear={(build as any)[slot] as BuildGear | null} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatBuildCard;
