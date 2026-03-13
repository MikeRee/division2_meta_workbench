import Build from './Build';
import { BuildWeapon } from './BuildWeapon';

export interface WeaponStats {
  [key: string]: number;
  weaponDamage: number;
  pvpWeaponDamage: number;
  criticalHitChance: number;
  criticalHitDamage: number;
  headshotDamage: number;
  armorDamage: number;
  healthDamage: number;
  range: number;
  reloadTime: number;
  reloadSpeedBonus: number;
  accuracy: number;
  stability: number;
  weaponSwapSpeed: number;
  weaponHandling: number;
  ammoCapacity: number;
}

export interface OffenseStats {
  [key: string]: number;
  allWeaponDamageBonus: number;
  marksmanRifleDamageBonus: number;
  rifleDamageBonus: number;
  assaultRifleDamageBonus: number;
  lmgDamageBonus: number;
  smgDamageBonus: number;
  shotgunDamageBonus: number;
  pistolDamageBonus: number;
  explosiveDamage: number;
}

export interface DefenseStats {
  [key: string]: number;
  armor: number;
  armorOnKill: number;
  armorRegeneration: number;
  maxHealth: number;
  healthOnKill: number;
  healthRegeneration: number;
  incomingRepairs: number;
  protectionFromElites: number;
  pulseResistance: number;
  explosiveResistance: number;
  hazardProtection: number;
  bleedResistance: number;
  blindDeafResistance: number;
  burnResistance: number;
  disorientResistance: number;
  disruptResistance: number;
  ensnareResistance: number;
  poisonResistance: number;
  shockResistance: number;
}

export class Stats {
  weapon: WeaponStats;
  offense: OffenseStats;
  defense: DefenseStats;

  constructor(weapon: WeaponStats, offense: OffenseStats, defense: DefenseStats) {
    this.weapon = weapon;
    this.offense = offense;
    this.defense = defense;
  }

