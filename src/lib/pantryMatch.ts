/**
 * Checks if an ingredient matches a pantry item name.
 *
 * Rules:
 * - Exact match (case-insensitive) always matches
 * - For pantry names with 3+ characters: matches if the pantry name appears
 *   as a whole word in the ingredient name (bounded by start/end, space, or hyphen)
 * - For pantry names shorter than 3 characters: only exact match
 */
export function pantryMatches(ingredientName: string, pantryName: string): boolean {
	const ingLower = ingredientName.toLowerCase();
	const pantryLower = pantryName.toLowerCase();

	// Exact match
	if (ingLower === pantryLower) return true;

	// Short pantry names: only exact match to avoid false positives
	if (pantryLower.length < 3) return false;

	// Word-boundary match: pantry name must appear as a whole word
	const escaped = pantryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const regex = new RegExp(`(^|[\\s\\-])${escaped}($|[\\s\\-])`, 'i');
	return regex.test(ingLower);
}

/**
 * Checks if an ingredient is matched by any pantry name in the list.
 * pantryNames should already be lowercased.
 */
export function isMatchedByPantry(ingredientName: string, pantryNames: string[]): boolean {
	return pantryNames.some((p) => pantryMatches(ingredientName, p));
}
