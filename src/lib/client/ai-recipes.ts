export interface AIProviderConfig {
	id: string;
	baseUrl: string;
	model: string;
	apiKey: string;
}

export interface GenerateOptions {
	count: number;
	pantryBased: number;
	pantryItems: string[];
	cuisinePrefs: Record<string, boolean>;
	recipeNotes: string;
	servings: number;
	healthConditions?: string[];
	onProgress?: (current: number, total: number, recipe?: any) => void;
}

// Region ID → cuisine examples for AI prompt
const regionCuisines: Record<string, string> = {
	nordeuropaeisch: 'Deutsch, Skandinavisch, Britisch, Niederländisch',
	suedeuropaeisch: 'Italienisch, Griechisch, Spanisch, Französisch, Portugiesisch',
	osteuropaeisch: 'Polnisch, Ungarisch, Russisch, Balkan, Tschechisch',
	asiatisch: 'Japanisch, Thailändisch, Vietnamesisch, Koreanisch, Chinesisch, Indisch, Indonesisch',
	orientalisch: 'Türkisch, Arabisch, Persisch, Libanesisch, Marokkanisch, Äthiopisch',
	nordamerikanisch: 'US-Amerikanisch, Mexikanisch, Cajun/Kreolisch',
	suedamerikanisch: 'Brasilianisch, Peruanisch, Argentinisch, Karibisch',
	fusion: 'Fusion, Street Food, Modern, Crossover',
};

// Health condition labels for AI prompt
const healthLabels: Record<string, string> = {
	diabetes_typ1: 'Diabetes Typ 1 (wenig schnelle Kohlenhydrate, kein Zucker)',
	diabetes_typ2: 'Diabetes Typ 2 (kohlenhydratarm, kein Zucker, Vollkorn bevorzugen)',
	laktoseintoleranz: 'Laktoseintoleranz (keine Milchprodukte oder nur laktosefreie)',
	glutenunvertraeglichkeit: 'Glutenunverträglichkeit/Zöliakie (kein Weizen, Roggen, Gerste, Dinkel)',
	fruktoseintoleranz: 'Fruktoseintoleranz (wenig Obst, kein Honig, kein Agavendicksaft)',
	histaminintoleranz: 'Histaminintoleranz (keine gereiften Lebensmittel, kein Alkohol, keine Tomaten)',
	nussallergie: 'Nussallergie (keine Nüsse, kein Erdnussöl, keine Mandeln)',
	sojaallergie: 'Sojaallergie (keine Sojaprodukte, kein Tofu, keine Sojasauce)',
	fischallergie: 'Fisch-/Meeresfrüchte-Allergie (kein Fisch, keine Garnelen, keine Fischsauce)',
	eiallergie: 'Eiallergie (keine Eier in jeglicher Form)',
	bluthochdruck: 'Bluthochdruck (salzarm kochen, keine stark gesalzenen Zutaten)',
	gicht: 'Gicht (purinarm, kein Innereien, wenig Fleisch, kein Alkohol)',
	nierenerkrankung: 'Nierenerkrankung (kaliumarm, phosphatarm, eiweißreduziert)',
	reizdarmsyndrom: 'Reizdarmsyndrom/FODMAP (keine Zwiebeln, kein Knoblauch, kein Weizen, wenig Hülsenfrüchte)',
	cholesterin: 'Hoher Cholesterinspiegel (wenig gesättigte Fette, keine Butter, fettarmes Fleisch)',
	schwangerschaft: 'Schwangerschaft (kein Rohmilchkäse, kein rohes Fleisch/Fisch, keine Leber)'
};

async function callAI(provider: AIProviderConfig, prompt: string): Promise<string> {
	if (provider.id === 'anthropic') {
		const res = await fetch(provider.baseUrl + '/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': provider.apiKey,
				'anthropic-version': '2023-06-01',
				'anthropic-dangerous-direct-browser-access': 'true'
			},
			body: JSON.stringify({
				model: provider.model,
				max_tokens: 2048,
				messages: [{ role: 'user', content: prompt }]
			})
		});
		if (!res.ok) throw new Error(`AI Error ${res.status}: ${await res.text()}`);
		const data = await res.json();
		return data.content[0].text;
	} else {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (provider.apiKey) headers['Authorization'] = `Bearer ${provider.apiKey}`;

		const res = await fetch(provider.baseUrl + '/chat/completions', {
			method: 'POST',
			headers,
			body: JSON.stringify({
				model: provider.model,
				max_tokens: 2048,
				messages: [{ role: 'user', content: prompt }]
			})
		});
		if (!res.ok) throw new Error(`AI Error ${res.status}: ${await res.text()}`);
		const data = await res.json();
		return data.choices[0].message.content;
	}
}

