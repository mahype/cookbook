import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params }) => {
	const db = getDb();
	const item = db.prepare('SELECT checked FROM shopping_list WHERE id = ?').get(params.id) as
		| { checked: number }
		| undefined;

	if (!item) {
		return json({ error: 'Item not found' }, { status: 404 });
	}

	const newChecked = item.checked === 0 ? 1 : 0;
	db.prepare('UPDATE shopping_list SET checked = ? WHERE id = ?').run(newChecked, params.id);

	return json({ success: true, checked: newChecked });
};

export const DELETE: RequestHandler = async ({ params }) => {
	const db = getDb();
	const result = db.prepare('DELETE FROM shopping_list WHERE id = ?').run(params.id);

	if (result.changes === 0) {
		return json({ error: 'Item not found' }, { status: 404 });
	}

	return json({ success: true });
};
