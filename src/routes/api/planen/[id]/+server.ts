import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, parseMealPlan, parsePerson, parseRecipe, type MealPlanRow, type PersonRow, type RecipeRow } from '$lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	const db = getDb();

	const row = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(id) as MealPlanRow | undefined;
	if (!row) {
		return json({ error: 'Essensplan nicht gefunden' }, { status: 404 });
	}

	const plan = parseMealPlan(row);

	// Resolve persons
	const persons = plan.person_ids.length > 0
		? (db.prepare(`SELECT * FROM persons WHERE id IN (${plan.person_ids.map(() => '?').join(',')})`).all(...plan.person_ids) as PersonRow[]).map(parsePerson)
		: [];

	// Resolve recipes
	const recipes = plan.recipe_ids.length > 0
		? (db.prepare(`SELECT * FROM recipes WHERE id IN (${plan.recipe_ids.map(() => '?').join(',')})`).all(...plan.recipe_ids) as RecipeRow[]).map(parseRecipe)
		: [];

	return json({ meal_plan: plan, persons, recipes });
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	const body = await request.json();
	const db = getDb();

	const existing = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(id) as MealPlanRow | undefined;
	if (!existing) {
		return json({ error: 'Essensplan nicht gefunden' }, { status: 404 });
	}

	const fields: string[] = [];
	const values: (string | number | null)[] = [];

	if (body.title !== undefined) {
		fields.push('title = ?');
		values.push(body.title);
	}
	if (body.recipe_ids !== undefined) {
		fields.push('recipe_ids = ?');
		values.push(JSON.stringify(body.recipe_ids));
	}
	if (body.status !== undefined) {
		fields.push('status = ?');
		values.push(body.status);
	}
	if (body.votes !== undefined) {
		fields.push('votes = ?');
		values.push(JSON.stringify(body.votes));
	}
	if (body.winner_recipe_id !== undefined) {
		fields.push('winner_recipe_id = ?');
		values.push(body.winner_recipe_id);
	}

	if (fields.length > 0) {
		values.push(id);
		db.prepare(`UPDATE meal_plans SET ${fields.join(', ')} WHERE id = ?`).run(...values);
	}

	const row = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(id) as MealPlanRow;
	return json({ meal_plan: parseMealPlan(row) });
};
