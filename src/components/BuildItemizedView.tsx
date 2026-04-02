import React from 'react';
import './BuildItemizedView.css';
import Build from '../models/Build';
import { BuildWeapon } from '../models/BuildWeapon';
import BuildGear from '../models/BuildGear';
import Specialization from '../models/Specialization';
import useCleanDataStore from '../stores/useCleanDataStore';
import Talent from '../models/Talent';
import { getDefaultCoreImage } from '../models/CoreValue';
import { GearModClassification, getGearColors } from '../models/GearMod';

function formatAttr(attrs: Record<string, number> | null): string[] {
  if (!attrs) return [];
  return Object.entries(attrs)
    .filter(([k]) => k)
    .map(([k, v]) => `${k} ${v}${v < 1000 ? '%' : '/s'}`);
}

/** Get the classification color for an attribute key */
function getAttrColor(key: string): string {
  const classification = useCleanDataStore.getState().getGearAttributeClassification(key) as
    | GearModClassification
    | undefined;
  if (!classification) return '#b0b0b0';
  const [color1] = getGearColors(classification);
  return color1;
}

/** Render an attribute row with classification color, or a "not set" placeholder */
function AttrRow({ attrs, label }: { attrs: Record<string, number> | null; label: string }) {
  if (attrs === null) return null; // slot doesn't exist
  const entries = Object.entries(attrs).filter(([k]) => k);
  if (entries.length === 0) {
    return <div className="itemized-detail itemized-not-set">{label}: not yet set</div>;
  }
  const [key, value] = entries[0];
  const color = getAttrColor(key);
  return (
    <div className="itemized-detail" style={{ color }}>
      {key} {value}
      {value < 1000 ? '%' : '/s'}
    </div>
  );
}

/** For each brand/gearset, track how many pieces are equipped and which slot types. */
interface SetInfo {
  count: number;
  slots: Set<string>; // e.g. 'chest', 'backpack', 'mask', etc.
}

function buildSetInfo(build: Build): Record<string, SetInfo> {
  const info: Record<string, SetInfo> = {};
  const gearSlots = ['mask', 'chest', 'holster', 'backpack', 'gloves', 'kneepads'] as const;
  gearSlots.forEach((slot) => {
    const gear = build[slot] as BuildGear | null;
    if (!gear) return;
    const d = gear.data as any;
    const key = d?.brand || d?.name || gear.name;
    if (!info[key]) info[key] = { count: 0, slots: new Set() };
    info[key].count++;
    info[key].slots.add(slot);
  });
  return info;
}

function formatRecord(rec: Record<string, number | string>): string[] {
  return Object.entries(rec)
    .filter(([k]) => k)
    .map(([k, v]) => {
      if (typeof v === 'number') return `${k} ${v}${v < 1000 ? '%' : ''}`;
      return `${k}: ${v}`;
    });
}

/** Look up a talent by name from the clean data store.
 *  Returns the talent and whether the match was on the perfect variant. */
function lookupTalent(name: string): { talent: Talent; isPerfect: boolean } | undefined {
  const talents: Talent[] = useCleanDataStore.getState().getCleanData('talents') || [];
  const lower = name.toLowerCase().trim();

  // Detect if the input name signals a perfect variant
  const looksLikePerfect = /^perfect/.test(lower);
  // Strip "perfectly" / "perfect" prefix to get the base talent name for matching
  const baseName = lower.replace(/^perfectly?\s+/i, '');

  // 1. Exact match on perfectName
  const perfectExact = talents.find((t) => t.perfectName?.toLowerCase() === lower);
  if (perfectExact) return { talent: perfectExact, isPerfect: true };

  // 2. Exact match on regular name
  const exact = talents.find((t) => t.name.toLowerCase() === lower);
  if (exact) return { talent: exact, isPerfect: false };

  // 3. If input looks like a perfect variant, match the stripped base name against regular names
  if (looksLikePerfect) {
    const baseExact = talents.find((t) => t.name.toLowerCase() === baseName);
    if (baseExact && baseExact.perfectName) return { talent: baseExact, isPerfect: true };

    const baseFuzzy = talents.find(
      (t) => t.name.toLowerCase().includes(baseName) || baseName.includes(t.name.toLowerCase()),
    );
    if (baseFuzzy && baseFuzzy.perfectName) return { talent: baseFuzzy, isPerfect: true };
  }

  // 4. General fuzzy match
  const fuzzy = talents.find(
    (t) => t.name.toLowerCase().includes(lower) || lower.includes(t.name.toLowerCase()),
  );
  if (fuzzy) {
    // If input had "perfect" prefix and we matched a talent that has a perfect variant, use it
    if (looksLikePerfect && fuzzy.perfectName) return { talent: fuzzy, isPerfect: true };
    return { talent: fuzzy, isPerfect: false };
  }

  return undefined;
}

