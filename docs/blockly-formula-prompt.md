# Blockly Formula Generation Prompt for Division 2 Build Calculator

Use this prompt with Google Gemini to request Blockly XML for a specific stat calculation.

---

## The Prompt

```
You are a Blockly code generator for a Division 2 (PS5) build calculator. I will describe a stat I want to calculate, and you will produce the Blockly JSON block state that implements the formula using ONLY the custom blocks described below.

Your output must be valid Blockly serialization JSON (the format produced by Blockly.serialization.workspaces.save()). Do NOT output Blockly XML. Output ONLY the JSON object — no explanation, no markdown fences.

---

## BUILD STRUCTURE

A Division 2 build consists of:

- 3 Weapon slots: primaryWeapon, secondaryWeapon, pistol
- 6 Gear slots: mask, chest, holster, backpack, gloves, kneepads
- 2 Skills
- 1 Specialization (demolitionist, firewall, gunner, sharpshooter, survivalist, technician)
- Keener's Watch (4 categories × 4 stats each)

### Weapon Properties (per weapon)
Each weapon has base numeric stats:
| Label | Key |
|---|---|
| RPM | rpm |
| Base Mag Size | baseMagSize |
| Modded Mag Size | moddedMagSize |
| Reload | reload |
| Damage | damage |
| Optimal Range | optimalRange |
| HSD | hsd |

Each weapon also has:
- 2 core attributes (core1, core2): weapon-type damage + a secondary stat
- 1 minor attribute (attrib): a secondary stat
- Up to 4 mod slots (optics rail, magazine slot, muzzle slot, underbarrel) each with stat bonuses

### Gear Properties (per gear piece)
Each gear piece has:
| Label | Key |
|---|---|
| Name | name |
| Source | source |
| Type | type |

Each gear piece also has:
- 1 core attribute: weapon damage (15%), armor (170,000), or skill tier (1)
- Up to 2 minor attributes (minor1, minor2): chosen from gear attributes below
- 1 mod slot (minor3, only on mask/chest/backpack): chosen from gear mod attributes below

### Core Attribute Types
| Label | Value |
|---|---|
| Weapon Damage | weapon damage |
| Armor | armor |
| Skill Tier | skill tier |

---

## ATTRIBUTE VOCABULARY (all possible dropdown values for "sum all" and "percent all" blocks)

These are the attribute keys that can appear across gear, weapons, brand sets, gear sets, and Keener's Watch. The "sum all" and "percent all" blocks iterate the entire build and sum every instance of the chosen attribute.

### Weapon Attributes (max values)
| Attribute | Max |
|---|---|
| damage to armor | 6 |
| critical hit chance | 9.5 |
| health damage | 9.5 |
| dmg to target out of cover | 10 |
| headshot damage | 10 |
| critical hit damage | 10 |
| reload speed | 12 |
| stability | 12 |
| accuracy | 12 |
| optimal range | 24 |
| mag size | 12.5 |
| rate of fire | 5 |
| swap speed | 15 |

### Weapon Type Innate Attributes
| Weapon Type | Attribute | Max |
|---|---|---|
| assault rifle | health damage | 21 |
| lmg | dmg to target out of cover | 12 |
| smg | critical hit chance | 21 |
| shotgun | damage to armor | 12 |
| rifle | critical hit damage | 17 |
| mmr | headshot damage | 111 |

### Gear Attributes (offensive)
| Attribute | Max |
|---|---|
| weapon handling | 8 |
| critical hit chance | 6 |
| critical hit damage | 12 |
| headshot damage | 10 |

### Gear Attributes (defensive)
| Attribute | Max |
|---|---|
| armor regen | 4925 |
| hazard protection | 10 |
| health | 18935 |
| explosive resistance | 10 |

### Gear Attributes (skill)
| Attribute | Max |
|---|---|
| skill haste | 12 |
| skill damage | 10 |
| repair skills | 20 |
| status effect | 10 |

### Gear Mod Attributes (offensive)
| Attribute | Max |
|---|---|
| critical hit chance | 6 |
| critical hit damage | 12 |
| headshot damage | 10 |

### Gear Mod Attributes (defensive)
| Attribute | Max |
|---|---|
| protection from elites | 13 |
| armor on kill | 18935 |
| status effect resistance | 10 |
| pulse resistance | 10 |
| incoming repairs | 20 |

### Gear Mod Attributes (skill)
| Attribute | Max |
|---|---|
| skill haste | 12 |
| skill duration | 10 |
| repair skills | 20 |

### Keener's Watch Attributes
| Category | Attribute | Max |
|---|---|---|
| offensive | weapon damage | 10 |
| offensive | critical hit chance | 10 |
| offensive | critical hit damage | 20 |
| offensive | headshot damage | 20 |
| defensive | total armor | 10 |
| defensive | total health | 10 |
| defensive | explosive resistance | 10 |
| defensive | hazard protection | 10 |
| utility | skill damage | 10 |
| utility | skill haste | 10 |
| utility | skill duration | 20 |
| utility | skill repair | 10 |
| handling | accuracy | 10 |
| handling | stability | 10 |
| handling | reload speed | 10 |
| handling | ammo capacity | 20 |

### Brand Set Bonus Attributes (examples — these also appear in the vocabulary)
- assault rifle damage, lmg damage, mmr damage, rifle damage, shotgun damage, smg damage, pistol damage
- weapon damage, total armor, health, armor on kill, armor regen
- critical hit chance, critical hit damage, headshot damage
- hazard protection, explosive resistance, incoming repairs
- skill haste, skill damage, skill duration, repair skills, status effect
- rate of fire, reload speed, accuracy, stability, optimal range, mag size
- damage to armor, dmg to target out of cover, health damage
- protection from elites, melee damage

### Gear Set Bonus Attributes (examples)
- total armor, health, weapon handling
- critical hit chance, critical hit damage, headshot damage
- skill haste, skill damage, skill repair, skill duration, status effect
- armor on kill, explosive resistance, hazard protection
- weapon damage

---

## AVAILABLE BLOCKLY BLOCKS

### Data Blocks

1. **base_weapon** — Get a numeric property from the currently selected weapon.
   - Dropdown field "PROP": one of `rpm`, `baseMagSize`, `moddedMagSize`, `reload`, `damage`, `optimalRange`, `hsd`
   - Output type: Number
   - Generated code: `getBaseWeapon("PROP")`

2. **base_gear** — Get a property from gear (returns string for name/source/type).
   - Dropdown field "PROP": one of `name`, `source`, `type`
   - Output type: Number
   - Generated code: `getBaseGear("PROP")`

3. **stat_sum_all** — Sum all instances of a named attribute across the entire build (all 6 gear pieces, all 3 weapons, brand/gear set bonuses, Keener's Watch).
   - Dropdown field "ATTR": any attribute from the vocabulary above (e.g. "critical hit chance", "headshot damage", "weapon damage")
   - Output type: Number
   - Generated code: `sumAll("ATTR")`
   - The value returned is the raw sum (e.g. if total CHC across the build is 45, it returns 45)

4. **stat_percent_all** — Same as sum_all but divides by 100 to get a multiplier.
   - Dropdown field "ATTR": same vocabulary as stat_sum_all
   - Output type: Number
   - Generated code: `(sumAll("ATTR") / 100)`
   - Use this when you need the attribute as a decimal multiplier (e.g. 45% → 0.45)

5. **stat_core** — Sum of a core attribute type across all 6 gear pieces.
   - Dropdown field "CORE": one of `weapon damage`, `armor`, `skill tier`
   - Output type: Number
   - Generated code: `getCore("CORE")`
   - For weapon damage: returns the total % (e.g. 6 red cores × 15% = 90)
   - For armor: returns total armor value (e.g. 6 blue cores × 170,000 = 1,020,000)
   - For skill tier: returns total tiers (e.g. 6 yellow cores = 6)

### Math Blocks

6. **stat_add** — Add two numbers: A + B
   - Inputs: A (Number), B (Number)
   - Output: Number
   - Generated code: `(A + B)`

7. **stat_subtract** — Subtract: A − B
   - Inputs: A (Number), B (Number)
   - Output: Number
   - Generated code: `(A - B)`

8. **stat_multiply** — Multiply: A × B
   - Inputs: A (Number), B (Number)
   - Output: Number
   - Generated code: `(A * B)`

9. **stat_divide** — Divide: A ÷ B
   - Inputs: A (Number), B (Number)
   - Output: Number
   - Generated code: `(A / B)`

10. **stat_round** — Round a value to N decimal places.
    - Input: VALUE (Number)
    - Field: DECIMALS (number, 0–10)
    - Output: Number
    - Generated code: `round(VALUE, DECIMALS)`

11. **stat_percent_additive** — Compound percentage: base × (1 + %A) × (1 + %B) × …
    - First input: BASE (Number) — the base value
    - Subsequent inputs: +% of (Number) — each is a percentage bonus that compounds multiplicatively
    - Variable number of inputs (click + to add more bonus steps, − to remove)
    - Output: Number
    - Generated code: `(BASE * (1 + A) * (1 + B) * ...)`
    - Use this for Division 2's multiplicative damage formula where each bonus category compounds separately
    - Example: base weapon damage with weapon damage% and weapon type damage%:
      - BASE = `getBaseWeapon("damage")`
      - +% of = `stat_percent_all("weapon damage")`
      - +% of = `stat_percent_all("assault rifle damage")`
      - Result: `damage * (1 + weaponDmg%) * (1 + arDmg%)`

12. **stat_constant** — A literal constant value.
    - Field: VALUE (text, default "0")
    - Output: any
    - Generated code: the number itself, or a quoted string if non-numeric

### Logic Blocks

13. **logic_if_then_else** — Ternary: if COND then THEN else ELSE
    - Inputs: COND (Boolean), THEN (any), ELSE (any)
    - Output: any
    - Generated code: `(COND ? THEN : ELSE)`

14. **logic_compare** — Compare two values.
    - Inputs: A (any), B (any)
    - Dropdown field "OP": one of `===`, `!==`, `<`, `>`, `<=`, `>=`
    - Output: Boolean
    - Generated code: `(A OP B)`

15. **logic_and_or** — Combine two booleans.
    - Inputs: A (Boolean), B (Boolean)
    - Dropdown field "OP": `&&` or `||`
    - Output: Boolean
    - Generated code: `(A OP B)`

16. **logic_not** — Negate a boolean.
    - Input: VAL (Boolean)
    - Output: Boolean
    - Generated code: `(!VAL)`

17. **logic_boolean** — Boolean constant.
    - Dropdown field "BOOL": `true` or `false`
    - Output: Boolean

---

## OUTPUT FORMAT

Produce a Blockly workspace JSON object (the format from `Blockly.serialization.workspaces.save()`). The top-level block should be the root of the formula expression tree. Blocks connect via "inputs" with named keys matching the input names above (e.g. "A", "B", "VALUE", "COND", "THEN", "ELSE").

Example — a formula for "Base Damage × (1 + weapon damage%)":

{
  "blocks": {
    "languageVersion": 0,
    "blocks": [
      {
        "type": "stat_multiply",
        "inputs": {
          "A": {
            "block": {
              "type": "base_weapon",
              "fields": { "PROP": "damage" }
            }
          },
          "B": {
            "block": {
              "type": "stat_add",
              "inputs": {
                "A": {
                  "block": {
                    "type": "stat_constant",
                    "fields": { "VALUE": "1" }
                  }
                },
                "B": {
                  "block": {
                    "type": "stat_percent_all",
                    "fields": { "ATTR": "weapon damage" }
                  }
                }
              }
            }
          }
        }
      }
    ]
  }
}

---

## FORMULA TYPE

Along with the JSON, tell me which FormulaType to use:
- "number" — raw numeric result (e.g. DPS, total armor)
- "percent" — result is a percentage (e.g. critical hit chance)
- "per/sec" — result is a rate (e.g. rounds per second)

---

Now, generate the Blockly JSON for the following stat:

[DESCRIBE THE STAT YOU WANT HERE — e.g. "Total Critical Hit Chance (sum of all CHC sources, capped at 60%)" or "Effective DPS accounting for crit chance, crit damage, and headshot damage"]
```

---

## How to Use

1. Copy the entire prompt above
2. Replace `[DESCRIBE THE STAT YOU WANT HERE]` with your stat description
3. Paste into Google Gemini
4. Take the JSON response and load it into your Blockly workspace via `Blockly.serialization.workspaces.load(json, workspace)`
5. Set the FormulaType as indicated in the response

### Example Stat Requests

- "Total Critical Hit Chance — sum all CHC from gear, weapons, watch, and brand bonuses, capped at 60%"
- "Effective weapon DPS — base damage × (1 + weapon damage%) × RPM / 60, accounting for crit chance and crit damage"
- "Total Armor — base armor (170,000) × number of armor cores + sum of all armor bonuses from gear/watch + (base armor × total armor%)"
- "Headshot Damage multiplier — base weapon HSD% + sum of all headshot damage bonuses"
- "Skill Haste total — sum all skill haste from gear attributes, mods, brand bonuses, and watch"
