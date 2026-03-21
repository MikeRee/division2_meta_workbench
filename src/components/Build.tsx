import { useState, useEffect } from 'react';
import './Build.css';
import { MdWatch, MdFolderOpen, MdRefresh } from 'react-icons/md';
import { useBuildStore } from '../stores/useBuildStore';
import { useLookupStore } from '../stores/useLookupStore';
import Weapon from '../models/Weapon';
import Skill from '../models/Skill';
import NamedGear from '../models/NamedGear';
import { MinorAttribute } from '../models/NamedGear';
import BuildGear, { GearSource } from '../models/BuildGear';
import { GearType } from '../models/BuildGear';
import { CoreType, getDefaultCoreValue, getDefaultMinorAttributes } from '../models/CoreValue';
import { GearModValue } from '../models/GearMod';
import TacticalCard from './TacticalCard';
import WeaponTacticalCard from './WeaponTacticalCard';
import { BuildWeapon } from '../models/BuildWeapon';
import BuildJsonModal from './BuildJsonModal';
import KeenersWatch from './KeenersWatch';
import { KeenersWatchStats } from '../models/KeenersWatchStats';

function Build() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayType, setOverlayType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [showWatchOverlay, setShowWatchOverlay] = useState(false);

  const currentBuild = useBuildStore((state) => state.currentBuild);
  const updateCurrentBuild = useBuildStore((state) => state.updateCurrentBuild);
  const newBuild = useBuildStore((state) => state.newBuild);

  const specializationsMap = useLookupStore((state) => state.specializations);
  const weaponsMap = useLookupStore((state) => state.weapons);
  const skillsMap = useLookupStore((state) => state.skills);
  const namedGearMap = useLookupStore((state) => state.namedGear);
  const brandsetsMap = useLookupStore((state) => state.brandsets);
  const gearsetsMap = useLookupStore((state) => state.gearsets);
  const gearAttributesMap = useLookupStore((state) => state.gearAttributes);
  const weaponModsMap = useLookupStore((state) => state.weaponMods);

  const specializations =
    specializationsMap instanceof Map ? Array.from(specializationsMap.values()) : [];
  const weapons = weaponsMap instanceof Map ? Array.from(weaponsMap.values()) : [];
  const skills = skillsMap instanceof Map ? Array.from(skillsMap.values()) : [];
  const namedGear = namedGearMap instanceof Map ? Array.from(namedGearMap.values()) : [];
  const brandsets = brandsetsMap instanceof Map ? Array.from(brandsetsMap.values()) : [];
  const gearsets = gearsetsMap instanceof Map ? Array.from(gearsetsMap.values()) : [];
  const weaponMods = weaponModsMap instanceof Map ? Array.from(weaponModsMap.values()) : [];

  // Initialize BuildGear with gear attributes when they're loaded
  useEffect(() => {
    if (gearAttributesMap) {
      const gearAttrs = gearAttributesMap.getAll();
      BuildGear.initializeGearAttributes(gearAttrs);
    }
  }, [gearAttributesMap]);

  const handleCellClick = (type: string) => {
    setOverlayType(type);
    setShowOverlay(true);
    setSearchTerm('');
  };

  // Helper function to process minor attributes
  const processMinorAttribute = (
    minorAttr: MinorAttribute,
    defaultMinorKey: string | null,
    allGearMods: Record<string, number>,
  ): GearModValue => {
    if (minorAttr === 'mod') {
      return new GearModValue(allGearMods);
    } else if (typeof minorAttr === 'object' && Object.keys(minorAttr).length === 0) {
      return new GearModValue({});
    } else if (typeof minorAttr === 'object' && Object.keys(minorAttr).length === 1) {
      const key = Object.keys(minorAttr)[0];
      const value = minorAttr[key];

      if (Object.values(CoreType).includes(key as CoreType)) {
        return new GearModValue(minorAttr, key as CoreType, key, value);
      }

      // Check missingMappings first, then gearModCollection
      const missingMapping = useLookupStore.getState().getMissingMapping(key);
      const classification =
        missingMapping || useLookupStore.getState().gearAttributes?.getClassification(key);

      return new GearModValue(minorAttr, classification!, key, value);
    } else if (
      typeof minorAttr === 'object' &&
      defaultMinorKey !== null &&
      minorAttr[defaultMinorKey] !== undefined
    ) {
      // Check missingMappings first, then gearModCollection
      const missingMapping = useLookupStore.getState().getMissingMapping(defaultMinorKey);
      const classification =
        missingMapping ||
        useLookupStore.getState().gearAttributes?.getClassification(defaultMinorKey);

      return new GearModValue(
        minorAttr,
        classification!,
        defaultMinorKey,
        minorAttr[defaultMinorKey],
      );
    } else {
      return new GearModValue({});
    }
  };

  const createBuildGearList = (gearType: GearType): BuildGear[] => {
    const buildGearList: BuildGear[] = [];

    console.log('Creating BuildGear list for:', gearType);
    console.log('NamedGear count:', namedGear.length);
    console.log('Gearsets count:', gearsets.length);
    console.log('Brandsets count:', brandsets.length);

    // 1. Add NamedGear items of this type
    const namedGearItems = (namedGear as NamedGear[]).filter(
      (gear) =>
        gear.type === gearType ||
        (gearType === GearType.Kneepads && gear.type === GearType.Kneepads),
    );

    console.log('Filtered NamedGear items:', namedGearItems.length);

    namedGearItems.forEach((gear) => {
      if (!gear.core) {
        console.warn(`NamedGear item "${gear.name}" has no core attribute defined, skipping`);
        return;
      }

      // Validate core type matches enum
      const validCoreTypes = Object.values(CoreType);
      if (!validCoreTypes.includes(gear.core)) {
        console.error(
          `NamedGear item "${gear.name}" has invalid core type: "${gear.core}". ` +
            `Expected one of: ${validCoreTypes.join(', ')}. ` +
            `Fix the data in namedGear.json`,
        );
        return;
      }

      const defaultMinors = getDefaultMinorAttributes(gear.core);

      // Get all possible gear mods as a Record<string, number>
      const allGearMods: Record<string, number> = {};
      if (gearAttributesMap instanceof Map) {
        for (const [key, gearMod] of gearAttributesMap.entries()) {
          allGearMods[gearMod.attribute] = gearMod.max;
        }
      }

      // Process minor attributes
      buildGearList.push(new BuildGear(gear));
    });

    // 2. Add Gearset items for this gear type
    gearsets.forEach((gearset) => {
      if (!gearset.core) {
        console.warn(`Gearset "${gearset.name}" has no core attribute defined, skipping`);
        return;
      }
      buildGearList.push(new BuildGear(gearset, gearType));
    });

    // 3. Add Brandset items for this gear type
    brandsets.forEach((brandset) => {
      if (!brandset.core) {
        console.warn(`Brandset "${brandset.brand}" has no core attribute defined, skipping`);
        return;
      }
      buildGearList.push(new BuildGear(brandset, gearType));
    });

    // 4. Sort alphabetically by name
    buildGearList.sort((a, b) => a.name.localeCompare(b.name));

    console.log('Total BuildGear items created:', buildGearList.length);

    return buildGearList;
  };

  const handleSelect = (value: string | BuildGear | BuildWeapon) => {
    if (overlayType) {
      updateCurrentBuild({ [overlayType]: value } as any);
    }
    setShowOverlay(false);
  };

  const handleLoad = () => {
    setShowJsonModal(true);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset the build? This will clear all selections.')) {
      newBuild();
    }
  };

  const handleJsonSave = (jsonString: string) => {
    try {
      const llmBuild = JSON.parse(jsonString);

      // Reconstruct BuildWeapon instances by looking up weapons by name
      const reconstructWeapon = (llmWeapon: any): BuildWeapon | null => {
        if (!llmWeapon || !llmWeapon.name) return null;

        // Find the weapon by name
        const weapon = (weapons as Weapon[]).find((w) => w.name === llmWeapon.name);
        if (!weapon) {
          console.warn(`Weapon not found: ${llmWeapon.name}`);
          return null;
        }

        // Reconstruct mod slots
        const configuredModSlots: Record<string, Record<string, number>> = {};
        if (llmWeapon.muzzleIfOption) {
          configuredModSlots.muzzle = { [llmWeapon.muzzleIfOption]: 0 };
        }
        if (llmWeapon.underbarrelIfOption) {
          configuredModSlots.underbarrel = { [llmWeapon.underbarrelIfOption]: 0 };
        }
        if (llmWeapon.magazineIfOption) {
          configuredModSlots.magazine = { [llmWeapon.magazineIfOption]: 0 };
        }
        if (llmWeapon.opticsIfOption) {
          configuredModSlots.optics = { [llmWeapon.opticsIfOption]: 0 };
        }

        return new BuildWeapon(weapon, configuredModSlots, weaponMods);
      };

      // Reconstruct BuildGear instances by looking up gear by name
      const reconstructGear = (llmGear: any, gearType: GearType): BuildGear | null => {
        if (!llmGear || !llmGear.name) return null;

        // Find the gear in namedGear, gearsets, or brandsets
        const namedGearItem = (namedGear as NamedGear[]).find((g) => g.name === llmGear.name);
        const gearsetItem = gearsets.find((g) => g.name === llmGear.name);
        const brandsetItem = brandsets.find((b) => b.brand === llmGear.name);

        const foundItem = namedGearItem || gearsetItem || brandsetItem;

        if (!foundItem) {
          console.warn(`Gear not found: ${llmGear.name}`);
          return null;
        }

        // Create BuildGear from the found item
        const buildGear =
          gearsetItem || brandsetItem
            ? new BuildGear(foundItem, gearType)
            : new BuildGear(foundItem);

        // Apply attributes from LlmGear if they exist
        if (llmGear.gearAttrib1 && buildGear.minor1 && gearAttributesMap) {
          // Find the attribute in gearAttributesMap and update minor1
          const allGearAttrs = gearAttributesMap.toArray();
          const mod = allGearAttrs.find((m) => m.attribute === llmGear.gearAttrib1);
          if (mod) {
            buildGear.minor1 = new GearModValue(
              { [mod.attribute]: mod.max },
              mod.classification,
              mod.attribute,
              mod.max,
            );
          }
        }

        if (llmGear.gearAttrib2 && buildGear.minor2 && gearAttributesMap) {
          // Find the attribute in gearAttributesMap and update minor2
          const allGearAttrs = gearAttributesMap.toArray();
          const mod = allGearAttrs.find((m) => m.attribute === llmGear.gearAttrib2);
          if (mod) {
            buildGear.minor2 = new GearModValue(
              { [mod.attribute]: mod.max },
              mod.classification,
              mod.attribute,
              mod.max,
            );
          }
        }

        if (llmGear.gearMod && buildGear.minor3 && gearAttributesMap) {
          // Find the mod in gearAttributesMap and update minor3
          const allGearAttrs = gearAttributesMap.toArray();
          const mod = allGearAttrs.find((m) => m.attribute === llmGear.gearMod);
          if (mod) {
            buildGear.minor3 = new GearModValue(
              { [mod.attribute]: mod.max },
              mod.classification,
              mod.attribute,
              mod.max,
            );
          }
        }

        return buildGear;
      };

      // Build the updates object
      const updates: any = {
        specialization: llmBuild.specialization || '',
        skill1: llmBuild.skill1 || '',
        skill2: llmBuild.skill2 || '',
        watch: llmBuild.watch || currentBuild.watch || undefined,
        primaryWeapon: reconstructWeapon(llmBuild.primaryWeapon),
        secondaryWeapon: reconstructWeapon(llmBuild.secondaryWeapon),
        pistol: reconstructWeapon(llmBuild.pistol),
        mask: reconstructGear(llmBuild.mask, GearType.Mask),
        chest: reconstructGear(llmBuild.chest, GearType.Chest),
        holster: reconstructGear(llmBuild.holster, GearType.Holster),
        backpack: reconstructGear(llmBuild.backpack, GearType.Backpack),
        gloves: reconstructGear(llmBuild.gloves, GearType.Gloves),
        kneepads: reconstructGear(llmBuild.kneepads, GearType.Kneepads),
      };

      updateCurrentBuild(updates);
      alert('Build updated successfully!');
    } catch (error: any) {
      alert(`Failed to update build: ${error.message}`);
      console.error('Error updating build:', error);
    }
  };

  const getFilteredItems = () => {
    let items: any[] = [];
    const displayKey = 'name';

    switch (overlayType) {
      case 'specialization':
        items = specializations;
        break;
      case 'primaryWeapon':
      case 'secondaryWeapon':
        // Filter out pistols for primary and secondary weapons, wrap in BuildWeapon
        items = (weapons as Weapon[])
          .filter((weapon) => weapon.type?.toLowerCase() !== 'pistol')
          .map((weapon) => new BuildWeapon(weapon, {}, weaponMods));
        break;
      case 'pistol':
        // Only show pistols, wrap in BuildWeapon
        items = (weapons as Weapon[])
          .filter((weapon) => weapon.type?.toLowerCase() === 'pistol')
          .map((weapon) => new BuildWeapon(weapon, {}, weaponMods));
        break;
      case 'mask':
        items = createBuildGearList(GearType.Mask);
        break;
      case 'chest':
        items = createBuildGearList(GearType.Chest);
        break;
      case 'holster':
        items = createBuildGearList(GearType.Holster);
        break;
      case 'backpack':
        items = createBuildGearList(GearType.Backpack);
        break;
      case 'gloves':
        items = createBuildGearList(GearType.Gloves);
        break;
      case 'kneepads':
        items = createBuildGearList(GearType.Kneepads);
        break;
      case 'skill1':
      case 'skill2':
        items = skills as Skill[];
        break;
      default:
        break;
    }

    if (!searchTerm) return items;

    // Handle search for BuildWeapon objects
    if (items.length > 0 && items[0] instanceof BuildWeapon) {
      return items.filter((item) =>
        (item as BuildWeapon).weapon.name?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    return items.filter((item) =>
      (item as any)[displayKey]?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  };

  const filteredItems = getFilteredItems();

  // Check if current overlay is for gear or weapon selection
  const isGearSelection = ['mask', 'chest', 'holster', 'backpack', 'gloves', 'kneepads'].includes(
    overlayType,
  );
  const isWeaponSelection = ['primaryWeapon', 'secondaryWeapon', 'pistol'].includes(overlayType);

  const getSpecializationImage = (name: string) => {
    return `/images/specialties/${name.toLowerCase()}.png`;
  };

  return (
    <div className="build-container">
      <div className="build-header">
        <h2>Build</h2>
        <div className="build-actions">
          <button
            className="icon-button"
            onClick={() => setShowWatchOverlay(true)}
            title="Keener's Watch"
          >
            <MdWatch />
          </button>
          <button className="icon-button" onClick={handleLoad} title="Load Build">
            <MdFolderOpen />
          </button>
          <button className="icon-button" onClick={handleReset} title="Reset Build">
            <MdRefresh />
          </button>
        </div>
      </div>

      <div className="build-content">
        <div className="build-row">
          {currentBuild.specialization ? (
            <div className="specialization-cell" onClick={() => handleCellClick('specialization')}>
              <img
                src={getSpecializationImage(currentBuild.specialization)}
                alt={currentBuild.specialization}
                className="specialization-image"
              />
            </div>
          ) : (
            <div className="build-cell" onClick={() => handleCellClick('specialization')}>
              <span className="cell-label">Specialization</span>
              <span className="cell-value">Select...</span>
            </div>
          )}
          {currentBuild.pistol ? (
            <WeaponTacticalCard
              buildWeapon={currentBuild.pistol}
              onClick={() => handleCellClick('pistol')}
            />
          ) : (
            <div className="build-cell" onClick={() => handleCellClick('pistol')}>
              <span className="cell-label">Pistol</span>
              <span className="cell-value">Select...</span>
            </div>
          )}
        </div>

        <div className="build-row weapons-row">
          {currentBuild.primaryWeapon ? (
            <WeaponTacticalCard
              buildWeapon={currentBuild.primaryWeapon}
              onClick={() => handleCellClick('primaryWeapon')}
            />
          ) : (
            <div className="build-cell" onClick={() => handleCellClick('primaryWeapon')}>
              <span className="cell-label">Weapon 1</span>
              <span className="cell-value">Select...</span>
            </div>
          )}
          {currentBuild.secondaryWeapon ? (
            <WeaponTacticalCard
              buildWeapon={currentBuild.secondaryWeapon}
              onClick={() => handleCellClick('secondaryWeapon')}
            />
          ) : (
            <div className="build-cell" onClick={() => handleCellClick('secondaryWeapon')}>
              <span className="cell-label">Weapon 2</span>
              <span className="cell-value">Select...</span>
            </div>
          )}
        </div>

        <div className="build-row gear-row">
          {currentBuild.mask ? (
            <TacticalCard buildGear={currentBuild.mask} onClick={() => handleCellClick('mask')} />
          ) : (
            <div className="build-cell" onClick={() => handleCellClick('mask')}>
              <span className="cell-label">Mask</span>
              <span className="cell-value">Select...</span>
            </div>
          )}
          {currentBuild.backpack ? (
            <TacticalCard
              buildGear={currentBuild.backpack}
              onClick={() => handleCellClick('backpack')}
            />
          ) : (
            <div className="build-cell" onClick={() => handleCellClick('backpack')}>
              <span className="cell-label">Backpack</span>
              <span className="cell-value">Select...</span>
            </div>
          )}
        </div>

        <div className="build-row gear-row">
          {currentBuild.chest ? (
            <TacticalCard buildGear={currentBuild.chest} onClick={() => handleCellClick('chest')} />
          ) : (
            <div className="build-cell" onClick={() => handleCellClick('chest')}>
              <span className="cell-label">Chest</span>
              <span className="cell-value">Select...</span>
            </div>
          )}
          {currentBuild.gloves ? (
            <TacticalCard
              buildGear={currentBuild.gloves}
              onClick={() => handleCellClick('gloves')}
            />
          ) : (
            <div className="build-cell" onClick={() => handleCellClick('gloves')}>
              <span className="cell-label">Gloves</span>
              <span className="cell-value">Select...</span>
            </div>
          )}
        </div>

        <div className="build-row gear-row">
          {currentBuild.holster ? (
            <TacticalCard
              buildGear={currentBuild.holster}
              onClick={() => handleCellClick('holster')}
            />
          ) : (
            <div className="build-cell" onClick={() => handleCellClick('holster')}>
              <span className="cell-label">Holster</span>
              <span className="cell-value">Select...</span>
            </div>
          )}
          {currentBuild.kneepads ? (
            <TacticalCard
              buildGear={currentBuild.kneepads}
              onClick={() => handleCellClick('kneepads')}
            />
          ) : (
            <div className="build-cell" onClick={() => handleCellClick('kneepads')}>
              <span className="cell-label">Kneepads</span>
              <span className="cell-value">Select...</span>
            </div>
          )}
        </div>

        <div className="build-row skills-row">
          <div className="build-cell" onClick={() => handleCellClick('skill1')}>
            <span className="cell-label">Skill 1</span>
            <span className="cell-value">{currentBuild.skill1 || 'Select...'}</span>
          </div>
          <div className="build-cell" onClick={() => handleCellClick('skill2')}>
            <span className="cell-label">Skill 2</span>
            <span className="cell-value">{currentBuild.skill2 || 'Select...'}</span>
          </div>
        </div>
      </div>

      {showOverlay && (
        <div className="overlay-backdrop" onClick={() => setShowOverlay(false)}>
          <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-header">
              <h3>Select {overlayType}</h3>
              <button className="close-btn" onClick={() => setShowOverlay(false)}>
                ✕
              </button>
            </div>

            <input
              type="text"
              className="overlay-search"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />

            <div
              className={`overlay-list ${overlayType === 'specialization' ? 'specialization-grid' : !isGearSelection && !isWeaponSelection ? 'single-column' : ''}`}
            >
              {filteredItems.length > 0 ? (
                isGearSelection ? (
                  // Render TacticalCards for gear items
                  filteredItems.map((item, index) => (
                    <TacticalCard
                      key={index}
                      buildGear={item as BuildGear}
                      onClick={() => handleSelect(item as BuildGear)}
                    />
                  ))
                ) : isWeaponSelection ? (
                  // Render WeaponTacticalCards for weapon items
                  filteredItems.map((item, index) => (
                    <WeaponTacticalCard
                      key={index}
                      buildWeapon={item as BuildWeapon}
                      onClick={() => handleSelect(item as BuildWeapon)}
                    />
                  ))
                ) : overlayType === 'specialization' ? (
                  // Render specialization items with images
                  filteredItems.map((item, index) => (
                    <img
                      key={index}
                      src={getSpecializationImage(item.name)}
                      alt={item.name}
                      className="specialization-item"
                      onClick={() => handleSelect(item.name)}
                    />
                  ))
                ) : (
                  // Render simple list items for non-gear/weapon items
                  filteredItems.map((item, index) => (
                    <div
                      key={index}
                      className="overlay-item"
                      onClick={() => handleSelect(item.name)}
                    >
                      {item.name}
                    </div>
                  ))
                )
              ) : (
                <div className="overlay-empty">No items found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showWatchOverlay && (
        <div className="overlay-backdrop" onClick={() => setShowWatchOverlay(false)}>
          <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-header">
              <h3>Keener's Watch</h3>
              <button className="close-btn" onClick={() => setShowWatchOverlay(false)}>
                ✕
              </button>
            </div>
            <KeenersWatch
              stats={currentBuild.watch}
              onChange={(stats: KeenersWatchStats) => updateCurrentBuild({ watch: stats })}
            />
          </div>
        </div>
      )}

      <BuildJsonModal
        isOpen={showJsonModal}
        onClose={() => setShowJsonModal(false)}
        currentBuild={currentBuild}
        onSave={handleJsonSave}
      />
    </div>
  );
}

export default Build;
