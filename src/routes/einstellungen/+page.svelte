<script lang="ts">
	import { onMount } from 'svelte';
	import { isCapacitor, loadPreferences, savePreference } from '$lib/stores/data';
	import { healthConditionOptions } from '$lib/healthConditions';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	let showDeleteSettings = $state(false);
	let showDeleteRecipes = $state(false);

	async function deleteAllSettings() {
		try {
			if (isCapacitor()) {
				const { clearAllPreferences } = await import('$lib/client/db');
				await clearAllPreferences();
			} else {
				await fetch('/api/einstellungen/reset', { method: 'POST' });
			}
			window.location.reload();
		} catch (e) {
			console.error('Fehler beim Löschen der Einstellungen:', e);
		}
	}

	async function deleteAllRecipes() {
		try {
			if (isCapacitor()) {
				const { clearAllRecipes } = await import('$lib/client/db');
				await clearAllRecipes();
			} else {
				await fetch('/api/rezepte/reset', { method: 'POST' });
			}
			window.location.reload();
		} catch (e) {
			console.error('Fehler beim Löschen der Rezepte:', e);
		}
	}
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let healthConditions = $state<string[]>([]);
	let healthSaveState: ButtonState = $state('idle');

	function toggleHealthCondition(id: string) {
		if (healthConditions.includes(id)) {
			healthConditions = healthConditions.filter(c => c !== id);
		} else {
			healthConditions = [...healthConditions, id];
		}
		saveHealth();
	}

	async function saveHealth() {
		healthSaveState = 'loading';
		try {
			if (isCapacitor()) {
				await savePreference('healthConditions', JSON.stringify(healthConditions));
			} else {
				await fetch('/api/einstellungen', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ health_conditions: healthConditions })
				});
			}
			healthSaveState = 'success';
		} catch {
			healthSaveState = 'error';
		}
		resetAfterDelay(s => healthSaveState = s);
	}

	onMount(async () => {
		if (isCapacitor()) {
			const prefs = await loadPreferences();
			regionToggles = migratePreferences(prefs.cuisinePreferences ?? {});
			recipeNotes = prefs.recipeNotes;
			defaultServings = prefs.defaultServings;
			healthConditions = prefs.healthConditions ?? [];
			if (prefs.aiProvider) {
				aiProviderId = prefs.aiProvider.id ?? '';
				aiApiKey = prefs.aiProvider.apiKey ?? '';
				aiModel = prefs.aiProvider.model ?? '';
				aiBaseUrl = prefs.aiProvider.baseUrl ?? '';
			}
			// Load image keys
			const pKey = await loadPreference('pexelsApiKey');
			if (pKey) pexelsApiKey = pKey;
			const uKey = await loadPreference('unsplashApiKey');
			if (uKey) unsplashApiKey = uKey;
			const imgKey = await loadPreference('openaiImageKey');
			if (imgKey) openaiImageKey = imgKey;
		} else {
			// Load health conditions from server
			try {
				const res = await fetch('/api/einstellungen');
				if (res.ok) {
					const d = await res.json();
					healthConditions = d.healthConditions ?? [];
				}
			} catch {}
		}
	});

	const cuisineRegions = [
		{ id: 'nordeuropaeisch', label: 'Nordeuropäisch', emoji: '🇩🇪', examples: 'Deutsch, Britisch, Skandinavisch' },
		{ id: 'suedeuropaeisch', label: 'Südeuropäisch', emoji: '🇮🇹', examples: 'Italienisch, Griechisch, Spanisch, Französisch' },
		{ id: 'osteuropaeisch', label: 'Osteuropäisch', emoji: '🇵🇱', examples: 'Polnisch, Ungarisch, Balkan, Russisch' },
		{ id: 'asiatisch', label: 'Asiatisch', emoji: '🥢', examples: 'Japanisch, Thai, Vietnamesisch, Koreanisch, Indisch, Chinesisch' },
		{ id: 'orientalisch', label: 'Orientalisch & Afrikanisch', emoji: '🧆', examples: 'Türkisch, Arabisch, Persisch, Marokkanisch, Äthiopisch' },
		{ id: 'nordamerikanisch', label: 'Nordamerikanisch', emoji: '🇺🇸', examples: 'US-Amerikanisch, Mexikanisch, Cajun' },
		{ id: 'suedamerikanisch', label: 'Südamerikanisch & Karibisch', emoji: '🇧🇷', examples: 'Brasilianisch, Peruanisch, Karibisch' },
		{ id: 'fusion', label: 'Fusion & Street Food', emoji: '🌮', examples: 'Crossover, Street Food, Modern' },
	];

	// Migrate old detailed ratings to new region toggles
	function migratePreferences(old: Record<string, number>): Record<string, boolean> {
		if (!old || Object.keys(old).length === 0) {
			// Default: all on
			return Object.fromEntries(cuisineRegions.map(r => [r.id, true]));
		}
		// Check if already in new format (keys are region ids)
		if (Object.keys(old).some(k => cuisineRegions.find(r => r.id === k))) {
			return Object.fromEntries(cuisineRegions.map(r => [r.id, !!old[r.id]]));
		}
		// Old format: has individual cuisine names with star ratings — enable all regions
		return Object.fromEntries(cuisineRegions.map(r => [r.id, true]));
	}

	let regionToggles = $state<Record<string, boolean>>(migratePreferences(data.cuisinePreferences ?? {}));

	let defaultServings = $state(data.defaultServings ?? 2);
	let recipeNotes = $state(data.recipeNotes ?? '');
	let cuisineState: 'idle' | 'loading' | 'success' | 'error' = $state('idle');
	let notesState: 'idle' | 'loading' | 'success' | 'error' = $state('idle');

	type ButtonState = 'idle' | 'loading' | 'success' | 'error';
	function resetAfterDelay(setter: (s: ButtonState) => void) {
		setTimeout(() => setter('idle'), 1500);
	}

	async function toggleRegion(id: string) {
		regionToggles = { ...regionToggles, [id]: !regionToggles[id] };
		// Auto-save
		cuisineState = 'loading';
		try {
			if (isCapacitor()) {
				await savePreference('cuisinePreferences', JSON.stringify(regionToggles));
			} else {
				const res = await fetch('/api/einstellungen', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ cuisine_preferences: regionToggles })
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
	let pexelsApiKey = $state('');
	let unsplashApiKey = $state('');
	let openaiImageKey = $state('');
	let imageSaveState = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let showPexelsKey = $state(false);
	let showUnsplashKey = $state(false);
	let showImageKey = $state(false);
	let showAdvanced = $state(false);
	let showModelDropdown = $state(false);
	let aiTestState: ButtonState = $state('idle');

	const providerModels: Record<string, string[]> = {
		openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1', 'gpt-4.1-nano', 'o3-mini', 'o4-mini'],
		anthropic: ['claude-sonnet-4-20250514', 'claude-haiku-3-20250414', 'claude-opus-4-20250514'],
		mistral: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest'],
		openrouter: ['auto', 'anthropic/claude-sonnet-4', 'openai/gpt-4o-mini', 'google/gemini-2.5-flash'],
		ollama: ['llama3.2', 'llama3.1', 'mistral', 'gemma2', 'phi3', 'qwen2'],
		custom: []
	};
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

	<!-- Personen & Haushalt -->
	<a href="/personen" class="block bg-white rounded-2xl shadow-sm border border-warm-100 overflow-hidden mb-6 hover:shadow-md transition-shadow">
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

	<!-- Health Conditions -->
	<div class="bg-white rounded-2xl shadow-sm border border-warm-100 overflow-hidden mb-6">
		<div class="px-5 py-4">
			<h2 class="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-1">Gesundheit & Verträglichkeiten</h2>
			<p class="text-xs text-warm-400 mb-4">Cokko berücksichtigt diese bei der Rezeptauswahl.</p>
			<div class="grid grid-cols-1 gap-2">
				{#each healthConditionOptions as option}
					<button
						type="button"
						onclick={() => toggleHealthCondition(option.id)}
						class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left text-sm transition-all min-h-[44px]
							{healthConditions.includes(option.id) ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-warm-200 text-warm-600 hover:border-warm-300'}"
					>
						<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">{@html option.icon}</svg>
						<span class="flex-1">{option.label}</span>
						{#if healthConditions.includes(option.id)}
							<svg class="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
							</svg>
						{/if}
					</button>
				{/each}
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

				<!-- Model with dropdown -->
				<div class="mb-3 relative">
					<label class="text-xs font-medium text-warm-500 block mb-1">Modell</label>
					<div class="relative">
						<input
							type="text"
							bind:value={aiModel}
							placeholder="z.B. gpt-4o-mini"
							onfocus={() => showModelDropdown = true}
							class="w-full rounded-xl border border-warm-200 bg-warm-50 px-4 py-2.5 text-sm text-warm-800 focus:border-spice-400 focus:ring-2 focus:ring-spice-200 focus:outline-none"
						/>
						<button
							onclick={() => showModelDropdown = !showModelDropdown}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600"
						>
							<svg class="w-4 h-4 transition-transform {showModelDropdown ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
					</div>
					{#if showModelDropdown && (providerModels[aiProviderId] ?? []).length > 0}
						<div class="absolute z-10 w-full mt-1 bg-white rounded-xl border border-warm-200 shadow-lg max-h-48 overflow-y-auto">
							{#each providerModels[aiProviderId] ?? [] as model}
								<button
									onclick={() => { aiModel = model; showModelDropdown = false; }}
									class="w-full text-left px-4 py-2.5 text-sm hover:bg-spice-50 transition-colors first:rounded-t-xl last:rounded-b-xl
										{aiModel === model ? 'text-spice-600 font-medium bg-spice-50' : 'text-warm-700'}"
								>
									{model}
								</button>
							{/each}
						</div>
					{/if}
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
						class="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 min-w-[140px] flex items-center justify-center transition-colors disabled:opacity-50 {aiTestState === 'success' ? 'border-green-500 bg-white text-green-600' : aiTestState === 'error' ? 'border-red-500 bg-white text-red-600' : 'border-spice-500 text-spice-600 hover:bg-spice-50'}"
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
				{#if aiTestResult && !aiTestResult.success}
					<div class="mt-3 text-sm px-3 py-2 rounded-xl bg-red-50 text-red-700">
						✗ {aiTestResult.error}
					</div>
				{/if}
			{/if}
		</div>
	</div>

	<!-- Image Settings -->
	<div class="bg-white rounded-2xl shadow-sm border border-warm-100 overflow-hidden">
		<div class="px-5 py-4">
			<h2 class="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-1">Rezeptbilder</h2>
			<p class="text-xs text-warm-400 mb-3">
				Zuerst werden kostenlose Fotos gesucht (Pexels). Nur wenn kein passendes Foto gefunden wird, wird ein KI-Bild generiert (DALL-E, ~0,04€).
			</p>

			<div class="space-y-4">
				<!-- Pexels API Key -->
				<div>
					<label class="block text-sm font-medium text-warm-700 mb-1.5">
						Pexels API-Key
						<span class="text-warm-400 font-normal">(kostenlos)</span>
					</label>
					<p class="text-xs text-warm-400 mb-2">
						Hol dir einen kostenlosen Key auf <a href="https://www.pexels.com/api/" target="_blank" class="text-orange-500 underline">pexels.com/api</a>
					</p>
					<div class="relative">
						<input
							type={showPexelsKey ? 'text' : 'password'}
							bind:value={pexelsApiKey}
							placeholder="Pexels API Key"
							class="w-full px-4 py-3 pr-12 bg-warm-50 border border-warm-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
						/>
						<button
							onclick={() => showPexelsKey = !showPexelsKey}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 p-1"
						>
							{#if showPexelsKey}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18"/></svg>
							{:else}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
							{/if}
						</button>
					</div>
				</div>

				<!-- Unsplash API Key -->
				<div>
					<label class="block text-sm font-medium text-warm-700 mb-1.5">
						Unsplash API-Key
						<span class="text-warm-400 font-normal">(kostenlos)</span>
					</label>
					<p class="text-xs text-warm-400 mb-2">
						Key erstellen auf <a href="https://unsplash.com/developers" target="_blank" class="text-orange-500 underline">unsplash.com/developers</a>
					</p>
					<div class="relative">
						<input
							type={showUnsplashKey ? 'text' : 'password'}
							bind:value={unsplashApiKey}
							placeholder="Unsplash Access Key"
							class="w-full px-4 py-3 pr-12 bg-warm-50 border border-warm-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
						/>
						<button
							onclick={() => showUnsplashKey = !showUnsplashKey}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 p-1"
						>
							{#if showUnsplashKey}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18"/></svg>
							{:else}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
							{/if}
						</button>
					</div>
				</div>

				<!-- OpenAI Image Key (fallback) -->
				{#if aiProviderId !== 'openai'}
					<div>
						<label class="block text-sm font-medium text-warm-700 mb-1.5">
							OpenAI API-Key
							<span class="text-warm-400 font-normal">(Fallback, ~0,04€/Bild)</span>
						</label>
						<div class="relative">
							<input
								type={showImageKey ? 'text' : 'password'}
								bind:value={openaiImageKey}
								placeholder="sk-..."
								class="w-full px-4 py-3 pr-12 bg-warm-50 border border-warm-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
							/>
							<button
								onclick={() => showImageKey = !showImageKey}
								class="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 p-1"
							>
								{#if showImageKey}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18"/></svg>
								{:else}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
								{/if}
							</button>
						</div>
					</div>
				{/if}

				<button
					onclick={async () => {
						imageSaveState = 'loading';
						try {
							if (isCapacitor()) {
								await savePreference('pexelsApiKey', pexelsApiKey);
								await savePreference('unsplashApiKey', unsplashApiKey);
								if (aiProviderId !== 'openai') {
									await savePreference('openaiImageKey', openaiImageKey);
								}
								const { forceSave } = await import('$lib/client/db');
								await forceSave();
							}
							imageSaveState = 'success';
						} catch {
							imageSaveState = 'error';
						}
						resetAfterDelay(s => imageSaveState = s);
					}}
					class="w-full py-3 rounded-xl font-semibold text-base transition-colors {
						imageSaveState === 'success' ? 'bg-green-500 text-white' :
						imageSaveState === 'error' ? 'bg-red-500 text-white' :
						'bg-orange-500 text-white hover:bg-orange-600'
					}"
				>
					{#if imageSaveState === 'loading'}
						<svg class="w-5 h-5 mx-auto animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
					{:else if imageSaveState === 'success'}
						<svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
					{:else if imageSaveState === 'error'}
						<svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
					{:else}
						Speichern
					{/if}
				</button>
			</div>
		</div>
	</div>

	<div class="bg-white rounded-2xl shadow-sm border border-warm-100 overflow-hidden">
		<div class="px-5 pt-4 pb-2">
			<h2 class="text-sm font-semibold text-warm-500 uppercase tracking-wide">
				Küchen-Regionen
			</h2>
			<p class="text-xs text-warm-400 mt-1">Aktivierte Regionen werden zufällig bei der Rezeptgenerierung berücksichtigt</p>
		</div>
		<div class="px-5 pb-4 space-y-2">
			{#each cuisineRegions as region}
				<button
					onclick={() => toggleRegion(region.id)}
					class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors min-h-[48px] {regionToggles[region.id] ? 'bg-orange-50 border-orange-300' : 'bg-warm-50 border-warm-200 opacity-60'}"
				>
					<span class="text-xl flex-shrink-0">{region.emoji}</span>
					<div class="flex-1 text-left">
						<span class="text-sm font-semibold text-warm-800">{region.label}</span>
						<p class="text-xs text-warm-400">{region.examples}</p>
					</div>
					<div class="flex-shrink-0">
						{#if regionToggles[region.id]}
							<div class="w-10 h-6 bg-orange-500 rounded-full flex items-center justify-end px-0.5">
								<div class="w-5 h-5 bg-white rounded-full shadow"></div>
							</div>
						{:else}
							<div class="w-10 h-6 bg-warm-300 rounded-full flex items-center justify-start px-0.5">
								<div class="w-5 h-5 bg-white rounded-full shadow"></div>
							</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>
		{#if cuisineState === 'success'}
			<div class="px-5 pb-3">
				<p class="text-xs text-green-600 text-center">Gespeichert!</p>
			</div>
		{/if}
	</div>

	<div class="bg-white rounded-2xl shadow-sm border border-warm-100 overflow-hidden mt-6">
		<h2 class="px-5 pt-4 pb-2 text-sm font-semibold text-warm-500 uppercase tracking-wide">
			Deine Wünsche
		</h2>
		<div class="px-5 pb-4">
			<textarea
				bind:value={recipeNotes}
				placeholder="z.B. Gerne viel Gemüse, wenig Fleisch, eher leichte Gerichte..."
				rows="4"
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

	<div class="h-6"></div>

	<!-- Danger Zone -->
	<div class="space-y-3 mb-10">
		<button
			onclick={() => showDeleteSettings = true}
			class="w-full py-3 rounded-2xl font-semibold text-sm text-red-600 border-2 border-red-200 hover:bg-red-50 active:bg-red-100 transition-colors min-h-[48px]"
		>
			Einstellungen löschen
		</button>
		<button
			onclick={() => showDeleteRecipes = true}
			class="w-full py-3 rounded-2xl font-semibold text-sm text-red-600 border-2 border-red-200 hover:bg-red-50 active:bg-red-100 transition-colors min-h-[48px]"
		>
			Rezepte löschen
		</button>
	</div>
</div>

<ConfirmDialog
	open={showDeleteSettings}
	title="Einstellungen löschen?"
	message="Alle Einstellungen werden zurückgesetzt: KI-Konfiguration, Küchenpräferenzen, Gesundheitsbedingungen, Portionen und Wünsche. Der Onboarding-Wizard wird beim nächsten Start erneut angezeigt."
	confirmLabel="Ja, alles löschen"
	cancelLabel="Abbrechen"
	onConfirm={deleteAllSettings}
	onCancel={() => showDeleteSettings = false}
/>

<ConfirmDialog
	open={showDeleteRecipes}
	title="Alle Rezepte löschen?"
	message="Alle gespeicherten Rezepte und Vorschläge werden unwiderruflich gelöscht. Vorrat, Einkaufsliste und Personen bleiben erhalten."
	confirmLabel="Ja, Rezepte löschen"
	cancelLabel="Abbrechen"
	onConfirm={deleteAllRecipes}
	onCancel={() => showDeleteRecipes = false}
/>
