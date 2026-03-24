import BuildGear, { GearType } from './BuildGear';
import { BuildWeapon } from './BuildWeapon';
import { CoreType, parseCoreType } from './CoreValue';
import { KeenersWatchStats } from './KeenersWatchStats';
import LlmBuild, { LlmWeapon, LlmGear, LlmAttachments } from './LlmBuild';
import { useLookupStore } from '../stores/useLookupStore';
import useCleanDataStore from '../stores/useCleanDataStore';
import { fuzzyFind } from '../utils/fuzzySearch';
import Gearset from './Gearset';
import Brandset from './Brandset';
import NamedExoticGear from './NamedExoticGear';
import Weapon from './Weapon';
import WeaponMod from './WeaponMod';
function getDefaultWatchStats(): KeenersWatchStats {
  const keenersWatchData = useLookupStore.getState().keenersWatch;
  const defaults: KeenersWatchStats = {
    Offensive: {},
    Defensive: {},
    Utility: {},
    Handling: {},
  };
  if (keenersWatchData instanceof Map && keenersWatchData.size > 0) {
    keenersWatchData.forEach((attr: any) => {
      const rawCategory = attr.category;
      const category = rawCategory
        ? ((rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1)) as keyof KeenersWatchStats)
        : null;
      const statName = attr.attribute;
      const maxValue = parseFloat(attr.max.toString().replace('%', '')) || 0;
      if (category && statName && defaults[category]) {
        defaults[category][statName] = maxValue;
      }
    });
  }
  return defaults;
}

class Build {
  name: string;
  specialization: any;
  primaryWeapon: BuildWeapon | null;
  secondaryWeapon: BuildWeapon | null;
  pistol: BuildWeapon | null;
  mask: BuildGear | null;
  chest: BuildGear | null;
  holster: BuildGear | null;
  backpack: BuildGear | null;
  gloves: BuildGear | null;
  kneepads: BuildGear | null;
  skill1: any;
  skill2: any;
  watch: KeenersWatchStats;
  createdAt: number;
  updatedAt: number;

  constructor({
    name = '',
    specialization = null,
    primaryWeapon = null,
    secondaryWeapon = null,
    pistol = null,
    mask = null,
    chest = null,
    holster = null,
    backpack = null,
    gloves = null,
    kneepads = null,
    skill1 = null,
    skill2 = null,
    watch = null,
    createdAt = null,
    updatedAt = null,
  }: {
    name?: string;
    specialization?: any;
    primaryWeapon?: BuildWeapon | null;
    secondaryWeapon?: BuildWeapon | null;
    pistol?: BuildWeapon | null;
    mask?: BuildGear | null;
    chest?: BuildGear | null;
    holster?: BuildGear | null;
    backpack?: BuildGear | null;
    gloves?: BuildGear | null;
    kneepads?: BuildGear | null;
    skill1?: any;
    skill2?: any;
    watch?: any;
    createdAt?: number | null;
    updatedAt?: number | null;
  } = {}) {
    this.name = name;
    this.specialization = specialization;
    this.primaryWeapon = primaryWeapon;
    this.secondaryWeapon = secondaryWeapon;
    this.pistol = pistol;
    this.mask = mask;
    this.chest = chest;
    this.holster = holster;
    this.backpack = backpack;
    this.gloves = gloves;
    this.kneepads = kneepads;
    this.skill1 = skill1;
    this.skill2 = skill2;
    this.watch =
      watch &&
      typeof watch === 'object' &&
      Object.values(watch).some((cat: any) => cat && Object.keys(cat).length > 0)
        ? watch
        : getDefaultWatchStats();
    this.createdAt = createdAt || Date.now();
    this.updatedAt = updatedAt || Date.now();
  }

