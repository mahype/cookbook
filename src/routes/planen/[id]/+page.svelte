<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import StepIndicator from '$lib/components/StepIndicator.svelte';
	import type { Recipe, Person } from '$lib/server/db';

	const planId = $derived(page.params.id);

	let persons = $state<Person[]>([]);
	let recipes = $state<Recipe[]>([]);
	let pantryNames = $state<string[]>([]);
	let selectedRecipeIds = $state<Set<number>>(new Set());
	let loading = $state(true);
	let saving = $state(false);
	let sort = $state('newest');

	const sortOptions = [
		{ value: 'newest', label: 'Neu' },
		{ value: 'pantry', label: 'Vorrat %' },
		{ value: 'cheapest', label: 'Günstig' },
		{ value: 'fastest', label: 'Schnell' },
		{ value: 'simplest', label: 'Simpel' }
	] as const;

	async function loadData() {
		loading = true;
		try {
			const [planRes, recipesRes] = await Promise.all([
				fetch(`/api/planen/${planId}`),
				fetch(`/api/planen/${planId}/rezepte?sort=${sort}`)
			]);

			if (planRes.ok) {
				const planData = await planRes.json();
				persons = planData.persons;
				// Restore previously selected recipes
				const existingIds: number[] = planData.meal_plan.recipe_ids;
				if (existingIds.length > 0) {
					selectedRecipeIds = new Set(existingIds);
				}
			}

			if (recipesRes.ok) {
				const recipeData = await recipesRes.json();
				recipes = recipeData.recipes;
				pantryNames = recipeData.pantryNames;
			}
		} catch {
			// ignore
		} finally {
			loading = false;
		}
	}

	loadData();

	function setSort(value: string) {
		sort = value;
		loadRecipes();
	}

	async function loadRecipes() {
		try {
			const res = await fetch(`/api/planen/${planId}/rezepte?sort=${sort}`);
			if (res.ok) {
				const data = await res.json();
				recipes = data.recipes;
				pantryNames = data.pantryNames;
			}
		} catch {
			// ignore
		}
	}

	function toggleRecipe(id: number) {
		const next = new Set(selectedRecipeIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selectedRecipeIds = next;
	}

	const selectionCount = $derived(selectedRecipeIds.size);

	async function handleWeiter() {
		if (selectionCount === 0 || saving) return;
		saving = true;
		try {
			await fetch(`/api/planen/${planId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ recipe_ids: Array.from(selectedRecipeIds) })
			});
			goto(`/planen/${planId}/abstimmung`);
		} catch {
			// ignore
		} finally {
			saving = false;
		}
	}

	async function handleSkipVoting() {
		if (selectionCount === 0 || saving) return;
		saving = true;
		try {
			// Set recipes and mark completed in one step
			await fetch(`/api/planen/${planId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					recipe_ids: Array.from(selectedRecipeIds),
					status: 'completed',
					winner_recipe_id: Array.from(selectedRecipeIds)[0]
				})
			});
			goto(`/planen/${planId}/abstimmung`);
		} catch {
			// ignore
		} finally {
			saving = false;
		}
	}

	const cuisineColors: Record<string, string> = {
		Deutsch: 'bg-amber-100 text-amber-800',
		Asiatisch: 'bg-red-100 text-red-800',
		Italienisch: 'bg-green-100 text-green-800',
		Mexikanisch: 'bg-orange-100 text-orange-800'
	};

	const cuisineEmojis: Record<string, string> = {
		Deutsch: '🇩🇪',
		Asiatisch: '🥢',
		Italienisch: '🇮🇹',
		Mexikanisch: '🌮'
	};

	function placeholderGradient(name: string) {
		const hash = name.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
		const h1 = Math.abs(hash % 360);
		const h2 = (h1 + 40) % 360;
		return `linear-gradient(135deg, hsl(${h1}, 70%, 80%), hsl(${h2}, 60%, 70%))`;
	}
</script>

