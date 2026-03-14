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
	cuisinePrefs: Record<string, number>;
	recipeNotes: string;
	servings: number;
	healthConditions?: string[];
}

export async function generateRecipes(
	opts: GenerateOptions,
	provider: AIProviderConfig
): Promise<any[]> {
	const pantryList = opts.pantryItems.length > 0 ? opts.pantryItems.join(', ') : 'keine Vorräte';

	const favCuisines =
		Object.entries(opts.cuisinePrefs)
			.filter(([, v]) => v >= 2)
			.map(([k]) => k)
			.join(', ') || 'international';

	// Map health condition IDs to human-readable constraints
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

	const healthConstraints = (opts.healthConditions ?? [])
		.map(id => healthLabels[id])
		.filter(Boolean);

	const healthSection = healthConstraints.length > 0
		? `\n\nWICHTIG – Gesundheitliche Einschränkungen (MUSS beachtet werden!):\n${healthConstraints.map(c => `- ${c}`).join('\n')}\nAlle Rezepte MÜSSEN diese Einschränkungen berücksichtigen. Verwende KEINE verbotenen Zutaten.`
		: '';

	const prompt = `Generiere ${opts.count} Rezepte als JSON-Array. ${opts.pantryBased} davon sollen möglichst viele dieser Vorräte verwenden: ${pantryList}.

Bevorzugte Küchen: ${favCuisines}
Wünsche: ${opts.recipeNotes || 'Abwechslung'}
Portionen: ${opts.servings}${healthSection}

Jedes Rezept als JSON-Objekt mit:
- name: string
- description: string (1-2 Sätze)
- cuisine: string (z.B. "Thailändisch", "Japanisch")
- cost_estimate: number (geschätzte Kosten in EUR für alle Portionen)
- prep_time: number (Minuten)
- difficulty: "Einfach" oder "Mittel"
- servings: number
- pantry_based: boolean (true wenn Vorrats-Rezept)
- ingredients: Array von {name, amount, store: "Discounter"|"Supermarkt"|"Gemüsehändler"|"Asia-Laden"|"Theke", estimated_price: number}
- steps: string[] (Zubereitungsschritte)

Antworte NUR mit dem JSON-Array, kein anderer Text.`;

	let content: string;

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
				max_tokens: 8192,
				messages: [{ role: 'user', content: prompt }]
			})
		});
		if (!res.ok) throw new Error(`AI Error ${res.status}: ${await res.text()}`);
		const data = await res.json();
		content = data.content[0].text;
	} else {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (provider.apiKey) headers['Authorization'] = `Bearer ${provider.apiKey}`;

		const res = await fetch(provider.baseUrl + '/chat/completions', {
			method: 'POST',
			headers,
			body: JSON.stringify({
				model: provider.model,
				max_tokens: 8192,
				messages: [{ role: 'user', content: prompt }]
			})
		});
		if (!res.ok) throw new Error(`AI Error ${res.status}: ${await res.text()}`);
		const data = await res.json();
		content = data.choices[0].message.content;
	}

	// Parse JSON from response (handle markdown code blocks)
	const jsonMatch = content.match(/\[[\s\S]*\]/);
	if (!jsonMatch) throw new Error('KI hat kein gültiges JSON geliefert');

	try {
		return JSON.parse(jsonMatch[0]);
	} catch {
		// Try to repair truncated JSON: close open strings/objects/arrays
		let fixed = jsonMatch[0];
		// Count open brackets
		const openBrackets = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
		const openBraces = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length;
		// Close unterminated string
		const quoteCount = (fixed.match(/"/g) || []).length;
		if (quoteCount % 2 !== 0) fixed += '"';
		// Close open braces and brackets
		for (let i = 0; i < openBraces; i++) fixed += '}';
		for (let i = 0; i < openBrackets; i++) fixed += ']';
		try {
			const parsed = JSON.parse(fixed);
			// Return only complete recipes (ones that have at least name + ingredients)
			return Array.isArray(parsed) ? parsed.filter((r: any) => r.name && r.ingredients) : parsed;
		} catch {
			throw new Error('KI-Antwort war unvollständig. Bitte nochmal versuchen.');
		}
	}
}