  toLlm(): LlmBuild {
    const convertWeapon = (weapon: BuildWeapon | null): LlmWeapon | null => {
      if (!weapon) return null;
      if (!(weapon instanceof BuildWeapon)) {
        console.warn('convertWeapon: received non-BuildWeapon object, skipping', weapon);
        return null;
      }

      const attrib1 = Object.keys(weapon.primaryAttribute1)[0] || '';

      let attrib2: string | null = null;
      const pa2 = weapon.primaryAttribute2;
      if (pa2) {
        const pa2Key = Object.keys(pa2)[0];
        if (pa2Key) attrib2 = pa2Key;
      }

      let attrib3: string | null = null;
      const sa = weapon.secondaryAttribute;
      if (sa) {
        const saKey = Object.keys(sa)[0];
        if (saKey) attrib3 = saKey;
      }

      let attachments: LlmAttachments | null = null;
      const buildSlots = weapon.modSlots; // equipped mods (Record<string, Record<string, number>>)
      const weaponSlots = weapon.weapon.modSlots; // available slot names (string[])

      if (weaponSlots.length > 0 || Object.keys(buildSlots).length > 0) {
        const slotSet = new Set(weaponSlots.map((s) => s.toLowerCase()));
        const allMods: WeaponMod[] = useCleanDataStore.getState().getCleanData('weaponMods') || [];

        const resolveSlot = (
          availableKey: string,
        ): Record<string, Record<string, number>> | null => {
          const buildKey = Object.keys(buildSlots).find((k) => k.toLowerCase() === availableKey);
          if (buildKey) {
            const bonusData = buildSlots[buildKey];
            if (bonusData && Object.keys(bonusData).length > 0) {
              // Look up the mod name by matching slot type and bonus
              const mod = allMods.find(
                (m) =>
                  m.type.toUpperCase() === buildKey.toUpperCase() &&
                  Object.keys(m.bonus).some((k) => Object.keys(bonusData).includes(k)),
              );
              const modName = mod?.name || 'MISSING MOD';
              return { [modName]: bonusData };
            }
            return { 'MISSING MOD': {} };
          }
          if (slotSet.has(availableKey)) return null;
          return null;
        };

        const muzzle = resolveSlot('muzzle slot');
        const underbarrel = resolveSlot('underbarrel');
        const magazine = resolveSlot('magazine slot');
        const optics = resolveSlot('optics rail');

        attachments = new LlmAttachments(muzzle, underbarrel, magazine, optics);
      }

      return new LlmWeapon(
        weapon.weapon.name,
        attrib1,
        attrib2,
        attrib3,
        weapon.talents?.[0] ?? null,
        attachments,
      );
    };

    const convertGear = (gear: BuildGear | null): LlmGear | null => {
      if (!gear) return null;
      if (!(gear instanceof BuildGear)) {
        console.warn('convertGear: received non-BuildGear object, skipping', gear);
        return null;
      }

      const core = gear.core.length === 3 ? null : (gear.core[0] ?? null);

      const attr1Key = gear.attribute1 ? Object.keys(gear.attribute1)[0] || null : null;
      const attr2Key = gear.attribute2 ? Object.keys(gear.attribute2)[0] || null : null;
      const modSlot0 = gear.modSlots[0];
      const modKeys = modSlot0 ? Object.keys(modSlot0).filter(Boolean) : [];

      return new LlmGear(gear.name, core, attr1Key, attr2Key, modKeys.length > 0 ? modKeys : null);
    };

    return new LlmBuild({
      primaryWeapon: convertWeapon(this.primaryWeapon),
      secondaryWeapon: convertWeapon(this.secondaryWeapon),
      pistol: convertWeapon(this.pistol),
      mask: convertGear(this.mask),
      chest: convertGear(this.chest),
      holster: convertGear(this.holster),
      backpack: convertGear(this.backpack),
      gloves: convertGear(this.gloves),
      kneepads: convertGear(this.kneepads),
    });
  }

  toView(): Record<string, any> {
    const llm = this.toLlm();
    return llm.toJSON();
  }

