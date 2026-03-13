import Database from 'better-sqlite3';
import { resolve } from 'path';
import { mkdirSync } from 'fs';

const DB_PATH = resolve('data/recipes.db');
mkdirSync(resolve('data'), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
	DROP TABLE IF EXISTS daily_suggestions;
	DROP TABLE IF EXISTS pantry;
	DROP TABLE IF EXISTS preferences;
	DROP TABLE IF EXISTS recipes;

	CREATE TABLE recipes (
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
		pantry_based INTEGER NOT NULL DEFAULT 0,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE daily_suggestions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		date TEXT NOT NULL UNIQUE,
		recipe_ids TEXT NOT NULL DEFAULT '[]',
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE pantry (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE preferences (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		key TEXT NOT NULL UNIQUE,
		value TEXT NOT NULL DEFAULT ''
	);
`);

type Ingredient = {
	name: string;
	amount: string;
	store: string;
};

type RecipeSeed = {
	name: string;
	description: string;
	cuisine: string;
	cost_estimate: number;
	prep_time: number;
	difficulty: string;
	image_url: string;
	ingredients: Ingredient[];
	steps: string[];
	shopping_tags: string[];
	store_category: string;
};

const recipes: RecipeSeed[] = [
	{
		name: 'Gebratene Nudeln mit Gemüse',
		description: 'Schnelle Asia-Nudeln mit knackigem Gemüse und würziger Sojasauce – in 20 Minuten fertig.',
		cuisine: 'Asiatisch',
		cost_estimate: 5.50,
		prep_time: 20,
		difficulty: 'Einfach',
		image_url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&q=80',
		ingredients: [
			{ name: 'Mie-Nudeln', amount: '250g', store: 'Asia-Laden' },
			{ name: 'Möhren', amount: '2 Stück', store: 'Discounter' },
			{ name: 'Paprika rot', amount: '1 Stück', store: 'Discounter' },
			{ name: 'Zucchini', amount: '1 kleine', store: 'Gemüsehändler' },
			{ name: 'Frühlingszwiebeln', amount: '1 Bund', store: 'Gemüsehändler' },
			{ name: 'Sojasauce', amount: '3 EL', store: 'Asia-Laden' },
			{ name: 'Sesamöl', amount: '1 EL', store: 'Asia-Laden' },
			{ name: 'Knoblauch', amount: '2 Zehen', store: 'Discounter' },
			{ name: 'Ingwer', amount: '1 daumengroßes Stück', store: 'Gemüsehändler' }
		],
		steps: [
			'Nudeln nach Packungsanleitung kochen, abgießen und beiseite stellen.',
			'Gemüse waschen und in dünne Streifen schneiden. Knoblauch und Ingwer fein hacken.',
			'Sesamöl in einem Wok oder großer Pfanne stark erhitzen.',
			'Knoblauch und Ingwer 30 Sekunden anbraten, dann Möhren dazu und 2 Minuten braten.',
			'Paprika und Zucchini dazugeben, weitere 2 Minuten unter Rühren braten.',
			'Nudeln und Sojasauce hinzufügen, alles gut vermengen und 2 Minuten durchschwenken.',
			'Mit Frühlingszwiebeln garnieren und sofort servieren.'
		],
		shopping_tags: ['Nudeln', 'Möhren', 'Paprika', 'Zucchini', 'Sojasauce'],
		store_category: 'Asia-Laden'
	},
	{
		name: 'Klassisches Kartoffelgratin',
		description: 'Cremiges Kartoffelgratin mit goldbrauner Käsekruste – der deutsche Klassiker für gemütliche Abende.',
		cuisine: 'Deutsch',
		cost_estimate: 6.00,
		prep_time: 60,
		difficulty: 'Einfach',
		image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80',
		ingredients: [
			{ name: 'Festkochende Kartoffeln', amount: '800g', store: 'Discounter' },
			{ name: 'Sahne', amount: '200ml', store: 'Discounter' },
			{ name: 'Milch', amount: '100ml', store: 'Discounter' },
			{ name: 'Geriebener Emmentaler', amount: '150g', store: 'Supermarkt' },
			{ name: 'Knoblauch', amount: '2 Zehen', store: 'Discounter' },
			{ name: 'Butter', amount: '20g', store: 'Discounter' },
			{ name: 'Muskatnuss', amount: '1 Prise', store: 'Discounter' },
			{ name: 'Salz & Pfeffer', amount: 'nach Geschmack', store: 'Discounter' }
		],
		steps: [
			'Backofen auf 180°C Ober-/Unterhitze vorheizen.',
			'Kartoffeln schälen und in 3mm dünne Scheiben schneiden.',
			'Auflaufform mit Butter einfetten und mit einer halbierten Knoblauchzehe ausreiben.',
			'Sahne, Milch, gepressten Knoblauch, Salz, Pfeffer und Muskatnuss verrühren.',
			'Kartoffelscheiben dachziegelartig in die Form schichten, jede Lage leicht salzen.',
			'Sahne-Mischung gleichmäßig darüber gießen.',
			'Mit Emmentaler bestreuen und 45 Minuten backen bis die Oberfläche goldbraun ist.',
			'5 Minuten ruhen lassen, dann servieren.'
		],
		shopping_tags: ['Kartoffeln', 'Sahne', 'Käse', 'Milch'],
		store_category: 'Discounter'
	},
	{
		name: 'Pad Thai',
		description: 'Authentisches Thai-Nudelgericht mit Garnelen, Erdnüssen und Limette – süß-sauer-würzig.',
		cuisine: 'Asiatisch',
		cost_estimate: 9.50,
		prep_time: 30,
		difficulty: 'Mittel',
		image_url: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800&q=80',
		ingredients: [
			{ name: 'Reisnudeln (breit)', amount: '200g', store: 'Asia-Laden' },
			{ name: 'Garnelen (TK, geschält)', amount: '200g', store: 'Supermarkt' },
			{ name: 'Eier', amount: '2 Stück', store: 'Discounter' },
			{ name: 'Sojasprossen', amount: '100g', store: 'Asia-Laden' },
			{ name: 'Frühlingszwiebeln', amount: '3 Stück', store: 'Gemüsehändler' },
			{ name: 'Erdnüsse (ungesalzen)', amount: '50g', store: 'Discounter' },
			{ name: 'Limette', amount: '1 Stück', store: 'Gemüsehändler' },
			{ name: 'Fischsauce', amount: '2 EL', store: 'Asia-Laden' },
			{ name: 'Tamarindenpaste', amount: '1 EL', store: 'Asia-Laden' },
			{ name: 'Zucker', amount: '1 EL', store: 'Discounter' },
			{ name: 'Knoblauch', amount: '2 Zehen', store: 'Discounter' },
			{ name: 'Pflanzenöl', amount: '2 EL', store: 'Discounter' }
		],
		steps: [
			'Reisnudeln 10 Minuten in warmem Wasser einweichen, dann abgießen.',
			'Sauce mischen: Fischsauce, Tamarindenpaste, Zucker und 2 EL Wasser verrühren.',
			'Erdnüsse grob hacken. Frühlingszwiebeln in Ringe schneiden.',
			'Öl im Wok erhitzen, Knoblauch kurz anbraten, dann Garnelen 2 Minuten braten.',
			'Garnelen zur Seite schieben, Eier aufschlagen und stocken lassen, dann zerkleinern.',
			'Nudeln und Sauce dazugeben, 2 Minuten unter Rühren braten bis die Nudeln weich sind.',
			'Sojasprossen unterheben, mit Erdnüssen, Frühlingszwiebeln und Limettenspalten servieren.'
		],
		shopping_tags: ['Reisnudeln', 'Garnelen', 'Erdnüsse', 'Limette', 'Sojasprossen'],
		store_category: 'Asia-Laden'
	},
	{
		name: 'Linsensuppe mit Würstchen',
		description: 'Herzhafte deutsche Linsensuppe mit Kartoffeln und Wiener Würstchen – wärmt von innen.',
		cuisine: 'Deutsch',
		cost_estimate: 5.00,
		prep_time: 45,
		difficulty: 'Einfach',
		image_url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80',
		ingredients: [
			{ name: 'Braune Tellerlinsen', amount: '250g', store: 'Discounter' },
			{ name: 'Kartoffeln', amount: '300g', store: 'Discounter' },
			{ name: 'Möhren', amount: '2 Stück', store: 'Discounter' },
			{ name: 'Lauch', amount: '1 Stange', store: 'Gemüsehändler' },
			{ name: 'Wiener Würstchen', amount: '4 Stück', store: 'Supermarkt' },
			{ name: 'Gemüsebrühe', amount: '1 Liter', store: 'Discounter' },
			{ name: 'Essig', amount: '1 EL', store: 'Discounter' },
			{ name: 'Lorbeerblatt', amount: '1 Stück', store: 'Discounter' },
			{ name: 'Salz & Pfeffer', amount: 'nach Geschmack', store: 'Discounter' }
		],
		steps: [
			'Linsen abspülen und abtropfen lassen.',
			'Kartoffeln und Möhren schälen und in kleine Würfel schneiden. Lauch in Ringe schneiden.',
			'Gemüsebrühe zum Kochen bringen, Linsen und Lorbeerblatt hinzufügen.',
			'Nach 10 Minuten Kartoffeln und Möhren dazugeben.',
			'Weitere 15 Minuten köcheln bis Linsen und Kartoffeln gar sind.',
			'Lauch und in Scheiben geschnittene Würstchen hinzufügen, 5 Minuten mitkochen.',
			'Mit Essig, Salz und Pfeffer abschmecken. Lorbeerblatt entfernen und servieren.'
		],
		shopping_tags: ['Linsen', 'Kartoffeln', 'Möhren', 'Würstchen', 'Lauch'],
		store_category: 'Discounter'
	},
	{
		name: 'Chicken Teriyaki mit Reis',
		description: 'Saftige Hähnchenschenkel in glänzender Teriyaki-Sauce auf duftendem Jasminreis.',
		cuisine: 'Asiatisch',
		cost_estimate: 7.50,
		prep_time: 25,
		difficulty: 'Einfach',
		image_url: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&q=80',
		ingredients: [
			{ name: 'Hähnchenbrust', amount: '300g (Theke)', store: 'Theke' },
			{ name: 'Jasminreis', amount: '200g', store: 'Asia-Laden' },
			{ name: 'Sojasauce', amount: '4 EL', store: 'Asia-Laden' },
			{ name: 'Mirin', amount: '2 EL', store: 'Asia-Laden' },
			{ name: 'Honig', amount: '1 EL', store: 'Discounter' },
			{ name: 'Ingwer', amount: '1 TL gerieben', store: 'Gemüsehändler' },
			{ name: 'Sesamkörner', amount: '1 EL', store: 'Asia-Laden' },
			{ name: 'Brokkoli', amount: '200g', store: 'Gemüsehändler' },
			{ name: 'Pflanzenöl', amount: '1 EL', store: 'Discounter' }
		],
		steps: [
			'Reis nach Packungsanleitung kochen.',
			'Teriyaki-Sauce mischen: Sojasauce, Mirin, Honig und Ingwer verrühren.',
			'Hähnchenbrust in mundgerechte Stücke schneiden.',
			'Öl in einer Pfanne erhitzen, Hähnchen von allen Seiten goldbraun anbraten (ca. 5 Min).',
			'Teriyaki-Sauce dazugießen und bei mittlerer Hitze einköcheln lassen bis sie glasig wird.',
			'Brokkoli in Röschen teilen, 4 Minuten in Salzwasser blanchieren.',
			'Reis auf Teller verteilen, Hähnchen und Brokkoli anrichten, mit Sesam bestreuen.'
		],
		shopping_tags: ['Hähnchen', 'Reis', 'Sojasauce', 'Brokkoli'],
		store_category: 'Supermarkt'
	},
	{
		name: 'Flammkuchen Elsässer Art',
		description: 'Knuspriger Flammkuchen mit Crème fraîche, Speck und Zwiebeln – schnell gemacht und unwiderstehlich.',
		cuisine: 'Deutsch',
		cost_estimate: 5.50,
		prep_time: 30,
		difficulty: 'Einfach',
		image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
		ingredients: [
			{ name: 'Fertiger Flammkuchenteig', amount: '1 Packung (ca. 270g)', store: 'Supermarkt' },
			{ name: 'Crème fraîche', amount: '200g', store: 'Discounter' },
			{ name: 'Speckwürfel (geräuchert)', amount: '150g', store: 'Supermarkt' },
			{ name: 'Zwiebeln', amount: '2 große', store: 'Discounter' },
			{ name: 'Salz & Pfeffer', amount: 'nach Geschmack', store: 'Discounter' },
			{ name: 'Muskatnuss', amount: '1 Prise', store: 'Discounter' }
		],
		steps: [
			'Backofen auf 220°C Ober-/Unterhitze vorheizen (oder höchste Stufe).',
			'Zwiebeln in dünne Ringe schneiden.',
			'Flammkuchenteig auf einem Backblech mit Backpapier ausrollen.',
			'Crème fraîche gleichmäßig auf dem Teig verstreichen. Mit Salz, Pfeffer und Muskatnuss würzen.',
			'Zwiebelringe und Speckwürfel gleichmäßig darauf verteilen.',
			'Im unteren Drittel des Ofens 12-15 Minuten backen bis der Rand knusprig und gebräunt ist.',
			'Sofort heiß servieren, am besten mit einem grünen Salat.'
		],
		shopping_tags: ['Crème fraîche', 'Speck', 'Zwiebeln', 'Flammkuchenteig'],
		store_category: 'Supermarkt'
	},
	{
		name: 'Rotes Thai-Curry mit Tofu',
		description: 'Cremiges Kokosnuss-Curry mit knusprigem Tofu, Paprika und Thai-Basilikum – vegan und aromatisch.',
		cuisine: 'Asiatisch',
		cost_estimate: 7.00,
		prep_time: 30,
		difficulty: 'Einfach',
		image_url: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&q=80',
		ingredients: [
			{ name: 'Fester Tofu', amount: '300g', store: 'Supermarkt' },
			{ name: 'Kokosmilch', amount: '1 Dose (400ml)', store: 'Asia-Laden' },
			{ name: 'Rote Currypaste', amount: '2 EL', store: 'Asia-Laden' },
			{ name: 'Paprika rot', amount: '1 Stück', store: 'Discounter' },
			{ name: 'Zuckerschoten', amount: '100g', store: 'Gemüsehändler' },
			{ name: 'Bambussprossen', amount: '1 kleine Dose', store: 'Asia-Laden' },
			{ name: 'Jasminreis', amount: '200g', store: 'Asia-Laden' },
			{ name: 'Fischsauce (oder Sojasauce)', amount: '1 EL', store: 'Asia-Laden' },
			{ name: 'Zucker', amount: '1 TL', store: 'Discounter' },
			{ name: 'Thai-Basilikum', amount: '1 Handvoll', store: 'Asia-Laden' }
		],
		steps: [
			'Reis nach Packungsanleitung kochen.',
			'Tofu in Würfel schneiden, mit Küchenpapier trocken tupfen.',
			'Tofu in einer Pfanne mit Öl von allen Seiten goldbraun anbraten, herausnehmen.',
			'Currypaste im selben Topf 1 Minute anrösten, bis sie duftet.',
			'Kokosmilch dazugießen, umrühren und aufkochen lassen.',
			'Paprika in Streifen und Zuckerschoten hinzufügen, 5 Minuten köcheln.',
			'Bambussprossen und Tofu dazugeben. Mit Fischsauce und Zucker abschmecken.',
			'Mit Thai-Basilikum garnieren und mit Reis servieren.'
		],
		shopping_tags: ['Tofu', 'Kokosmilch', 'Currypaste', 'Reis', 'Paprika'],
		store_category: 'Asia-Laden'
	},
	{
		name: 'Käsespätzle',
		description: 'Schwäbische Käsespätzle mit karamellisierten Röstzwiebeln – echtes Comfort Food.',
		cuisine: 'Deutsch',
		cost_estimate: 6.50,
		prep_time: 40,
		difficulty: 'Mittel',
		image_url: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=800&q=80',
		ingredients: [
			{ name: 'Spätzle (frisch oder getrocknet)', amount: '400g', store: 'Supermarkt' },
			{ name: 'Emmentaler (gerieben)', amount: '200g', store: 'Supermarkt' },
			{ name: 'Zwiebeln', amount: '3 große', store: 'Discounter' },
			{ name: 'Butter', amount: '40g', store: 'Discounter' },
			{ name: 'Salz & Pfeffer', amount: 'nach Geschmack', store: 'Discounter' },
			{ name: 'Schnittlauch', amount: '1 Bund', store: 'Gemüsehändler' }
		],
		steps: [
			'Zwiebeln in dünne Ringe schneiden und in 20g Butter bei mittlerer Hitze langsam goldbraun rösten (ca. 15 Min). Beiseite stellen.',
			'Spätzle in reichlich Salzwasser nach Packungsanleitung kochen, abgießen.',
			'Backofen auf 180°C vorheizen.',
			'In einer Auflaufform abwechselnd Spätzle und Käse schichten. Mit Käse abschließen.',
			'Restliche Butter in Flöckchen darauf verteilen.',
			'15 Minuten überbacken bis der Käse geschmolzen und leicht gebräunt ist.',
			'Mit den Röstzwiebeln und Schnittlauch toppen. Sofort servieren.'
		],
		shopping_tags: ['Spätzle', 'Käse', 'Zwiebeln', 'Butter'],
		store_category: 'Supermarkt'
	},
	{
		name: 'Japanische Miso-Suppe mit Udon',
		description: 'Wärmende Miso-Suppe mit dicken Udon-Nudeln, Tofu und Wakame – leicht und umami-reich.',
		cuisine: 'Asiatisch',
		cost_estimate: 6.00,
		prep_time: 20,
		difficulty: 'Einfach',
		image_url: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&q=80',
		ingredients: [
			{ name: 'Udon-Nudeln', amount: '200g', store: 'Asia-Laden' },
			{ name: 'Miso-Paste (hell)', amount: '3 EL', store: 'Asia-Laden' },
			{ name: 'Seidentofu', amount: '150g', store: 'Asia-Laden' },
			{ name: 'Wakame (getrocknet)', amount: '1 EL', store: 'Asia-Laden' },
			{ name: 'Frühlingszwiebeln', amount: '2 Stück', store: 'Gemüsehändler' },
			{ name: 'Dashi-Granulat', amount: '1 TL', store: 'Asia-Laden' },
			{ name: 'Sojasauce', amount: '1 EL', store: 'Asia-Laden' },
			{ name: 'Sesamöl', amount: '1 TL', store: 'Asia-Laden' }
		],
		steps: [
			'800ml Wasser mit Dashi-Granulat aufkochen.',
			'Wakame in einer kleinen Schüssel mit warmem Wasser 5 Minuten einweichen.',
			'Udon-Nudeln nach Packungsanleitung kochen, abgießen und auf Schüsseln verteilen.',
			'Hitze reduzieren (Brühe darf nicht mehr kochen!). Miso-Paste in einem Sieb in der Brühe auflösen.',
			'Tofu in kleine Würfel schneiden und vorsichtig in die Suppe geben.',
			'Eingeweichte Wakame und Sojasauce hinzufügen.',
			'Suppe über die Nudeln gießen. Mit Frühlingszwiebeln und einem Tropfen Sesamöl garnieren.'
		],
		shopping_tags: ['Udon', 'Miso', 'Tofu', 'Sojasauce'],
		store_category: 'Asia-Laden'
	},
	{
		name: 'Bauernfrühstück',
		description: 'Rustikales Pfannengericht mit Bratkartoffeln, Speck und Ei – schnell, günstig und sättigend.',
		cuisine: 'Deutsch',
		cost_estimate: 4.50,
		prep_time: 30,
		difficulty: 'Einfach',
		image_url: 'https://images.unsplash.com/photo-1513442542250-854d436a73f2?w=800&q=80',
		ingredients: [
			{ name: 'Festkochende Kartoffeln', amount: '500g', store: 'Discounter' },
			{ name: 'Eier', amount: '4 Stück', store: 'Discounter' },
			{ name: 'Speckwürfel', amount: '100g', store: 'Supermarkt' },
			{ name: 'Zwiebel', amount: '1 große', store: 'Discounter' },
			{ name: 'Schnittlauch', amount: '1 Bund', store: 'Gemüsehändler' },
			{ name: 'Butter oder Butterschmalz', amount: '2 EL', store: 'Discounter' },
			{ name: 'Salz & Pfeffer', amount: 'nach Geschmack', store: 'Discounter' },
			{ name: 'Gewürzgurken', amount: '2-3 Stück (Beilage)', store: 'Discounter' }
		],
		steps: [
			'Kartoffeln schälen, in dünne Scheiben schneiden und 10 Minuten in Salzwasser vorkochen. Abgießen.',
			'Zwiebel in Würfel schneiden.',
			'Butter in einer großen Pfanne erhitzen. Speckwürfel knusprig anbraten.',
			'Zwiebeln dazugeben und glasig dünsten.',
			'Kartoffelscheiben hinzufügen und bei mittlerer Hitze goldbraun braten (ca. 10 Min). Gelegentlich wenden.',
			'Eier verquirlen, mit Salz und Pfeffer würzen, über die Kartoffeln gießen.',
			'Bei kleiner Hitze stocken lassen (Deckel drauf), bis das Ei fest ist.',
			'Mit Schnittlauch bestreuen und mit Gewürzgurken servieren.'
		],
		shopping_tags: ['Kartoffeln', 'Eier', 'Speck', 'Zwiebeln'],
		store_category: 'Discounter'
	}
];

const insert = db.prepare(`
	INSERT INTO recipes (name, description, cuisine, cost_estimate, prep_time, difficulty, image_url, ingredients, steps, shopping_tags, store_category, status)
	VALUES (@name, @description, @cuisine, @cost_estimate, @prep_time, @difficulty, @image_url, @ingredients, @steps, @shopping_tags, @store_category, 'vorschlag')
`);

const insertMany = db.transaction((items: RecipeSeed[]) => {
	const ids: number[] = [];
	for (const item of items) {
		const result = insert.run({
			...item,
			ingredients: JSON.stringify(item.ingredients),
			steps: JSON.stringify(item.steps),
			shopping_tags: JSON.stringify(item.shopping_tags)
		});
		ids.push(Number(result.lastInsertRowid));
	}
	return ids;
});

const ids = insertMany(recipes);

const today = new Date().toISOString().split('T')[0];
db.prepare('INSERT INTO daily_suggestions (date, recipe_ids) VALUES (?, ?)').run(
	today,
	JSON.stringify(ids)
);

const pantryDefaults = ['Salz', 'Pfeffer', 'Olivenöl', 'Sonnenblumenöl', 'Zucker', 'Mehl', 'Butter'];
const insertPantry = db.prepare('INSERT INTO pantry (name) VALUES (?)');
for (const item of pantryDefaults) {
	insertPantry.run(item);
}

const defaultPreferences = ['Asiatisch', 'Deutsch', 'Italienisch'];
db.prepare('INSERT INTO preferences (key, value) VALUES (?, ?)').run(
	'cuisine_preferences',
	JSON.stringify(defaultPreferences)
);

console.log(`✓ ${recipes.length} Rezepte eingefügt`);
console.log(`✓ Tagesvorschläge für ${today} erstellt`);
console.log(`  Rezept-IDs: ${ids.join(', ')}`);
console.log(`✓ ${pantryDefaults.length} Vorrats-Artikel eingefügt`);
console.log(`✓ Küchen-Präferenzen: ${defaultPreferences.join(', ')}`);

db.close();
