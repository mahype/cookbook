import { json } from '@sveltejs/kit';
import { getDb, parseRecipe } from '$lib/server/db';
import type { RecipeRow } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const db = getDb();
	const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

	const suggestion = db.prepare('SELECT * FROM daily_suggestions WHERE date = ?').get(date) as
		| { id: number; date: string; recipe_ids: string }
		| undefined;

	if (!suggestion) {
		return json({ date, recipes: [] });
	}

	const recipeIds: number[] = JSON.parse(suggestion.recipe_ids);
	if (recipeIds.length === 0) {
		return json({ date, recipes: [] });
	}

	const placeholders = recipeIds.map(() => '?').join(',');
	const rows = db
		.prepare(`SELECT * FROM recipes WHERE id IN (${placeholders})`)
		.all(...recipeIds) as RecipeRow[];

	const recipes = rows.map(parseRecipe);

	return json({ date, recipes });
};
