import { useState, useEffect } from 'react';
import './Build.css';
import { MdWatch, MdFolderOpen, MdRefresh } from 'react-icons/md';
import { useBuildStore } from '../stores/useBuildStore';
import { useLookupStore } from '../stores/useLookupStore';
import { useCleanDataStore } from '../stores/useCleanDataStore';
import Weapon from '../models/Weapon';
import Skill from '../models/Skill';
import BuildGear, { GearSource } from '../models/BuildGear';
import { GearType } from '../models/BuildGear';
import { CoreType, getDefaultMinorAttributes } from '../models/CoreValue';
import { GearModValue } from '../models/GearMod';
import TacticalCard from './TacticalCard';
import WeaponTacticalCard from './WeaponTacticalCard';
import { BuildWeapon } from '../models/BuildWeapon';
import BuildJsonModal from './BuildJsonModal';
import KeenersWatch from './KeenersWatch';
import { KeenersWatchStats } from '../models/KeenersWatchStats';
import NamedExoticGear, { MinorAttribute } from '../models/NamedExoticGear';
import GearEditOverlay from './GearEditOverlay';
import WeaponEditOverlay from './WeaponEditOverlay';

const GEAR_SLOTS = ['mask', 'chest', 'holster', 'backpack', 'gloves', 'kneepads'] as const;
const WEAPON_SLOTS = ['primaryWeapon', 'secondaryWeapon', 'pistol'] as const;

