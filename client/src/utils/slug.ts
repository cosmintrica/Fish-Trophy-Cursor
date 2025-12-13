/**
 * Utility functions for creating URL-friendly slugs
 */

/**
 * Creates a URL-friendly slug from Romanian text
 * Example: "Biban" -> "biban", "Lac Slatina" -> "lac-slatina"
 */
export function createSlug(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/ă/g, 'a')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/ș/g, 's')
    .replace(/ț/g, 't')
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with -
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
}

/**
 * Finds a species by slug (case-insensitive, diacritics-ignored)
 */
export function findSpeciesBySlug(species: Array<{ id: string; name: string }>, slug: string): { id: string; name: string } | null {
  if (!slug || !species) return null;
  
  const normalizedSlug = slug.toLowerCase().trim();
  
  return species.find(s => {
    const speciesSlug = createSlug(s.name);
    return speciesSlug === normalizedSlug;
  }) || null;
}

/**
 * Finds a location by slug (case-insensitive, diacritics-ignored)
 */
export function findLocationBySlug(locations: Array<{ id: string; name: string }>, slug: string): { id: string; name: string } | null {
  if (!slug || !locations) return null;
  
  const normalizedSlug = slug.toLowerCase().trim();
  
  return locations.find(l => {
    const locationSlug = createSlug(l.name);
    return locationSlug === normalizedSlug;
  }) || null;
}

