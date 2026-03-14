<script lang="ts">
	import { onMount } from 'svelte';
	import { isCapacitor, loadPreferences, savePreference } from '$lib/stores/data';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	onMount(async () => {
		if (isCapacitor()) {
			const prefs = await loadPreferences();
			ratings = { ...prefs.cuisinePreferences };
			recipeNotes = prefs.recipeNotes;
			defaultServings = prefs.defaultServings;
			if (prefs.aiProvider) {
				aiProviderId = prefs.aiProvider.id ?? '';
				aiApiKey = prefs.aiProvider.apiKey ?? '';
				aiModel = prefs.aiProvider.model ?? '';
				aiBaseUrl = prefs.aiProvider.baseUrl ?? '';
			}
		}
	});

	const cuisineCategories = [
		{
			name: 'Asiatisch',
			cuisines: ['Chinesisch', 'Japanisch', 'Koreanisch', 'Thailändisch', 'Vietnamesisch', 'Indisch', 'Indonesisch', 'Malaysisch', 'Philippinisch', 'Sri-Lankisch']
		},
		{
			name: 'Europäisch',
			cuisines: ['Deutsch', 'Italienisch', 'Französisch', 'Griechisch', 'Spanisch', 'Portugiesisch', 'Britisch', 'Skandinavisch', 'Osteuropäisch', 'Balkan']
		},
		{
			name: 'Orient & Afrika',
			cuisines: ['Arabisch/Orientalisch', 'Türkisch', 'Persisch', 'Libanesisch', 'Marokkanisch', 'Äthiopisch', 'Westafrikanisch']
		},
		{
			name: 'Amerika',
			cuisines: ['Amerikanisch', 'Mexikanisch', 'Brasilianisch', 'Peruanisch', 'Karibisch', 'Cajun/Kreolisch']
		},
		{
			name: 'Sonstige',
			cuisines: ['Australisch', 'Fusion', 'Vegetarisch/Vegan', 'Street Food']
		}
	];

	let ratings = $state<Record<string, number>>({ ...(data.cuisinePreferences ?? {}) });

	// Track which categories are expanded — all collapsed by default
	let expanded = $state<Set<string>>(new Set());

	function toggleCategory(name: string) {
		const next = new Set(expanded);
		if (next.has(name)) {
			next.delete(name);
		} else {
			next.add(name);
		}
		expanded = next;
	}

	function activeCount(cuisines: string[]): number {
		return cuisines.filter(c => (ratings[c] ?? 0) > 0).length;
	}

	let defaultServings = $state(data.defaultServings ?? 2);
	let recipeNotes = $state(data.recipeNotes ?? '');
	let cuisineState: 'idle' | 'loading' | 'success' | 'error' = $state('idle');
	let notesState: 'idle' | 'loading' | 'success' | 'error' = $state('idle');

	type ButtonState = 'idle' | 'loading' | 'success' | 'error';
	function resetAfterDelay(setter: (s: ButtonState) => void) {
		setTimeout(() => setter('idle'), 1500);
	}

	function setRating(cuisine: string, star: number) {
		const current = ratings[cuisine] ?? 0;
		if (current === star) {
			// Tap same star again → deselect
			ratings = { ...ratings, [cuisine]: 0 };
		} else {
			ratings = { ...ratings, [cuisine]: star };
		}
		save();
	}

	async function save() {
		cuisineState = 'loading';
		try {
			const prefs: Record<string, number> = {};
			for (const [k, v] of Object.entries(ratings)) {
				if (v > 0) prefs[k] = v;
			}
			if (isCapacitor()) {
				await savePreference('cuisinePreferences', JSON.stringify(prefs));
			} else {
				const res = await fetch('/api/einstellungen', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ cuisine_preferences: prefs })
				});
				if (!res.ok) { cuisineState = 'error'; resetAfterDelay(s => cuisineState = s); return; }
			}
			cuisineState = 'success';
		} catch {
			cuisineState = 'error';
		}
		resetAfterDelay(s => cuisineState = s);
	}

	async function saveNotes() {
		notesState = 'loading';
		try {
			if (isCapacitor()) {
				await savePreference('recipeNotes', recipeNotes);
			} else {
				const res = await fetch('/api/einstellungen', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ recipe_notes: recipeNotes })
				});
				if (!res.ok) { notesState = 'error'; resetAfterDelay(s => notesState = s); return; }
			}
			notesState = 'success';
		} catch {
			notesState = 'error';
		}
		resetAfterDelay(s => notesState = s);
	}

	async function saveServings(value: number) {
		try {
			if (isCapacitor()) {
				await savePreference('defaultServings', String(value));
			} else {
				await fetch('/api/einstellungen', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ default_servings: value })
				});
			}
		} catch {}
	}

	function adjustServings(delta: number) {
		const next = Math.min(12, Math.max(1, defaultServings + delta));
		if (next !== defaultServings) {
			defaultServings = next;
			saveServings(next);
		}
	}

	function totalActive(): number {
		return Object.values(ratings).filter(v => v > 0).length;
	}

	// --- AI Provider ---
	const providerList = [
		{ id: 'openai', name: 'OpenAI', defaultUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' },
		{ id: 'anthropic', name: 'Anthropic', defaultUrl: 'https://api.anthropic.com/v1', defaultModel: 'claude-sonnet-4-20250514' },
		{ id: 'mistral', name: 'Mistral', defaultUrl: 'https://api.mistral.ai/v1', defaultModel: 'mistral-small-latest' },
		{ id: 'openrouter', name: 'OpenRouter', defaultUrl: 'https://openrouter.ai/api/v1', defaultModel: 'auto' },
		{ id: 'ollama', name: 'Ollama', defaultUrl: 'http://localhost:11434/v1', defaultModel: 'llama3.2' },
		{ id: 'custom', name: 'Custom', defaultUrl: '', defaultModel: '' }
	];

	let aiProviderId = $state<string>(data.aiProvider?.id ?? '');
	let aiApiKey = $state(data.aiProvider?.apiKey ?? '');
	let aiModel = $state(data.aiProvider?.model ?? '');
	let aiBaseUrl = $state(data.aiProvider?.baseUrl ?? '');
	let showApiKey = $state(false);
	let showAdvanced = $state(false);
	let aiTestState: ButtonState = $state('idle');
	let aiTestResult = $state<{ success: boolean; error?: string; model?: string } | null>(null);
	let aiSaveState: ButtonState = $state('idle');

	function selectProvider(id: string) {
		const p = providerList.find(p => p.id === id);
		if (!p) return;
		aiProviderId = id;
		aiBaseUrl = p.defaultUrl;
		aiModel = p.defaultModel;
		aiApiKey = id === aiProviderId ? aiApiKey : '';
		aiTestResult = null;
	}

	async function saveAI() {
		if (!aiProviderId) return;
		aiSaveState = 'loading';
		try {
			const aiProvider = {
				id: aiProviderId,
				name: providerList.find(p => p.id === aiProviderId)?.name ?? aiProviderId,
				baseUrl: aiBaseUrl,
				model: aiModel,
				apiKey: aiApiKey
			};
			if (isCapacitor()) {
				await savePreference('aiProvider', JSON.stringify(aiProvider));
			} else {
				await fetch('/api/einstellungen', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ ai_provider: aiProvider })
				});
			}
			aiSaveState = 'success';
		} catch {
			aiSaveState = 'error';
		}
		resetAfterDelay(s => aiSaveState = s);
	}

	async function testAI() {
		aiTestState = 'loading';
		aiTestResult = null;
		try {
			if (isCapacitor()) {
				aiTestResult = await testAIDirect();
			} else {
				const res = await fetch('/api/ai/test', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						provider: {
							id: aiProviderId,
							name: providerList.find(p => p.id === aiProviderId)?.name ?? '',
							baseUrl: aiBaseUrl,
							model: aiModel,
							apiKey: aiApiKey
						}
					})
				});
				aiTestResult = await res.json();
			}
			aiTestState = aiTestResult?.success ? 'success' : 'error';
		} catch {
			aiTestResult = { success: false, error: 'Netzwerkfehler' };
			aiTestState = 'error';
		}
		resetAfterDelay(s => aiTestState = s);
	}

	async function testAIDirect(): Promise<{ success: boolean; error?: string; model?: string }> {
		if (!aiProviderId || !aiBaseUrl || !aiModel) {
			return { success: false, error: 'Unvollständige Konfiguration' };
		}
		try {
			if (aiProviderId === 'anthropic') {
				const res = await fetch(`${aiBaseUrl}/messages`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': aiApiKey,
						'anthropic-version': '2023-06-01'
					},
					body: JSON.stringify({
						model: aiModel,
						max_tokens: 32,
						messages: [{ role: 'user', content: 'Antworte mit OK' }]
					})
				});
				if (!res.ok) {
					const err = await res.text();
					return { success: false, error: `API-Fehler ${res.status}: ${err}` };
				}
				const data = await res.json();
				return { success: true, model: data.model ?? aiModel };
			} else {
				const headers: Record<string, string> = { 'Content-Type': 'application/json' };
				if (aiApiKey) headers['Authorization'] = `Bearer ${aiApiKey}`;
				const res = await fetch(`${aiBaseUrl}/chat/completions`, {
					method: 'POST',
					headers,
					body: JSON.stringify({
						model: aiModel,
						max_tokens: 32,
						messages: [{ role: 'user', content: 'Antworte mit OK' }]
					})
				});
				if (!res.ok) {
					const err = await res.text();
					return { success: false, error: `API-Fehler ${res.status}: ${err}` };
				}
				const data = await res.json();
				return { success: true, model: data.model ?? aiModel };
			}
		} catch (e) {
			return { success: false, error: e instanceof Error ? e.message : 'Unbekannter Fehler' };
		}
	}
