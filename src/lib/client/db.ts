/**
 * Client-side SQLite database using sql.js (WASM).
 * Mirrors the server-side API from $lib/server/db.ts.
 * Persists data to IndexedDB.
 */
import initSqlJs, { type Database } from 'sql.js';

// Re-export types from server for shared use
export type Ingredient = {
	name: string;
	amount: string;
	store: 'Discounter' | 'Supermarkt' | 'Gemüsehändler' | 'Asia-Laden' | 'Theke';
	estimated_price?: number;
};

export type Recipe = {
	id: number;
	name: string;
	description: string;
	cuisine: string;
	cost_estimate: number;
	prep_time: number;
	difficulty: 'Einfach' | 'Mittel';
	image_url: string;
	ingredients: Ingredient[];
	steps: string[];
	shopping_tags: string[];
	store_category: string;
	status: 'vorschlag' | 'approved';
	pantry_based: number;
	servings: number;
	created_at: string;
};

export type RecipeRow = Omit<Recipe, 'ingredients' | 'steps' | 'shopping_tags'> & {
	ingredients: string;
	steps: string;
	shopping_tags: string;
};

export type PantryItem = {
	id: number;
	name: string;
	created_at: string;
};

export type ShoppingItem = {
	id: number;
	ingredient_name: string;
	ingredient_amount: string;
	recipe_name: string;
	store: string;
	estimated_price: number;
	checked: number;
	created_at: string;
};

export type Person = {
	id: number;
	name: string;
	is_household: number;
	likes: string[];
	dislikes: string[];
	allergies: string[];
	health_conditions: string[];
	notes: string;
	created_at: string;
};

export type PersonRow = Omit<Person, 'likes' | 'dislikes' | 'allergies' | 'health_conditions'> & {
	likes: string;
	dislikes: string;
	allergies: string;
	health_conditions: string;
};

export type MealPlan = {
	id: number;
	title: string;
	person_ids: number[];
	recipe_ids: number[];
	status: 'planning' | 'voting' | 'completed';
	votes: Record<string, Record<string, number>>;
	winner_recipe_id: number | null;
	created_at: string;
};

export type MealPlanRow = Omit<MealPlan, 'person_ids' | 'recipe_ids' | 'votes'> & {
	person_ids: string;
	recipe_ids: string;
	votes: string;
};

// --- IndexedDB persistence ---

const IDB_NAME = 'cookbook-db';
const IDB_STORE = 'sqlitedb';
const IDB_KEY = 'database';

// --- Storage Layer: Capacitor Preferences (native) or IndexedDB (web fallback) ---

async function useCapPrefs(): Promise<boolean> {
	try {
		if (typeof window !== 'undefined' && (window as any).Capacitor) {
			const { Preferences } = await import('@capacitor/preferences');
			return !!Preferences;
		}
	} catch {}
	return false;
}

