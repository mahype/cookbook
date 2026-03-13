import { json } from '@sveltejs/kit';
import { getDb, parseRecipe } from '$lib/server/db';
import type { RecipeRow } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const db = getDb();
	const cuisine = url.searchParams.get('cuisine');
	const store = url.searchParams.get('store');
	const maxTime = url.searchParams.get('maxTime');

	let query = 'SELECT * FROM recipes WHERE status = ?';
	const params: (string | number)[] = ['approved'];

	if (cuisine) {
		query += ' AND cuisine = ?';
		params.push(cuisine);
	}

	if (store) {
		query += ' AND store_category = ?';
		params.push(store);
	}

	if (maxTime) {
		query += ' AND prep_time <= ?';
		params.push(parseInt(maxTime));
	}

	query += ' ORDER BY created_at DESC';

	const rows = db.prepare(query).all(...params) as RecipeRow[];
	const recipes = rows.map(parseRecipe);

	return json({ recipes });
};