function parseRecipeJSON(content: string): any {
	// Try object first, then array
	const objMatch = content.match(/\{[\s\S]*\}/);
	if (!objMatch) throw new Error('Kein JSON gefunden');
	return JSON.parse(objMatch[0]);
}

export async function generateRecipes(
	opts: GenerateOptions,
	provider: AIProviderConfig
): Promise<any[]> {
	const pantryList = opts.pantryItems.length > 0 ? opts.pantryItems.join(', ') : 'keine Vorräte';

	// Build enabled regions list
	const enabledRegions = Object.entries(opts.cuisinePrefs)
		.filter(([, v]) => v)
		.map(([k]) => regionCuisines[k] ?? k)
		.flat();
	const cuisineInstruction = enabledRegions.length > 0
		? `Erlaubte Küchen: ${enabledRegions.join(', ')}. Wähle ZUFÄLLIG aus diesen Küchen — variiere stark und wiederhole keine Küche.`
		: 'Wähle aus ALLEN internationalen Küchen zufällig.';

	const healthConstraints = (opts.healthConditions ?? [])
		.map(id => healthLabels[id])
		.filter(Boolean);

	const healthSection = healthConstraints.length > 0
		? `\nWICHTIG – Gesundheitliche Einschränkungen (MUSS beachtet werden!):\n${healthConstraints.map(c => `- ${c}`).join('\n')}\nVerwende KEINE verbotenen Zutaten.`
		: '';

	const previousNames: string[] = [];
	const recipes: any[] = [];

	for (let i = 0; i < opts.count; i++) {
		const isPantryRecipe = i < opts.pantryBased && opts.pantryItems.length > 0;

		opts.onProgress?.(i + 1, opts.count);

		const pantryInstruction = isPantryRecipe
			? `Dieses Rezept MUSS möglichst viele dieser Vorräte verwenden: ${pantryList}. Setze pantry_based: true.`
			: `Vorräte (optional nutzen): ${pantryList}. Setze pantry_based: false.`;

		const avoidSection = previousNames.length > 0
			? `\nVermeide Ähnlichkeit zu bereits generierten Rezepten: ${previousNames.join(', ')}.`
			: '';

		const prompt = `Generiere EIN Rezept als JSON-Objekt.

WICHTIG: Sei KREATIV und ÜBERRASCHEND. Wähle ein Gericht das der User wahrscheinlich noch nicht oft gekocht hat. Keine Standardgerichte wie Spaghetti Bolognese oder Schnitzel.

${pantryInstruction}
${cuisineInstruction}
Wünsche: ${opts.recipeNotes || 'Abwechslung und Überraschung'}
Portionen: ${opts.servings}${healthSection}${avoidSection}

JSON-Format:
{
  "name": "Rezeptname",
  "description": "1-2 Sätze Beschreibung",
  "cuisine": "z.B. Thailändisch",
  "cost_estimate": 8.50,
  "prep_time": 25,
  "difficulty": "Einfach",
  "servings": ${opts.servings},
  "pantry_based": ${isPantryRecipe},
  "ingredients": [{"name": "Zutat", "amount": "200g", "store": "Discounter", "estimated_price": 1.50}],
  "steps": ["Schritt 1", "Schritt 2"]
}

Store-Werte: "Discounter", "Supermarkt", "Gemüsehändler", "Asia-Laden", "Theke"
Antworte NUR mit dem JSON-Objekt, kein anderer Text.`;

		try {
			const content = await callAI(provider, prompt);
			const recipe = parseRecipeJSON(content);
			recipes.push(recipe);
			previousNames.push(recipe.name);
			opts.onProgress?.(i + 1, opts.count, recipe);
		} catch (e: any) {
			console.warn(`Rezept ${i + 1} fehlgeschlagen:`, e.message);
			// Continue with remaining recipes
		}
	}

	if (recipes.length === 0) {
		throw new Error('Keine Rezepte generiert. Bitte KI-Einstellungen prüfen.');
	}

	return recipes;
}
