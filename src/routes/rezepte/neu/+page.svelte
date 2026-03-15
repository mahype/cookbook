<script lang="ts">
	import { goto } from '$app/navigation';
	import { isCapacitor } from '$lib/stores/data';

	let editorEl = $state<HTMLDivElement | null>(null);
	let imageFiles = $state<File[]>([]);
	let submitting = $state(false);
	let error = $state('');

	// --- URL Import ---
	let urlInput = $state('');
	let urlLoading = $state(false);
	let urlError = $state('');

	async function importFromUrl() {
		if (!urlInput.trim()) return;
		urlLoading = true;
		urlError = '';
		error = '';

		try {
			// Load AI provider config
			let aiProvider: any;
			if (isCapacitor()) {
				const { loadPreferences } = await import('$lib/stores/data');
				const prefs = await loadPreferences();
				aiProvider = prefs.aiProvider;
			} else {
				const res = await fetch('/api/einstellungen');
				if (res.ok) {
					const prefs = await res.json();
					aiProvider = typeof prefs.aiProvider === 'string' ? JSON.parse(prefs.aiProvider) : prefs.aiProvider;
				}
			}

			if (!aiProvider?.apiKey) {
				urlError = 'Bitte zuerst KI-Einstellungen konfigurieren.';
				return;
			}

			// Fetch the URL content via a CORS proxy or directly
			let pageContent: string;
			try {
				// Try fetching through our API (server-side, no CORS issues)
				if (!isCapacitor()) {
					const res = await fetch('/api/rezepte/fetch-url', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ url: urlInput.trim() })
					});
					if (res.ok) {
						const data = await res.json();
						pageContent = data.content;
					} else {
						throw new Error('Server fetch failed');
					}
				} else {
					// In Capacitor, try a public CORS proxy
					const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(urlInput.trim())}`;
					const res = await fetch(proxyUrl);
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					pageContent = await res.text();
				}
			} catch {
				urlError = 'Seite konnte nicht geladen werden. Probiere es mit Copy & Paste.';
				return;
			}

			// Extract text content (strip HTML tags, keep structure)
			const doc = new DOMParser().parseFromString(pageContent, 'text/html');

			// Try to find recipe image
			let imageUrl = '';
			const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
			const schemaImage = pageContent.match(/"image"\s*:\s*"(https?:\/\/[^"]+)"/)?.[1];
			imageUrl = ogImage || schemaImage || '';

			// Try to extract structured recipe data (JSON-LD)
			let recipeJsonLd = '';
			const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
			for (const script of scripts) {
				try {
					const json = JSON.parse(script.textContent || '');
					const findRecipe = (obj: any): any => {
						if (obj?.['@type'] === 'Recipe') return obj;
						if (Array.isArray(obj)) for (const item of obj) { const r = findRecipe(item); if (r) return r; }
						if (obj?.['@graph']) return findRecipe(obj['@graph']);
						return null;
					};
					const recipe = findRecipe(json);
					if (recipe) {
						recipeJsonLd = JSON.stringify(recipe, null, 2);
						if (recipe.image) {
							const img = Array.isArray(recipe.image) ? recipe.image[0] : recipe.image;
							imageUrl = typeof img === 'string' ? img : img?.url || imageUrl;
						}
						break;
					}
				} catch {}
			}

			// Get text content for AI
			// Remove scripts, styles, nav, footer
			['script', 'style', 'nav', 'footer', 'header', 'aside'].forEach(tag => {
				doc.querySelectorAll(tag).forEach(el => el.remove());
			});
			const textContent = (doc.body?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 8000);

			// Use AI to parse the recipe
			const prompt = `Extrahiere das Rezept von dieser Webseite und gib es als JSON zurück.

${recipeJsonLd ? `Strukturierte Daten (JSON-LD) gefunden:\n${recipeJsonLd.slice(0, 3000)}\n\n` : ''}Seitentext:
${textContent.slice(0, 5000)}

Quelle: ${urlInput.trim()}

Gib das Rezept als JSON-Objekt zurück:
{
  "name": "Rezeptname",
  "description": "1-2 Sätze Beschreibung",
  "cuisine": "z.B. Italienisch",
  "cost_estimate": 8.50,
  "prep_time": 25,
  "difficulty": "Einfach",
  "servings": 4,
  "pantry_based": false,
  "tags": ["fix & fertig", "gemüselastig"],
  "ingredients": [{"name": "Zutat", "amount": "200g", "store": "Supermarkt", "estimated_price": 1.50}],
  "steps": ["Schritt 1", "Schritt 2"]
}

