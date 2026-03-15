import { json } from '@sveltejs/kit';
import { getDb, parseRecipe } from '$lib/server/db';
import type { RecipeRow } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const db = getDb();

	// Get ALL suggestions (not date-filtered — old ones stay until dismissed)
	const suggestion = db.prepare('SELECT * FROM daily_suggestions ORDER BY id DESC LIMIT 1').get() as
		| { id: number; date: string; recipe_ids: string }
		| undefined;

	if (!suggestion) {
		return json({ date: new Date().toISOString().split('T')[0], recipes: [] });
	}

	const recipeIds: number[] = JSON.parse(suggestion.recipe_ids);
	if (recipeIds.length === 0) {
		return json({ date: suggestion.date, recipes: [] });
	}

	const placeholders = recipeIds.map(() => '?').join(',');
	const rows = db
		.prepare(`SELECT * FROM recipes WHERE id IN (${placeholders}) AND status = 'vorschlag' ORDER BY id DESC`)
		.all(...recipeIds) as RecipeRow[];

	const recipes = rows.map(parseRecipe);

	return json({ date: suggestion.date, recipes });
};
