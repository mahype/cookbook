import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { chatCompletion, getAIProvider } from '$lib/server/ai';
import type { RequestHandler } from './$types';

const SYSTEM_PROMPT = `Du bist ein Rezept-Parser. Extrahiere aus dem gegebenen Text ein strukturiertes Rezept.

Antworte NUR mit validem JSON in exakt diesem Format:
{
  "name": "Name des Gerichts",
  "description": "Kurze Beschreibung (1-2 Sätze)",
  "cuisine": "Küche (z.B. Thailändisch, Deutsch, Italienisch)",
  "cost_estimate": 0,
  "prep_time": 30,
  "difficulty": "Einfach|Mittel|Schwer",
  "servings": 2,
  "ingredients": [
    {"name": "Zutat", "amount": "Menge mit Einheit", "store": "Supermarkt|Discounter|Asia-Laden|Gemüsehändler|Vorrat", "estimated_price": 0}
  ],
  "steps": ["Schritt 1", "Schritt 2"],
  "shopping_tags": ["Tag1", "Tag2"]
}

Regeln:
- Alle Felder müssen ausgefüllt sein
- prep_time in Minuten
- ingredients: jede Zutat einzeln, mit realistischer Mengenangabe
- steps: klare, nummerierte Schritte
- shopping_tags: die wichtigsten Zutaten zum Einkaufen
- Wenn Informationen fehlen, schätze sinnvoll
- Antworte NUR mit JSON, kein weiterer Text`;

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { html, text, images } = body;

	if (!text && (!images || images.length === 0)) {
		return json({ error: 'Kein Inhalt zum Verarbeiten' }, { status: 400 });
	}

	const db = getDb();
	const rawInput = html || text || '';

	// Try AI parsing if provider is configured
	const provider = getAIProvider();
	let recipe: Record<string, unknown> | null = null;

	if (provider) {
		try {
			const prompt = `Bitte parse dieses Rezept:\n\n${text || ''}`;
			const response = await chatCompletion(prompt, SYSTEM_PROMPT);
			
			// Extract JSON from response (might be wrapped in markdown code blocks)
			let jsonStr = response.text.trim();
			const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
			if (jsonMatch) jsonStr = jsonMatch[1].trim();
			
			recipe = JSON.parse(jsonStr);
		} catch (e) {
			console.error('AI parsing failed, falling back to basic:', e);
		}
	}

	// Fallback: basic text parsing
	if (!recipe) {
		const lines = (text || '').split('\n').filter((l: string) => l.trim());
		recipe = {
			name: lines[0]?.trim().slice(0, 100) || 'Neues Rezept',
			description: lines.slice(1, 4).join(' ').trim().slice(0, 300) || 'Manuell hinzugefügt',
			cuisine: 'Sonstiges',
			cost_estimate: 0,
			prep_time: 0,
			difficulty: 'Einfach',
			servings: 2,
			ingredients: [],
			steps: [],
			shopping_tags: []
		};
	}

	const imageUrl = images?.[0] || '';

	const result = db.prepare(`
		INSERT INTO recipes (name, description, cuisine, cost_estimate, prep_time, difficulty, image_url, ingredients, steps, shopping_tags, store_category, status, raw_input, servings)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)
	`).run(
		recipe.name || 'Neues Rezept',
		recipe.description || '',
		recipe.cuisine || 'Sonstiges',
		recipe.cost_estimate || 0,
		recipe.prep_time || 0,
		recipe.difficulty || 'Einfach',
		imageUrl,
		JSON.stringify(recipe.ingredients || []),
		JSON.stringify(recipe.steps || []),
		JSON.stringify(recipe.shopping_tags || []),
		'',
		rawInput,
		recipe.servings || 2
	);

	const id = Number(result.lastInsertRowid);

	return json({
		id,
		name: recipe.name,
		status: 'approved',
		ai_parsed: !!provider && !!recipe.ingredients
	});
};
