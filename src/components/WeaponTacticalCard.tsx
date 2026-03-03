import React from "react";
import styles from "./TacticalCard.module.css";
import { BuildWeapon } from "../models/BuildWeapon";

// Color mapping based on weapon flag
const getWeaponColors = (flag: string | null) => {
  switch (flag) {
    case 'E': // Exotic - reddish
      return {
        accentBar: '#DC2626',
        gradientStart: '#4d0505',
        gradientEnd: 'black',
        nameColor: '#EF4444'
      };
    case 'N': // Named - yellow
      return {
        accentBar: '#FFD700',
        gradientStart: '#4d4105',
        gradientEnd: 'black',
        nameColor: '#FFD700'
      };
    default: // Standard - yellow with white text
      return {
        accentBar: '#FFD700',
        gradientStart: '#4d4105',
        gradientEnd: 'black',
        nameColor: '#e5e7eb'
      };
  }
};

interface WeaponTacticalCardProps {
  /** BuildWeapon item to display */
  buildWeapon: BuildWeapon;
  /** Optional click handler */
  onClick?: () => void;
}

const WeaponTacticalCard: React.FC<WeaponTacticalCardProps> = ({
  buildWeapon,
  onClick,
}) => {
  // Defensive check - ensure buildWeapon and weapon exist
  if (!buildWeapon || !buildWeapon.weapon) {
    console.error('WeaponTacticalCard: Invalid buildWeapon prop', buildWeapon);
    return null;
  }
  
  const weapon = buildWeapon.weapon;
  const colors = getWeaponColors(weapon.flag);

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
      <div
        className={styles.accentBar}
        style={{ backgroundColor: colors.accentBar }}
      />

      <div className={styles.cardContent}>
        <div className={styles.gearInfo}>
          <div className={styles.gearName} style={{ color: colors.nameColor }}>
            {weapon.name}
          </div>
        </div>

        <div className={styles.gearAttributes}>
          {weapon.damage && (
            <div className={styles.attribute}>
              {weapon.damage} Damage
            </div>
          )}
          {weapon.rpm && (
            <div className={styles.attribute}>
              {weapon.rpm} RPM
            </div>
          )}
          {weapon.baseMagSize && (
            <div className={styles.attribute}>
              {weapon.baseMagSize} Mag
            </div>
          )}
        </div>

        <div className={styles.pipContainer}>
          {/* Display mod slots as pips */}
          {weapon.modSlots && weapon.modSlots.map((slot, index) => (
            <div
              key={index}
              className={styles.pip}
              title={slot}
            />
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