  static BuildStats(build: Build, selectedWeapon?: BuildWeapon | null): Stats {
    // Use selectedWeapon if provided, otherwise default to primaryWeapon
    const weaponToCalculate = selectedWeapon !== undefined ? selectedWeapon : build.primaryWeapon;

    // Initialize weapon stats with base values from the weapon
    const weapon: WeaponStats = {
      weaponDamage: 0,
      pvpWeaponDamage: 0,
      criticalHitChance: 0,
      criticalHitDamage: 0,
      headshotDamage: 0,
      armorDamage: 0,
      healthDamage: 0,
      range: 0,
      reloadTime: 0,
      reloadSpeedBonus: 0,
      accuracy: 0,
      stability: 0,
      weaponSwapSpeed: 0,
      weaponHandling: 0,
      ammoCapacity: 0,
    };

    // If we have a weapon, add its base stats
    if (weaponToCalculate) {
      const baseWeapon = weaponToCalculate.weapon;
      
      // Base weapon stats
      weapon.weaponDamage = baseWeapon.damage || 0;
      weapon.headshotDamage = baseWeapon.hsd || 0;
      weapon.range = baseWeapon.optimalRange || 0;
      weapon.reloadTime = baseWeapon.reload || 0;
      weapon.ammoCapacity = baseWeapon.moddedMagSize || baseWeapon.baseMagSize || 0;

      // Add weapon core attributes (core1, core2)
      if (weaponToCalculate.core1?.key && weaponToCalculate.core1?.value) {
        this.addWeaponStat(weapon, weaponToCalculate.core1.key, weaponToCalculate.core1.value);
      }
      if (weaponToCalculate.core2?.key && weaponToCalculate.core2?.value) {
        this.addWeaponStat(weapon, weaponToCalculate.core2.key, weaponToCalculate.core2.value);
      }

      // Add weapon attribute
      if (weaponToCalculate.attrib?.key && weaponToCalculate.attrib?.value) {
        this.addWeaponStat(weapon, weaponToCalculate.attrib.key, weaponToCalculate.attrib.value);
      }

      // Add weapon mod stats from configured mod slots
      if (weaponToCalculate.configuredModSlots) {
        Object.values(weaponToCalculate.configuredModSlots).forEach(modSlot => {
          Object.entries(modSlot).forEach(([statKey, statValue]) => {
            this.addWeaponStat(weapon, statKey, statValue);
          });
        });
      }
    }

    // Add stats from all gear pieces
    const gearPieces = [
      build.mask,
      build.chest,
      build.holster,
      build.backpack,
      build.gloves,
      build.kneepads
    ];

    gearPieces.forEach(gear => {
      if (gear) {
        // Add minor1 attribute
        if (gear.minor1?.key && gear.minor1?.value) {
          this.addWeaponStat(weapon, gear.minor1.key, gear.minor1.value);
        }
        // Add minor2 attribute
        if (gear.minor2?.key && gear.minor2?.value) {
          this.addWeaponStat(weapon, gear.minor2.key, gear.minor2.value);
        }
        // Add minor3 attribute (mod slot)
        if (gear.minor3?.key && gear.minor3?.value) {
          this.addWeaponStat(weapon, gear.minor3.key, gear.minor3.value);
        }
      }
    });

    const offense: OffenseStats = {
      allWeaponDamageBonus: 0,
      marksmanRifleDamageBonus: 0,
      rifleDamageBonus: 0,
      assaultRifleDamageBonus: 0,
      lmgDamageBonus: 0,
      smgDamageBonus: 0,
      shotgunDamageBonus: 0,
      pistolDamageBonus: 0,
      explosiveDamage: 0,
    };

    const defense: DefenseStats = {
      armor: 0,
      armorOnKill: 0,
      armorRegeneration: 0,
      maxHealth: 0,
      healthOnKill: 0,
      healthRegeneration: 0,
      incomingRepairs: 0,
      protectionFromElites: 0,
      pulseResistance: 0,
      explosiveResistance: 0,
      hazardProtection: 0,
      bleedResistance: 0,
      blindDeafResistance: 0,
      burnResistance: 0,
      disorientResistance: 0,
      disruptResistance: 0,
      ensnareResistance: 0,
      poisonResistance: 0,
      shockResistance: 0,
    };

    return new Stats(weapon, offense, defense);
  }

  // Helper method to add a stat to weapon stats based on the attribute key
  private static addWeaponStat(weapon: WeaponStats, key: string, value: number): void {
    const lowerKey = key.toLowerCase().trim();

    // Map attribute keys to weapon stat properties
    if (lowerKey.includes('critical hit chance') || lowerKey.includes('chc')) {
      weapon.criticalHitChance += value;
    } else if (lowerKey.includes('critical hit damage') || lowerKey.includes('chd')) {
      weapon.criticalHitDamage += value;
    } else if (lowerKey.includes('headshot damage') || lowerKey.includes('hsd')) {
      weapon.headshotDamage += value;
    } else if (lowerKey.includes('damage to armor') || lowerKey.includes('armor damage')) {
      weapon.armorDamage += value;
    } else if (lowerKey.includes('damage to health') || lowerKey.includes('health damage')) {
      weapon.healthDamage += value;
    } else if (lowerKey.includes('reload speed')) {
      weapon.reloadSpeedBonus += value;
    } else if (lowerKey.includes('accuracy')) {
      weapon.accuracy += value;
    } else if (lowerKey.includes('stability')) {
      weapon.stability += value;
    } else if (lowerKey.includes('weapon swap')) {
      weapon.weaponSwapSpeed += value;
    } else if (lowerKey.includes('weapon handling')) {
      weapon.weaponHandling += value;
    } else if (lowerKey.includes('optimal range') || lowerKey === 'range') {
      weapon.range += value;
    } else if (lowerKey.includes('magazine') || lowerKey.includes('ammo')) {
      weapon.ammoCapacity += value;
    }
  }
}