Regeln:
- Alle Zutaten mit realistischen Preisen für deutsche Supermärkte schätzen
- Store-Werte: "Discounter", "Supermarkt", "Gemüsehändler", "Asia-Laden", "Theke"
- cost_estimate = Summe aller Zutaten-Preise
- prep_time in Minuten
- Schritte auf Deutsch, klar und knapp
- Tags aus dieser Liste vergeben: "fix & fertig" (≤20 Min), "blitzschnell" (≤10 Min), "gemüselastig", "proteinreich", "leichte Küche" (kalorienarm), "low carb", "kindertauglich", "vegetarisch", "vegan", "meal prep", "one pot", "günstig" (unter 6€), "besonderer Anlass"
- Antworte NUR mit dem JSON-Objekt`;

			let content: string;
			if (aiProvider.id === 'anthropic') {
				const res = await fetch(aiProvider.baseUrl + '/messages', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': aiProvider.apiKey,
						'anthropic-version': '2023-06-01',
						'anthropic-dangerous-direct-browser-access': 'true'
					},
					body: JSON.stringify({ model: aiProvider.model, max_tokens: 2048, messages: [{ role: 'user', content: prompt }] })
				});
				if (!res.ok) throw new Error(`AI Error ${res.status}`);
				const data = await res.json();
				content = data.content[0].text;
			} else {
				const headers: Record<string, string> = { 'Content-Type': 'application/json' };
				if (aiProvider.apiKey) headers['Authorization'] = `Bearer ${aiProvider.apiKey}`;
				const res = await fetch(aiProvider.baseUrl + '/chat/completions', {
					method: 'POST',
					headers,
					body: JSON.stringify({ model: aiProvider.model, max_tokens: 2048, messages: [{ role: 'user', content: prompt }] })
				});
				if (!res.ok) throw new Error(`AI Error ${res.status}`);
				const data = await res.json();
				content = data.choices[0].message.content;
			}

			// Parse JSON from AI response
			const jsonMatch = content.match(/\{[\s\S]*\}/);
			if (!jsonMatch) throw new Error('Kein Rezept in der KI-Antwort gefunden');
			const recipe = JSON.parse(jsonMatch[0]);

			// Save recipe
			if (isCapacitor()) {
				const db = await import('$lib/client/db');
				const id = await db.insertRecipe({
					name: recipe.name,
					description: recipe.description,
					cuisine: recipe.cuisine,
					cost_estimate: recipe.cost_estimate,
					prep_time: recipe.prep_time,
					difficulty: recipe.difficulty,
					image_url: imageUrl,
					ingredients: recipe.ingredients,
					steps: recipe.steps,
					shopping_tags: recipe.tags ?? [],
					status: 'approved',
					pantry_based: recipe.pantry_based ? 1 : 0,
					servings: recipe.servings,
					raw_input: urlInput.trim()
				});
				await db.forceSave();
				goto(`/rezepte/${id}`);
			} else {
				const res = await fetch('/api/rezepte/parse', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						text: JSON.stringify(recipe),
						html: '',
						images: [],
						image_url: imageUrl,
						source_url: urlInput.trim()
					})
				});
				if (res.ok) {
					const data = await res.json();
					goto(`/rezepte/${data.id}`);
				} else {
					throw new Error('Speichern fehlgeschlagen');
				}
			}
		} catch (e: any) {
			urlError = e.message || 'Fehler beim Importieren';
		} finally {
			urlLoading = false;
		}
	}

	// --- Paste/Text input ---
	function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items) return;

		for (const item of items) {
			if (item.type.startsWith('image/')) {
				e.preventDefault();
				const file = item.getAsFile();
				if (file) insertImage(file);
				return;
			}
		}
	}

	function insertImage(file: File) {
		imageFiles = [...imageFiles, file];
		const url = URL.createObjectURL(file);
		const img = document.createElement('img');
		img.src = url;
		img.className = 'max-w-full rounded-xl my-3';
		img.dataset.imageIndex = String(imageFiles.length - 1);
		editorEl?.appendChild(img);
		editorEl?.appendChild(document.createElement('br'));
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = input.files;
		if (!files) return;
		for (const file of files) {
			if (file.type.startsWith('image/')) {
				insertImage(file);
			}
		}
		input.value = '';
	}

	async function fileToBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}

	async function submit() {
		if (!editorEl) return;
		const html = editorEl.innerHTML.trim();
		const text = editorEl.innerText.trim();

		if (!text && imageFiles.length === 0) {
			error = 'Bitte füge mindestens Text oder ein Bild ein.';
			return;
		}

		submitting = true;
		error = '';

		try {
			const images = await Promise.all(imageFiles.map(fileToBase64));

			const res = await fetch('/api/rezepte/parse', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ html, text, images })
			});

			if (!res.ok) {
				const data = await res.json();
				error = data.error || 'Fehler beim Verarbeiten';
				return;
			}

			const data = await res.json();
			goto(`/rezepte/${data.id}`);
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="max-w-lg mx-auto px-4 pt-6 pb-24">
	<h1 class="text-2xl font-bold text-warm-900 mb-1">Rezept hinzufügen</h1>
	<p class="text-sm text-warm-500 mb-6">Importiere per URL, Text oder Bild.</p>

	<!-- URL Import -->
	<div class="bg-white rounded-2xl border border-warm-100 shadow-sm p-4 mb-4">
		<label class="text-sm font-semibold text-warm-700 mb-2 block">Von URL importieren</label>
		<div class="flex gap-2">
			<input
				type="url"
				bind:value={urlInput}
				placeholder="https://chefkoch.de/rezept/..."
				class="flex-1 px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
				onkeydown={(e) => e.key === 'Enter' && importFromUrl()}
			/>
			<button
				onclick={importFromUrl}
				disabled={urlLoading || !urlInput.trim()}
				class="px-4 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 disabled:opacity-40 transition-colors min-w-[80px] flex items-center justify-center"
			>
				{#if urlLoading}
					<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
					</svg>
				{:else}
					Import
				{/if}
			</button>
		</div>
		{#if urlError}
			<p class="text-sm text-red-600 mt-2">{urlError}</p>
		{/if}
		{#if urlLoading}
			<p class="text-sm text-orange-600 mt-2">Seite wird geladen und analysiert...</p>
		{/if}
	</div>

	<!-- Divider -->
	<div class="flex items-center gap-3 my-4">
		<div class="flex-1 border-t border-warm-200"></div>
		<span class="text-xs text-warm-400 font-medium">ODER</span>
		<div class="flex-1 border-t border-warm-200"></div>
	</div>

	<!-- Rich text editor -->
	<label class="text-sm font-semibold text-warm-700 mb-2 block">Per Text / Copy & Paste</label>
	<div class="relative">
		<div
			bind:this={editorEl}
			contenteditable="true"
			role="textbox"
			aria-multiline="true"
			onpaste={handlePaste}
			class="min-h-[200px] w-full rounded-2xl border-2 border-warm-200 bg-white px-4 py-4 text-sm text-warm-800 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 focus:outline-none overflow-y-auto"
			data-placeholder="Rezept hier einfügen – Text, Bilder, oder beides..."
		></div>
	</div>

	<!-- Image upload button -->
	<label
		class="mt-3 flex items-center gap-2 justify-center w-full py-2.5 rounded-xl border-2 border-dashed border-warm-300 text-warm-500 hover:border-orange-400 hover:text-orange-600 cursor-pointer transition-colors"
	>
		<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
			<rect x="3" y="3" width="18" height="18" rx="2" />
			<circle cx="8.5" cy="8.5" r="1.5" />
			<path d="m21 15-5-5L5 21" />
		</svg>
		<span class="text-sm font-medium">Bild hinzufügen</span>
		<input type="file" accept="image/*" multiple class="hidden" onchange={handleFileSelect} />
	</label>

	{#if error}
		<div class="mt-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</div>
	{/if}

	<!-- Submit -->
	<button
		onclick={submit}
		disabled={submitting}
		class="mt-6 w-full bg-orange-500 hover:bg-orange-600 disabled:bg-warm-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
	>
		{#if submitting}
			<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
			</svg>
			Wird verarbeitet...
		{:else}
			Rezept verarbeiten
		{/if}
	</button>
</div>

<style>
	[data-placeholder]:empty::before {
		content: attr(data-placeholder);
		color: #b8a89a;
		pointer-events: none;
	}

	[contenteditable] :global(img) {
		max-width: 100%;
		border-radius: 0.75rem;
		margin: 0.75rem 0;
	}
</style>
