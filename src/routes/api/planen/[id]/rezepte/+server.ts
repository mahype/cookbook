import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, parseMealPlan, parsePerson, parseRecipe, getPantryItems, type MealPlanRow, type PersonRow, type RecipeRow, type Recipe } from '$lib/server/db';
import { isMatchedByPantry } from '$lib/pantryMatch';

export const GET: RequestHandler = async ({ params, url }) => {
	const id = Number(params.id);
	const db = getDb();

	const row = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(id) as MealPlanRow | undefined;
	if (!row) {
		return json({ error: 'Essensplan nicht gefunden' }, { status: 404 });
	}

	const plan = parseMealPlan(row);

	// Get all persons in this plan
	const persons = plan.person_ids.length > 0
		? (db.prepare(`SELECT * FROM persons WHERE id IN (${plan.person_ids.map(() => '?').join(',')})`).all(...plan.person_ids) as PersonRow[]).map(parsePerson)
		: [];

	// Collect all dislikes and allergies
	const excludeIngredients = new Set<string>();
	for (const person of persons) {
		for (const d of person.dislikes) excludeIngredients.add(d.toLowerCase());
		for (const a of person.allergies) excludeIngredients.add(a.toLowerCase());
	}

	// Sort param
	const sort = url.searchParams.get('sort') || 'newest';

	let query = "SELECT * FROM recipes WHERE status = 'approved'";
	if (sort === 'fastest') {
		query += ' ORDER BY prep_time ASC';
	} else {
		query += ' ORDER BY id DESC';
	}

	const rows = db.prepare(query).all() as RecipeRow[];
	let recipes = rows.map(parseRecipe);

	// Filter out recipes containing disliked/allergic ingredients
	if (excludeIngredients.size > 0) {
		recipes = recipes.filter((recipe) => {
			return !recipe.ingredients.some((ing) => {
				const ingLower = ing.name.toLowerCase();
				for (const excluded of excludeIngredients) {
					if (ingLower === excluded) return true;
					if (excluded.length >= 3) {
						const escaped = excluded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
						const regex = new RegExp(`(^|[\\s\\-])${escaped}($|[\\s\\-])`, 'i');
						if (regex.test(ingLower)) return true;
					}
				}
				return false;
			});
		});
	}

	// JS-level sorts
	const pantryItems = getPantryItems();
	const pantryNames = pantryItems.map((p) => p.name.toLowerCase());

	if (sort === 'simplest') {
		recipes.sort((a, b) => a.ingredients.length - b.ingredients.length);
	} else if (sort === 'pantry') {
		recipes.sort((a, b) => pantryMatchPct(b, pantryNames) - pantryMatchPct(a, pantryNames));
	} else if (sort === 'cheapest') {
		recipes.sort((a, b) => missingCost(a, pantryNames) - missingCost(b, pantryNames));
	}

	return json({ recipes, pantryNames });
};

function pantryMatchPct(recipe: Recipe, pantryNames: string[]): number {
	if (recipe.ingredients.length === 0) return 0;
	const matched = recipe.ingredients.filter((ing) => isMatchedByPantry(ing.name, pantryNames)).length;
	return (matched / recipe.ingredients.length) * 100;
}

function missingCost(recipe: Recipe, pantryNames: string[]): number {
	return recipe.ingredients
		.filter((ing) => !isMatchedByPantry(ing.name, pantryNames))
		.reduce((sum, ing) => sum + (ing.estimated_price ?? 0), 0);
}
