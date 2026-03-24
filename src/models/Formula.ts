import Brandset from '../models/Brandset';
import Gearset from '../models/Gearset';
import Build from './Build';
import BuildGear, { GearSource, GearType } from './BuildGear';
import { BuildWeapon } from './BuildWeapon';
import useCleanDataStore from '../stores/useCleanDataStore';
import { CoreType } from './CoreValue';
import NamedExoticGear from './NamedExoticGear';

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
  cores: Partial<Record<CoreType, GearType[]>> = {};

  add(stat: string, source: string, label: string, value: number): void {
    if (!this.values[stat]) {
      this.values[stat] = new CalculatedData();
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
      const wName = weapon.weapon?.name ?? 'Unknown Weapon';
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

    // Log calculated values
    Object.entries(calc.values).forEach(([stat, data]) => {
      const values = [];
      for (let i = 0; i < data.values.length; i++) {
        values.push(`${data.labels[i]}:${data.values[i]}`);
      }
      console.log(`${stat}: ${data.value}`, values);
    });

    return calc;
  }
}
