import Brandset from '../models/Brandset';
import Gearset from '../models/Gearset';
import Build from './Build';
import BuildGear, { GearSource, GearType, WeaponType } from './BuildGear';
import { BuildWeapon } from './BuildWeapon';
import useCleanDataStore from '../stores/useCleanDataStore';
import { CoreType } from './CoreValue';
import NamedExoticGear from './NamedExoticGear';
import Talent from './Talent';

export enum FormulaType {
  Percent = 'percent',
  PerSec = 'per/sec',
  Number = 'number',
}

export interface Formula {
  label: string;
  block: any;
  type: FormulaType;
  formula: string;
}

export class CalculatedData {
  value: number = 0;
  values: number[] = [];
  labels: string[] = [];

  add(source: string, label: string, value: number): void {
    this.values.push(value);
    this.value += value;
    this.labels.push(`${source}: ${label}`);
  }
}

export class StatCalculator {
  values: Record<string, CalculatedData> = {};
  cores: Partial<Record<CoreType, string[]>> = {};

  add(stat: string, source: string, label: string, value: number): void {
    // console.log(
    //   `[StatCalculator] add: stat="${stat}", source="${source}", label="${label}", value=${value}`,
    // );

    if (!this.values[stat]) {
      this.values[stat] = new CalculatedData();
    }
    if (stat == 'skill tier') {
      if (!this.cores[CoreType.SkillTier]) this.cores[CoreType.SkillTier] = [];
      this.cores[CoreType.SkillTier]!.push(source);
    }
    this.values[stat].add(source, label, value);
  }

