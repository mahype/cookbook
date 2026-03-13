import { getDb, parseRecipe, getPantryItems } from '$lib/server/db';
import type { RecipeRow } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const db = getDb();
	const today = new Date().toISOString().split('T')[0];

	const suggestion = db.prepare('SELECT * FROM daily_suggestions WHERE date = ?').get(today) as
		| { id: number; date: string; recipe_ids: string }
		| undefined;

	const pantryItems = getPantryItems();
	const pantryNames = pantryItems.map((p) => p.name.toLowerCase());

	if (!suggestion) {
		return { date: today, recipes: [], pantryNames };
	}

	const recipeIds: number[] = JSON.parse(suggestion.recipe_ids);
	if (recipeIds.length === 0) {
		return { date: today, recipes: [], pantryNames };
	}

	const placeholders = recipeIds.map(() => '?').join(',');
	const rows = db
		.prepare(`SELECT * FROM recipes WHERE id IN (${placeholders}) ORDER BY pantry_based DESC`)
		.all(...recipeIds) as RecipeRow[];

	return {
		date: today,
		recipes: rows.map(parseRecipe),
		pantryNames
	};
};
