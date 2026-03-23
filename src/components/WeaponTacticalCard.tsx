import React, { useEffect } from 'react';
import styles from './TacticalCard.module.css';
import { BuildWeapon } from '../models/BuildWeapon';
import { getDefaultCoreImage } from '../models/CoreValue';
import { getDefaultAttrImage, GearModClassification } from '../models/GearMod';
import { Rarety } from '../constants/dataKeys';

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

  // Check for offensive attributes
  if (
    lowerKey.includes('damage') ||
    lowerKey.includes('critical') ||
    lowerKey.includes('headshot') ||
    lowerKey.includes('health damage')
  ) {
    return GearModClassification.Offensive;
  }

  // Check for defensive attributes
  if (
    lowerKey.includes('armor') ||
    lowerKey.includes('health') ||
    lowerKey.includes('hazard protection')
  ) {
    return GearModClassification.Defensive;
  }

  // Check for utility/skill attributes
  if (
    lowerKey.includes('skill') ||
    lowerKey.includes('status effects') ||
    lowerKey.includes('repair') ||
    lowerKey.includes('duration')
  ) {
    return GearModClassification.Skill;
  }

  // Default to offensive for weapon attributes
  return GearModClassification.Offensive;
};

interface WeaponTacticalCardProps {
  /** BuildWeapon item to display */
  buildWeapon: BuildWeapon;
  /** Optional click handler */
  onClick?: () => void;
}

const WeaponTacticalCard: React.FC<WeaponTacticalCardProps> = ({ buildWeapon, onClick }) => {
  // // Debug logger for buildWeapon prop
  // useEffect(() => {
  //   console.log('WeaponTacticalCard - buildWeapon:', buildWeapon);
  // }, [buildWeapon]);

  // Defensive check - ensure buildWeapon and weapon exist
  if (!buildWeapon || !buildWeapon.weapon) {
    console.error('WeaponTacticalCard: Invalid buildWeapon prop', buildWeapon);
    return null;
  }

  const weapon = buildWeapon.weapon;
  const colors = getWeaponColors(weapon.rarety);

  return (
    <div className={styles.tacticalCard} onClick={onClick}>
      <div
        className={styles.cardGradient}
        style={{
          background: `linear-gradient(to right, ${colors.gradientStart}, ${colors.gradientEnd} 70%)`,
        }}
      />

      {/* Retro-futuristic screen lines */}
      <div className={styles.cardScanlines} />

      {/* Left side accent bar */}
      <div className={styles.accentBar} style={{ backgroundColor: colors.accentBar }} />

      <div className={styles.cardContent}>
        <div className={styles.gearInfo}>
          <div className={styles.gearName} style={{ color: colors.nameColor }}>
            {weapon.name}
          </div>
        </div>

        <div className={styles.gearAttributes}>
          {weapon.damage && <div className={styles.attribute}>{weapon.damage} Damage</div>}
          {weapon.rpm && <div className={styles.attribute}>{weapon.rpm} RPM</div>}
          {weapon.baseMagSize && <div className={styles.attribute}>{weapon.baseMagSize} Mag</div>}
        </div>

        <div className={styles.pipContainer}>
          {/* Core1 attribute image - weapon type damage */}
          {buildWeapon.core1 && buildWeapon.core1.key && (
            <div
              className={styles.attributeIcon}
              dangerouslySetInnerHTML={{
                __html: getDefaultAttrImage(GearModClassification.Offensive), // Weapon damage is always offensive
              }}
            />
          )}

          {/* Core2 attribute image - secondary weapon attribute */}
          {buildWeapon.core2 && buildWeapon.core2.key && (
            <div
              className={styles.attributeIcon}
              dangerouslySetInnerHTML={{
                __html: getDefaultAttrImage(getAttributeClassification(buildWeapon.core2.key)),
              }}
            />
          )}

          {/* Attrib attribute image - tertiary weapon attribute */}
          {buildWeapon.attrib && buildWeapon.attrib.key && (
            <div
              className={styles.attributeIcon}
              dangerouslySetInnerHTML={{
                __html: getDefaultAttrImage(getAttributeClassification(buildWeapon.attrib.key)),
              }}
            />
          )}

          {/* Display mod slots as pips */}
          {weapon.modSlots &&
            weapon.modSlots.map((slot, index) => (
              <div key={index} className={styles.pip} title={slot} />
            ))}
        </div>
      </div>

      {/* Decorative corner brackets */}
      <div className={`${styles.cornerBracket} ${styles.cornerTop}`} />
      <div className={`${styles.cornerBracket} ${styles.cornerBottom}`} />
    </div>
  );
};

export default WeaponTacticalCard;