  static fromLlm(llmBuild: LlmBuild): Partial<Build> {
    // Note: This returns a partial Build since LlmBuild doesn't contain all Build properties
    // The caller should merge this with existing Build data or provide defaults

    const convertWeapon = (llmWeapon: any): BuildWeapon | null => {
      if (!llmWeapon) return null;

      const name: string = llmWeapon.name;
      const storeState = useCleanDataStore.getState();
      const weapons: Weapon[] = storeState.getCleanData('weapons') || [];

      const weapon = fuzzyFind(name, weapons, (w) => w.name);
      if (!weapon) {
        console.warn(`Build.fromLlm: no weapon match found for "${name}"`);
        return null;
      }

      const bw = new BuildWeapon(weapon);

      // Restore primary attribute 2
      if (llmWeapon.primaryAttrib2) {
        const weaponAttrs = BuildWeapon.getWeaponAttributeOptions();
        const val = weaponAttrs[llmWeapon.primaryAttrib2] ?? 0;
        bw.setPrimaryAttribute2(llmWeapon.primaryAttrib2, val);
      }

      // Restore secondary attribute
      if (llmWeapon.secondaryAttrib) {
        const weaponAttrs = BuildWeapon.getWeaponAttributeOptions();
        const val = weaponAttrs[llmWeapon.secondaryAttrib] ?? 0;
        bw.setSecondaryAttribute(llmWeapon.secondaryAttrib, val);
      }

      // Restore talent
      if (llmWeapon.talent) {
        bw.setTalent(llmWeapon.talent);
      }

      // Restore mod slots from attachments
      const attachments = llmWeapon.attachments;
      if (attachments) {
        const allMods: WeaponMod[] = storeState.getCleanData('weaponMods') || [];
        const slotFields: [string, Record<string, Record<string, number>> | null][] = [
          ['muzzle slot', attachments.muzzleIfOption],
          ['underbarrel', attachments.underbarrelIfOption],
          ['magazine slot', attachments.magazineIfOption],
          ['optics rail', attachments.opticsIfOption],
        ];

        const slots: Record<string, Record<string, number>> = {};
        for (const [slotKey, attachment] of slotFields) {
          if (!attachment) continue;
          const modName = Object.keys(attachment)[0];
          if (!modName || modName === 'MISSING MOD') continue;
          const bonusData = attachment[modName];

          // Find the matching weapon mod to get the canonical slot type
          const mod = allMods.find((m) => m.name === modName && m.type.toLowerCase() === slotKey);
          const slotType = mod?.type || bw.weapon.modSlots.find((s) => s.toLowerCase() === slotKey);
          if (slotType) {
            slots[slotType] = bonusData;
          }
        }
        if (Object.keys(slots).length > 0) {
          bw.setModSlots(slots);
        }
      }

      return bw;
    };

    const convertGear = (llmGear: any, gearType: GearType): BuildGear | null => {
      if (!llmGear) return null;

      const name: string = llmGear.name;
      const llmCore: CoreType | null = llmGear.core ?? null;

      const storeState = useCleanDataStore.getState();
      const namedGear: NamedExoticGear[] = storeState.getCleanData('namedGear') || [];
      const gearsets: Gearset[] = storeState.getCleanData('gearsets') || [];
      const brandsets: Brandset[] = storeState.getCleanData('brandsets') || [];

      // Build a single combined list with a unified name accessor and source tag
      const combined: {
        item: NamedExoticGear | Gearset | Brandset;
        name: string;
        source: 'named' | 'gearset' | 'brand';
      }[] = [
        ...namedGear.map((ng) => ({ item: ng, name: ng.name, source: 'named' as const })),
        ...gearsets.map((gs) => ({ item: gs, name: gs.name, source: 'gearset' as const })),
        ...brandsets.map((bs) => ({ item: bs, name: bs.brand, source: 'brand' as const })),
      ];

      const match = fuzzyFind(name, combined, (entry) => entry.name);

      if (!match) {
        console.log(
          `Build.fromLlm: no gear match for "${name}" across ${namedGear.length} named, ${gearsets.length} gearsets, ${brandsets.length} brands`,
        );
        return null;
      }

      try {
        const buildGear =
          match.source === 'named'
            ? new BuildGear(match.item)
            : new BuildGear(match.item, gearType);

        // If the gear has 3 cores (exotic with all 3), keep them as-is from the data
        // Otherwise (1 core), assign the first LLM-provided core
        if (buildGear.core.length < 3 && llmCore) {
          const coreType = parseCoreType(llmCore);
          buildGear.setCore(coreType);
        }

        // Restore gear attributes
        const gearAttributesMap = useLookupStore.getState().gearAttributes;
        if (gearAttributesMap) {
          const allGearAttrs = gearAttributesMap.toArray();

          if (
            llmGear.gearAttrib1 &&
            buildGear.attribute1 !== null &&
            Object.keys(buildGear.attribute1).length === 0
          ) {
            const attr = allGearAttrs.find((a: any) => a.attribute === llmGear.gearAttrib1);
            if (attr) buildGear.setAttribute1(attr.attribute, attr.max);
          }

          if (
            llmGear.gearAttrib2 &&
            buildGear.attribute2 !== null &&
            Object.keys(buildGear.attribute2).length === 0
          ) {
            const attr = allGearAttrs.find((a: any) => a.attribute === llmGear.gearAttrib2);
            if (attr) buildGear.setAttribute2(attr.attribute, attr.max);
          }

          if (llmGear.gearMod && buildGear.maxModSlots > 0) {
            const attr = allGearAttrs.find((a: any) => a.attribute === llmGear.gearMod);
            if (attr) buildGear.setModSlot(0, attr.attribute, attr.max);
          }
        }

        return buildGear;
      } catch (e) {
        console.warn(`Build.fromLlm: failed to create BuildGear from ${match.source} "${name}"`, e);
        return null;
      }
    };

    return {
      primaryWeapon: convertWeapon(llmBuild.primaryWeapon),
      secondaryWeapon: convertWeapon(llmBuild.secondaryWeapon),
      pistol: convertWeapon(llmBuild.pistol),
      mask: convertGear(llmBuild.mask, GearType.Mask),
      chest: convertGear(llmBuild.chest, GearType.Chest),
      holster: convertGear(llmBuild.holster, GearType.Holster),
      backpack: convertGear(llmBuild.backpack, GearType.Backpack),
      gloves: convertGear(llmBuild.gloves, GearType.Gloves),
      kneepads: convertGear(llmBuild.kneepads, GearType.Kneepads),
    };
  }

  toJSON() {
    const llm = this.toLlm().toJSON();
    return {
      name: this.name,
      ...llm,
      watch: this.watch,
    };
  }

  static fromJSON(json: any): Build {
    // json is in LlmBuild format with name and watch added
    const llmBuild = new LlmBuild({
      primaryWeapon: json.primaryWeapon,
      secondaryWeapon: json.secondaryWeapon,
      pistol: json.pistol,
      mask: json.mask,
      chest: json.chest,
      holster: json.holster,
      backpack: json.backpack,
      gloves: json.gloves,
      kneepads: json.kneepads,
    });

    const partial = Build.fromLlm(llmBuild);

    return new Build({
      name: json.name || '',
      watch: json.watch || null,
      ...partial,
    });
  }
}

export default Build;