function openIdb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(IDB_NAME, 1);
		req.onupgradeneeded = () => {
			req.result.createObjectStore(IDB_STORE);
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function loadFromIdb(): Promise<Uint8Array | null> {
	// Try Capacitor Preferences first (native, persistent)
	if (await useCapPrefs()) {
		try {
			const { Preferences } = await import('@capacitor/preferences');
			const { value } = await Preferences.get({ key: IDB_KEY });
			if (value) {
				const binary = atob(value);
				const bytes = new Uint8Array(binary.length);
				for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
				return bytes;
			}
		} catch (e) {
			console.warn('Capacitor Preferences load failed, falling back to IDB:', e);
		}
	}

	// Fallback: IndexedDB
	const idb = await openIdb();
	return new Promise((resolve, reject) => {
		const tx = idb.transaction(IDB_STORE, 'readonly');
		const store = tx.objectStore(IDB_STORE);
		const req = store.get(IDB_KEY);
		req.onsuccess = () => resolve(req.result ?? null);
		req.onerror = () => reject(req.error);
	});
}

async function saveToIdb(data: Uint8Array): Promise<void> {
	// Save to Capacitor Preferences (native UserDefaults/SharedPreferences)
	if (await useCapPrefs()) {
		try {
			const { Preferences } = await import('@capacitor/preferences');
			// Convert Uint8Array to base64
			let binary = '';
			for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
			await Preferences.set({ key: IDB_KEY, value: btoa(binary) });
		} catch (e) {
			console.warn('Capacitor Preferences save failed:', e);
		}
	}

	// Also save to IndexedDB as fallback
	const idb = await openIdb();
	return new Promise((resolve, reject) => {
		const tx = idb.transaction(IDB_STORE, 'readwrite');
		const store = tx.objectStore(IDB_STORE);
		const req = store.put(data, IDB_KEY);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});
}

// --- Database singleton ---

let db: Database | null = null;
let dbReady: Promise<Database> | null = null;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function initSchema(db: Database) {
	db.run(`
		CREATE TABLE IF NOT EXISTS recipes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			description TEXT NOT NULL,
			cuisine TEXT NOT NULL,
			cost_estimate REAL NOT NULL,
			prep_time INTEGER NOT NULL,
			difficulty TEXT NOT NULL CHECK(difficulty IN ('Einfach', 'Mittel')),
			image_url TEXT DEFAULT '',
			ingredients TEXT NOT NULL DEFAULT '[]',
			steps TEXT NOT NULL DEFAULT '[]',
			shopping_tags TEXT NOT NULL DEFAULT '[]',
			store_category TEXT DEFAULT '',
			status TEXT NOT NULL DEFAULT 'vorschlag' CHECK(status IN ('vorschlag', 'approved')),
			raw_input TEXT DEFAULT '',
			servings INTEGER NOT NULL DEFAULT 2,
			pantry_based INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS daily_suggestions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			date TEXT NOT NULL UNIQUE,
			recipe_ids TEXT NOT NULL DEFAULT '[]',
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS pantry (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS preferences (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			key TEXT NOT NULL UNIQUE,
			value TEXT NOT NULL DEFAULT ''
		);

		CREATE TABLE IF NOT EXISTS shopping_list (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			ingredient_name TEXT NOT NULL,
			ingredient_amount TEXT NOT NULL,
			recipe_name TEXT NOT NULL,
			store TEXT DEFAULT '',
			estimated_price REAL DEFAULT 0,
			checked INTEGER DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS persons (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			is_household INTEGER DEFAULT 1,
			likes TEXT DEFAULT '[]',
			dislikes TEXT DEFAULT '[]',
			allergies TEXT DEFAULT '[]',
			health_conditions TEXT DEFAULT '[]',
			notes TEXT DEFAULT '',
			created_at TEXT DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS meal_plans (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT DEFAULT '',
			person_ids TEXT DEFAULT '[]',
			recipe_ids TEXT DEFAULT '[]',
			status TEXT DEFAULT 'planning' CHECK(status IN ('planning', 'voting', 'completed')),
			votes TEXT DEFAULT '{}',
			winner_recipe_id INTEGER,
			created_at TEXT DEFAULT (datetime('now'))
		);
	`);
}

/**
 * Get the client-side sql.js database. Initializes on first call.
 * Loads existing data from IndexedDB if available.
 */
export async function getDb(): Promise<Database> {
	if (db) return db;
	if (dbReady) return dbReady;

	dbReady = (async () => {
		const SQL = await initSqlJs({
			locateFile: () => '/sql-wasm.wasm'
		});

		const saved = await loadFromIdb();
		db = saved ? new SQL.Database(saved) : new SQL.Database();

		initSchema(db);
		return db;
	})();

	return dbReady;
}

/** Debounced save — call after every write operation */
function scheduleSave() {
	if (saveTimeout) clearTimeout(saveTimeout);
	saveTimeout = setTimeout(async () => {
		if (db) {
			const data = db.export();
			await saveToIdb(data);
		}
	}, 250);
}

/** Force an immediate save (e.g. before page unload) */
export async function forceSave(): Promise<void> {
	if (saveTimeout) clearTimeout(saveTimeout);
	if (db) {
		const data = db.export();
		await saveToIdb(data);
	}
}

// --- Helper to convert sql.js result rows to objects ---

function rowsToObjects<T>(db: Database, sql: string, params?: unknown[]): T[] {
	const stmt = db.prepare(sql);
	if (params) stmt.bind(params);
	const results: T[] = [];
	while (stmt.step()) {
		results.push(stmt.getAsObject() as T);
	}
	stmt.free();
	return results;
}

function rowToObject<T>(db: Database, sql: string, params?: unknown[]): T | undefined {
	const rows = rowsToObjects<T>(db, sql, params);
	return rows[0];
}

// --- Parse helpers (mirrors server) ---

export function parseRecipe(row: RecipeRow): Recipe {
	return {
		...row,
		pantry_based: row.pantry_based ?? 0,
		ingredients: JSON.parse(row.ingredients),
		steps: JSON.parse(row.steps),
		shopping_tags: JSON.parse(row.shopping_tags)
	};
}

export function parsePerson(row: PersonRow): Person {
	return {
		...row,
		likes: JSON.parse(row.likes),
		dislikes: JSON.parse(row.dislikes),
		allergies: JSON.parse(row.allergies),
		health_conditions: JSON.parse(row.health_conditions || '[]')
	};
}

export function parseMealPlan(row: MealPlanRow): MealPlan {
	return {
		...row,
		person_ids: JSON.parse(row.person_ids),
		recipe_ids: JSON.parse(row.recipe_ids),
		votes: JSON.parse(row.votes)
	};
}

// ============================================================
// Recipe CRUD
// ============================================================

export async function getRecipes(filters?: {
	status?: string;
	cuisine?: string;
	store?: string;
	maxTime?: number;
}): Promise<Recipe[]> {
	const d = await getDb();
	let sql = 'SELECT * FROM recipes WHERE 1=1';
	const params: unknown[] = [];

	if (filters?.status) {
		sql += ' AND status = ?';
		params.push(filters.status);
	}
	if (filters?.cuisine) {
		sql += ' AND cuisine = ?';
		params.push(filters.cuisine);
	}
	if (filters?.store) {
		sql += ' AND store_category = ?';
		params.push(filters.store);
	}
	if (filters?.maxTime) {
		sql += ' AND prep_time <= ?';
		params.push(filters.maxTime);
	}

	sql += ' ORDER BY id DESC';
	return rowsToObjects<RecipeRow>(d, sql, params).map(parseRecipe);
}

export async function getRecipeById(id: number): Promise<Recipe | undefined> {
	const d = await getDb();
	const row = rowToObject<RecipeRow>(d, 'SELECT * FROM recipes WHERE id = ?', [id]);
	return row ? parseRecipe(row) : undefined;
}

export async function getRecipesByIds(ids: number[]): Promise<Recipe[]> {
	if (ids.length === 0) return [];
	const d = await getDb();
	const placeholders = ids.map(() => '?').join(',');
	return rowsToObjects<RecipeRow>(
		d,
		`SELECT * FROM recipes WHERE id IN (${placeholders}) ORDER BY pantry_based DESC`,
		ids
	).map(parseRecipe);
}

export async function insertRecipe(recipe: {
	name: string;
	description: string;
	cuisine: string;
	cost_estimate: number;
	prep_time: number;
	difficulty: string;
	image_url?: string;
	ingredients: Ingredient[];
	steps: string[];
	shopping_tags?: string[];
	store_category?: string;
	status?: string;
	pantry_based?: number;
	servings?: number;
}): Promise<number> {
	const d = await getDb();
	d.run(
		`INSERT INTO recipes (name, description, cuisine, cost_estimate, prep_time, difficulty, image_url, ingredients, steps, shopping_tags, store_category, status, pantry_based, servings)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			recipe.name,
			recipe.description,
			recipe.cuisine,
			recipe.cost_estimate,
			recipe.prep_time,
			recipe.difficulty,
			recipe.image_url ?? '',
			JSON.stringify(recipe.ingredients),
			JSON.stringify(recipe.steps),
			JSON.stringify(recipe.shopping_tags ?? []),
			recipe.store_category ?? '',
			recipe.status ?? 'vorschlag',
			recipe.pantry_based ?? 0,
			recipe.servings ?? 2
		]
	);
	const row = rowToObject<{ id: number }>(d, 'SELECT last_insert_rowid() as id');
	scheduleSave();
	return row!.id;
}

export async function deleteRecipe(id: number): Promise<boolean> {
	const d = await getDb();
	d.run('DELETE FROM recipes WHERE id = ?', [id]);
	// Remove from daily_suggestions recipe_ids
	const suggestions = rowsToObjects<{ id: number; recipe_ids: string }>(
		d,
		'SELECT id, recipe_ids FROM daily_suggestions'
	);
	for (const s of suggestions) {
		const ids: number[] = JSON.parse(s.recipe_ids);
		const filtered = ids.filter((rid) => rid !== id);
		if (filtered.length !== ids.length) {
			if (filtered.length === 0) {
				d.run('DELETE FROM daily_suggestions WHERE id = ?', [s.id]);
			} else {
				d.run('UPDATE daily_suggestions SET recipe_ids = ? WHERE id = ?', [JSON.stringify(filtered), s.id]);
			}
		}
	}
	scheduleSave();
	return d.getRowsModified() > 0;
}

export async function updateRecipeImage(id: number, imageUrl: string): Promise<void> {
	const d = await getDb();
	d.run('UPDATE recipes SET image_url = ? WHERE id = ?', [imageUrl, id]);
	scheduleSave();
}

export async function approveRecipes(ids: number[]): Promise<number> {
	if (ids.length === 0) return 0;
	const d = await getDb();
	const placeholders = ids.map(() => '?').join(',');
	d.run(
		`UPDATE recipes SET status = 'approved' WHERE id IN (${placeholders}) AND status = 'vorschlag'`,
		ids
	);
	scheduleSave();
	return d.getRowsModified();
}

// ============================================================
// Pantry CRUD
// ============================================================

export async function getPantryItems(): Promise<PantryItem[]> {
	const d = await getDb();
	return rowsToObjects<PantryItem>(d, 'SELECT * FROM pantry ORDER BY name COLLATE NOCASE');
}

export async function addPantryItem(name: string): Promise<{ id: number; name: string } | null> {
	const d = await getDb();
	try {
		d.run('INSERT INTO pantry (name) VALUES (?)', [name.trim()]);
		const row = rowToObject<{ id: number }>(d, 'SELECT last_insert_rowid() as id');
		scheduleSave();
		return { id: row!.id, name: name.trim() };
	} catch {
		// UNIQUE constraint violation
		return null;
	}
}

export async function removePantryItem(opts: { id?: number; name?: string }): Promise<boolean> {
	const d = await getDb();
	if (opts.id) {
		d.run('DELETE FROM pantry WHERE id = ?', [opts.id]);
	} else if (opts.name) {
		d.run('DELETE FROM pantry WHERE LOWER(name) = LOWER(?)', [opts.name]);
	}
	scheduleSave();
	return d.getRowsModified() > 0;
}

// ============================================================
// Shopping List CRUD
// ============================================================

export async function getShoppingItems(): Promise<ShoppingItem[]> {
	const d = await getDb();
	return rowsToObjects<ShoppingItem>(
		d,
		'SELECT * FROM shopping_list ORDER BY checked ASC, created_at DESC'
	);
}

export async function addShoppingItems(
	items: {
		ingredient_name: string;
		ingredient_amount: string;
		recipe_name: string;
		store?: string;
		estimated_price?: number;
	}[]
): Promise<number[]> {
	const d = await getDb();
	const ids: number[] = [];
	for (const item of items) {
		d.run(
			'INSERT INTO shopping_list (ingredient_name, ingredient_amount, recipe_name, store, estimated_price) VALUES (?, ?, ?, ?, ?)',
			[
				item.ingredient_name,
				item.ingredient_amount,
				item.recipe_name,
				item.store ?? '',
				item.estimated_price ?? 0
			]
		);
		const row = rowToObject<{ id: number }>(d, 'SELECT last_insert_rowid() as id');
		ids.push(row!.id);
	}
	scheduleSave();
	return ids;
}

export async function toggleShoppingItem(id: number): Promise<boolean> {
	const d = await getDb();
	const row = rowToObject<{ checked: number }>(
		d,
		'SELECT checked FROM shopping_list WHERE id = ?',
		[id]
	);
	if (!row) return false;
	d.run('UPDATE shopping_list SET checked = ? WHERE id = ?', [row.checked ? 0 : 1, id]);
	scheduleSave();
	return true;
}

export async function deleteShoppingItem(id: number): Promise<boolean> {
	const d = await getDb();
	d.run('DELETE FROM shopping_list WHERE id = ?', [id]);
	scheduleSave();
	return d.getRowsModified() > 0;
}

export async function clearShoppingList(checkedOnly: boolean): Promise<void> {
	const d = await getDb();
	if (checkedOnly) {
		d.run('DELETE FROM shopping_list WHERE checked = 1');
	} else {
		d.run('DELETE FROM shopping_list');
	}
	scheduleSave();
}

export async function getShoppingCount(): Promise<number> {
	const d = await getDb();
	const row = rowToObject<{ count: number }>(
		d,
		'SELECT COUNT(*) as count FROM shopping_list WHERE checked = 0'
	);
	return row?.count ?? 0;
}

export async function checkShoppingIngredient(ingredientName: string): Promise<boolean> {
	const d = await getDb();
	const row = rowToObject<{ id: number }>(
		d,
		'SELECT id FROM shopping_list WHERE ingredient_name = ? AND checked = 0',
		[ingredientName]
	);
	return !!row;
}

// ============================================================
// Preferences
// ============================================================

export async function getPreference(key: string): Promise<string | undefined> {
	const d = await getDb();
	const row = rowToObject<{ value: string }>(
		d,
		'SELECT value FROM preferences WHERE key = ?',
		[key]
	);
	return row?.value;
}

export async function setPreference(key: string, value: string): Promise<void> {
	const d = await getDb();
	d.run(
		'INSERT INTO preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
		[key, value]
	);
	scheduleSave();
}

export async function clearAllPreferences(): Promise<void> {
	const d = await getDb();
	d.run('DELETE FROM preferences');
	scheduleSave();
}

export async function clearAllRecipes(): Promise<void> {
	const d = await getDb();
	d.run('DELETE FROM recipes');
	d.run('DELETE FROM daily_suggestions');
	scheduleSave();
}

// ============================================================
// Persons CRUD
// ============================================================

export async function getPersons(): Promise<Person[]> {
	const d = await getDb();
	return rowsToObjects<PersonRow>(
		d,
		'SELECT * FROM persons ORDER BY is_household DESC, name ASC'
	).map(parsePerson);
}

export async function createPerson(data: {
	name: string;
	is_household?: number;
	likes?: string[];
	dislikes?: string[];
	allergies?: string[];
	health_conditions?: string[];
	notes?: string;
}): Promise<Person> {
	const d = await getDb();
	d.run(
		'INSERT INTO persons (name, is_household, likes, dislikes, allergies, health_conditions, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
		[
			data.name,
			data.is_household ?? 1,
			JSON.stringify(data.likes ?? []),
			JSON.stringify(data.dislikes ?? []),
			JSON.stringify(data.allergies ?? []),
			JSON.stringify(data.health_conditions ?? []),
			data.notes ?? ''
		]
	);
	const row = rowToObject<{ id: number }>(d, 'SELECT last_insert_rowid() as id');
	scheduleSave();
	const personRow = rowToObject<PersonRow>(d, 'SELECT * FROM persons WHERE id = ?', [row!.id]);
	return parsePerson(personRow!);
}

export async function updatePerson(
	id: number,
	data: Partial<{
		name: string;
		is_household: number;
		likes: string[];
		dislikes: string[];
		allergies: string[];
		health_conditions: string[];
		notes: string;
	}>
): Promise<Person | null> {
	const d = await getDb();
	const existing = rowToObject<PersonRow>(d, 'SELECT * FROM persons WHERE id = ?', [id]);
	if (!existing) return null;

	const sets: string[] = [];
	const params: unknown[] = [];

	if (data.name !== undefined) {
		sets.push('name = ?');
		params.push(data.name);
	}
	if (data.is_household !== undefined) {
		sets.push('is_household = ?');
		params.push(data.is_household);
	}
	if (data.likes !== undefined) {
		sets.push('likes = ?');
		params.push(JSON.stringify(data.likes));
	}
	if (data.dislikes !== undefined) {
		sets.push('dislikes = ?');
		params.push(JSON.stringify(data.dislikes));
	}
	if (data.allergies !== undefined) {
		sets.push('allergies = ?');
		params.push(JSON.stringify(data.allergies));
	}
	if (data.health_conditions !== undefined) {
		sets.push('health_conditions = ?');
		params.push(JSON.stringify(data.health_conditions));
	}
	if (data.notes !== undefined) {
		sets.push('notes = ?');
		params.push(data.notes);
	}

	if (sets.length > 0) {
		params.push(id);
		d.run(`UPDATE persons SET ${sets.join(', ')} WHERE id = ?`, params);
		scheduleSave();
	}

	const updated = rowToObject<PersonRow>(d, 'SELECT * FROM persons WHERE id = ?', [id]);
	return parsePerson(updated!);
}

export async function deletePerson(id: number): Promise<boolean> {
	const d = await getDb();
	d.run('DELETE FROM persons WHERE id = ?', [id]);
	scheduleSave();
	return d.getRowsModified() > 0;
}

// ============================================================
// Meal Plans CRUD
// ============================================================

export async function getMealPlans(): Promise<MealPlan[]> {
	const d = await getDb();
	return rowsToObjects<MealPlanRow>(d, 'SELECT * FROM meal_plans ORDER BY id DESC').map(
		parseMealPlan
	);
}

export async function getMealPlanById(id: number): Promise<MealPlan | undefined> {
	const d = await getDb();
	const row = rowToObject<MealPlanRow>(d, 'SELECT * FROM meal_plans WHERE id = ?', [id]);
	return row ? parseMealPlan(row) : undefined;
}

export async function createMealPlan(personIds: number[]): Promise<MealPlan> {
	const d = await getDb();
	d.run('INSERT INTO meal_plans (person_ids) VALUES (?)', [JSON.stringify(personIds)]);
	const row = rowToObject<{ id: number }>(d, 'SELECT last_insert_rowid() as id');
	scheduleSave();
	const plan = rowToObject<MealPlanRow>(d, 'SELECT * FROM meal_plans WHERE id = ?', [row!.id]);
	return parseMealPlan(plan!);
}

export async function updateMealPlan(
	id: number,
	data: Partial<{
		title: string;
		recipe_ids: number[];
		status: string;
		votes: Record<string, Record<string, number>>;
		winner_recipe_id: number | null;
	}>
): Promise<MealPlan | null> {
	const d = await getDb();
	const existing = rowToObject<MealPlanRow>(d, 'SELECT * FROM meal_plans WHERE id = ?', [id]);
	if (!existing) return null;

	const sets: string[] = [];
	const params: unknown[] = [];

	if (data.title !== undefined) {
		sets.push('title = ?');
		params.push(data.title);
	}
	if (data.recipe_ids !== undefined) {
		sets.push('recipe_ids = ?');
		params.push(JSON.stringify(data.recipe_ids));
	}
	if (data.status !== undefined) {
		sets.push('status = ?');
		params.push(data.status);
	}
	if (data.votes !== undefined) {
		sets.push('votes = ?');
		params.push(JSON.stringify(data.votes));
	}
	if (data.winner_recipe_id !== undefined) {
		sets.push('winner_recipe_id = ?');
		params.push(data.winner_recipe_id);
	}

	if (sets.length > 0) {
		params.push(id);
		d.run(`UPDATE meal_plans SET ${sets.join(', ')} WHERE id = ?`, params);
		scheduleSave();
	}

	const updated = rowToObject<MealPlanRow>(d, 'SELECT * FROM meal_plans WHERE id = ?', [id]);
	return parseMealPlan(updated!);
}

export async function recordVote(
	planId: number,
	personId: string,
	votes: Record<string, number>
): Promise<MealPlan | null> {
	const d = await getDb();
	const row = rowToObject<MealPlanRow>(d, 'SELECT * FROM meal_plans WHERE id = ?', [planId]);
	if (!row) return null;

	const currentVotes = JSON.parse(row.votes);
	currentVotes[personId] = votes;

	d.run('UPDATE meal_plans SET votes = ? WHERE id = ?', [JSON.stringify(currentVotes), planId]);
	scheduleSave();

	const updated = rowToObject<MealPlanRow>(d, 'SELECT * FROM meal_plans WHERE id = ?', [planId]);
	return parseMealPlan(updated!);
}

// ============================================================
// Daily Suggestions
// ============================================================

export async function getDailySuggestions(
	date?: string
): Promise<{ date: string; recipes: Recipe[] }> {
	const d = await getDb();
	let suggestion: { id: number; date: string; recipe_ids: string } | undefined;
	if (date) {
		suggestion = rowToObject<{ id: number; date: string; recipe_ids: string }>(
			d,
			'SELECT * FROM daily_suggestions WHERE date = ?',
			[date]
		);
	} else {
		suggestion = rowToObject<{ id: number; date: string; recipe_ids: string }>(
			d,
			'SELECT * FROM daily_suggestions ORDER BY date DESC LIMIT 1',
			[]
		);
	}
	const targetDate = suggestion?.date ?? date ?? new Date().toISOString().split('T')[0];

	if (!suggestion) {
		return { date: targetDate, recipes: [] };
	}

	const recipeIds: number[] = JSON.parse(suggestion.recipe_ids);
	const recipes = await getRecipesByIds(recipeIds);
	return { date: targetDate, recipes };
}

export async function saveDailySuggestions(date: string, recipeIds: number[]): Promise<void> {
	const d = await getDb();
	// Clean up old suggestions and their unapproved recipes
	const oldSuggestions = rowsToObjects<{ recipe_ids: string }>(
		d,
		'SELECT recipe_ids FROM daily_suggestions'
	);
	const oldIds = oldSuggestions.flatMap((s) => JSON.parse(s.recipe_ids) as number[]);
	if (oldIds.length > 0) {
		const placeholders = oldIds.map(() => '?').join(',');
		d.run(
			`DELETE FROM recipes WHERE id IN (${placeholders}) AND status = 'vorschlag'`,
			oldIds
		);
	}
	d.run('DELETE FROM daily_suggestions');

	// Save new suggestion
	d.run('INSERT INTO daily_suggestions (date, recipe_ids) VALUES (?, ?)', [
		date,
		JSON.stringify(recipeIds)
	]);
	scheduleSave();
}

// ============================================================
// Filter helpers (for recipe list page)
// ============================================================

export async function getDistinctCuisines(): Promise<string[]> {
	const d = await getDb();
	return rowsToObjects<{ cuisine: string }>(
		d,
		"SELECT DISTINCT cuisine FROM recipes WHERE status = 'approved' ORDER BY cuisine"
	).map((r) => r.cuisine);
}

export async function getDistinctStores(): Promise<string[]> {
	const d = await getDb();
	return rowsToObjects<{ store_category: string }>(
		d,
		"SELECT DISTINCT store_category FROM recipes WHERE status = 'approved' AND store_category != '' ORDER BY store_category"
	).map((r) => r.store_category);
}
