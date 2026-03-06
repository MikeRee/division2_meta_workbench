import { useState } from 'react';
import './Build.css';
import { MdSave, MdFolderOpen, MdRefresh } from 'react-icons/md';
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

function Build() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayType, setOverlayType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showJsonModal, setShowJsonModal] = useState(false);
  
  const currentBuild = useBuildStore(state => state.currentBuild);
  const updateCurrentBuild = useBuildStore(state => state.updateCurrentBuild);
  const saveCurrentBuild = useBuildStore(state => state.saveCurrentBuild);
  const newBuild = useBuildStore(state => state.newBuild);
  
  const specializationsMap = useLookupStore(state => state.specializations);
  const weaponsMap = useLookupStore(state => state.weapons);
  const skillsMap = useLookupStore(state => state.skills);
  const namedGearMap = useLookupStore(state => state.namedGear);
  const brandsetsMap = useLookupStore(state => state.brandsets);
  const gearsetsMap = useLookupStore(state => state.gearsets);
  const gearAttributesMap = useLookupStore(state => state.gearAttributes);
  
  const specializations = specializationsMap instanceof Map ? Array.from(specializationsMap.values()) : [];
  const weapons = weaponsMap instanceof Map ? Array.from(weaponsMap.values()) : [];
  const skills = skillsMap instanceof Map ? Array.from(skillsMap.values()) : [];
  const namedGear = namedGearMap instanceof Map ? Array.from(namedGearMap.values()) : [];
  const brandsets = brandsetsMap instanceof Map ? Array.from(brandsetsMap.values()) : [];
  const gearsets = gearsetsMap instanceof Map ? Array.from(gearsetsMap.values()) : [];

  const handleCellClick = (type: string) => {
    setOverlayType(type);
    setShowOverlay(true);
    setSearchTerm('');
  };

  // Helper function to process minor attributes
  const processMinorAttribute = (
    minorAttr: MinorAttribute,
    defaultMinorKey: string | null,
    allGearMods: Record<string, number>
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
      const classification = missingMapping || useLookupStore.getState().gearAttributes?.getClassification(key);
      
      return new GearModValue(minorAttr, classification!, key, value);
    } else if (typeof minorAttr === 'object' && defaultMinorKey !== null && minorAttr[defaultMinorKey] !== undefined) {
      // Check missingMappings first, then gearModCollection
      const missingMapping = useLookupStore.getState().getMissingMapping(defaultMinorKey);
      const classification = missingMapping || useLookupStore.getState().gearAttributes?.getClassification(defaultMinorKey);

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
    const namedGearItems = (namedGear as NamedGear[]).filter(gear => 
      gear.type?.toLowerCase() === gearType.toLowerCase() || 
      (gearType === 'kneepads' && gear.type?.toLowerCase() === 'knees')
    );
    
    console.log('Filtered NamedGear items:', namedGearItems.length);
    
    namedGearItems.forEach(gear => {
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
          `Fix the data in namedGear.json`
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
      const minor1Mod = processMinorAttribute(gear.minor1, defaultMinors.minor1, allGearMods);
      const minor2Mod = processMinorAttribute(
        gear.minor2,
        defaultMinors.minor2,
        allGearMods,
      );
      const minor3Mod = processMinorAttribute(
        gear.minor3,
        null,
        allGearMods,
      );
      
      buildGearList.push(new BuildGear({
        name: gear.name,
        source: gear.isExotic ? GearSource.Exotic : GearSource.Named,
        type: gearType,
        icon: gear.icon,
        core: { type: gear.core, value: getDefaultCoreValue(gear.core) },
        minor1: minor1Mod,
        minor2: minor2Mod,
        minor3: null,
      }));
    });

    // 2. Add Gearset items
    gearsets.forEach(gearset => {
      if (!gearset.core) {
        console.warn(`Gearset "${gearset.name}" has no core attribute defined, skipping`);
        return;
      }
      // Extract CoreType from gearset.core (can be CoreType or Record<CoreType, string[]>)
      const core = typeof gearset.core === 'object' 
        ? Object.keys(gearset.core)[0] as CoreType
        : gearset.core;
      const defaultMinors = getDefaultMinorAttributes(core);

      // Get all possible gear mods as a Record<string, number>
      const allGearMods: Record<string, number> = {};
      if (gearAttributesMap instanceof Map) {
        for (const [key, gearMod] of gearAttributesMap.entries()) {
          allGearMods[gearMod.attribute] = gearMod.max;
        }
      }
      const gearAttrCollection = useLookupStore.getState().gearAttributes;
      const allGearAttr = gearAttrCollection!.getAll();

      // Process minor attributes
      const minor1Mod = processMinorAttribute(
        allGearAttr,
        defaultMinors.minor1,
        allGearMods,
      );
      const minor3Mod = processMinorAttribute("mod", null, allGearMods);
      
      buildGearList.push(
        new BuildGear({
          name: gearset.name,
          source: GearSource.Gearset,
          type: gearType,
          icon: gearset.logo,
          core: {
            type: core,
            value: getDefaultCoreValue(core),
          },
          minor1: minor1Mod,
          minor2: null,
          minor3:
            gearType === GearType.Mask ||
            gearType === GearType.Chest ||
            gearType === GearType.Backpack
              ? minor3Mod
              : null,
        }),
      );
    });

    // 3. Add Brandset items
    brandsets.forEach(brandset => {
      if (!brandset.core) {
        console.warn(`Brandset "${brandset.brand}" has no core attribute defined, skipping`);
        return;
      }
      
      const defaultMinors = getDefaultMinorAttributes(brandset.core);

      // Get all possible gear mods as a Record<string, number>
      const allGearMods: Record<string, number> = {};
      if (gearAttributesMap instanceof Map) {
        for (const [key, gearMod] of gearAttributesMap.entries()) {
          allGearMods[gearMod.attribute] = gearMod.max;
        }
      }
      const gearAttrCollection = useLookupStore.getState().gearAttributes;
      const allGearAttr = gearAttrCollection!.getAll();

      // Process minor attributes
      const minor1Mod = processMinorAttribute(
        allGearAttr,
        defaultMinors.minor1,
        allGearMods,
      );
      const minor2Mod = processMinorAttribute(
        allGearAttr,
        defaultMinors.minor2,
        allGearMods,
      );
      const minor3Mod = processMinorAttribute(
        "mod",
        null,
        allGearMods,
      );
      
      buildGearList.push(
        new BuildGear({
          name: brandset.brand,
          source: GearSource.Brandset,
          type: gearType,
          icon: brandset.icon,
          core: {
            type: brandset.core,
            value: getDefaultCoreValue(brandset.core),
          },
          minor1: minor1Mod,
          minor2: minor2Mod,
          minor3:
            gearType === GearType.Mask ||
            gearType === GearType.Chest ||
            gearType === GearType.Backpack
              ? minor3Mod
              : null,
        }),
      );
    });

    // 4. Sort alphabetically by name
    buildGearList.sort((a, b) => a.name.localeCompare(b.name));

    console.log('Total BuildGear items created:', buildGearList.length);

    return buildGearList;
  };

  const handleSelect = (value: string | BuildGear | BuildWeapon) => {
    switch(overlayType) {
      case 'specialization':
        updateCurrentBuild({ specialization: value as string });
        break;
      case 'primaryWeapon':
        updateCurrentBuild({ primaryWeapon: value as BuildWeapon });
        break;
      case 'secondaryWeapon':
        updateCurrentBuild({ secondaryWeapon: value as BuildWeapon });
        break;
      case 'pistol':
        updateCurrentBuild({ pistol: value as BuildWeapon });
        break;
      case 'mask':
        updateCurrentBuild({ mask: value as BuildGear });
        break;
      case 'chest':
        updateCurrentBuild({ chest: value as BuildGear });
        break;
      case 'holster':
        updateCurrentBuild({ holster: value as BuildGear });
        break;
      case 'backpack':
        updateCurrentBuild({ backpack: value as BuildGear });
        break;
      case 'gloves':
        updateCurrentBuild({ gloves: value as BuildGear });
        break;
      case 'kneepads':
        updateCurrentBuild({ kneepads: value as BuildGear });
        break;
      case 'skill1':
        updateCurrentBuild({ skill1: value as string });
        break;
      case 'skill2':
        updateCurrentBuild({ skill2: value as string });
        break;
      default:
        break;
    }
    setShowOverlay(false);
  };

  const handleSave = () => {
    const name = prompt('Enter build name:', currentBuild.name || 'Untitled Build');
    if (name) {
      saveCurrentBuild(name);
      alert('Build saved successfully!');
    }
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
        const weapon = (weapons as Weapon[]).find(w => w.name === llmWeapon.name);
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
        
        return new BuildWeapon(weapon, configuredModSlots);
      };
      
      // Reconstruct BuildGear instances by looking up gear by name
      const reconstructGear = (llmGear: any, gearType: GearType): BuildGear | null => {
        if (!llmGear || !llmGear.name) return null;
        
        // Find the gear in namedGear, gearsets, or brandsets
        const namedGearItem = (namedGear as NamedGear[]).find(g => g.name === llmGear.name);
        const gearsetItem = gearsets.find(g => g.name === llmGear.name);
        const brandsetItem = brandsets.find(b => b.brand === llmGear.name);
        
        if (!namedGearItem && !gearsetItem && !brandsetItem) {
          console.warn(`Gear not found: ${llmGear.name}`);
          return null;
        }
        
        // Get all possible gear mods
        const allGearMods: Record<string, number> = {};
        if (gearAttributesMap instanceof Map) {
          for (const [key, gearMod] of gearAttributesMap.entries()) {
            allGearMods[gearMod.attribute] = gearMod.max;
          }
        }
        
        // Create GearModValue instances for minors
        const createMinor = (minorKey: string | null): GearModValue | null => {
          if (!minorKey) return null;
          
          const missingMapping = useLookupStore.getState().getMissingMapping(minorKey);
          const classification = missingMapping || useLookupStore.getState().gearAttributes?.getClassification(minorKey);
          
          return new GearModValue({ [minorKey]: allGearMods[minorKey] || 0 }, classification!, minorKey, allGearMods[minorKey] || 0);
        };
        
        let source: GearSource;
        let icon = '';
        
        if (namedGearItem) {
          source = namedGearItem.isExotic ? GearSource.Exotic : GearSource.Named;
          icon = namedGearItem.icon || '';
        } else if (gearsetItem) {
          source = GearSource.Gearset;
          icon = gearsetItem.logo || '';
        } else {
          source = GearSource.Brandset;
          icon = brandsetItem?.icon || '';
        }
        
        return new BuildGear({
          name: llmGear.name,
          source,
          type: gearType,
          icon,
          core: { type: llmGear.core, value: getDefaultCoreValue(llmGear.core) },
          minor1: createMinor(llmGear.minor1),
          minor2: createMinor(llmGear.minor2),
          minor3: createMinor(llmGear.minor3),
        });
      };
      
      // Build the updates object
      const updates: any = {
        specialization: llmBuild.specialization || '',
        skill1: llmBuild.skill1 || '',
        skill2: llmBuild.skill2 || '',
        watch: llmBuild.watch || null,
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
    
    switch(overlayType) {
      case 'specialization':
        items = specializations;
        break;
      case 'primaryWeapon':
      case 'secondaryWeapon':
        // Filter out pistols for primary and secondary weapons, wrap in BuildWeapon
        items = (weapons as Weapon[])
          .filter(weapon => 
            weapon.type?.toLowerCase() !== 'pistols' && 
            weapon.type?.toLowerCase() !== 'pistol'
          )
          .map(weapon => new BuildWeapon(weapon));
        break;
      case 'pistol':
        // Only show pistols, wrap in BuildWeapon
        items = (weapons as Weapon[])
          .filter(weapon => 
            weapon.type?.toLowerCase() === 'pistols' || 
            weapon.type?.toLowerCase() === 'pistol'
          )
          .map(weapon => new BuildWeapon(weapon));
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
      return items.filter(item => 
        (item as BuildWeapon).weapon.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return items.filter(item => 
      (item as any)[displayKey]?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredItems = getFilteredItems();
  
  // Check if current overlay is for gear or weapon selection
  const isGearSelection = ['mask', 'chest', 'holster', 'backpack', 'gloves', 'kneepads'].includes(overlayType);
  const isWeaponSelection = ['primaryWeapon', 'secondaryWeapon', 'pistol'].includes(overlayType);

  const getSpecializationImage = (name: string) => {
    return `/images/${name.toLowerCase()}.png`;
  };

  return (
    <div className="build-container">
      <div className="build-header">
        <h2>Build</h2>
        <div className="build-actions">
          <button className="icon-button" onClick={handleSave} title="Save Build">
            <MdSave />
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
            <div 
              className="specialization-cell" 
              onClick={() => handleCellClick('specialization')}
            >
              <img 
                src={getSpecializationImage(currentBuild.specialization)} 
                alt={currentBuild.specialization}
                className="specialization-image"
              />
            </div>
          ) : (
            <div 
              className="build-cell" 
              onClick={() => handleCellClick('specialization')}
            >
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
            <div 
              className="build-cell" 
              onClick={() => handleCellClick('pistol')}
            >
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
            <div 
              className="build-cell" 
              onClick={() => handleCellClick('primaryWeapon')}
            >
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
            <div 
              className="build-cell" 
              onClick={() => handleCellClick('secondaryWeapon')}
            >
              <span className="cell-label">Weapon 2</span>
              <span className="cell-value">Select...</span>
            </div>
          )}
        </div>

        <div className="build-row gear-row">
          {currentBuild.mask ? (
            <TacticalCard 
              buildGear={currentBuild.mask} 
              onClick={() => handleCellClick('mask')}
            />
          ) : (
            <div 
              className="build-cell" 
              onClick={() => handleCellClick('mask')}
            >
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
            <div 
              className="build-cell" 
              onClick={() => handleCellClick('backpack')}
            >
              <span className="cell-label">Backpack</span>
              <span className="cell-value">Select...</span>
            </div>
          )}
        </div>

        <div className="build-row gear-row">
          {currentBuild.chest ? (
            <TacticalCard 
              buildGear={currentBuild.chest} 
              onClick={() => handleCellClick('chest')}
            />
          ) : (
            <div 
              className="build-cell" 
              onClick={() => handleCellClick('chest')}
            >
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
            <div 
              className="build-cell" 
              onClick={() => handleCellClick('gloves')}
            >
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
            <div 
              className="build-cell" 
              onClick={() => handleCellClick('holster')}
            >
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
            <div 
              className="build-cell" 
              onClick={() => handleCellClick('kneepads')}
            >
              <span className="cell-label">Kneepads</span>
              <span className="cell-value">Select...</span>
            </div>
          )}
        </div>

        <div className="build-row skills-row">
          <div 
            className="build-cell" 
            onClick={() => handleCellClick('skill1')}
          >
            <span className="cell-label">Skill 1</span>
            <span className="cell-value">{currentBuild.skill1 || 'Select...'}</span>
          </div>
          <div 
            className="build-cell" 
            onClick={() => handleCellClick('skill2')}
          >
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
              <button className="close-btn" onClick={() => setShowOverlay(false)}>✕</button>
            </div>
            
            <input
              type="text"
              className="overlay-search"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />

            <div className={`overlay-list ${overlayType === 'specialization' ? 'specialization-grid' : !isGearSelection && !isWeaponSelection ? 'single-column' : ''}`}>
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
