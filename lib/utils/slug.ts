/**
 * Génère un slug à partir d'un nom (pour URLs).
 * Ex: "Dentistes" -> "dentistes", "Sage-femmes" -> "sage-femmes"
 */
export function slugify(str: string | null | undefined): string {
  if (str == null || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}