function Build() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayType, setOverlayType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [showWatchOverlay, setShowWatchOverlay] = useState(false);
  const [editGearSlot, setEditGearSlot] = useState<string | null>(null);
  const [editWeaponSlot, setEditWeaponSlot] = useState<string | null>(null);

  const builds = useBuildStore((state) => state.builds);
  const activeBuildIndex = useBuildStore((state) => state.activeBuildIndex);
  const setActiveBuildIndex = useBuildStore((state) => state.setActiveBuildIndex);
  const currentBuild = builds[activeBuildIndex];
  const updateCurrentBuild = useBuildStore((state) => state.updateCurrentBuild);
  const newBuild = useBuildStore((state) => state.newBuild);

  // Clean data store — primary source of truth
  const specializations = useCleanDataStore((s) => s.data.specializations) ?? [];
  const weapons = (useCleanDataStore((s) => s.data.weapons) ?? []) as Weapon[];
  const skills = (useCleanDataStore((s) => s.data.skills) ?? []) as Skill[];
  const namedGear = (useCleanDataStore((s) => s.data.namedGear) ?? []) as NamedExoticGear[];
  const brandsets = useCleanDataStore((s) => s.data.brandsets) ?? [];
  const gearsets = useCleanDataStore((s) => s.data.gearsets) ?? [];
  const weaponMods = useCleanDataStore((s) => s.data.weaponMods) ?? [];

  // Still from lookup store — CSV-derived data not yet in clean store
  const gearAttributesMap = useLookupStore((state) => state.gearAttributes);

  // Initialize BuildGear with gear attributes when they're loaded
  useEffect(() => {
    if (gearAttributesMap) {
      const gearAttrs = gearAttributesMap.getAll();
      BuildGear.initializeGearAttributes(gearAttrs);
    }
  }, [gearAttributesMap]);

  const handleCellClick = (type: string) => {
    // If item is already set, open edit overlay instead of selection
    if (GEAR_SLOTS.includes(type as any) && currentBuild[type as keyof typeof currentBuild]) {
      setEditGearSlot(type);
      return;
    }
    if (WEAPON_SLOTS.includes(type as any) && currentBuild[type as keyof typeof currentBuild]) {
      setEditWeaponSlot(type);
      return;
    }
    setOverlayType(type);
    setShowOverlay(true);
    setSearchTerm('');
  };

  const handleGearEditSave = (slot: string, updated: BuildGear) => {
    updateCurrentBuild({ [slot]: updated } as any);
    setEditGearSlot(null);
  };

  const handleWeaponEditSave = (slot: string, updated: BuildWeapon) => {
    updateCurrentBuild({ [slot]: updated } as any);
    setEditWeaponSlot(null);
  };

  const handleEditRemove = (slot: string) => {
    updateCurrentBuild({ [slot]: null } as any);
    setEditGearSlot(null);
    setEditWeaponSlot(null);
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
    const namedGearItems = (namedGear as NamedExoticGear[]).filter(
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

      const defaultMinors = getDefaultMinorAttributes(gear.core[0]);

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

        return new BuildWeapon(weapon);
      };

      // Reconstruct BuildGear instances by looking up gear by name
      const reconstructGear = (llmGear: any, gearType: GearType): BuildGear | null => {
        if (!llmGear || !llmGear.name) return null;

        // Find the gear in namedGear, gearsets, or brandsets
        const namedGearItem = (namedGear as NamedExoticGear[]).find((g) => g.name === llmGear.name);
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
        if (
          llmGear.gearAttrib1 &&
          buildGear.attribute1 !== null &&
          Object.keys(buildGear.attribute1).length === 0 &&
          gearAttributesMap
        ) {
          const allGearAttrs = gearAttributesMap.toArray();
          const mod = allGearAttrs.find((m) => m.attribute === llmGear.gearAttrib1);
          if (mod) {
            buildGear.setAttribute1(mod.attribute, mod.max);
          }
        }

        if (
          llmGear.gearAttrib2 &&
          buildGear.attribute2 !== null &&
          Object.keys(buildGear.attribute2).length === 0 &&
          gearAttributesMap
        ) {
          const allGearAttrs = gearAttributesMap.toArray();
          const mod = allGearAttrs.find((m) => m.attribute === llmGear.gearAttrib2);
          if (mod) {
            buildGear.setAttribute2(mod.attribute, mod.max);
          }
        }

        if (llmGear.gearMod && buildGear.maxModSlots > 0) {
          const gearModAttrsMap = useLookupStore.getState().gearModAttributes;
          if (gearModAttrsMap instanceof Map) {
            const modAttr = Array.from(gearModAttrsMap.values()).find(
              (m) => m.attribute === llmGear.gearMod,
            );
            if (modAttr) {
              buildGear.setModSlot(0, modAttr.attribute, modAttr.max);
            }
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
          .map((weapon) => new BuildWeapon(weapon));
        break;
      case 'pistol':
        // Only show pistols, wrap in BuildWeapon
        items = (weapons as Weapon[])
          .filter((weapon) => weapon.type?.toLowerCase() === 'pistol')
          .map((weapon) => new BuildWeapon(weapon));
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

  const BUILD_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6'] as const;

  return (
    <div className="build-container">
      <div className="build-header">
        <div className="build-title-row">
          <h2>Build</h2>
          <div className="build-slot-indicators">
            {builds.map((build, i) => (
              <button
                key={i}
                className={`build-slot-square ${i === activeBuildIndex ? 'active' : ''}`}
                style={{
                  borderColor: BUILD_COLORS[i],
                  backgroundColor: build.isEmpty() ? 'transparent' : BUILD_COLORS[i],
                }}
                onClick={() => setActiveBuildIndex(i)}
                title={`Build ${i + 1}`}
                aria-label={`Switch to build slot ${i + 1}`}
              />
            ))}
          </div>
        </div>
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

      {editGearSlot && currentBuild[editGearSlot as keyof typeof currentBuild] && (
        <GearEditOverlay
          buildGear={currentBuild[editGearSlot as keyof typeof currentBuild] as BuildGear}
          onSave={(updated) => handleGearEditSave(editGearSlot, updated)}
          onRemove={() => handleEditRemove(editGearSlot)}
          onClose={() => setEditGearSlot(null)}
        />
      )}

      {editWeaponSlot && currentBuild[editWeaponSlot as keyof typeof currentBuild] && (
        <WeaponEditOverlay
          buildWeapon={currentBuild[editWeaponSlot as keyof typeof currentBuild] as BuildWeapon}
          onSave={(updated) => handleWeaponEditSave(editWeaponSlot, updated)}
          onRemove={() => handleEditRemove(editWeaponSlot)}
          onClose={() => setEditWeaponSlot(null)}
        />
      )}
    </div>
  );
}

export default Build;