/** Build display lines for the matched talent variant (perfect or regular) */
function buildTalentDisplay(t: Talent, isPerfect: boolean) {
  const lines: string[] = [];
  const displayName = isPerfect && t.perfectName ? t.perfectName : t.name;
  const description = isPerfect && t.perfectDescription ? t.perfectDescription : t.description;
  const bonus = isPerfect && t.perfectBonus ? t.perfectBonus : t.bonus;
  const stacks = isPerfect && t.perfectStacks.length > 0 ? t.perfectStacks : t.stacks;

  const bonusLines = formatRecord(bonus);
  if (bonusLines.length > 0) lines.push(...bonusLines);

  stacks.forEach((s) => {
    const bonusStr = formatRecord(s.bonus).join(', ');
    lines.push(
      `${s.name || 'Stack'} x${s.size}${bonusStr ? ': ' + bonusStr : ''}${s.duration ? ` (${s.duration}s)` : ''}`,
    );
  });

  return { displayName, description, lines, isPerfect };
}

interface Props {
  build: Build;
  onCellClick: (type: string) => void;
}

const BuildItemizedView: React.FC<Props> = ({ build, onCellClick }) => {
  const setInfo = buildSetInfo(build);

  const SLOT_ORDER = [
    { key: 'specialization', label: 'Specialization' },
    { key: 'primaryWeapon', label: 'Primary Weapon' },
    { key: 'secondaryWeapon', label: 'Secondary Weapon' },
    { key: 'pistol', label: 'Pistol' },
    { key: 'mask', label: 'Mask' },
    { key: 'backpack', label: 'Backpack' },
    { key: 'chest', label: 'Chest' },
    { key: 'gloves', label: 'Gloves' },
    { key: 'holster', label: 'Holster' },
    { key: 'kneepads', label: 'Kneepads' },
    { key: 'skill1', label: 'Skill 1' },
    { key: 'skill2', label: 'Skill 2' },
  ];

  return (
    <div className="itemized-list">
      {SLOT_ORDER.map(({ key, label }) => {
        const value = build[key as keyof Build];
        if (!value) {
          return (
            <div
              key={key}
              className="itemized-entry itemized-empty"
              onClick={() => onCellClick(key)}
            >
              <div className="itemized-header">{label}</div>
              <div className="itemized-detail dim">Select...</div>
            </div>
          );
        }

        if (key === 'specialization')
          return (
            <SpecSection
              key={key}
              spec={value as Specialization}
              onClick={() => onCellClick(key)}
            />
          );
        if (key === 'skill1' || key === 'skill2')
          return (
            <SkillSection
              key={key}
              label={label}
              name={value as string}
              onClick={() => onCellClick(key)}
            />
          );
        if (key === 'primaryWeapon' || key === 'secondaryWeapon' || key === 'pistol')
          return (
            <WeaponSection
              key={key}
              label={label}
              bw={value as BuildWeapon}
              onClick={() => onCellClick(key)}
            />
          );
        return (
          <GearSection
            key={key}
            label={label}
            bg={value as BuildGear}
            setInfo={setInfo}
            onClick={() => onCellClick(key)}
          />
        );
      })}
    </div>
  );
};

