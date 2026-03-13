import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const db = getDb();
	const row = db.prepare('SELECT COUNT(*) as count FROM shopping_list WHERE checked = 0').get() as { count: number };
	return json({ count: row.count });
};
