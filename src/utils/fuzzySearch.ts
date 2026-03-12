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
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Normalize string for comparison (lowercase, normalize diacritics, normalize apostrophes/quotes, remove punctuation and extra spaces)
 */
function normalizeString(str: string): string {
  return str
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
    .trim();
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is exact match)
 */
function similarityScore(str1: string, str2: string): number {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);
  
  if (normalized1 === normalized2) return 1;
  
  // Check for partial matches (substring or prefix)
  // If str1 is fully contained in str2, give it a high score
  if (normalized2.includes(normalized1)) {
    // Score based on how much of str2 is matched by str1
    // If str1 matches the beginning of str2, give it an even higher score
    if (normalized2.startsWith(normalized1)) {
      return 0.95; // Very high score for prefix matches
    }
    return 0.85; // High score for substring matches
  }
  
  // Check if str2 is contained in str1 (less common but possible)
  if (normalized1.includes(normalized2)) {
    return 0.85;
  }
  
  const maxLen = Math.max(normalized1.length, normalized2.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(normalized1, normalized2);
  return 1 - distance / maxLen;
}

/**
 * Common gear type suffixes to strip from search strings
 */
const GEAR_TYPE_SUFFIXES = [
  'mask', 'chest', 'holster', 'gloves', 'backpack', 'kneepads',
  'masks', 'chests', 'holsters', 'backpacks' // plural forms
];

/**
 * Strip gear type suffix from search string if present
 */
function stripGearTypeSuffix(searchStr: string): string {
  const normalized = normalizeString(searchStr);
  const words = normalized.split(' ');
  
  // Check if the last word is a gear type
  if (words.length > 1) {
    const lastWord = words[words.length - 1];
    if (GEAR_TYPE_SUFFIXES.includes(lastWord)) {
      // Remove the last word and return
      return words.slice(0, -1).join(' ');
    }
  }
  
  return normalized;
}

/**
 * Find the best match from an array of items based on a search string
 * @param searchStr The string to search for
 * @param items Array of items to search through
 * @param getItemName Function to extract the name from each item
 * @param threshold Minimum similarity score (0-1) to consider a match
 * @returns The best matching item or null if no match above threshold
 */
export function fuzzyFind<T>(
  searchStr: string,
  items: T[],
  getItemName: (item: T) => string,
  threshold: number = 0.7
): T | null {
  if (!searchStr || items.length === 0) return null;

  let bestMatch: T | null = null;
  let bestScore = threshold;
  
  // Try with gear type suffix stripped
  const strippedSearch = stripGearTypeSuffix(searchStr);
  const normalizedSearch = normalizeString(searchStr);

  for (const item of items) {
    const itemName = getItemName(item);
    
    // Try both original and stripped versions
    const scoreOriginal = similarityScore(searchStr, itemName);
    const scoreStripped = strippedSearch !== normalizedSearch 
      ? similarityScore(strippedSearch, normalizeString(itemName))
      : 0;
    
    const score = Math.max(scoreOriginal, scoreStripped);
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  // Debug logging for failed matches
  if (!bestMatch && items.length > 0) {
    console.log(`Fuzzy search failed for "${searchStr}" (normalized: "${normalizedSearch}", stripped: "${strippedSearch}")`);
    console.log(`Threshold: ${threshold}, Best score found: ${bestScore}`);
    
    // Show top 3 closest matches
    const topMatches = items
      .map(item => ({
        name: getItemName(item),
        score: similarityScore(searchStr, getItemName(item))
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    
    console.log('Top 3 closest matches:', topMatches);
  }

  return bestMatch;
}
