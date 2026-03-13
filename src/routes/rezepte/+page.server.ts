import { getDb, parseRecipe, getPantryItems } from '$lib/server/db';
import type { RecipeRow } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
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

	// Get unique cuisines and stores for filters
	const allRows = db
		.prepare("SELECT DISTINCT cuisine FROM recipes WHERE status = 'approved' ORDER BY cuisine")
		.all() as { cuisine: string }[];
	const allStores = db
		.prepare("SELECT DISTINCT store_category FROM recipes WHERE status = 'approved' AND store_category != '' ORDER BY store_category")
		.all() as { store_category: string }[];

	const pantryItems = getPantryItems();

	return {
		recipes: rows.map(parseRecipe),
		pantryNames: pantryItems.map((p) => p.name.toLowerCase()),
		filters: {
			cuisines: allRows.map((r) => r.cuisine),
			stores: allStores.map((r) => r.store_category),
			current: { cuisine: cuisine || '', store: store || '', maxTime: maxTime || '' }
		}
	};
};