</script>

<div class="max-w-lg mx-auto px-4 pt-6">
	<h1 class="text-2xl font-bold text-warm-900 mb-2 flex items-center gap-2"><svg class="w-6 h-6 text-warm-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> Einstellungen</h1>
	<p class="text-sm text-warm-500 mb-6">
		Bewerte deine bevorzugten Küchen – deine Rezeptvorschläge werden entsprechend gewichtet.
	</p>

	<!-- Default Servings -->
	<div class="bg-white rounded-2xl shadow-sm border border-warm-100 overflow-hidden mb-6">
		<div class="px-5 py-4">
			<h2 class="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-1">Standard-Portionen</h2>
			<p class="text-xs text-warm-400 mb-4">Für wie viele Personen kochst du normalerweise?</p>
			<div class="flex items-center justify-center gap-4">
				<button
					onclick={() => adjustServings(-1)}
					disabled={defaultServings <= 1}
					class="w-11 h-11 rounded-full bg-spice-100 text-spice-700 flex items-center justify-center text-2xl font-bold hover:bg-spice-200 active:bg-spice-300 transition-colors disabled:opacity-30"
				>−</button>
				<span class="text-3xl font-bold text-warm-800 w-10 text-center">{defaultServings}</span>
				<button
					onclick={() => adjustServings(1)}
					disabled={defaultServings >= 12}
					class="w-11 h-11 rounded-full bg-spice-100 text-spice-700 flex items-center justify-center text-2xl font-bold hover:bg-spice-200 active:bg-spice-300 transition-colors disabled:opacity-30"
				>+</button>
			</div>
		</div>
	</div>

	<!-- AI Provider Settings -->
	<div class="bg-white rounded-2xl shadow-sm border border-warm-100 overflow-hidden mb-6">
		<div class="px-5 py-4">
			<h2 class="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-1">KI-Einstellungen</h2>
			<p class="text-xs text-warm-400 mb-4">Wähle deinen KI-Anbieter für Rezeptvorschläge und -verarbeitung.</p>

			<!-- Provider buttons -->
			<div class="grid grid-cols-3 gap-2 mb-4">
				{#each providerList as p}
					<button
						onclick={() => selectProvider(p.id)}
						class="py-2.5 px-3 rounded-xl text-sm font-medium transition-colors {aiProviderId === p.id ? 'bg-spice-500 text-white' : 'bg-warm-100 text-warm-600 hover:bg-warm-200'}"
					>{p.name}</button>
				{/each}
			</div>

			{#if aiProviderId}
				<!-- API Key -->
				{#if aiProviderId !== 'ollama'}
					<div class="mb-3">
						<label class="text-xs font-medium text-warm-500 block mb-1">API-Key</label>
						<div class="relative">
							<input
								type={showApiKey ? 'text' : 'password'}
								bind:value={aiApiKey}
								placeholder="sk-..."
								autocomplete="off"
								class="w-full rounded-xl border border-warm-200 bg-warm-50 px-4 py-2.5 text-sm text-warm-800 pr-10 focus:border-spice-400 focus:ring-2 focus:ring-spice-200 focus:outline-none"
							/>
							<button
								onclick={() => (showApiKey = !showApiKey)}
								class="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									{#if showApiKey}
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
									{:else}
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									{/if}
								</svg>
							</button>
						</div>
					</div>
				{:else}
					<p class="text-xs text-herb-600 bg-herb-50 px-3 py-2 rounded-xl mb-3">Kein API-Key nötig – Ollama läuft lokal.</p>
				{/if}

				<!-- Model -->
				<div class="mb-3">
					<label class="text-xs font-medium text-warm-500 block mb-1">Modell</label>
					<input
						type="text"
						bind:value={aiModel}
						placeholder="z.B. gpt-4o-mini"
						class="w-full rounded-xl border border-warm-200 bg-warm-50 px-4 py-2.5 text-sm text-warm-800 focus:border-spice-400 focus:ring-2 focus:ring-spice-200 focus:outline-none"
					/>
				</div>

				<!-- Advanced: Base URL -->
				<button onclick={() => (showAdvanced = !showAdvanced)} class="text-xs text-warm-400 hover:text-warm-600 mb-2 flex items-center gap-1">
					<svg class="w-3 h-3 transition-transform {showAdvanced ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
					Erweitert
				</button>
				{#if showAdvanced}
					<div class="mb-3">
						<label class="text-xs font-medium text-warm-500 block mb-1">Base-URL</label>
						<input
							type="text"
							bind:value={aiBaseUrl}
							placeholder="https://api.openai.com/v1"
							class="w-full rounded-xl border border-warm-200 bg-warm-50 px-4 py-2.5 text-sm text-warm-800 focus:border-spice-400 focus:ring-2 focus:ring-spice-200 focus:outline-none"
						/>
					</div>
				{/if}

				<!-- Action buttons -->
				<div class="flex gap-2 mt-4">
					<button
						onclick={testAI}
						disabled={aiTestState === 'loading'}
						class="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 min-w-[140px] flex items-center justify-center transition-colors disabled:opacity-50 {aiTestState === 'success' ? 'border-green-500 bg-green-50 text-green-600' : aiTestState === 'error' ? 'border-red-500 bg-red-50 text-red-600' : 'border-spice-500 text-spice-600 hover:bg-spice-50'}"
					>
						{#if aiTestState === 'loading'}
							<svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
						{:else if aiTestState === 'success'}
							<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
						{:else if aiTestState === 'error'}
							<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
						{:else}
							Verbindung testen
						{/if}
					</button>
					<button
						onclick={saveAI}
						disabled={aiSaveState === 'loading'}
						class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white min-w-[120px] flex items-center justify-center transition-colors disabled:opacity-50 {aiSaveState === 'success' ? 'bg-green-500' : aiSaveState === 'error' ? 'bg-red-500' : 'bg-spice-500 hover:bg-spice-600'}"
					>
						{#if aiSaveState === 'loading'}
							<svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
						{:else if aiSaveState === 'success'}
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
						{:else if aiSaveState === 'error'}
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
						{:else}
							Speichern
						{/if}
					</button>
				</div>

				<!-- Test result -->
				{#if aiTestResult}
					<div class="mt-3 text-sm px-3 py-2 rounded-xl {aiTestResult.success ? 'bg-herb-50 text-herb-700' : 'bg-red-50 text-red-700'}">
						{#if aiTestResult.success}
							✓ Verbindung OK{aiTestResult.model ? ` (${aiTestResult.model})` : ''}
						{:else}
							✗ {aiTestResult.error}
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	</div>

	<div class="bg-white rounded-2xl shadow-sm border border-warm-100 overflow-hidden">
		<div class="px-5 pt-4 pb-2">
			<h2 class="text-sm font-semibold text-warm-500 uppercase tracking-wide">
				Küchen-Präferenzen
			</h2>
			<p class="text-xs text-warm-400 mt-1">★ = ab und zu · ★★ = gerne · ★★★ = Favorit</p>
		</div>
		{#each cuisineCategories as category}
			{@const isExpanded = expanded.has(category.name)}
			{@const count = activeCount(category.cuisines)}
			<div class="border-t border-warm-100">
				<button
					onclick={() => toggleCategory(category.name)}
					class="w-full flex items-center justify-between px-5 py-3.5 hover:bg-warm-50 transition-colors active:bg-warm-100"
				>
					<div class="flex items-center gap-2">
						<span class="text-base font-semibold text-warm-800">{category.name}</span>
						{#if count > 0}
							<span class="text-xs font-medium text-spice-600 bg-spice-50 rounded-full px-2 py-0.5">{count} aktiv</span>
						{/if}
					</div>
					<svg
						class="w-5 h-5 text-warm-400 transition-transform duration-200 {isExpanded ? 'rotate-90' : ''}"
						fill="none" stroke="currentColor" viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
				{#if isExpanded}
					<ul>
						{#each category.cuisines as cuisine}
							{@const rating = ratings[cuisine] ?? 0}
							<li>
								<div class="flex items-center justify-between pl-10 pr-5 py-3 min-h-[48px]">
									<span class="text-sm font-medium text-warm-700">{cuisine}</span>
									<div class="flex gap-1">
										{#each [1, 2, 3] as star}
											<button
												onclick={() => setRating(cuisine, star)}
												class="p-0.5 transition-colors"
												aria-label="{cuisine} {star} Stern{star > 1 ? 'e' : ''}"
											>
												<svg class="w-7 h-7 {rating >= star ? 'text-orange-500' : 'text-warm-300'}" viewBox="0 0 24 24" fill={rating >= star ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.5">
													<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
												</svg>
											</button>
										{/each}
									</div>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/each}
	</div>

	<div class="bg-white rounded-2xl shadow-sm border border-warm-100 overflow-hidden mt-6">
		<h2 class="px-5 pt-4 pb-2 text-sm font-semibold text-warm-500 uppercase tracking-wide">
			<svg class="w-4 h-4 inline-block align-text-bottom text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> Deine Wünsche & Präferenzen
		</h2>
		<div class="px-5 pb-4">
			<textarea
				bind:value={recipeNotes}
				placeholder="z.B. Ich mag gerne gesunde Gerichte, viel Gemüse, asiatische Küche..."
				rows="5"
				class="w-full rounded-xl border border-warm-200 bg-warm-50 px-4 py-3 text-sm text-warm-800 placeholder-warm-400 focus:border-spice-400 focus:ring-2 focus:ring-spice-200 focus:outline-none resize-y"
			></textarea>
			<button
				onclick={saveNotes}
				disabled={notesState === 'loading'}
				class="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold text-white min-h-[42px] flex items-center justify-center transition-colors disabled:opacity-50 {notesState === 'success' ? 'bg-green-500' : notesState === 'error' ? 'bg-red-500' : 'bg-spice-500 hover:bg-spice-600 active:bg-spice-700'}"
			>
				{#if notesState === 'loading'}
					<svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
				{:else if notesState === 'success'}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
				{:else if notesState === 'error'}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
				{:else}
					Wünsche speichern
				{/if}
			</button>
		</div>
	</div>

	<!-- Personen & Haushalt -->
	<a href="/personen" class="block bg-white rounded-2xl shadow-sm border border-warm-100 overflow-hidden mt-6 hover:shadow-md transition-shadow">
		<div class="px-5 py-4 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<span class="w-8 flex items-center justify-center text-warm-500">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
				</span>
				<div>
					<span class="text-base font-medium text-warm-800">Personen & Haushalt</span>
					<p class="text-xs text-warm-500">Vorlieben, Abneigungen & Allergien verwalten</p>
				</div>
			</div>
			<svg class="w-5 h-5 text-warm-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</div>
	</a>

	<p class="text-xs text-warm-400 text-center mt-4 mb-6">
		{totalActive()} {totalActive() === 1 ? 'Küche' : 'Küchen'} ausgewählt
		{#if cuisineState === 'loading'}· Speichert...{/if}
	</p>
</div>
