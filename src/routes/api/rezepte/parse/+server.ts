import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { html, text, images } = body;

	if (!text && (!images || images.length === 0)) {
		return json({ error: 'Kein Inhalt zum Verarbeiten' }, { status: 400 });
	}

	const db = getDb();

	// For now: basic parsing from plain text
	// AI processing will be added later
	const lines = (text || '').split('\n').filter((l: string) => l.trim());
	const name = lines[0]?.trim().slice(0, 100) || 'Neues Rezept';
	const description = lines.slice(1, 4).join(' ').trim().slice(0, 300) || 'Manuell hinzugefügt';

	// Store the first image if present
	const imageUrl = images?.[0] || '';

	const result = db.prepare(`
		INSERT INTO recipes (name, description, cuisine, cost_estimate, prep_time, difficulty, image_url, ingredients, steps, shopping_tags, store_category, status, raw_input)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?)
	`).run(
		name,
		description,
		'Sonstiges',
		0,
		0,
		'Einfach',
		imageUrl,
		'[]',
		'[]',
		'[]',
		'',
		html || text || ''
	);

	const id = Number(result.lastInsertRowid);

	return json({ id, name, status: 'approved' });
};
