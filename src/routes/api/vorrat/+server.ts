import { json } from '@sveltejs/kit';
import { getDb, getPantryItems } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const items = getPantryItems();
	return json({ items: items.map((i) => i.name) });
};

export const POST: RequestHandler = async ({ request }) => {
	const { name } = await request.json();

	if (!name || typeof name !== 'string' || !name.trim()) {
		return json({ error: 'Name ist erforderlich' }, { status: 400 });
	}

	const db = getDb();
	try {
		const result = db
			.prepare('INSERT INTO pantry (name) VALUES (?)')
			.run(name.trim());
		return json({ id: result.lastInsertRowid, name: name.trim() }, { status: 201 });
	} catch (e: any) {
		if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
			return json({ error: 'Artikel existiert bereits' }, { status: 409 });
		}
		throw e;
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const db = getDb();

	if (body.name && typeof body.name === 'string') {
		db.prepare('DELETE FROM pantry WHERE LOWER(name) = LOWER(?)').run(body.name.trim());
		return json({ success: true });
	}

	if (body.id && typeof body.id === 'number') {
		db.prepare('DELETE FROM pantry WHERE id = ?').run(body.id);
		return json({ success: true });
	}

	return json({ error: 'Name oder ID ist erforderlich' }, { status: 400 });
};
