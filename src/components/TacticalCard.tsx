import React, { useEffect } from 'react';
import styles from './TacticalCard.module.css';
import BuildGear, { GearSource } from '../models/BuildGear';
import { getDefaultCoreImage } from '../models/CoreValue';
import { getDefaultAttrImage, getDefaultModImage, GearModClassification } from '../models/GearMod';
import useLookupStore from '../stores/useLookupStore';

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

/** Extract key/value from a Record<string, number> and look up classification.
 *  Returns 'not-settable' for null, 'not-set' for empty record, or the display data. */
function getAttrDisplay(
  attrs: Record<string, number> | null,
):
  | { key: string; value: number; classification: GearModClassification }
  | 'not-settable'
  | 'not-set' {
  if (attrs === null) return 'not-settable';
  const entries = Object.entries(attrs);
  if (entries.length === 0) return 'not-set';
  const [key, value] = entries[0];
  const classification =
    useLookupStore.getState().gearAttributes?.getClassification(key) ??
    GearModClassification.Offensive;
  return { key, value, classification };
}

function getModSlotDisplay(
  modSlots: Record<number, Record<string, number>>,
): { key: string; value: number; classification: GearModClassification } | null {
  const slot = modSlots[0];
  if (!slot) return null;
  const entries = Object.entries(slot);
  if (entries.length === 0) return null;
  const [key, value] = entries[0];
  const gearModAttrsMap = useLookupStore.getState().gearModAttributes;
  const modAttr =
    gearModAttrsMap instanceof Map
      ? Array.from(gearModAttrsMap.values()).find((m) => m.attribute === key)
      : undefined;
  const classification = modAttr?.classification ?? GearModClassification.Offensive;
  return { key, value, classification };
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

        <div className={styles.badgeList}>
          {/* Core attribute icons — all on one row */}
          {buildGear.core && buildGear.core.length > 0 && (
            <div className={styles.badgeRow}>
              {buildGear.core.map((coreValue, index) => (
                <div
                  key={`core-${index}`}
                  className={styles.attributeIcon}
                  dangerouslySetInnerHTML={{
                    __html: getDefaultCoreImage(coreValue),
                  }}
                />
              ))}
            </div>
          )}

          {/* Attribute 1 — icon + label + value */}
          {(() => {
            const attr1 = getAttrDisplay(buildGear.attribute1);
            if (attr1 === 'not-settable') return null;
            if (attr1 === 'not-set') {
              return (
                <div className={`${styles.badgeRow} ${styles.badgeRowNotSet}`}>
                  <div
                    className={styles.attributeIcon}
                    dangerouslySetInnerHTML={{
                      __html: getDefaultAttrImage(GearModClassification.Offensive),
                    }}
                  />
                  <span className={styles.badgeLabel}>No Attribute Set</span>
                </div>
              );
            }
            return (
              <div className={styles.badgeRow}>
                <div
                  className={styles.attributeIcon}
                  dangerouslySetInnerHTML={{
                    __html: getDefaultAttrImage(attr1.classification),
                  }}
                />
                <span className={styles.badgeLabel}>
                  {attr1.key}{' '}
                  {attr1.value != null && (
                    <span className={styles.badgeValue}>
                      {attr1.value}
                      {attr1.value < 1000 ? '%' : attr1.value >= 1000 ? '/s' : ''}
                    </span>
                  )}
                </span>
              </div>
            );
          })()}

          {/* Attribute 2 — icon + label + value */}
          {(() => {
            const attr2 = getAttrDisplay(buildGear.attribute2);
            if (attr2 === 'not-settable') return null;
            if (attr2 === 'not-set') {
              return (
                <div className={`${styles.badgeRow} ${styles.badgeRowNotSet}`}>
                  <div
                    className={styles.attributeIcon}
                    dangerouslySetInnerHTML={{
                      __html: getDefaultAttrImage(GearModClassification.Offensive),
                    }}
                  />
                  <span className={styles.badgeLabel}>No Attribute Set</span>
                </div>
              );
            }
            return (
              <div className={styles.badgeRow}>
                <div
                  className={styles.attributeIcon}
                  dangerouslySetInnerHTML={{
                    __html: getDefaultAttrImage(attr2.classification),
                  }}
                />
                <span className={styles.badgeLabel}>
                  {attr2.key}{' '}
                  {attr2.value != null && (
                    <span className={styles.badgeValue}>
                      {attr2.value}
                      {attr2.value < 1000 ? '%' : attr2.value >= 1000 ? '/s' : ''}
                    </span>
                  )}
                </span>
              </div>
            );
          })()}

          {/* Mod slot — icon + label + value */}
          {(() => {
            const mod = getModSlotDisplay(buildGear.modSlots);
            if (mod) {
              return (
                <div className={styles.badgeRow}>
                  <div
                    className={styles.attributeIcon}
                    dangerouslySetInnerHTML={{
                      __html: getDefaultModImage(mod.classification),
                    }}
                  />
                  <span className={styles.badgeLabel}>
                    {mod.key}{' '}
                    {mod.value != null && (
                      <span className={styles.badgeValue}>
                        {mod.value}
                        {mod.value < 1000 ? '%' : mod.value >= 1000 ? '/s' : ''}
                      </span>
                    )}
                  </span>
                </div>
              );
            }
            if (buildGear.maxModSlots > 0) {
              return (
                <div className={`${styles.badgeRow} ${styles.badgeRowNotSet}`}>
                  <div
                    className={styles.attributeIcon}
                    dangerouslySetInnerHTML={{
                      __html: getDefaultModImage(GearModClassification.Offensive),
                    }}
                  />
                  <span className={styles.badgeLabel}>No Mod Set</span>
                </div>
              );
            }
            return null;
          })()}
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
  if (buildGear.attribute1 !== null) count++;
  if (buildGear.attribute2 !== null) count++;
  if (Object.keys(buildGear.modSlots).length > 0) count++;
  return count || 1; // At least 1 pip
}

export default TacticalCard;
