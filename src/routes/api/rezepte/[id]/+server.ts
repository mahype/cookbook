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
	const result = db.prepare('DELETE FROM recipes WHERE id = ?').run(params.id);

	if (result.changes === 0) {
		return json({ error: 'Rezept nicht gefunden' }, { status: 404 });
	}

	return json({ success: true });
};
