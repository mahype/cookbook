import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const db = getDb();
	const items = db
		.prepare('SELECT * FROM shopping_list ORDER BY checked ASC, created_at DESC')
		.all();
	return json({ items });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const items = body.items;

	if (!Array.isArray(items) || items.length === 0) {
		return json({ error: 'items must be a non-empty array' }, { status: 400 });
	}

	const db = getDb();

	const insert = db.prepare(`
		INSERT INTO shopping_list (ingredient_name, ingredient_amount, recipe_name, store, estimated_price)
		VALUES (@ingredient_name, @ingredient_amount, @recipe_name, @store, @estimated_price)
	`);

	const insertAll = db.transaction(() => {
		const ids: number[] = [];
		for (const item of items) {
			const result = insert.run({
				ingredient_name: item.ingredient_name,
				ingredient_amount: item.ingredient_amount,
				recipe_name: item.recipe_name,
				store: item.store || '',
				estimated_price: item.estimated_price || 0
			});
			ids.push(Number(result.lastInsertRowid));
		}
		return ids;
	});

	const ids = insertAll();
	return json({ success: true, ids });
};

export const DELETE: RequestHandler = async ({ url }) => {
	const db = getDb();
	const all = url.searchParams.get('all');

	if (all === 'true') {
		db.prepare('DELETE FROM shopping_list').run();
	} else {
		db.prepare('DELETE FROM shopping_list WHERE checked = 1').run();
	}

	return json({ success: true });
};
