export const HOME_DESCRIPTION_FALLBACK =
  'Replica modern lighting from a Hong Kong retailer — pendant, wall, table, floor, and ceiling lamps.';

const GENERIC_HOME_DESCRIPTIONS = new Set([
  'Modern lighting for living spaces.',
  'Modern lighting for living spaces. Pendant, wall, table, floor, and ceiling lamps.',
]);

export function isGenericHomeSeoDescription(description: string): boolean {
  const trimmed = description.trim();
  if (!trimmed) return true;
  if (GENERIC_HOME_DESCRIPTIONS.has(trimmed)) return true;
  return trimmed.startsWith('Modern lighting for living spaces');
}

export function homePageDescription(cmsDescription: string): string {
  if (isGenericHomeSeoDescription(cmsDescription)) return HOME_DESCRIPTION_FALLBACK;
  return cmsDescription.trim();
}