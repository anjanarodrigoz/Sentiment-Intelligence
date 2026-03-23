/**
 * App mode helper.
 *
 * Set VITE_APP_MODE=public in your .env (or .env.local) to enable public mode.
 * In public mode, MongoDB is not used and scraped data is stored in Zustand only.
 *
 * Default is 'saas' (full MongoDB-backed mode).
 */
export const isPublicMode = import.meta.env.VITE_APP_MODE === 'public';