<div class="max-w-lg mx-auto px-4 pt-6 pb-40">
	<StepIndicator current={2} />

	<header class="mb-4">
		<h1 class="text-2xl font-bold text-warm-900">Rezepte auswählen</h1>
	</header>

	<!-- Person info bar -->
	{#if persons.length > 0}
		<div class="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
			<svg class="w-4 h-4 text-warm-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			{#each persons as person}
				<span class="text-xs font-medium bg-warm-100 text-warm-700 px-2.5 py-1 rounded-full whitespace-nowrap">{person.name}</span>
			{/each}
		</div>
	{/if}

	<!-- Sort pills -->
	<div class="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-4 px-4">
		{#each sortOptions as opt}
			<button
				onclick={() => setSort(opt.value)}
				class="rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors {sort === opt.value ? 'bg-orange-500 text-white font-semibold' : 'bg-white border border-warm-200 text-warm-600'}"
			>
				{opt.label}
			</button>
		{/each}
	</div>

	{#if loading}
		<div class="text-center py-16 text-warm-500">Laden...</div>
	{:else if recipes.length === 0}
		<div class="text-center py-16">
			<svg class="w-12 h-12 mx-auto text-warm-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
			</svg>
			<p class="text-warm-500">Keine passenden Rezepte gefunden</p>
			<p class="text-warm-400 text-sm mt-1">Alle Rezepte enthalten unverträgliche Zutaten</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each recipes as recipe (recipe.id)}
				{@const isSelected = selectedRecipeIds.has(recipe.id)}
				<button
					onclick={() => toggleRecipe(recipe.id)}
					class="w-full text-left rounded-2xl shadow-sm overflow-hidden border-2 transition-all duration-150 bg-white
						{isSelected ? 'border-herb-400 ring-1 ring-herb-200' : 'border-warm-100 hover:border-warm-200'}"
				>
					<div class="flex">
						<!-- Recipe thumbnail -->
						<div class="w-24 h-24 flex-shrink-0 relative overflow-hidden">
							{#if recipe.image_url}
								<img src={recipe.image_url} alt={recipe.name} class="w-full h-full object-cover" />
							{:else}
								<div class="w-full h-full flex items-center justify-center text-2xl" style="background: {placeholderGradient(recipe.name)}">
									{cuisineEmojis[recipe.cuisine] || '🍽️'}
								</div>
							{/if}
						</div>

						<!-- Recipe info -->
						<div class="flex-1 p-3 min-w-0">
							<h3 class="font-semibold text-warm-900 text-sm leading-tight mb-1 truncate">{recipe.name}</h3>
							<p class="text-warm-500 text-xs mb-2 line-clamp-1">{recipe.description}</p>
							<div class="flex flex-wrap gap-1">
								<span class="text-[10px] px-1.5 py-0.5 rounded-full {cuisineColors[recipe.cuisine] || 'bg-warm-100 text-warm-700'}">
									{recipe.cuisine}
								</span>
								<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-warm-100 text-warm-700">
									{recipe.prep_time} Min
								</span>
								<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-warm-100 text-warm-700">
									~{recipe.cost_estimate.toFixed(2)}€
								</span>
							</div>
						</div>

						<!-- Selection indicator -->
						<div class="flex items-center pr-3">
							{#if isSelected}
								<div class="w-7 h-7 rounded-full bg-herb-500 flex items-center justify-center">
									<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
									</svg>
								</div>
							{:else}
								<div class="w-7 h-7 rounded-full bg-spice-500 flex items-center justify-center">
									<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14m-7-7h14" />
									</svg>
								</div>
							{/if}
						</div>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>

<!-- Bottom bar -->
{#if selectionCount > 0}
	<div class="fixed bottom-20 left-0 right-0 px-4 pt-3 pb-3 z-30 bg-warm-50 border-t border-warm-200">
		<div class="max-w-lg mx-auto space-y-2">
			<button
				onclick={handleWeiter}
				disabled={saving}
				class="w-full bg-spice-500 hover:bg-spice-600 disabled:opacity-60 text-white py-4 rounded-2xl text-base font-semibold shadow-lg transition-colors"
			>
				{saving ? 'Wird gespeichert...' : `Weiter mit ${selectionCount} Rezept${selectionCount !== 1 ? 'en' : ''}`}
			</button>
			<button
				onclick={handleSkipVoting}
				disabled={saving}
				class="w-full text-warm-500 hover:text-warm-700 text-sm font-medium py-2 transition-colors"
			>
				Ohne Abstimmung abschließen
			</button>
		</div>
	</div>
{/if}
