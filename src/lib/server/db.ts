import Database from 'better-sqlite3';
import { resolve } from 'path';
import { pantryMatches } from '$lib/pantryMatch';

const DB_PATH = resolve('data/recipes.db');

let db: Database.Database;

export function getDb(): Database.Database {
	if (!db) {
		db = new Database(DB_PATH);
		db.pragma('journal_mode = WAL');
		db.pragma('foreign_keys = ON');
		initDb(db);
	}
	return db;
}

function initDb(db: Database.Database) {
	db.exec(`
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
	`);

	// Add pantry_based column if it doesn't exist
	const columns = db.prepare("PRAGMA table_info(recipes)").all() as { name: string }[];
	if (!columns.some(c => c.name === 'pantry_based')) {
		db.exec("ALTER TABLE recipes ADD COLUMN pantry_based INTEGER NOT NULL DEFAULT 0");
	}
}

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
	created_at: string;
};

export type RecipeRow = Omit<Recipe, 'ingredients' | 'steps' | 'shopping_tags'> & {
	ingredients: string;
	steps: string;
	shopping_tags: string;
	pantry_based: number;
};

export type PantryItem = {
	id: number;
	name: string;
	created_at: string;
};

export function getPantryItems(): PantryItem[] {
	return getDb().prepare('SELECT * FROM pantry ORDER BY name COLLATE NOCASE').all() as PantryItem[];
}

export function isInPantry(ingredientName: string): boolean {
	const pantryItems = getPantryItems();
	return pantryItems.some((item) => pantryMatches(ingredientName, item.name));
}

export function parseRecipe(row: RecipeRow): Recipe {
	return {
		...row,
		pantry_based: row.pantry_based ?? 0,
		ingredients: JSON.parse(row.ingredients),
		steps: JSON.parse(row.steps),
		shopping_tags: JSON.parse(row.shopping_tags)
	};
}

export function getPreference(key: string): string | undefined {
	const row = getDb().prepare('SELECT value FROM preferences WHERE key = ?').get(key) as { value: string } | undefined;
	return row?.value;
}

export function setPreference(key: string, value: string): void {
	getDb().prepare('INSERT INTO preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}
