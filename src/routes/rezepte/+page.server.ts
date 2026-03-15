import { getDb, parseRecipe, getPantryItems } from '$lib/server/db';
import type { Recipe, RecipeRow } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import { isMatchedByPantry } from '$lib/pantryMatch';

const SORT_OPTIONS = ['newest', 'pantry', 'cheapest', 'fastest', 'simplest'] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

export const load: PageServerLoad = async ({ url }) => {
	const db = getDb();
	const tab = url.searchParams.get('tab') || 'vorschlaege';
	const cuisine = url.searchParams.get('cuisine');
	const store = url.searchParams.get('store');
	const maxTime = url.searchParams.get('maxTime');
	const sort = (url.searchParams.get('sort') as SortOption) || 'newest';
	const validSort = SORT_OPTIONS.includes(sort) ? sort : 'newest';

	const pantryItems = getPantryItems();
	const pantryNames = pantryItems.map((p) => p.name.toLowerCase());

	// --- Vorschläge data (load most recent, not just today) ---
	const today = new Date().toISOString().split('T')[0];
	const suggestion = db.prepare('SELECT * FROM daily_suggestions ORDER BY date DESC LIMIT 1').get() as
		| { id: number; date: string; recipe_ids: string }
		| undefined;

	let suggestionRecipes: Recipe[] = [];
	if (suggestion) {
		const recipeIds: number[] = JSON.parse(suggestion.recipe_ids);
		if (recipeIds.length > 0) {
			const placeholders = recipeIds.map(() => '?').join(',');
			const rows = db
				.prepare(`SELECT * FROM recipes WHERE id IN (${placeholders}) AND status = 'vorschlag' ORDER BY id DESC`)
				.all(...recipeIds) as RecipeRow[];
			suggestionRecipes = rows.map(parseRecipe);
		}
	}

	// --- Gespeichert (approved recipes) data ---
	let query = 'SELECT * FROM recipes WHERE status = ?';
	const params: (string | number)[] = ['approved'];

	if (cuisine) {
		query += ' AND cuisine = ?';
		params.push(cuisine);
	}

	if (store) {
		query += ' AND store_category = ?';
		params.push(store);
	}

	if (maxTime) {
		query += ' AND prep_time <= ?';
		params.push(parseInt(maxTime));
	}

	// Simple DB-level sorts
	if (validSort === 'newest') {
		query += ' ORDER BY id DESC';
	} else if (validSort === 'fastest') {
		query += ' ORDER BY prep_time ASC';
	} else {
		query += ' ORDER BY id DESC'; // default order, will re-sort in JS
	}

	const rows = db.prepare(query).all(...params) as RecipeRow[];
	let recipes = rows.map(parseRecipe);

	// JS-level sorts that need parsed ingredients
	if (validSort === 'simplest') {
		recipes.sort((a, b) => a.ingredients.length - b.ingredients.length);
	} else if (validSort === 'pantry') {
		recipes.sort((a, b) => {
			const pctA = pantryMatchPct(a, pantryNames);
			const pctB = pantryMatchPct(b, pantryNames);
			return pctB - pctA;
		});
	} else if (validSort === 'cheapest') {
		recipes.sort((a, b) => {
			const costA = missingIngredientsCost(a, pantryNames);
			const costB = missingIngredientsCost(b, pantryNames);
			return costA - costB;
		});
	}

	// Get unique cuisines and stores for filters
	const allRows = db
		.prepare("SELECT DISTINCT cuisine FROM recipes WHERE status = 'approved' ORDER BY cuisine")
		.all() as { cuisine: string }[];
	const allStores = db
		.prepare("SELECT DISTINCT store_category FROM recipes WHERE status = 'approved' AND store_category != '' ORDER BY store_category")
		.all() as { store_category: string }[];

	return {
		tab,
		date: today,
		suggestionRecipes,
		recipes,
		pantryNames,
		sort: validSort,
		filters: {
			cuisines: allRows.map((r) => r.cuisine),
			stores: allStores.map((r) => r.store_category),
			current: { cuisine: cuisine || '', store: store || '', maxTime: maxTime || '' }
		}
	};
};

function pantryMatchPct(recipe: Recipe, pantryNames: string[]): number {
	if (recipe.ingredients.length === 0) return 0;
	const matched = recipe.ingredients.filter((ing) => isMatchedByPantry(ing.name, pantryNames)).length;
	return (matched / recipe.ingredients.length) * 100;
}

function missingIngredientsCost(recipe: Recipe, pantryNames: string[]): number {
	return recipe.ingredients
		.filter((ing) => !isMatchedByPantry(ing.name, pantryNames))
		.reduce((sum, ing) => sum + (ing.estimated_price ?? 0), 0);
}