  /** Flatten to a simple Record<string, number> keyed by stat name */
  toRecord(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [stat, data] of Object.entries(this.values)) {
      result[stat] = data.value;
    }
    return result;
  }

  static forBuild(
    build: Build,
    weaponSlot: 'primaryWeapon' | 'secondaryWeapon' | 'pistol',
    stackValues: Record<string, number> = {},
  ): StatCalculator {
    const calc = new StatCalculator();

    // Aggregate values from all gear pieces
    const gearPieces = [
      build.mask,
      build.chest,
      build.holster,
      build.backpack,
      build.gloves,
      build.kneepads,
    ];

    // Count occurrences of gearsets, brandsets, and named gear brands
    // Map key -> [representative BuildGear, count]
    const setCounts = new Map<string, [Gearset | Brandset, number]>();
    const hasNinjabike = build.backpack?.name?.includes('NinjaBike') ?? false;

    gearPieces.forEach((gear) => {
      if (!gear) return;

      if (gear.source) {
        let key: string | null = null;
        let setItem: Gearset | Brandset | null = null;

        gear.core.forEach((c) => {
          if (!calc.cores[c]) calc.cores[c] = [];
          if (gear.type != null) calc.cores[c]!.push(gear.type);
        });

        switch (gear.source) {
          case GearSource.Brandset:
            key = `brandset_${gear.name}`;
            setItem = gear.data as Brandset;
            break;
          case GearSource.Gearset:
            key = `gearset_${gear.name}`;
            setItem = gear.data as Gearset;
            break;
          case GearSource.Named: {
            const namedData = gear.data as NamedExoticGear | undefined;
            if (namedData?.brand) {
              key = `brandset_${namedData.brand}`;
              const brandsets: Brandset[] =
                useCleanDataStore.getState().getCleanData('brandsets') || [];
              setItem = brandsets.find((bs) => bs.brand === namedData.brand) || null;
            }
            break;
          }
        }

        if (key && setItem) {
          const existing = setCounts.get(key);
          if (existing) {
            setCounts.set(key, [existing[0], existing[1] + 1]);
          } else {
            setCounts.set(key, [setItem, 1]);
          }
        }

        // Add gear attribute values
        if (gear.attribute1) {
          for (const [key, value] of Object.entries(gear.attribute1)) {
            calc.add(key, gear.type ?? 'Unknown', 'Attribute', value);
          }
        }
        if (gear.attribute2) {
          for (const [key, value] of Object.entries(gear.attribute2)) {
            calc.add(key, gear.type ?? 'Unknown', 'Attribute', value);
          }
        }
        // Add gear mod slot values
        for (const slot of Object.values(gear.modSlots)) {
          for (const [key, value] of Object.entries(slot)) {
            calc.add(key, gear.type ?? 'Unknown', 'GearMod', value);
          }
        }
      }
    });

    setCounts.forEach(([setItem, count]) => {
      if (hasNinjabike) count++;
      if (setItem instanceof Brandset) {
        switch (true) {
          case count > 2:
            Object.entries(setItem.threePc).forEach(([key, value]) => {
              calc.add(key, setItem.brand, `${count}+ Bonus`, value as number);
            });
          // falls through
          case count > 1:
            Object.entries(setItem.twoPc).forEach(([key, value]) => {
              calc.add(key, setItem.brand, `${count}+ Bonus`, value as number);
            });
          // falls through
          case count > 0:
            Object.entries(setItem.onePc).forEach(([key, value]) => {
              calc.add(key, setItem.brand, `${count}+ Bonus`, value as number);
            });
        }
      } else if (setItem instanceof Gearset) {
        switch (true) {
          case count > 2:
            Object.entries(setItem.threePc).forEach(([key, value]) => {
              calc.add(key, setItem.name, `${count}+ Bonus`, value as number);
            });
          // falls through
          case count > 1:
            Object.entries(setItem.twoPc).forEach(([key, value]) => {
              calc.add(key, setItem.name, `${count}+ Bonus`, value as number);
            });
        }
      }
    });

    // Load weapon stats based on selected weapon slot
    const weapon = build[weaponSlot] as BuildWeapon | null;
    if (weapon) {
      const wName =
        weaponSlot === 'primaryWeapon'
          ? 'Primary'
          : weaponSlot === 'secondaryWeapon'
            ? 'Secondary'
            : 'Pistol';
      const pa1 = weapon.primaryAttribute1;
      if (pa1) {
        const [key, value] = Object.entries(pa1)[0] ?? [];
        if (key && value != null) calc.add(key, wName, 'Core', value);
      }
      const pa2 = weapon.primaryAttribute2;
      if (pa2) {
        const [key, value] = Object.entries(pa2)[0] ?? [];
        if (key && value != null) calc.add(key, wName, 'Core', value);
      }
      const sa = weapon.secondaryAttribute;
      if (sa) {
        const [key, value] = Object.entries(sa)[0] ?? [];
        if (key && value != null) calc.add(key, wName, 'Attribute', value);
      }
      Object.entries(weapon.bonus).forEach(([key, val]) => calc.add(key, wName, 'Bonus', val));
      Object.entries(weapon.modSlots ?? {}).forEach(([slotName, modStats]) => {
        Object.entries(modStats ?? {}).forEach(([key, value]) => {
          calc.add(key, wName, slotName, value);
        });
      });
    }

    // Add watch stats
    const watchEntries = Object.entries(build.watch ?? {});
    watchEntries.forEach(([type, value]) => {
      Object.entries(value ?? {}).forEach(([statKey, statValue]) => {
        calc.add(statKey, 'Watch', 'Bonus', statValue as number);
      });
    });

    // Add specialty bonuses
    if (build.specialization?.bonuses) {
      for (const [stat, value] of Object.entries(build.specialization.bonuses)) {
        calc.add(stat, build.specialization.name || 'Specialization', 'Bonus', value as number);
      }
    }

    // Add stack contributions from talents
    const talents: Talent[] = useCleanDataStore.getState().getCleanData('talents') || [];
    const allStacks = StatCalculator.collectBuildStacks(build, talents, weaponSlot);
    for (const stack of allStacks) {
      const stackKey = stack.key;
      const assigned = stackValues[stackKey] ?? 0;
      if (assigned > 0) {
        for (const [stat, perStack] of Object.entries(stack.bonus)) {
          calc.add(stat, stack.source, `Stack x${assigned}`, perStack * assigned);
        }
      }
    }

    return calc;
  }

  /** Collect all stacks from a build's talents (gear + weapons + specialization) */
  static collectBuildStacks(
    build: Build,
    talents: Talent[],
    weaponSlot?: 'primaryWeapon' | 'secondaryWeapon' | 'pistol',
  ): {
    key: string;
    source: string;
    talentName: string;
    bonus: Record<string, number>;
    max: number;
  }[] {
    const result: {
      key: string;
      source: string;
      talentName: string;
      bonus: Record<string, number>;
      max: number;
    }[] = [];
    const talentByName = new Map<string, Talent>();
    talents.forEach((t) => {
      talentByName.set(t.name.toLowerCase(), t);
      if (t.perfectName) talentByName.set(t.perfectName.toLowerCase(), t);
    });

    const addTalentStacks = (talentNames: string[], source: string) => {
      for (const tName of talentNames) {
        const talent = talentByName.get(tName.toLowerCase());
        if (!talent) continue;
        // Check if this is a perfect talent name
        const isPerfect = talent.perfectName?.toLowerCase() === tName.toLowerCase();
        const stacks =
          isPerfect && talent.perfectStacks.length > 0 ? talent.perfectStacks : talent.stacks;
        stacks.forEach((stack, idx) => {
          if (stack.size > 0 && Object.keys(stack.bonus).length > 0) {
            const key = `${source}:${tName}:${idx}`;
            result.push({
              key,
              source,
              talentName: tName,
              bonus: stack.bonus,
              max: stack.size,
            });
          }
        });
      }
    };

    // Gear talents
    const gearPieces: { slot: string; gear: any }[] = [
      { slot: 'Mask', gear: build.mask },
      { slot: 'Chest', gear: build.chest },
      { slot: 'Holster', gear: build.holster },
      { slot: 'Backpack', gear: build.backpack },
      { slot: 'Gloves', gear: build.gloves },
      { slot: 'Kneepads', gear: build.kneepads },
    ];
    // Count gearset pieces per set name for fourPc talent eligibility
    const gearsetCounts = new Map<string, number>();
    const hasNinjabike = build.backpack?.name?.includes('NinjaBike') ?? false;
    for (const { gear } of gearPieces) {
      if (!gear?.data || gear.source !== GearSource.Gearset) continue;
      const gs = gear.data as Gearset;
      gearsetCounts.set(gs.name, (gearsetCounts.get(gs.name) ?? 0) + 1);
    }

    // Track which fourPc talents have already been added to avoid duplicates
    const addedFourPc = new Set<string>();

    for (const { slot, gear } of gearPieces) {
      if (!gear?.data) continue;
      let talentNames: string[] = [];
      if (gear.source === GearSource.Gearset) {
        const gs = gear.data as Gearset;
        const slotLower = slot.toLowerCase();
        // Chest and backpack have slot-specific gearset talents
        if (slotLower === 'chest' && gs.chest) talentNames.push(gs.chest);
        else if (slotLower === 'backpack' && gs.backpack) talentNames.push(gs.backpack);
        // fourPc talent only activates with 4+ pieces (NinjaBike adds 1), added once per set
        const count = (gearsetCounts.get(gs.name) ?? 0) + (hasNinjabike ? 1 : 0);
        if (count >= 4 && gs.fourPc && !addedFourPc.has(gs.fourPc)) {
          talentNames.push(gs.fourPc);
          addedFourPc.add(gs.fourPc);
        }
      } else {
        talentNames = gear.data.talent || [];
      }
      addTalentStacks(talentNames, slot);
    }

    // Weapon talents – only include the selected weapon slot when specified
    const weaponSlots: { slot: string; weapon: any }[] = weaponSlot
      ? [
          {
            slot:
              weaponSlot === 'primaryWeapon'
                ? 'Primary'
                : weaponSlot === 'secondaryWeapon'
                  ? 'Secondary'
                  : 'Pistol',
            weapon: build[weaponSlot],
          },
        ]
      : [
          { slot: 'Primary', weapon: build.primaryWeapon },
          { slot: 'Secondary', weapon: build.secondaryWeapon },
          { slot: 'Pistol', weapon: build.pistol },
        ];
    for (const { slot, weapon } of weaponSlots) {
      if (!weapon) continue;
      const talentNames = weapon.talents || [];
      addTalentStacks(talentNames, slot);
    }

    // Specialization stacks
    if (build.specialization?.stacks) {
      build.specialization.stacks.forEach((stack: any, idx: number) => {
        if (stack.size > 0 && Object.keys(stack.bonus).length > 0) {
          const key = `Specialization:${build.specialization!.name}:${idx}`;
          result.push({
            key,
            source: build.specialization!.name || 'Specialization',
            talentName: build.specialization!.name,
            bonus: stack.bonus,
            max: stack.size,
          });
        }
      });
    }

    return result;
  }
}
