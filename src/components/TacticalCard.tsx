import React, { useEffect } from 'react';
import styles from './TacticalCard.module.css';
import BuildGear, { GearSource } from '../models/BuildGear';
import { getDefaultCoreImage } from '../models/CoreValue';
import { getDefaultAttrImage, getDefaultModImage } from '../models/GearMod';

// Color mapping based on GearSource
const getGearColors = (source: GearSource | null) => {
  switch (source) {
    case GearSource.Brandset:
      return {
        accentBar: '#FFD700',
        gradientStart: '#4d4105',
        gradientEnd: 'black',
        nameColor: '#e5e7eb',
      };
    case GearSource.Gearset:
      return {
        accentBar: '#40E0D0',
        gradientStart: '#054d4a',
        gradientEnd: 'black',
        nameColor: '#e5e7eb',
      };
    case GearSource.Named:
      return {
        accentBar: '#FFD700',
        gradientStart: '#4d4105',
        gradientEnd: 'black',
        nameColor: '#FFD700',
      };
    case GearSource.Exotic:
      return {
        accentBar: '#DC2626',
        gradientStart: '#4d0505',
        gradientEnd: 'black',
        nameColor: '#EF4444',
      };
    default:
      return {
        accentBar: '#f97316',
        gradientStart: '#4d3105',
        gradientEnd: 'black',
        nameColor: '#e5e7eb',
      };
  }
};

interface TacticalCardProps {
  /** BuildGear item to display */
  buildGear: BuildGear;
  /** Optional click handler */
  onClick?: () => void;
}

const TacticalCard: React.FC<TacticalCardProps> = ({ buildGear, onClick }) => {
  // Get colors based on gear source
  const colors = getGearColors(buildGear.source || null);

  return (
    <div className={styles.tacticalCard} onClick={onClick}>
      <div
        className={styles.cardGradient}
        style={{
          background: `linear-gradient(to right, ${colors.gradientStart}, ${colors.gradientEnd} 70%)`,
        }}
      />

      {buildGear.icon && (
        <div
          className={styles.cardOverlayImg}
          style={{ backgroundImage: `url(${buildGear.icon})` }}
        />
      )}

      {/* Retro-futuristic screen lines */}
      <div className={styles.cardScanlines} />

      {/* Left side accent bar */}
      <div className={styles.accentBar} style={{ backgroundColor: colors.accentBar }} />

      <div className={styles.cardContent}>
        <div className={styles.gearInfo}>
          <div className={styles.gearName} style={{ color: colors.nameColor }}>
            {buildGear.name}
          </div>
        </div>

        <div className={styles.gearAttributes}>
          {buildGear.minor1 && (
            <div className={styles.attribute}>
              {buildGear.minor1.value}
              {buildGear.minor1.value && buildGear.minor1.value < 1000
                ? '%'
                : buildGear.minor1.value && buildGear.minor1.value >= 1000
                  ? '/s'
                  : ''}{' '}
              {buildGear.minor1.key}
            </div>
          )}
          {buildGear.minor2 && (
            <div className={styles.attribute}>
              {buildGear.minor2.value}
              {buildGear.minor2.value && buildGear.minor2.value < 1000
                ? '%'
                : buildGear.minor2.value && buildGear.minor2.value >= 1000
                  ? '/s'
                  : ''}{' '}
              {buildGear.minor2.key}
            </div>
          )}
          {buildGear.minor3 && (
            <div className={styles.attribute}>
              {buildGear.minor3.value}
              {buildGear.minor3.value && buildGear.minor3.value < 1000
                ? '%'
                : buildGear.minor3.value && buildGear.minor3.value >= 1000
                  ? '/s'
                  : ''}{' '}
              {buildGear.minor3.key}
            </div>
          )}
        </div>

        <div className={styles.pipContainer}>
          {/* Core attribute images */}
          {buildGear.core &&
            buildGear.core.map((coreValue, index) => (
              <div
                key={index}
                className={styles.attributeIcon}
                dangerouslySetInnerHTML={{
                  __html: getDefaultCoreImage(coreValue),
                }}
              />
            ))}

          {/* Minor 1 attribute image */}
          {buildGear.minor1 && (buildGear.minor1.classification || buildGear.minor1.core) && (
            <div
              className={styles.attributeIcon}
              dangerouslySetInnerHTML={{
                __html: buildGear.minor1.core
                  ? getDefaultCoreImage(buildGear.minor1.core)
                  : getDefaultAttrImage(buildGear.minor1.classification!),
              }}
            />
          )}

          {/* Minor 2 attribute image */}
          {buildGear.minor2 && (buildGear.minor2.classification || buildGear.minor2.core) && (
            <div
              className={styles.attributeIcon}
              dangerouslySetInnerHTML={{
                __html: buildGear.minor2.core
                  ? getDefaultCoreImage(buildGear.minor2.core)
                  : getDefaultAttrImage(buildGear.minor2.classification!),
              }}
            />
          )}

          {/* Mod slot image */}
          {buildGear.minor3 && buildGear.minor3.classification && (
            <div
              className={styles.attributeIcon}
              dangerouslySetInnerHTML={{
                __html: getDefaultModImage(buildGear.minor3.classification),
              }}
            />
          )}
        </div>
      </div>

      {/* Decorative corner brackets */}
      <div className={`${styles.cornerBracket} ${styles.cornerTop}`} />
      <div className={`${styles.cornerBracket} ${styles.cornerBottom}`} />
    </div>
  );
};

// Helper function to count non-empty attributes
function getAttributeCount(buildGear: BuildGear): number {
  let count = 0;
  if (buildGear.core) count++;
  if (buildGear.minor1) count++;
  if (buildGear.minor2) count++;
  if (buildGear.minor3) count++;
  return count || 1; // At least 1 pip
}

export default TacticalCard;
