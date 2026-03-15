<script lang="ts">
	import { onMount } from 'svelte';
	import RecipeCard from '$lib/components/RecipeCard.svelte';
	import TabToggle from '$lib/components/TabToggle.svelte';
	import { isCapacitor, loadRecipes, loadDailySuggestions, loadPantryNames, getDistinctCuisines, getDistinctStores } from '$lib/stores/data';
	import { generateRecipes } from '$lib/client/ai-recipes';
	import { findOrGenerateImage } from '$lib/client/ai-images';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let localData = $state(data);

	onMount(async () => {
		if (isCapacitor()) {
			const [suggestions, recipes, pantryNms, cuisines, stores] = await Promise.all([
				loadDailySuggestions(),
				loadRecipes({ status: 'approved' }),
				loadPantryNames(),
				getDistinctCuisines(),
				getDistinctStores()
			]);
			localData = {
				...localData,
				date: suggestions.date,
				suggestionRecipes: suggestions.recipes,
				recipes,
				pantryNames: pantryNms,
				filters: {
					cuisines,
					stores,
					current: { cuisine: '', store: '', maxTime: '' }
				}
			};
			pantryNames = pantryNms;
		}

		// Auto-generate after onboarding wizard
		const params = new URLSearchParams(window.location.search);
		const autoGenerate = params.get('generate');
		if (autoGenerate) {
			// Clean URL
			const url = new URL(window.location.href);
			url.searchParams.delete('generate');
			history.replaceState({}, '', url.pathname + url.search);
			// Start generation
			const count = parseInt(autoGenerate) || 5;
			handleGenerate(count);
		}
	});

	let activeTab = $state(localData.tab ?? 'vorschlaege');
	let cuisine = $state(localData.filters?.current?.cuisine ?? '');
	let store = $state(localData.filters?.current?.store ?? '');
	let maxTime = $state(localData.filters?.current?.maxTime ?? '');
	let pantryNames = $state(localData.pantryNames ?? []);

	const tabs = [
		{ value: 'vorschlaege', label: 'Vorschläge' },
		{ value: 'gespeichert', label: 'Gespeichert' }
	];

	async function switchTab(value: string) {
		activeTab = value;
		const params = new URLSearchParams(window.location.search);
		if (value === 'vorschlaege') {
			params.delete('tab');
			// Reload suggestions when switching back
			if (isCapacitor()) {
				try {
					const suggestions = await loadDailySuggestions();
					localData = { ...localData, date: suggestions.date, suggestionRecipes: suggestions.recipes };
				} catch {}
			}
		} else {
			params.set('tab', value);
			// Reload saved recipes when switching to Gespeichert
			try {
				const recipes = await loadRecipes({ status: 'approved' });
				localData = { ...localData, recipes };
			} catch {}
		}
		// Keep sort/filter params only for gespeichert
		if (value === 'vorschlaege') {
			params.delete('sort');
			params.delete('cuisine');
			params.delete('store');
			params.delete('maxTime');
		}
		const query = params.toString();
		history.replaceState({}, '', '/rezepte' + (query ? '?' + query : ''));
	}

	const sortOptions = [
		{ value: 'newest', label: 'Neu' },
		{ value: 'pantry', label: 'Vorrat %' },
		{ value: 'cheapest', label: 'Günstig' },
		{ value: 'fastest', label: 'Schnell' },
		{ value: 'simplest', label: 'Simpel' }
	] as const;

	function setSort(value: string) {
		const params = new URLSearchParams(window.location.search);
		params.set('tab', 'gespeichert');
		if (value === 'newest') {
			params.delete('sort');
		} else {
			params.set('sort', value);
		}
		const query = params.toString();
		window.location.href = '/rezepte' + (query ? '?' + query : '');
	}

	function handlePantryAdd(name: string) {
		const lower = name.toLowerCase();
		if (!pantryNames.includes(lower)) {
			pantryNames = [...pantryNames, lower];
		}
	}

	function handlePantryRemove(name: string) {
		pantryNames = pantryNames.filter((p) => p !== name.toLowerCase());
	}

	function applyFilters() {
		const params = new URLSearchParams();
		params.set('tab', 'gespeichert');
		if (cuisine) params.set('cuisine', cuisine);
		if (store) params.set('store', store);
		if (maxTime) params.set('maxTime', maxTime);
		if ((localData.sort ?? 'newest') !== 'newest') params.set('sort', (localData.sort ?? 'newest'));
		const query = params.toString();
		window.location.href = '/rezepte' + (query ? '?' + query : '');
	}

	function resetFilters() {
		cuisine = '';
		store = '';
		maxTime = '';
		const params = new URLSearchParams();
		params.set('tab', 'gespeichert');
		if ((localData.sort ?? 'newest') !== 'newest') params.set('sort', (localData.sort ?? 'newest'));
		const query = params.toString();
		window.location.href = '/rezepte' + (query ? '?' + query : '');
	}

	const hasFilters = $derived(cuisine || store || maxTime);

	let deleteTarget: any = $state(null);
	let deleting = $state(false);

	async function confirmDelete() {
		if (!deleteTarget) return;
		deleting = true;
		try {
			if (isCapacitor()) {
				const db = await import('$lib/client/db');
				await db.deleteRecipe(deleteTarget.id);
			} else {
				await fetch(`/api/rezepte/${deleteTarget.id}`, { method: 'DELETE' });
			}
			localData = {
				...localData,
				suggestionRecipes: (localData.suggestionRecipes ?? []).filter((r) => r.id !== deleteTarget.id),
				recipes: (localData.recipes ?? []).filter((r) => r.id !== deleteTarget.id)
			};
			deleteTarget = null;
		} catch (e) {
			console.error('Delete failed', e);
		} finally {
			deleting = false;
		}
	}

	let fabOpen = $state(false);
	let generating = $state(false);
	let generateError = $state('');
	let generateProgress = $state('');

	// --- Generate Dialog ---
	let showGenerateDialog = $state(false);
	let showWishDialog = $state(false);
	let wishText = $state('');
	let wishLoading = $state(false);
	let wishError = $state('');
	let generateCount = $state(5);
	const cuisineRegions = [
		{ id: 'nordeuropaeisch', label: 'Nordeuropäisch', emoji: '🇩🇪' },
		{ id: 'suedeuropaeisch', label: 'Südeuropäisch', emoji: '🇮🇹' },
		{ id: 'osteuropaeisch', label: 'Osteuropäisch', emoji: '🇵🇱' },
		{ id: 'asiatisch', label: 'Asiatisch', emoji: '🥢' },
		{ id: 'orientalisch', label: 'Orient & Afrika', emoji: '🧆' },
		{ id: 'nordamerikanisch', label: 'Nordamerikanisch', emoji: '🇺🇸' },
		{ id: 'suedamerikanisch', label: 'Südamerikanisch', emoji: '🇧🇷' },
		{ id: 'fusion', label: 'Fusion & Street Food', emoji: '🌮' },
	];
	// Will be loaded from prefs, then remembered across generations
	let generateRegions = $state<Record<string, boolean>>(
		Object.fromEntries(cuisineRegions.map(r => [r.id, true]))
	);
	let regionsLoaded = false;

	async function loadRegionsFromPrefs() {
		if (regionsLoaded) return; // Keep last user changes
		try {
			if (isCapacitor()) {
				const { loadPreferences } = await import('$lib/stores/data');
				const prefs = await loadPreferences();
				const cp = prefs.cuisinePreferences ?? {};
				if (Object.keys(cp).length > 0) {
					generateRegions = Object.fromEntries(
						cuisineRegions.map(r => [r.id, cp[r.id] !== undefined ? !!cp[r.id] : true])
					);
				}
			} else {
				const res = await fetch('/api/einstellungen');
				if (res.ok) {
					const prefs = await res.json();
					const cp = prefs.cuisinePreferences ?? prefs.cuisine_preferences ?? {};
					if (Object.keys(cp).length > 0) {
						generateRegions = Object.fromEntries(
							cuisineRegions.map(r => [r.id, cp[r.id] !== undefined ? !!cp[r.id] : true])
						);
					}
				}
			}
		} catch {}
		regionsLoaded = true;
	}

	function openGenerateDialog() {
		fabOpen = false;
		loadRegionsFromPrefs();
		showGenerateDialog = true;
	}

	async function submitWish() {
		if (!wishText.trim()) return;
		wishLoading = true;
		wishError = '';

		try {
			let aiProviderConfig: any, pantryItemsList: string[], prefs: any;
			if (isCapacitor()) {
				const { loadPreferences, loadPantryNames: lpn } = await import('$lib/stores/data');
				const prefsData = await loadPreferences();
				prefs = prefsData;
				pantryItemsList = await lpn();
				aiProviderConfig = prefsData.aiProvider;
			} else {
				const [prefsRes, pantryRes] = await Promise.all([
					fetch('/api/einstellungen'),
					fetch('/api/vorrat')
				]);
				prefs = await prefsRes.json();
				const pantryData = await pantryRes.json();
				pantryItemsList = pantryData.map((p: any) => p.name || p);
				const rawProv = prefs.aiProvider ?? prefs.ai_provider;
				aiProviderConfig = typeof rawProv === 'string' ? JSON.parse(rawProv) : rawProv;
			}

			if (!aiProviderConfig?.apiKey) {
				wishError = 'Bitte zuerst KI-Einstellungen konfigurieren.';
				return;
			}

			const recipes = await generateRecipes(
				{
					count: 1,
					pantryBased: 0,
					pantryItems: pantryItemsList,
					cuisinePrefs: {},
					recipeNotes: wishText.trim(),
					servings: prefs.defaultServings ?? 2,
					healthConditions: prefs.healthConditions ?? [],
				},
				aiProviderConfig
			);

			if (recipes.length === 0) throw new Error('Kein Rezept generiert');

			const recipe = recipes[0];
			if (isCapacitor()) {
				const db = await import('$lib/client/db');
				const id = await db.insertRecipe({
					name: recipe.name,
					description: recipe.description,
					cuisine: recipe.cuisine,
					cost_estimate: recipe.cost_estimate,
					prep_time: recipe.prep_time,
					difficulty: recipe.difficulty,
					image_url: '',
					ingredients: recipe.ingredients,
					steps: recipe.steps,
					shopping_tags: recipe.tags ?? [],
					status: 'approved',
					pantry_based: recipe.pantry_based ? 1 : 0,
					servings: recipe.servings,
				});
				await db.forceSave();

				showWishDialog = false;
				wishText = '';
				goto(`/rezepte/${id}`);
			}
		} catch (e: any) {
			wishError = e.message || 'Fehler';
		} finally {
			wishLoading = false;
		}
	}

	function startGenerate() {
		showGenerateDialog = false;
		regionsLoaded = true; // Remember user changes for next time
		handleGenerate(generateCount, generateRegions);
	}

	async function handleGenerate(count: number = 5, regionOverrides?: Record<string, boolean>) {
		generating = true;
		generateError = '';
		generateProgress = 'Lade Einstellungen...';

		try {
			let aiProviderConfig, prefs, pantryItemsList: string[];

			if (isCapacitor()) {
				const { loadPreferences, loadPantryNames: lpn } = await import('$lib/stores/data');
				const prefsData = await loadPreferences();
				prefs = prefsData;
				pantryItemsList = await lpn();
				aiProviderConfig = prefsData.aiProvider;
			} else {
				const [prefsRes, pantryRes] = await Promise.all([
					fetch('/api/einstellungen'),
					fetch('/api/vorrat')
				]);
				prefs = await prefsRes.json();
				const pantryData = await pantryRes.json();
				pantryItemsList = pantryData.map((p: any) => p.name || p);
				const rawProvider = prefs.aiProvider ?? prefs.ai_provider;
				aiProviderConfig =
					typeof rawProvider === 'string'
						? JSON.parse(rawProvider)
						: rawProvider;
			}

			if (!aiProviderConfig?.apiKey) {
				generateError = 'Bitte zuerst KI-Einstellungen konfigurieren (Einstellungen → KI)';
				generating = false;
				generateProgress = '';
				return;
			}

			generateProgress = `Rezept 1/${count} wird generiert...`;

			const cuisinePrefsToUse = regionOverrides ?? prefs.cuisinePreferences ?? prefs.cuisine_preferences ?? {};

			const recipes = await generateRecipes(
				{
					count,
					pantryBased: Math.min(2, pantryItemsList.length > 0 ? 2 : 0),
					pantryItems: pantryItemsList,
					cuisinePrefs: cuisinePrefsToUse,
					recipeNotes: prefs.recipeNotes ?? '',
					servings: prefs.defaultServings ?? 2,
					healthConditions: prefs.healthConditions ?? [],
					onProgress: (current, total, recipe) => {
						if (recipe) {
							generateProgress = current < total
								? `${recipe.name} ✓ — Rezept ${current + 1}/${total} wird generiert...`
								: `${recipe.name} ✓ — Speichere...`;
						} else {
							generateProgress = `Rezept ${current}/${total} wird generiert...`;
						}
					}
				},
				aiProviderConfig
			);

			generateProgress = `${recipes.length} Rezept${recipes.length !== 1 ? 'e' : ''} generiert! Speichere...`;

			// Save recipes
			if (isCapacitor()) {
				const db = await import('$lib/client/db');
				const today = new Date().toISOString().split('T')[0];
				const recipeIds: number[] = [];
				for (const r of recipes) {
					const id = await db.insertRecipe({
						name: r.name,
						description: r.description,
						cuisine: r.cuisine,
						cost_estimate: r.cost_estimate,
						prep_time: r.prep_time,
						difficulty: r.difficulty,
						image_url: '',
						ingredients: r.ingredients,
						steps: r.steps,
						shopping_tags: r.tags ?? [],
						status: 'vorschlag',
						pantry_based: r.pantry_based ? 1 : 0,
						servings: r.servings
					});
					recipeIds.push(id);
				}
				await db.saveDailySuggestions(today, recipeIds);
			} else {
				await fetch('/api/vorschlaege/neu', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ recipes })
				});
			}

			// Reload suggestions
			if (isCapacitor()) {
				const sug = await loadDailySuggestions();
				const pn = await loadPantryNames();
				localData = {
					...localData,
					suggestionRecipes: sug.recipes,
					date: sug.date,
					pantryNames: pn
				};
			} else {
				window.location.reload();
			}

			// Find images in background (Pexels first, then DALL-E fallback)
			let pexelsKey = '';
			let unsplashKey = '';
			let openaiKey = '';
			if (isCapacitor()) {
				const { loadPreference } = await import('$lib/stores/data');
				pexelsKey = (await loadPreference('pexelsApiKey')) ?? '';
				unsplashKey = (await loadPreference('unsplashApiKey')) ?? '';
				openaiKey = (await loadPreference('openaiImageKey')) ?? '';
			}
			// If main provider is OpenAI, use that key for DALL-E
			if (!openaiKey && aiProviderConfig.id === 'openai') {
				openaiKey = aiProviderConfig.apiKey;
			}

			if (pexelsKey || unsplashKey || openaiKey) {
				for (const recipe of localData.suggestionRecipes ?? []) {
					findOrGenerateImage(recipe.name, pexelsKey, openaiKey, unsplashKey).then(async (url) => {
						if (url) {
							if (isCapacitor()) {
								const db = await import('$lib/client/db');
								await db.updateRecipeImage(recipe.id, url);
							}
							localData = {
								...localData,
								suggestionRecipes: (localData.suggestionRecipes ?? []).map((r) =>
									r.id === recipe.id ? { ...r, image_url: url } : r
								)
							};
						}
					});
				}
			}
		} catch (e) {
			console.error('Generate error:', e);
			generateError = e instanceof Error ? e.message : String(e);
		} finally {
			generating = false;
			generateProgress = '';
		}
	}
