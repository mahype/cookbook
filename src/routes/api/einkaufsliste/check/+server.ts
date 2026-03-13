import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { ingredient_name } = body;

	if (!ingredient_name) {
		return json({ error: 'ingredient_name required' }, { status: 400 });
	}

	const db = getDb();
	const existing = db
		.prepare('SELECT id FROM shopping_list WHERE ingredient_name = ? AND checked = 0')
		.get(ingredient_name) as { id: number } | undefined;

	return json({ exists: !!existing });
};
