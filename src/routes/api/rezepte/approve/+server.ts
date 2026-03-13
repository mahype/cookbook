import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { ids } = await request.json();

	if (!Array.isArray(ids) || ids.length === 0) {
		return json({ error: 'Keine Rezept-IDs angegeben' }, { status: 400 });
	}

	const db = getDb();
	const placeholders = ids.map(() => '?').join(',');
	const result = db
		.prepare(`UPDATE recipes SET status = 'approved' WHERE id IN (${placeholders}) AND status = 'vorschlag'`)
		.run(...ids);

	return json({ updated: result.changes });
};
