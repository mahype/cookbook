import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, parseMealPlan, type MealPlanRow } from '$lib/server/db';

export const POST: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	const body = await request.json();
	const { person_id, votes } = body;

	if (!person_id || !votes || typeof votes !== 'object') {
		return json({ error: 'person_id und votes erforderlich' }, { status: 400 });
	}

	const db = getDb();
	const row = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(id) as MealPlanRow | undefined;
	if (!row) {
		return json({ error: 'Essensplan nicht gefunden' }, { status: 404 });
	}

	const plan = parseMealPlan(row);
	plan.votes[String(person_id)] = votes;

	db.prepare('UPDATE meal_plans SET votes = ? WHERE id = ?').run(JSON.stringify(plan.votes), id);

	const updated = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(id) as MealPlanRow;
	return json({ meal_plan: parseMealPlan(updated) });
};
