import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, parsePerson, type PersonRow } from '$lib/server/db';

export const PUT: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	const body = await request.json();
	const db = getDb();

	const existing = db.prepare('SELECT * FROM persons WHERE id = ?').get(id) as PersonRow | undefined;
	if (!existing) {
		return json({ error: 'Person nicht gefunden' }, { status: 404 });
	}

	const fields: string[] = [];
	const values: (string | number)[] = [];

	if (body.name !== undefined) {
		fields.push('name = ?');
		values.push(body.name.trim());
	}
	if (body.is_household !== undefined) {
		fields.push('is_household = ?');
		values.push(body.is_household ? 1 : 0);
	}
	if (body.likes !== undefined) {
		fields.push('likes = ?');
		values.push(JSON.stringify(body.likes));
	}
	if (body.dislikes !== undefined) {
		fields.push('dislikes = ?');
		values.push(JSON.stringify(body.dislikes));
	}
	if (body.allergies !== undefined) {
		fields.push('allergies = ?');
		values.push(JSON.stringify(body.allergies));
	}
	if (body.health_conditions !== undefined) {
		fields.push('health_conditions = ?');
		values.push(JSON.stringify(body.health_conditions));
	}
	if (body.notes !== undefined) {
		fields.push('notes = ?');
		values.push(body.notes);
	}

	if (fields.length > 0) {
		values.push(id);
		db.prepare(`UPDATE persons SET ${fields.join(', ')} WHERE id = ?`).run(...values);
	}

	const row = db.prepare('SELECT * FROM persons WHERE id = ?').get(id) as PersonRow;
	return json({ person: parsePerson(row) });
};

export const DELETE: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	const db = getDb();

	const result = db.prepare('DELETE FROM persons WHERE id = ?').run(id);
	if (result.changes === 0) {
		return json({ error: 'Person nicht gefunden' }, { status: 404 });
	}

	return json({ success: true });
};
