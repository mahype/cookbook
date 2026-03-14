import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, parsePerson, type PersonRow } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	const db = getDb();
	const rows = db
		.prepare('SELECT * FROM persons ORDER BY is_household DESC, name ASC')
		.all() as PersonRow[];
	const persons = rows.map(parsePerson);
	return json({ persons });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { name, is_household = 1, likes = [], dislikes = [], allergies = [], health_conditions = [], notes = '' } = body;

	if (!name || typeof name !== 'string' || !name.trim()) {
		return json({ error: 'Name ist erforderlich' }, { status: 400 });
	}

	const db = getDb();
	const result = db
		.prepare(
			'INSERT INTO persons (name, is_household, likes, dislikes, allergies, health_conditions, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
		)
		.run(
			name.trim(),
			is_household ? 1 : 0,
			JSON.stringify(likes),
			JSON.stringify(dislikes),
			JSON.stringify(allergies),
			JSON.stringify(health_conditions),
			notes
		);

	const row = db.prepare('SELECT * FROM persons WHERE id = ?').get(result.lastInsertRowid) as PersonRow;
	return json({ person: parsePerson(row) }, { status: 201 });
};
