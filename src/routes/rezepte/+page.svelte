<script lang="ts">
	import RecipeCard from '$lib/components/RecipeCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let cuisine = $state(data.filters.current.cuisine);
	let store = $state(data.filters.current.store);
	let maxTime = $state(data.filters.current.maxTime);
	let pantryNames = $state(data.pantryNames);

	const sortOptions = [
		{ value: 'newest', label: 'Neueste' },
		{ value: 'pantry', label: 'Vorrats-Match' },
		{ value: 'cheapest', label: 'Günstigster Einkauf' },
		{ value: 'fastest', label: 'Schnellste' },
		{ value: 'simplest', label: 'Einfachste' }
	] as const;

	function setSort(value: string) {
		const params = new URLSearchParams(window.location.search);
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
		if (cuisine) params.set('cuisine', cuisine);
		if (store) params.set('store', store);
		if (maxTime) params.set('maxTime', maxTime);
		if (data.sort !== 'newest') params.set('sort', data.sort);
		const query = params.toString();
		window.location.href = '/rezepte' + (query ? '?' + query : '');
	}

	function resetFilters() {
		cuisine = '';
		store = '';
		maxTime = '';
		const params = new URLSearchParams();
		if (data.sort !== 'newest') params.set('sort', data.sort);
		const query = params.toString();
		window.location.href = '/rezepte' + (query ? '?' + query : '');
	}

	const hasFilters = $derived(cuisine || store || maxTime);
</script>

<div class="max-w-lg mx-auto px-4 pt-6">
	<header class="mb-4">
		<h1 class="text-2xl font-bold text-warm-900">Meine Rezepte</h1>
		<p class="text-warm-500 text-sm mt-1">{data.recipes.length} Rezept{data.recipes.length !== 1 ? 'e' : ''} in der Sammlung</p>
	</header>

	<!-- Sort pills -->
	<div class="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-4 px-4">
		{#each sortOptions as opt}
			<button
				onclick={() => setSort(opt.value)}
				class="rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors {data.sort === opt.value ? 'bg-orange-500 text-white font-semibold' : 'bg-white border border-warm-200 text-warm-600'}"
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
					{#each data.filters.cuisines as c}
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
					{#each data.filters.stores as s}
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
					<option value="20">≤ 20 Min</option>
					<option value="30">≤ 30 Min</option>
					<option value="45">≤ 45 Min</option>
					<option value="60">≤ 60 Min</option>
				</select>
			</div>
		</div>
	</div>

	{#if data.recipes.length === 0}
		<div class="text-center py-16">
			<div class="text-5xl mb-4">📚</div>
			{#if hasFilters}
				<p class="text-warm-500 text-lg">Keine Rezepte mit diesen Filtern</p>
				<button onclick={resetFilters} class="text-spice-500 text-base font-medium mt-2 min-h-[44px] px-4">Filter zurücksetzen</button>
			{:else}
				<p class="text-warm-500 text-lg">Noch keine Rezepte übernommen</p>
				<p class="text-warm-400 text-sm mt-2">Geh zu den Vorschlägen und wähle Rezepte aus!</p>
				<a href="/vorschlaege" class="inline-block mt-4 px-6 py-3.5 min-h-[48px] bg-spice-500 text-white rounded-xl font-medium hover:bg-spice-600 transition-colors">
					Zu den Vorschlägen
				</a>
			{/if}
		</div>
	{:else}
		<div class="space-y-4 mb-6">
			{#each data.recipes as recipe (recipe.id)}
				<RecipeCard {recipe} expandable={true} {pantryNames} onPantryAdd={handlePantryAdd} onPantryRemove={handlePantryRemove} />
			{/each}
		</div>
	{/if}
</div>