function SpecSection({ spec, onClick }: { spec: Specialization; onClick: () => void }) {
  const bonuses = formatRecord(spec.bonuses);
  const benefits = formatRecord(spec.benefits);
  return (
    <div className="itemized-entry" onClick={onClick}>
      <div className="itemized-header">{spec.name}</div>
      {bonuses.length > 0 && (
        <div className="itemized-group">
          <span className="itemized-group-label">Bonuses</span>
          {bonuses.map((b, i) => (
            <div key={i} className="itemized-detail">
              {b}
            </div>
          ))}
        </div>
      )}
      {benefits.length > 0 && (
        <div className="itemized-group">
          <span className="itemized-group-label">Benefits</span>
          {benefits.map((b, i) => (
            <div key={i} className="itemized-detail">
              {b}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WeaponSection({
  label,
  bw,
  onClick,
}: {
  label: string;
  bw: BuildWeapon;
  onClick: () => void;
}) {
  const weapon = bw.weapon;
  const title = `${weapon.name} (${weapon.variant || weapon.type})`;
  const attrs: string[] = [
    ...formatAttr(bw.primaryAttribute1),
    ...formatAttr(bw.primaryAttribute2),
    ...formatAttr(bw.secondaryAttribute),
  ];

  // Mod slots
  const equipped = bw.modSlots ?? {};
  const modLines: string[] = [];
  const allSlots = new Set([...weapon.modSlots, ...Object.keys(equipped)]);
  allSlots.forEach((slot) => {
    const eq = equipped[slot];
    if (eq && Object.keys(eq).length > 0) {
      const [k, v] = Object.entries(eq)[0];
      modLines.push(`${slot}: ${k} ${v}${v < 1000 ? '%' : '/s'}`);
    }
  });

  // Bonus
  const bonusLines = formatRecord(weapon.bonus);

  // Talent + stacks
  const talentNames = bw.talents.filter(Boolean);
  const talentDisplays = talentNames.map((tn) => {
    const result = lookupTalent(tn);
    if (!result)
      return { displayName: tn, description: undefined, lines: [] as string[], isPerfect: false };
    return buildTalentDisplay(result.talent, result.isPerfect);
  });

  return (
    <div className="itemized-entry" onClick={onClick}>
      <div className="itemized-header">{title}</div>
      <div className="itemized-sublabel">{label}</div>
      {attrs.length > 0 && (
        <div className="itemized-group">
          <span className="itemized-group-label">Attributes</span>
          {attrs.map((a, i) => (
            <div key={i} className="itemized-detail">
              {a}
            </div>
          ))}
        </div>
      )}
      {modLines.length > 0 && (
        <div className="itemized-group">
          <span className="itemized-group-label">Mods</span>
          {modLines.map((m, i) => (
            <div key={i} className="itemized-detail">
              {m}
            </div>
          ))}
        </div>
      )}
      {bonusLines.length > 0 && (
        <div className="itemized-group">
          <span className="itemized-group-label">Bonus</span>
          {bonusLines.map((b, i) => (
            <div key={i} className="itemized-detail">
              {b}
            </div>
          ))}
        </div>
      )}
      {talentDisplays.map((td, i) => (
        <div key={i} className="itemized-group">
          <span className={`itemized-group-label${td.isPerfect ? ' perfect-label' : ''}`}>
            {td.isPerfect ? 'Perfect ' : ''}Talent: {td.displayName}
          </span>
          {td.description && <div className="itemized-detail dim">{td.description}</div>}
          {td.lines.map((s, j) => (
            <div key={j} className="itemized-detail">
              {s}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function GearSection({
  label,
  bg,
  setInfo,
  onClick,
}: {
  label: string;
  bg: BuildGear;
  setInfo: Record<string, SetInfo>;
  onClick: () => void;
}) {
  const data = bg.data;
  const title = bg.name;
  const d = data as any;
  const countKey = d?.brand || d?.name || title;
  const info = setInfo[countKey];
  const piecesEquipped = info?.count || 1;
  const slotsEquipped = info?.slots || new Set<string>();

  // Core icons as inline SVG
  const coreIcons = bg.core.map((c) => getDefaultCoreImage(c));

  // Mod slots
  const modLines: string[] = [];
  const slots = bg.modSlots;
  Object.entries(slots).forEach(([, val]) => {
    const entries = Object.entries(val);
    if (entries.length > 0) {
      const [k, v] = entries[0];
      modLines.push(`${k} ${v}${v < 1000 ? '%' : '/s'}`);
    }
  });
  // Show "not yet set" for empty mod slots
  const emptyModSlots = bg.maxModSlots - Object.keys(slots).length;

  // Brand/set bonuses with active highlighting
  // Use bg.source (a string enum) instead of instanceof — survives deserialization
  type SetBonusEntry =
    | { kind: 'stat'; text: string; active: boolean }
    | { kind: 'talent'; label: string; talentName: string; active: boolean };

  const setBonuses: SetBonusEntry[] = [];

  if (bg.source === 'brandset') {
    if (d.onePc && Object.keys(d.onePc).length)
      setBonuses.push({
        kind: 'stat',
        text: `1pc: ${formatRecord(d.onePc).join(', ')}`,
        active: piecesEquipped >= 1,
      });
    if (d.twoPc && Object.keys(d.twoPc).length)
      setBonuses.push({
        kind: 'stat',
        text: `2pc: ${formatRecord(d.twoPc).join(', ')}`,
        active: piecesEquipped >= 2,
      });
    if (d.threePc && Object.keys(d.threePc).length)
      setBonuses.push({
        kind: 'stat',
        text: `3pc: ${formatRecord(d.threePc).join(', ')}`,
        active: piecesEquipped >= 3,
      });
  } else if (bg.source === 'gearset') {
    if (d.twoPc && Object.keys(d.twoPc).length)
      setBonuses.push({
        kind: 'stat',
        text: `2pc: ${formatRecord(d.twoPc).join(', ')}`,
        active: piecesEquipped >= 2,
      });
    if (d.threePc && Object.keys(d.threePc).length)
      setBonuses.push({
        kind: 'stat',
        text: `3pc: ${formatRecord(d.threePc).join(', ')}`,
        active: piecesEquipped >= 3,
      });
    if (d.fourPc)
      setBonuses.push({
        kind: 'talent',
        label: '4pc',
        talentName: d.fourPc,
        active: piecesEquipped >= 4,
      });
    if (d.chest)
      setBonuses.push({
        kind: 'talent',
        label: 'Chest',
        talentName: d.chest,
        active: piecesEquipped >= 4 && slotsEquipped.has('chest'),
      });
    if (d.backpack)
      setBonuses.push({
        kind: 'talent',
        label: 'Backpack',
        talentName: d.backpack,
        active: piecesEquipped >= 4 && slotsEquipped.has('backpack'),
      });
  }

  // Talent (named/exotic gear)
  const talentDisplays: {
    displayName: string;
    description?: string;
    lines: string[];
    isPerfect: boolean;
  }[] = [];
  if ((bg.source === 'named' || bg.source === 'exotic') && d.talent && d.talent.length > 0) {
    d.talent.forEach((tn: string) => {
      const result = lookupTalent(tn);
      if (!result) {
        talentDisplays.push({ displayName: tn, lines: [], isPerfect: false });
        return;
      }
      talentDisplays.push(buildTalentDisplay(result.talent, result.isPerfect));
    });
  }

  return (
    <div className="itemized-entry" onClick={onClick}>
      <div className="itemized-header">
        {coreIcons.map((svg, i) => (
          <span key={i} className="itemized-core-icon" dangerouslySetInnerHTML={{ __html: svg }} />
        ))}
        {title}
      </div>
      <div className="itemized-sublabel">
        {label} · {piecesEquipped}pc
      </div>
      <div className="itemized-group">
        <span className="itemized-group-label">Attributes</span>
        <AttrRow attrs={bg.attribute1} label="Attribute 1" />
        <AttrRow attrs={bg.attribute2} label="Attribute 2" />
      </div>
      {(modLines.length > 0 || emptyModSlots > 0) && (
        <div className="itemized-group">
          <span className="itemized-group-label">Mods</span>
          {modLines.map((m, i) => (
            <div key={i} className="itemized-detail">
              {m}
            </div>
          ))}
          {Array.from({ length: emptyModSlots }).map((_, i) => (
            <div key={`empty-${i}`} className="itemized-detail itemized-not-set">
              Mod slot: not yet set
            </div>
          ))}
        </div>
      )}
      {setBonuses.length > 0 && (
        <div className="itemized-group">
          <span className="itemized-group-label">Set Bonuses ({piecesEquipped}pc equipped)</span>
          {setBonuses.map((b, i) => {
            if (b.kind === 'stat') {
              return (
                <div
                  key={i}
                  className={`itemized-detail ${b.active ? 'itemized-bonus-active' : 'itemized-bonus-inactive'}`}
                >
                  {b.text}
                </div>
              );
            }
            // Talent bonus — look up and render with description + stacks
            const result = lookupTalent(b.talentName);
            const td = result ? buildTalentDisplay(result.talent, result.isPerfect) : null;
            return (
              <div
                key={i}
                className={b.active ? 'itemized-bonus-active' : 'itemized-bonus-inactive'}
              >
                <div className="itemized-detail">
                  {b.label}: {b.talentName}
                </div>
                {td && td.description && (
                  <div className="itemized-detail dim" style={{ paddingLeft: '0.5rem' }}>
                    {td.description}
                  </div>
                )}
                {td &&
                  td.lines.map((s, j) => (
                    <div key={j} className="itemized-detail" style={{ paddingLeft: '0.5rem' }}>
                      {s}
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      )}
      {talentDisplays.map((td, i) => (
        <div key={i} className="itemized-group">
          <span className={`itemized-group-label${td.isPerfect ? ' perfect-label' : ''}`}>
            {td.isPerfect ? 'Perfect ' : ''}Talent: {td.displayName}
          </span>
          {td.description && <div className="itemized-detail dim">{td.description}</div>}
          {td.lines.map((s, j) => (
            <div key={j} className="itemized-detail">
              {s}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SkillSection({
  label,
  name,
  onClick,
}: {
  label: string;
  name: string;
  onClick: () => void;
}) {
  return (
    <div className="itemized-entry" onClick={onClick}>
      <div className="itemized-header">{name}</div>
      <div className="itemized-sublabel">{label}</div>
    </div>
  );
}

export default BuildItemizedView;
