import React from 'react';
import styles from './TacticalCard.module.css';
import { BuildWeapon } from '../models/BuildWeapon';
import { getDefaultAttrImage, GearModClassification } from '../models/GearMod';
import { Rarety } from '../constants/dataKeys';
import useCleanDataStore from '../stores/useCleanDataStore';

// Color mapping based on weapon rarety
const getWeaponColors = (rarety: Rarety) => {
  switch (rarety) {
    case Rarety.EXOTIC:
      return {
        accentBar: '#DC2626',
        gradientStart: '#4d0505',
        gradientEnd: 'black',
        nameColor: '#EF4444',
      };
    case Rarety.NAMED:
      return {
        accentBar: '#FFD700',
        gradientStart: '#4d4105',
        gradientEnd: 'black',
        nameColor: '#FFD700',
      };
    default:
      return {
        accentBar: '#FFD700',
        gradientStart: '#4d4105',
        gradientEnd: 'black',
        nameColor: '#e5e7eb',
      };
  }
};

// Helper function to determine classification from weapon attribute key
const getAttributeClassification = (key: string | undefined): GearModClassification => {
  if (!key) return GearModClassification.Offensive;
  const lowerKey = key.toLowerCase();
  if (
    lowerKey.includes('damage') ||
    lowerKey.includes('critical') ||
    lowerKey.includes('headshot') ||
    lowerKey.includes('health damage')
  )
    return GearModClassification.Offensive;
  if (
    lowerKey.includes('armor') ||
    lowerKey.includes('health') ||
    lowerKey.includes('hazard protection')
  )
    return GearModClassification.Defensive;
  if (
    lowerKey.includes('skill') ||
    lowerKey.includes('status effects') ||
    lowerKey.includes('repair') ||
    lowerKey.includes('duration')
  )
    return GearModClassification.Skill;
  return GearModClassification.Offensive;
};

/** Render a single attribute row: icon + label + value, or greyed out "not set" */
function renderAttrRow(attrs: Record<string, number> | null, emptyLabel: string) {
  if (attrs === null) return null; // not settable

  const entries = Object.entries(attrs);
  if (entries.length === 0) {
    return (
      <div className={`${styles.badgeRow} ${styles.badgeRowNotSet}`}>
        <div
          className={styles.attributeIcon}
          dangerouslySetInnerHTML={{ __html: getDefaultAttrImage(GearModClassification.Offensive) }}
        />
        <span className={styles.badgeLabel}>{emptyLabel}</span>
      </div>
    );
  }

  const [key, value] = entries[0];
  const classification =
    (useCleanDataStore.getState().getGearAttributeClassification(key) as GearModClassification) ??
    getAttributeClassification(key);

  return (
    <div className={styles.badgeRow}>
      <div
        className={styles.attributeIcon}
        dangerouslySetInnerHTML={{ __html: getDefaultAttrImage(classification) }}
      />
      <span className={styles.badgeLabel}>
        {key}{' '}
        {value != null && (
          <span className={styles.badgeValue}>
            {value}
            {value < 1000 ? '%' : value >= 1000 ? '/s' : ''}
          </span>
        )}
      </span>
    </div>
  );
}

/** Hollowed-out orange square SVG for an empty mod slot */
const emptyModSlotSvg = `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="30" y="30" width="140" height="140" fill="none" stroke="#f97316" stroke-width="14" rx="4"/>
</svg>`;

/** Filled orange square SVG for a populated mod slot */
const filledModSlotSvg = `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="30" y="30" width="140" height="140" fill="#f97316" stroke="#f97316" stroke-width="14" rx="4"/>
</svg>`;

/** Pretty-print a mod slot name */
function formatSlotName(slot: string): string {
  return slot
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(' Slot', '')
    .replace(' Rail', '');
}

interface WeaponTacticalCardProps {
  buildWeapon: BuildWeapon;
  onClick?: () => void;
}

const WeaponTacticalCard: React.FC<WeaponTacticalCardProps> = ({ buildWeapon, onClick }) => {
  if (!buildWeapon || !buildWeapon.weapon) return null;

  const weapon = buildWeapon.weapon;
  const colors = getWeaponColors(weapon.rarety);
  const equippedMods = buildWeapon.modSlots;

  return (
    <div className={styles.tacticalCard} onClick={onClick}>
      <div
        className={styles.cardGradient}
        style={{
          background: `linear-gradient(to right, ${colors.gradientStart}, ${colors.gradientEnd} 70%)`,
        }}
      />
      <div className={styles.cardScanlines} />
      <div className={styles.accentBar} style={{ backgroundColor: colors.accentBar }} />

      <div className={styles.cardContent}>
        <div className={styles.gearInfo}>
          <div className={styles.gearName} style={{ color: colors.nameColor }}>
            {weapon.name}
          </div>
          {buildWeapon.talents.length > 0 && buildWeapon.talents[0] && (
            <div className={styles.gearSource}>{buildWeapon.talents[0]}</div>
          )}
        </div>

        <div className={styles.weaponBody}>
          {/* Left side: vertical attribute list like gear */}
          <div className={styles.badgeList}>
            {renderAttrRow(buildWeapon.primaryAttribute1, 'No Primary Attribute')}
            {renderAttrRow(buildWeapon.primaryAttribute2, 'No Attribute Set')}
            {renderAttrRow(buildWeapon.secondaryAttribute, 'No Attribute Set')}
          </div>

          {/* Right side: mod slots */}
          {(() => {
            const equipped = equippedMods ?? {};
            const allSlotNames = new Set([...weapon.modSlots, ...Object.keys(equipped)]);
            if (allSlotNames.size === 0) return null;
            return (
              <div className={styles.weaponModSlots}>
                {[...allSlotNames].map((slot, index) => {
                  const hasEquipped = equipped[slot] && Object.keys(equipped[slot]).length > 0;
                  return (
                    <div key={index} className={styles.weaponModSlot}>
                      <span className={styles.weaponModLabel}>{formatSlotName(slot)}</span>
                      <div
                        className={styles.weaponModIcon}
                        dangerouslySetInnerHTML={{
                          __html: hasEquipped ? filledModSlotSvg : emptyModSlotSvg,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      <div className={`${styles.cornerBracket} ${styles.cornerTop}`} />
      <div className={`${styles.cornerBracket} ${styles.cornerBottom}`} />
    </div>
  );
};

export default WeaponTacticalCard;
