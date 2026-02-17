/**
 * Normalise une chaîne pour la recherche : minuscules, sans accents.
 * Permet de matcher "cafe" avec "café", "elephant" avec "éléphant", etc.
 */
export function normalizeForSearch(str: string | null | undefined): string {
  if (str == null || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Vérifie si le texte contient la requête de recherche (insensible aux accents et à la casse).
 */
export function matchesSearch(text: string | null | undefined, query: string): boolean {
  if (!query.trim()) return true;
  const normalizedText = normalizeForSearch(text);
  const normalizedQuery = normalizeForSearch(query);
  return normalizedText.includes(normalizedQuery);
}
