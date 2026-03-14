import { getPreference } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const raw = getPreference('cuisine_preferences');
	let cuisinePreferences: Record<string, number> = {};
	if (raw) {
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			// Migrate old format: array of strings → object with rating 2
			for (const c of parsed) cuisinePreferences[c] = 2;
		} else {
			cuisinePreferences = parsed;
		}
	}
	const recipeNotes = getPreference('recipe_notes') ?? '';
	const defaultServings = parseInt(getPreference('default_servings') ?? '2', 10);
	const aiProvider = JSON.parse(getPreference('ai_provider') ?? 'null');
	return { cuisinePreferences, recipeNotes, defaultServings, aiProvider };
};
