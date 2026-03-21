import Brandset from '../models/Brandset';
import Gearset from '../models/Gearset';
import NamedGear from './NamedGear';
import Build from './Build';
import BuildGear, { GearSource, GearType } from './BuildGear';
import { BuildWeapon } from './BuildWeapon';
import useCleanDataStore from '../stores/useCleanDataStore';
import { CoreType } from './CoreValue';

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
          if (!calc.cores[c.type]) calc.cores[c.type] = [];
          if (gear.type != null) calc.cores[c.type]!.push(gear.type);
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
            const namedData = gear.data as NamedGear | undefined;
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

        // Add gear mod values
        if (gear.minor1?.key && gear.minor1.value != null) {
          calc.add(
            gear.minor1.key,
            gear.type ?? 'Unknown',
            gear.minor1.isAttribute ? 'Attribute' : 'GearMod',
            gear.minor1.value,
          );
        }
        if (gear.minor2?.key && gear.minor2.value != null) {
          calc.add(
            gear.minor2.key,
            gear.type ?? 'Unknown',
            gear.minor2.isAttribute ? 'Attribute' : 'GearMod',
            gear.minor2.value,
          );
        }
        if (gear.minor3?.key && gear.minor3.value != null) {
          calc.add(
            gear.minor3.key,
            gear.type ?? 'Unknown',
            gear.minor3.isAttribute ? 'Attribute' : 'GearMod',
            gear.minor3.value,
          );
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
      if (weapon.core1?.key && weapon.core1.value != null) {
        calc.add(weapon.core1.key, wName, 'Core', weapon.core1.value);
      }
      if (weapon.core2?.key && weapon.core2.value != null) {
        calc.add(weapon.core2.key, wName, 'Core', weapon.core2.value);
      }
      if (weapon.attrib?.key && weapon.attrib.value != null) {
        calc.add(weapon.attrib.key, wName, 'Attribute', weapon.attrib.value);
      }
      Object.entries(weapon.configuredModSlots ?? {}).forEach(([slotName, modStats]) => {
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
