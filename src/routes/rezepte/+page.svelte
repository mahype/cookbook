<script lang="ts">
	import RecipeCard from '$lib/components/RecipeCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let cuisine = $state(data.filters.current.cuisine);
	let store = $state(data.filters.current.store);
	let maxTime = $state(data.filters.current.maxTime);
	let pantryNames = $state(data.pantryNames);

	const sortOptions = [
		{ value: 'newest', label: 'Neu' },
		{ value: 'pantry', label: 'Vorrat %' },
		{ value: 'cheapest', label: 'Günstig' },
		{ value: 'fastest', label: 'Schnell' },
		{ value: 'simplest', label: 'Simpel' }
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

	let fabOpen = $state(false);
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
		<div class="space-y-4 pb-24">
			{#each data.recipes as recipe (recipe.id)}
				<RecipeCard {recipe} expandable={true} {pantryNames} onPantryAdd={handlePantryAdd} onPantryRemove={handlePantryRemove} />
			{/each}
		</div>
	{/if}
</div>

<!-- FAB overlay backdrop -->
{#if fabOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
		onclick={() => (fabOpen = false)}
		onkeydown={(e) => e.key === 'Escape' && (fabOpen = false)}
	></div>
{/if}

<!-- FAB + menu -->
<div class="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-3">
	<!-- Menu items -->
	{#if fabOpen}
		<a
			href="/planen"
			class="flex items-center gap-3 animate-fade-in-up"
		>
			<span class="bg-white text-warm-800 text-sm font-medium px-3 py-2 rounded-lg shadow-md whitespace-nowrap">
				Essen planen
			</span>
			<span class="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shadow-md">
				<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
					<rect x="3" y="4" width="18" height="18" rx="2" />
					<line x1="16" y1="2" x2="16" y2="6" />
					<line x1="8" y1="2" x2="8" y2="6" />
					<line x1="3" y1="10" x2="21" y2="10" />
				</svg>
			</span>
		</a>
	{/if}

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
</div>

<style>
	@keyframes fade-in-up {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.animate-fade-in-up {
		animation: fade-in-up 0.2s ease-out;
	}
</style>
