/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Normalize string for comparison (lowercase, normalize diacritics, normalize apostrophes/quotes, remove punctuation and extra spaces)
 */
function normalizeString(str: string): string {
  return (
    str
      .toLowerCase()
      // Remove parenthetical content (e.g., "Pestilence (M249 B)" -> "Pestilence")
      .replace(/\s*\([^)]*\)/g, '')
      // Normalize diacritics to ASCII equivalents
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Normalize different types of apostrophes and quotes to standard ones
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      // Remove all punctuation
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Calculate similarity score between two individual words (0-1)
 */
function wordSimilarity(w1: string, w2: string): number {
  if (w1 === w2) return 1;
  const maxLen = Math.max(w1.length, w2.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(w1, w2) / maxLen;
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is exact match).
 * Uses multiple strategies and returns the highest score:
 *  1. Exact normalized match
 *  2. Substring / prefix containment
 *  3. Levenshtein distance on full strings
 *  4. Word-overlap: counts how many words from the shorter string appear in the
 *     longer string (with per-word fuzzy tolerance for spelling issues).
 *     This is the key strategy that lets "Striker's Knapsack" match
 *     "Striker's Battlegear" — the shared word "strikers" is found even though
 *     "knapsack" doesn't appear in the candidate at all.
 */
function similarityScore(str1: string, str2: string): number {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);

  if (normalized1 === normalized2) return 1;

  let best = 0;

  // --- Strategy 1: substring / prefix containment ---
  if (normalized2.includes(normalized1)) {
    best = Math.max(best, normalized2.startsWith(normalized1) ? 0.95 : 0.85);
  }
  if (normalized1.includes(normalized2)) {
    best = Math.max(best, 0.85);
  }

  // --- Strategy 2: Levenshtein on full strings ---
  const maxLen = Math.max(normalized1.length, normalized2.length);
  if (maxLen > 0) {
    best = Math.max(best, 1 - levenshteinDistance(normalized1, normalized2) / maxLen);
  }

  // --- Strategy 3: word-overlap with fuzzy per-word matching ---
  const words1 = normalized1.split(' ').filter(Boolean);
  const words2 = normalized2.split(' ').filter(Boolean);

  if (words1.length > 0 && words2.length > 0) {
    // For each word in the search string, find the best matching word in the
    // candidate. A word is considered "matched" if its per-word similarity is
    // above a tolerance threshold (0.75 allows minor spelling differences).
    const WORD_MATCH_THRESHOLD = 0.75;

    // Score from perspective of words1 matching into words2
    let matched1 = 0;
    for (const w1 of words1) {
      let bestWordScore = 0;
      for (const w2 of words2) {
        bestWordScore = Math.max(bestWordScore, wordSimilarity(w1, w2));
      }
      if (bestWordScore >= WORD_MATCH_THRESHOLD) matched1++;
    }

    // Score from perspective of words2 matching into words1
    let matched2 = 0;
    for (const w2 of words2) {
      let bestWordScore = 0;
      for (const w1 of words1) {
        bestWordScore = Math.max(bestWordScore, wordSimilarity(w1, w2));
      }
      if (bestWordScore >= WORD_MATCH_THRESHOLD) matched2++;
    }

    // Use the ratio of matched words from the shorter side as the overlap score.
    // Weight it so that even 1 distinctive word matching gives a reasonable score,
    // but more overlap is always better.
    const overlapRatio1 = matched1 / words1.length;
    const overlapRatio2 = matched2 / words2.length;
    // Take the max of both perspectives — this handles asymmetric lengths well
    const overlapScore = Math.max(overlapRatio1, overlapRatio2);

    // Scale: 100% overlap → 0.95, 50% overlap → ~0.70, 1 of 2 words → 0.70
    const scaledOverlap = 0.45 + overlapScore * 0.5;
    best = Math.max(best, scaledOverlap);
  }

  return best;
}

/**
 * Common gear type suffixes to strip from search strings.
 * Includes both literal slot names and common LLM-invented piece names.
 */
const GEAR_TYPE_SUFFIXES = [
  // Literal slot names
  'mask',
  'chest',
  'holster',
  'gloves',
  'backpack',
  'kneepads',
  'masks',
  'chests',
  'holsters',
  'backpacks',
  // Common LLM-invented piece names for gearsets
  'breastplate',
  'knapsack',
  'gauntlets',
  'greaves',
  'helmet',
  'vest',
  'harness',
  'pads',
  'guard',
  'guards',
  'plate',
  'wrap',
  'wraps',
  'visor',
  'facemask',
  'chestpiece',
  'legguards',
  'armguards',
];

/**
 * Strip gear type suffix from search string if present
 */
function stripGearTypeSuffix(searchStr: string): string {
  const normalized = normalizeString(searchStr);
  const words = normalized.split(' ');

  // Check if the last word is a gear type suffix
  if (words.length > 1) {
    const lastWord = words[words.length - 1];
    if (GEAR_TYPE_SUFFIXES.includes(lastWord)) {
      return words.slice(0, -1).join(' ');
    }
  }

  return normalized;
}

/**
 * Find the best match from an array of items based on a search string.
 * Always returns the best-guess match — there is no minimum threshold.
 * Uses multiple scoring strategies including word-overlap and Levenshtein
 * to handle LLM-invented names, spelling variations, and gear-type suffixes.
 *
 * @param searchStr The string to search for
 * @param items Array of items to search through
 * @param getItemName Function to extract the name from each item
 * @returns The best matching item, or null only if searchStr is empty or items is empty
 */
export function fuzzyFind<T>(
  searchStr: string,
  items: T[],
  getItemName: (item: T) => string,
): T | null {
  if (!searchStr || items.length === 0) return null;

  let bestMatch: T | null = null;
  let bestScore = 0;

  const strippedSearch = stripGearTypeSuffix(searchStr);
  const normalizedSearch = normalizeString(searchStr);

  for (const item of items) {
    const itemName = getItemName(item);
    const normalizedItem = normalizeString(itemName);
    const strippedItem = stripGearTypeSuffix(itemName);

    // Score using multiple combinations of original / stripped strings
    const scores = [similarityScore(searchStr, itemName)];

    // If stripping changed the search string, also try stripped search vs both forms
    if (strippedSearch !== normalizedSearch) {
      scores.push(similarityScore(strippedSearch, normalizedItem));
      scores.push(similarityScore(strippedSearch, strippedItem));
    }

    // If stripping changed the item name, also try original search vs stripped item
    if (strippedItem !== normalizedItem) {
      scores.push(similarityScore(normalizedSearch, strippedItem));
    }

    const score = Math.max(...scores);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  return bestMatch;
}

/**
 * Fuzzy-match a search string against the keys of a Record and return the best matching key.
 * Useful when LLM output uses slightly different wording than canonical attribute names.
 * @param searchStr The string to match (e.g. "damage to target out of cover")
 * @param record The record whose keys are canonical names (e.g. { "dmg to target out of cover": 10 })
 * @param threshold Minimum similarity score to accept (default 0.7)
 * @returns The best matching key, or null if nothing meets the threshold
 */
export function fuzzyMatchKey(
  searchStr: string,
  record: Record<string, number>,
  threshold: number = 0.7,
): string | null {
  const keys = Object.keys(record);
  if (!searchStr || keys.length === 0) return null;

  // Exact match short-circuit
  if (record[searchStr] !== undefined) return searchStr;

  let bestKey: string | null = null;
  let bestScore = threshold;

  for (const key of keys) {
    const score = similarityScore(searchStr, key);
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  return bestKey;
}
