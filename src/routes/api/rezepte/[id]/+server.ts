import { json } from '@sveltejs/kit';
import { getDb, parseRecipe } from '$lib/server/db';
import type { RecipeRow } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const db = getDb();
	const row = db.prepare('SELECT * FROM recipes WHERE id = ?').get(params.id) as RecipeRow | undefined;

	if (!row) {
		return json({ error: 'Rezept nicht gefunden' }, { status: 404 });
	}

	return json(parseRecipe(row));
};

export const DELETE: RequestHandler = async ({ params }) => {
	const db = getDb();
	const recipeId = Number(params.id);
	const result = db.prepare('DELETE FROM recipes WHERE id = ?').run(recipeId);

	if (result.changes === 0) {
		return json({ error: 'Rezept nicht gefunden' }, { status: 404 });
	}

	// Remove from daily_suggestions recipe_ids
	const suggestions = db.prepare('SELECT id, recipe_ids FROM daily_suggestions').all() as { id: number; recipe_ids: string }[];
	for (const s of suggestions) {
		const ids: number[] = JSON.parse(s.recipe_ids);
		const filtered = ids.filter((id) => id !== recipeId);
		if (filtered.length !== ids.length) {
			if (filtered.length === 0) {
				db.prepare('DELETE FROM daily_suggestions WHERE id = ?').run(s.id);
			} else {
				db.prepare('UPDATE daily_suggestions SET recipe_ids = ? WHERE id = ?').run(JSON.stringify(filtered), s.id);
			}
		}
	}

	return json({ success: true });
};
