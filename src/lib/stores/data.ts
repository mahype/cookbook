/**
 * Data access layer that works in both web (SvelteKit server) and Capacitor (client-side SQLite) modes.
 */
import * as clientDb from '$lib/client/db';
import type { Recipe, PantryItem, ShoppingItem, Person, MealPlan, Ingredient } from '$lib/client/db';

export type { Recipe, PantryItem, ShoppingItem, Person, MealPlan, Ingredient };

// ============================================================
// Environment detection
// ============================================================

export function isCapacitor(): boolean {
	return typeof window !== 'undefined' && !!(window as any).Capacitor;
}

// ============================================================
// Helper
// ============================================================

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, init);
	if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
	return res.json();
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
	return apiFetch<T>(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

async function apiPut<T>(url: string, body: unknown): Promise<T> {
	return apiFetch<T>(url, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

async function apiDelete<T = void>(url: string): Promise<T> {
	return apiFetch<T>(url, { method: 'DELETE' });
}

// ============================================================
// Recipes
// ============================================================

export async function loadRecipes(filters?: {
	status?: string;
	cuisine?: string;
	store?: string;
	maxTime?: number;
}): Promise<Recipe[]> {
	if (isCapacitor()) {
		return clientDb.getRecipes(filters);
	}
	const params = new URLSearchParams();
	if (filters?.status) params.set('status', filters.status);
	if (filters?.cuisine) params.set('cuisine', filters.cuisine);
	if (filters?.store) params.set('store', filters.store);
	if (filters?.maxTime) params.set('maxTime', String(filters.maxTime));
	const qs = params.toString();
	return apiFetch<Recipe[]>(`/api/rezepte${qs ? `?${qs}` : ''}`);
}

export async function loadRecipe(id: number): Promise<Recipe | undefined> {
	if (isCapacitor()) {
		return clientDb.getRecipeById(id);
	}
	return apiFetch<Recipe>(`/api/rezepte/${id}`);
}

export async function loadRecipesByIds(ids: number[]): Promise<Recipe[]> {
	if (isCapacitor()) {
		return clientDb.getRecipesByIds(ids);
	}
	// No dedicated API for this — fetch individually
	const results = await Promise.all(ids.map((id) => loadRecipe(id)));
	return results.filter((r): r is Recipe => !!r);
}

export async function createRecipe(recipe: Parameters<typeof clientDb.insertRecipe>[0]): Promise<number> {
	if (isCapacitor()) {
		return clientDb.insertRecipe(recipe);
	}
	const data = await apiPost<{ id: number }>('/api/rezepte', recipe);
	return data.id;
}

export async function deleteRecipe(id: number): Promise<boolean> {
	if (isCapacitor()) {
		return clientDb.deleteRecipe(id);
	}
	await apiDelete(`/api/rezepte/${id}`);
	return true;
}

export async function approveRecipes(ids: number[]): Promise<number> {
	if (isCapacitor()) {
		return clientDb.approveRecipes(ids);
	}
	const data = await apiPost<{ updated: number }>('/api/rezepte/approve', { ids });
	return data.updated;
}

// ============================================================
// Pantry
// ============================================================

export async function loadPantry(): Promise<PantryItem[]> {
	if (isCapacitor()) {
		return clientDb.getPantryItems();
	}
	return apiFetch<PantryItem[]>('/api/vorrat');
}

export async function loadPantryNames(): Promise<string[]> {
	const items = await loadPantry();
	return items.map((i) => i.name.toLowerCase());
}

export async function addPantryItem(name: string): Promise<{ id: number; name: string } | null> {
	if (isCapacitor()) {
		return clientDb.addPantryItem(name);
	}
	return apiPost<{ id: number; name: string } | null>('/api/vorrat', { name });
}

export async function removePantryItem(opts: { id?: number; name?: string }): Promise<boolean> {
	if (isCapacitor()) {
		return clientDb.removePantryItem(opts);
	}
	if (opts.id) {
		await apiDelete(`/api/vorrat?id=${opts.id}`);
	} else if (opts.name) {
		await apiDelete(`/api/vorrat?name=${encodeURIComponent(opts.name)}`);
	}
	return true;
}

// ============================================================
// Shopping List
// ============================================================

export async function loadShoppingList(): Promise<ShoppingItem[]> {
	if (isCapacitor()) {
		return clientDb.getShoppingItems();
	}
	return apiFetch<ShoppingItem[]>('/api/einkaufsliste');
}

export async function addShoppingItems(
	items: Parameters<typeof clientDb.addShoppingItems>[0]
): Promise<number[]> {
	if (isCapacitor()) {
		return clientDb.addShoppingItems(items);
	}
	return apiPost<number[]>('/api/einkaufsliste', { items });
}

export async function toggleShoppingItem(id: number): Promise<boolean> {
	if (isCapacitor()) {
		return clientDb.toggleShoppingItem(id);
	}
	await apiPut(`/api/einkaufsliste/${id}`, { action: 'toggle' });
	return true;
}

export async function deleteShoppingItem(id: number): Promise<boolean> {
	if (isCapacitor()) {
		return clientDb.deleteShoppingItem(id);
	}
	await apiDelete(`/api/einkaufsliste/${id}`);
	return true;
}

export async function clearShoppingList(checkedOnly: boolean): Promise<void> {
	if (isCapacitor()) {
		return clientDb.clearShoppingList(checkedOnly);
	}
	await apiDelete(`/api/einkaufsliste?checkedOnly=${checkedOnly}`);
}

export async function getShoppingCount(): Promise<number> {
	if (isCapacitor()) {
		return clientDb.getShoppingCount();
	}
	const data = await apiFetch<{ count: number }>('/api/einkaufsliste/count');
	return data.count;
}

export async function checkShoppingIngredient(ingredientName: string): Promise<boolean> {
	if (isCapacitor()) {
		return clientDb.checkShoppingIngredient(ingredientName);
	}
	const data = await apiFetch<{ exists: boolean }>(
		`/api/einkaufsliste/check?name=${encodeURIComponent(ingredientName)}`
	);
	return data.exists;
}

// ============================================================
// Preferences
// ============================================================

export async function loadPreference(key: string): Promise<string | undefined> {
	if (isCapacitor()) {
		return clientDb.getPreference(key);
	}
	const data = await apiFetch<{ value?: string }>(`/api/einstellungen?key=${encodeURIComponent(key)}`);
	return data.value;
}

export async function savePreference(key: string, value: string): Promise<void> {
	if (isCapacitor()) {
		return clientDb.setPreference(key, value);
	}
	await apiPost('/api/einstellungen', { key, value });
}

export async function loadPreferences(): Promise<{
	cuisinePreferences: Record<string, number>;
	recipeNotes: string;
	defaultServings: number;
	aiProvider: any;
}> {
	const [cuisineRaw, recipeNotes, defaultServingsRaw, aiProviderRaw] = await Promise.all([
		loadPreference('cuisinePreferences'),
		loadPreference('recipeNotes'),
		loadPreference('defaultServings'),
		loadPreference('aiProvider')
	]);

	return {
		cuisinePreferences: cuisineRaw ? JSON.parse(cuisineRaw) : {},
		recipeNotes: recipeNotes ?? '',
		defaultServings: defaultServingsRaw ? parseInt(defaultServingsRaw, 10) : 2,
		aiProvider: aiProviderRaw ? JSON.parse(aiProviderRaw) : null
	};
}

// ============================================================
// Persons
// ============================================================

export async function loadPersons(): Promise<Person[]> {
	if (isCapacitor()) {
		return clientDb.getPersons();
	}
	return apiFetch<Person[]>('/api/personen');
}

export async function createPerson(data: Parameters<typeof clientDb.createPerson>[0]): Promise<Person> {
	if (isCapacitor()) {
		return clientDb.createPerson(data);
	}
	return apiPost<Person>('/api/personen', data);
}

export async function updatePerson(
	id: number,
	data: Parameters<typeof clientDb.updatePerson>[1]
): Promise<Person | null> {
	if (isCapacitor()) {
		return clientDb.updatePerson(id, data);
	}
	return apiPut<Person | null>(`/api/personen/${id}`, data);
}

export async function deletePerson(id: number): Promise<boolean> {
	if (isCapacitor()) {
		return clientDb.deletePerson(id);
	}
	await apiDelete(`/api/personen/${id}`);
	return true;
}

// ============================================================
// Meal Plans
// ============================================================

export async function loadMealPlans(): Promise<MealPlan[]> {
	if (isCapacitor()) {
		return clientDb.getMealPlans();
	}
	return apiFetch<MealPlan[]>('/api/planen');
}

export async function loadMealPlan(id: number): Promise<MealPlan | undefined> {
	if (isCapacitor()) {
		return clientDb.getMealPlanById(id);
	}
	return apiFetch<MealPlan>(`/api/planen/${id}`);
}

export async function createMealPlan(personIds: number[]): Promise<MealPlan> {
	if (isCapacitor()) {
		return clientDb.createMealPlan(personIds);
	}
	return apiPost<MealPlan>('/api/planen', { personIds });
}

export async function updateMealPlan(
	id: number,
	data: Parameters<typeof clientDb.updateMealPlan>[1]
): Promise<MealPlan | null> {
	if (isCapacitor()) {
		return clientDb.updateMealPlan(id, data);
	}
	return apiPut<MealPlan | null>(`/api/planen/${id}`, data);
}

export async function recordVote(
	planId: number,
	personId: string,
	votes: Record<string, number>
): Promise<MealPlan | null> {
	if (isCapacitor()) {
		return clientDb.recordVote(planId, personId, votes);
	}
	return apiPost<MealPlan | null>(`/api/planen/${planId}/vote`, { personId, votes });
}

// ============================================================
// Daily Suggestions
// ============================================================

export async function loadDailySuggestions(date?: string): Promise<{ date: string; recipes: Recipe[] }> {
	if (isCapacitor()) {
		return clientDb.getDailySuggestions(date);
	}
	const qs = date ? `?date=${date}` : '';
	return apiFetch<{ date: string; recipes: Recipe[] }>(`/api/vorschlaege${qs}`);
}

export async function saveDailySuggestions(date: string, recipeIds: number[]): Promise<void> {
	if (isCapacitor()) {
		return clientDb.saveDailySuggestions(date, recipeIds);
	}
	await apiPost('/api/vorschlaege', { date, recipeIds });
}

// ============================================================
// Filter helpers
// ============================================================

export async function getDistinctCuisines(): Promise<string[]> {
	if (isCapacitor()) {
		return clientDb.getDistinctCuisines();
	}
	const recipes = await loadRecipes({ status: 'approved' });
	return [...new Set(recipes.map((r) => r.cuisine))].sort();
}

export async function getDistinctStores(): Promise<string[]> {
	if (isCapacitor()) {
		return clientDb.getDistinctStores();
	}
	const recipes = await loadRecipes({ status: 'approved' });
	return [...new Set(recipes.map((r) => r.store_category).filter(Boolean))].sort();
}
