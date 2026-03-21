/**
 * Returns the base URL for fetching public assets.
 * Uses Vite's BASE_URL so paths work both locally and on GitHub Pages.
 */
export const getBasePath = (): string => {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base.slice(0, -1) : base;
};
