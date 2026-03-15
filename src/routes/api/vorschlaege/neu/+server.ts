import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const recipes = body.recipes;

	if (!Array.isArray(recipes) || recipes.length === 0) {
		return json({ error: 'recipes must be a non-empty array' }, { status: 400 });
	}

	const db = getDb();
	const today = new Date().toISOString().split('T')[0];

	// DO NOT delete old suggestions — they stay until the user dismisses them

	const insert = db.prepare(`
		INSERT INTO recipes (name, description, cuisine, cost_estimate, prep_time, difficulty, image_url, ingredients, steps, shopping_tags, store_category, status, pantry_based)
		VALUES (@name, @description, @cuisine, @cost_estimate, @prep_time, @difficulty, @image_url, @ingredients, @steps, @shopping_tags, @store_category, 'vorschlag', @pantry_based)
	`);

	const insertAll = db.transaction(() => {
		const ids: number[] = [];
		for (const recipe of recipes) {
			const ingredients = (recipe.ingredients || []).map((ing: Record<string, unknown>) => ({
				name: ing.name,
				amount: ing.amount,
				store: ing.store || '',
				...(ing.estimated_price != null ? { estimated_price: ing.estimated_price } : {})
			}));

			const result = insert.run({
				name: recipe.name,
				description: recipe.description,
				cuisine: recipe.cuisine,
				cost_estimate: recipe.cost_estimate,
				prep_time: recipe.prep_time,
				difficulty: recipe.difficulty,
				image_url: recipe.image_url || '',
				ingredients: JSON.stringify(ingredients),
				steps: JSON.stringify(recipe.steps || []),
				shopping_tags: JSON.stringify(recipe.tags || recipe.shopping_tags || []),
				store_category: recipe.store_category || '',
				pantry_based: recipe.pantry_based ? 1 : 0
			});
			ids.push(Number(result.lastInsertRowid));
		}
		return ids;
	});

	const recipeIds = insertAll();

	// Append to existing daily_suggestions (don't replace)
	const existing = db.prepare('SELECT id, recipe_ids FROM daily_suggestions LIMIT 1').get() as { id: number; recipe_ids: string } | undefined;

	if (existing) {
		const oldIds: number[] = JSON.parse(existing.recipe_ids);
		const mergedIds = [...oldIds, ...recipeIds];
		db.prepare('UPDATE daily_suggestions SET recipe_ids = ?, date = ? WHERE id = ?').run(
			JSON.stringify(mergedIds),
			today,
			existing.id
		);
	} else {
		db.prepare('INSERT INTO daily_suggestions (date, recipe_ids) VALUES (?, ?)').run(
			today,
			JSON.stringify(recipeIds)
		);
	}

	return json({ success: true, count: recipeIds.length, ids: recipeIds });
};
