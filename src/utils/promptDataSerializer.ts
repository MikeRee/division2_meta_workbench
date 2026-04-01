import type { CleanDataTypeMap } from '../stores/useCleanDataStore';

/**
 * Serializes dynamic game data into a compact string for LLM prompt injection.
 * Returns the serialized string and a character count for context budgeting.
 */
export function serializePromptData(data: Partial<CleanDataTypeMap>): {
  text: string;
  charCount: number;
  tokenEstimate: number;
} {
  const sections: string[] = [];

  // All weapon names (non-exotic, non-named) grouped by type
  const weapons = data.weapons ?? [];
  const weaponsByType = new Map<string, string[]>();
  for (const w of weapons) {
    const type = w.type.toLowerCase();
    if (!weaponsByType.has(type)) weaponsByType.set(type, []);
    weaponsByType.get(type)!.push(w.name);
  }

  // Emit all weapons grouped by type
  if (weaponsByType.size > 0) {
    sections.push('WEAPONS:');
    for (const [type, names] of [...weaponsByType.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    )) {
      const unique = [...new Set(names)].sort();
      sections.push(`  ${type}: ${unique.join(', ')}`);
    }
  }

  // Pistols specifically called out (subset of above, for easy reference)
  const pistolNames = weaponsByType.get('pistol');
  if (pistolNames && pistolNames.length > 0) {
    sections.push(`\nPISTOLS: ${[...new Set(pistolNames)].sort().join(', ')}`);
  }

  // Gearsets
  const gearsets = data.gearsets ?? [];
  if (gearsets.length > 0) {
    sections.push(
      `\nGEARSETS: ${gearsets
        .map((gs) => gs.name)
        .sort()
        .join(', ')}`,
    );
  }

  // Brandsets
  const brandsets = data.brandsets ?? [];
  if (brandsets.length > 0) {
    sections.push(
      `\nBRANDSETS: ${brandsets
        .map((bs) => bs.brand)
        .sort()
        .join(', ')}`,
    );
  }

  // Named items with their gear type
  const namedGear = data.namedGear ?? [];
  if (namedGear.length > 0) {
    const named = namedGear
      .filter((ng) => !ng.isExotic)
      .map((ng) => `${ng.name} (${ng.type})`)
      .sort();
    const exotic = namedGear
      .filter((ng) => ng.isExotic)
      .map((ng) => `${ng.name} (${ng.type}) [exotic]`)
      .sort();

    if (named.length > 0) {
      sections.push(`\nNAMED GEAR: ${named.join(', ')}`);
    }
    if (exotic.length > 0) {
      sections.push(`\nEXOTIC GEAR: ${exotic.join(', ')}`);
    }
  }

  const text = sections.join('\n');
  const charCount = text.length;
  // Rough token estimate: ~4 chars per token for English text
  const tokenEstimate = Math.ceil(charCount / 4);

  return { text, charCount, tokenEstimate };
}
