import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, parseMealPlan, type MealPlanRow } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { person_ids } = body;

	if (!Array.isArray(person_ids) || person_ids.length === 0) {
		return json({ error: 'Mindestens eine Person auswählen' }, { status: 400 });
	}

	const db = getDb();
	const result = db
		.prepare('INSERT INTO meal_plans (person_ids) VALUES (?)')
		.run(JSON.stringify(person_ids));

	const row = db
		.prepare('SELECT * FROM meal_plans WHERE id = ?')
		.get(result.lastInsertRowid) as MealPlanRow;

	return json({ meal_plan: parseMealPlan(row) }, { status: 201 });
};
