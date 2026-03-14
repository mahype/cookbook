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

	const prompt = `Generiere ${opts.count} Rezepte als JSON-Array. ${opts.pantryBased} davon sollen möglichst viele dieser Vorräte verwenden: ${pantryList}.

Bevorzugte Küchen: ${favCuisines}
Wünsche: ${opts.recipeNotes || 'Abwechslung'}
Portionen: ${opts.servings}

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
				max_tokens: 4096,
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
				max_tokens: 4096,
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
	return JSON.parse(jsonMatch[0]);
}
