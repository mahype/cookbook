import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';

export const POST: RequestHandler = async () => {
	const db = getDb();
	db.prepare('DELETE FROM preferences').run();
	return json({ success: true });
};