</script>

<div class="max-w-lg mx-auto px-4 pt-6">
	<header class="mb-4">
		<h1 class="text-2xl font-bold text-warm-900">Rezepte</h1>
	</header>

	<TabToggle {tabs} active={activeTab} onChange={switchTab} />

	{#if activeTab === 'vorschlaege'}
		<!-- Vorschläge tab -->

		{#if generating && (localData.suggestionRecipes ?? []).length > 0}
			<div class="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3">
				<svg class="animate-spin w-5 h-5 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
				<p class="text-sm text-orange-700 font-medium">{generateProgress}</p>
			</div>
		{/if}

		{#if generateError}
			<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
				<p class="text-sm text-red-700 font-medium">{generateError}</p>
			</div>
		{/if}

		{#if (localData.suggestionRecipes ?? []).length === 0}
			{#if generating}
				<div class="text-center py-16">
					<svg class="animate-spin w-10 h-10 mx-auto text-spice-500 mb-4" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
					</svg>
					<p class="text-warm-600 font-medium">{generateProgress}</p>
				</div>
			{:else}
				<div class="text-center py-16">
					<div class="text-warm-300 mb-4">
						<svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
						</svg>
					</div>
					<p class="text-warm-500 text-lg">Keine Vorschläge</p>
					<p class="text-warm-400 text-sm mt-2">Lass dir von der KI Rezepte vorschlagen!</p>
					{#if generateError}
						<p class="text-red-500 text-sm mt-2">{generateError}</p>
					{/if}
					<button
						onclick={openGenerateDialog}
						class="inline-flex items-center gap-2 mt-6 px-6 py-3.5 min-h-[48px] bg-spice-500 text-white rounded-xl font-medium hover:bg-spice-600 transition-colors"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
						</svg>
						Rezepte generieren
					</button>
				</div>
			{/if}
		{:else}
			<div class="space-y-4 mb-6">
				{#each localData.suggestionRecipes ?? [] as recipe (recipe.id)}
					<div class="relative" id="suggestion-{recipe.id}">
						<RecipeCard
							{recipe}
							approvable={true}
							dismissable={true}
							{pantryNames}
							onPantryAdd={handlePantryAdd}
							onPantryRemove={handlePantryRemove}
							onDismiss={(r) => (deleteTarget = r)}
							onApproved={(r) => {
								const el = document.getElementById(`suggestion-${r.id}`);
								if (el) {
									el.style.opacity = '0';
									el.style.maxHeight = el.scrollHeight + 'px';
									setTimeout(() => {
										el.style.maxHeight = '0';
										el.style.marginBottom = '0';
										el.style.overflow = 'hidden';
									}, 300);
									setTimeout(() => {
										localData = {
											...localData,
											suggestionRecipes: (localData.suggestionRecipes ?? []).filter(s => s.id !== r.id)
										};
									}, 800);
								}
							}}
						/>
					</div>
				{/each}
			</div>
		{/if}
	{:else}
		<!-- Gespeichert tab -->
		<p class="text-warm-500 text-sm mb-4">{(localData.recipes ?? []).length} Rezept{(localData.recipes ?? []).length !== 1 ? 'e' : ''} in der Sammlung</p>

		<!-- Sort pills -->
		<div class="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-4 px-4">
			{#each sortOptions as opt}
				<button
					onclick={() => setSort(opt.value)}
					class="rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors {(localData.sort ?? 'newest') === opt.value ? 'bg-orange-500 text-white font-semibold' : 'bg-white border border-warm-200 text-warm-600'}"
				>
					{opt.label}
				</button>
			{/each}
		</div>

		<!-- Filters -->
		<div class="bg-white rounded-2xl p-4 mb-5 border border-warm-100 shadow-sm">
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-sm font-semibold text-warm-700">Filter</h2>
				{#if hasFilters}
					<button onclick={resetFilters} class="text-sm text-spice-500 font-medium min-h-[44px] px-3 -mr-3 flex items-center">Zurücksetzen</button>
				{/if}
			</div>
			<div class="grid grid-cols-3 gap-2">
				<div>
					<label for="cuisine-filter" class="text-xs text-warm-500 mb-1 block">Küche</label>
					<select
						id="cuisine-filter"
						bind:value={cuisine}
						onchange={applyFilters}
						class="w-full text-sm rounded-lg border border-warm-200 px-2 py-2.5 min-h-[44px] bg-warm-50 text-warm-800 focus:outline-none focus:ring-2 focus:ring-spice-300"
					>
						<option value="">Alle</option>
						{#each localData.filters?.cuisines ?? [] as c}
							<option value={c}>{c}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="store-filter" class="text-xs text-warm-500 mb-1 block">Einkauf</label>
					<select
						id="store-filter"
						bind:value={store}
						onchange={applyFilters}
						class="w-full text-sm rounded-lg border border-warm-200 px-2 py-2.5 min-h-[44px] bg-warm-50 text-warm-800 focus:outline-none focus:ring-2 focus:ring-spice-300"
					>
						<option value="">Alle</option>
						{#each localData.filters?.stores ?? [] as s}
							<option value={s}>{s}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="time-filter" class="text-xs text-warm-500 mb-1 block">Zeit</label>
					<select
						id="time-filter"
						bind:value={maxTime}
						onchange={applyFilters}
						class="w-full text-sm rounded-lg border border-warm-200 px-2 py-2.5 min-h-[44px] bg-warm-50 text-warm-800 focus:outline-none focus:ring-2 focus:ring-spice-300"
					>
						<option value="">Alle</option>
						<option value="20">&le; 20 Min</option>
						<option value="30">&le; 30 Min</option>
						<option value="45">&le; 45 Min</option>
						<option value="60">&le; 60 Min</option>
					</select>
				</div>
			</div>
		</div>

		{#if (localData.recipes ?? []).length === 0}
			<div class="text-center py-16">
				<div class="text-warm-300 mb-4"><svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>
				{#if hasFilters}
					<p class="text-warm-500 text-lg">Keine Rezepte mit diesen Filtern</p>
					<button onclick={resetFilters} class="text-spice-500 text-base font-medium mt-2 min-h-[44px] px-4">Filter zurücksetzen</button>
				{:else}
					<p class="text-warm-500 text-lg">Noch keine Rezepte übernommen</p>
					<p class="text-warm-400 text-sm mt-2">Schau dir die Vorschläge an und wähle Rezepte aus!</p>
					<button
						onclick={() => switchTab('vorschlaege')}
						class="inline-block mt-4 px-6 py-3.5 min-h-[48px] bg-spice-500 text-white rounded-xl font-medium hover:bg-spice-600 transition-colors"
					>
						Zu den Vorschlägen
					</button>
				{/if}
			</div>
		{:else}
			<div class="space-y-4 pb-24">
				{#each localData.recipes ?? [] as recipe (recipe.id)}
					<RecipeCard {recipe} {pantryNames} onPantryAdd={handlePantryAdd} onPantryRemove={handlePantryRemove} onDismiss={(r) => (deleteTarget = r)} />
				{/each}
			</div>
		{/if}
	{/if}
</div>

<!-- Delete confirmation dialog -->
{#if deleteTarget}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
		onclick={() => !deleting && (deleteTarget = null)}
		onkeydown={(e) => e.key === 'Escape' && !deleting && (deleteTarget = null)}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
			onclick={(e) => e.stopPropagation()}
			onkeydown={() => {}}
		>
			<h2 class="text-lg font-bold text-warm-900 mb-1">Rezept verwerfen?</h2>
			<p class="text-warm-500 text-sm mb-6">{deleteTarget.name}</p>
			<div class="flex gap-3">
				<button
					onclick={() => (deleteTarget = null)}
					disabled={deleting}
					class="flex-1 px-4 py-2.5 rounded-xl border border-warm-200 text-warm-600 font-medium hover:bg-warm-50 transition-colors disabled:opacity-50"
				>
					Abbrechen
				</button>
				<button
					onclick={confirmDelete}
					disabled={deleting}
					class="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
				>
					{#if deleting}
						Lösche...
					{:else}
						Verwerfen
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- FAB overlay backdrop -->
{#if fabOpen}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
			onclick={() => (fabOpen = false)}
			onkeydown={(e) => e.key === 'Escape' && (fabOpen = false)}
		></div>
	{/if}

	<!-- FAB + menu (top-right) -->
	<div class="fixed top-[calc(env(safe-area-inset-top)+16px)] right-4 z-40 flex flex-col items-end gap-3">
		<!-- FAB button -->
		<button
			onclick={() => (fabOpen = !fabOpen)}
			class="w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg flex items-center justify-center transition-transform duration-300"
			aria-label={fabOpen ? 'Menü schließen' : 'Aktionsmenü öffnen'}
		>
			<svg
				class="w-7 h-7 transition-transform duration-300 {fabOpen ? 'rotate-45' : ''}"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				viewBox="0 0 24 24"
			>
				<line x1="12" y1="5" x2="12" y2="19" />
				<line x1="5" y1="12" x2="19" y2="12" />
			</svg>
		</button>

		<!-- Menu items (below FAB) -->
		{#if fabOpen}
			<div class="bg-white rounded-2xl shadow-lg border border-warm-200 overflow-hidden animate-fade-in-down min-w-[200px]">
				<button
					onclick={openGenerateDialog}
					disabled={generating}
					class="w-full flex items-center gap-3 px-4 py-3 hover:bg-warm-50 transition-colors disabled:opacity-50"
				>
					<span class="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
						{#if generating}
							<svg class="w-4 h-4 text-orange-600 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
							</svg>
						{:else}
							<svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
							</svg>
						{/if}
					</span>
					<span class="text-sm font-medium text-warm-800">{generating ? 'Generiere...' : 'Rezepte generieren'}</span>
				</button>
				<a
					href="/rezepte/neu"
					class="flex items-center gap-3 px-4 py-3 hover:bg-warm-50 transition-colors border-t border-warm-100"
				>
					<span class="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
						<svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
							<path d="M14 2v6h6" />
							<line x1="12" y1="18" x2="12" y2="12" />
							<line x1="9" y1="15" x2="15" y2="15" />
						</svg>
					</span>
					<span class="text-sm font-medium text-warm-800">Rezept hinzufügen</span>
				</a>
				<button
					onclick={() => { fabOpen = false; showWishDialog = true; }}
					disabled={generating}
					class="w-full flex items-center gap-3 px-4 py-3 hover:bg-warm-50 transition-colors border-t border-warm-100 disabled:opacity-50"
				>
					<span class="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
						<svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
						</svg>
					</span>
					<span class="text-sm font-medium text-warm-800">Gericht wünschen</span>
				</button>
				<a
					href="/planen"
					class="flex items-center gap-3 px-4 py-3 hover:bg-warm-50 transition-colors border-t border-warm-100"
				>
					<span class="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
						<svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
							<rect x="3" y="4" width="18" height="18" rx="2" />
							<line x1="16" y1="2" x2="16" y2="6" />
							<line x1="8" y1="2" x2="8" y2="6" />
							<line x1="3" y1="10" x2="21" y2="10" />
						</svg>
					</span>
					<span class="text-sm font-medium text-warm-800">Essen planen</span>
				</a>
			</div>
		{/if}
	</div>

<!-- Generate Dialog -->
{#if showGenerateDialog}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/40 z-[60] flex items-end sm:items-center justify-center"
		onclick={() => showGenerateDialog = false}
		onkeydown={(e) => e.key === 'Escape' && (showGenerateDialog = false)}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl"
			style="padding-bottom: calc(env(safe-area-inset-bottom) + 16px);"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="px-5 pt-5 pb-3">
				<h2 class="text-lg font-bold text-warm-900">Rezepte generieren</h2>
			</div>

			<!-- Count selector -->
			<div class="px-5 pb-4">
				<label class="text-sm font-medium text-warm-700 mb-2 block">Anzahl</label>
				<div class="flex gap-2">
					{#each [3, 5, 7, 10] as n}
						<button
							onclick={() => generateCount = n}
							class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px] {generateCount === n ? 'bg-orange-500 text-white' : 'bg-warm-100 text-warm-700'}"
						>
							{n}
						</button>
					{/each}
				</div>
			</div>

			<!-- Region toggles -->
			<div class="px-5 pb-4">
				<label class="text-sm font-medium text-warm-700 mb-2 block">Küchen-Regionen</label>
				<div class="grid grid-cols-2 gap-2">
					{#each cuisineRegions as region}
						<button
							onclick={() => generateRegions = { ...generateRegions, [region.id]: !generateRegions[region.id] }}
							class="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-colors min-h-[44px] {generateRegions[region.id] ? 'bg-orange-50 border-orange-300' : 'bg-warm-50 border-warm-200 opacity-50'}"
						>
							<span class="text-base">{region.emoji}</span>
							<span class="text-xs font-medium text-warm-800 leading-tight">{region.label}</span>
						</button>
					{/each}
				</div>
				<div class="flex gap-2 mt-2">
					<button
						onclick={() => generateRegions = Object.fromEntries(cuisineRegions.map(r => [r.id, true]))}
						class="text-xs text-orange-600 font-medium"
					>Alle an</button>
					<span class="text-xs text-warm-300">|</span>
					<button
						onclick={() => generateRegions = Object.fromEntries(cuisineRegions.map(r => [r.id, false]))}
						class="text-xs text-warm-400 font-medium"
					>Alle aus</button>
				</div>
			</div>

			<!-- Actions -->
			<div class="px-5 pb-2 flex gap-3">
				<button
					onclick={() => showGenerateDialog = false}
					class="flex-1 py-3 rounded-xl border border-warm-200 text-warm-600 font-semibold text-sm min-h-[48px]"
				>
					Abbrechen
				</button>
				<button
					onclick={startGenerate}
					disabled={!Object.values(generateRegions).some(v => v)}
					class="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm min-h-[48px] disabled:opacity-40"
				>
					{generateCount} Rezepte los!
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Wish Dialog -->
{#if showWishDialog}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/40 z-[60] flex items-end sm:items-center justify-center"
		onclick={() => !wishLoading && (showWishDialog = false)}
		onkeydown={(e) => e.key === 'Escape' && !wishLoading && (showWishDialog = false)}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl"
			style="padding-bottom: calc(env(safe-area-inset-bottom) + 16px);"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="px-5 pt-5 pb-2">
				<h2 class="text-lg font-bold text-warm-900">Gericht wünschen</h2>
				<p class="text-sm text-warm-400 mt-1">Beschreibe was du essen möchtest — die KI erstellt ein passendes Rezept.</p>
			</div>

			<div class="px-5 pb-4">
				<textarea
					bind:value={wishText}
					placeholder="z.B. Ein cremiges Risotto mit Pilzen und Parmesan, nicht zu aufwändig..."
					rows="3"
					class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
					onkeydown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), submitWish())}
				></textarea>
				{#if wishError}
					<p class="text-sm text-red-600 mt-2">{wishError}</p>
				{/if}
			</div>

			<div class="px-5 pb-2 flex gap-3">
				<button
					onclick={() => showWishDialog = false}
					disabled={wishLoading}
					class="flex-1 py-3 rounded-xl border border-warm-200 text-warm-600 font-semibold text-sm min-h-[48px] disabled:opacity-40"
				>
					Abbrechen
				</button>
				<button
					onclick={submitWish}
					disabled={wishLoading || !wishText.trim()}
					class="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm min-h-[48px] disabled:opacity-40 flex items-center justify-center gap-2"
				>
					{#if wishLoading}
						<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
						</svg>
						Wird erstellt...
					{:else}
						Rezept erstellen
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes fade-in-down {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.animate-fade-in-down {
		animation: fade-in-down 0.2s ease-out;
	}
</style>
