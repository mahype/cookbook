<script lang="ts">
	import type { Recipe } from '$lib/server/db';
	import { slide } from 'svelte/transition';
	import RecipeDetails from './RecipeDetails.svelte';

	type Props = {
		recipe: Recipe;
		approvable?: boolean;
		expandable?: boolean;
		pantryNames?: string[];
		onPantryAdd?: (name: string) => void;
		onPantryRemove?: (name: string) => void;
	};

	let {
		recipe,
		approvable = false,
		expandable = false,
		pantryNames = [],
		onPantryAdd,
		onPantryRemove
	}: Props = $props();

	let expanded = $state(false);
	let approved = $state(recipe.status === 'approved');
	let approving = $state(false);

	async function approveRecipe(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		if (approving || approved) return;
		approving = true;

		try {
			const res = await fetch('/api/rezepte/approve', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids: [recipe.id] })
			});
			if (res.ok) {
				approved = true;
			}
		} catch {
			// error silently handled
		} finally {
			approving = false;
		}
	}

	const cuisineColors: Record<string, string> = {
		Deutsch: 'bg-amber-100 text-amber-800',
		Asiatisch: 'bg-red-100 text-red-800',
		Italienisch: 'bg-green-100 text-green-800',
		Mexikanisch: 'bg-orange-100 text-orange-800'
	};

	const difficultyColors: Record<string, string> = {
		Einfach: 'bg-herb-100 text-herb-800',
		Mittel: 'bg-spice-100 text-spice-800'
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

{#snippet cardImage()}
	<div class="relative overflow-hidden">
		{#if recipe.image_url}
			<img
				src={recipe.image_url}
				alt={recipe.name}
				class="h-36 w-full object-cover"
				onerror={(e) => {
					const img = e.currentTarget as HTMLImageElement;
					img.style.display = 'none';
					img.nextElementSibling?.classList.remove('hidden');
				}}
			/>
			<div
				class="h-36 flex items-center justify-center text-4xl hidden"
				style="background: {placeholderGradient(recipe.name)}"
			>
				{cuisineEmojis[recipe.cuisine] || '🍽️'}
			</div>
		{:else}
			<div
				class="h-36 flex items-center justify-center text-4xl"
				style="background: {placeholderGradient(recipe.name)}"
			>
				{cuisineEmojis[recipe.cuisine] || '🍽️'}
			</div>
		{/if}
		{#if recipe.pantry_based}
			<div class="absolute top-0 left-0 z-10">
				<div
					class="absolute bg-emerald-600 text-white text-sm font-bold text-center leading-tight py-1.5"
					style="width: 200px; top: 30px; left: -50px; transform: rotate(-45deg);"
				>
					Aus dem Vorrat
				</div>
			</div>
		{/if}
		{#if approvable && approved}
			<div class="absolute top-3 right-3">
				<div class="flex items-center gap-1 bg-green-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-full shadow">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
					</svg>
					Übernommen
				</div>
			</div>
		{:else if approvable && !approved}
			<div class="absolute top-3 right-3">
				<button
					onclick={approveRecipe}
					disabled={approving}
					class="w-11 h-11 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white flex items-center justify-center shadow-lg transition-all duration-150"
				>
					{#if approving}
						<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
						</svg>
					{:else}
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14m-7-7h14" />
						</svg>
					{/if}
				</button>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet cardContent()}
	<div class="p-4">
		<div class="flex items-start justify-between gap-2 mb-2">
			<h3 class="font-semibold text-warm-900 text-base leading-tight">{recipe.name}</h3>
		</div>
		<p class="text-warm-500 text-sm mb-3 line-clamp-2">{recipe.description}</p>
		<div class="flex flex-wrap gap-1.5">
			<span
				class="text-xs px-2 py-0.5 rounded-full {cuisineColors[recipe.cuisine] ||
					'bg-warm-100 text-warm-700'}"
			>
				{recipe.cuisine}
			</span>
			<span class="text-xs px-2 py-0.5 rounded-full {difficultyColors[recipe.difficulty]}">
				{recipe.difficulty}
			</span>
			<span class="text-xs px-2 py-0.5 rounded-full bg-warm-100 text-warm-700">
				⏱ {recipe.prep_time} Min
			</span>
			<span class="text-xs px-2 py-0.5 rounded-full bg-warm-100 text-warm-700">
				~{recipe.cost_estimate.toFixed(2)}€
			</span>
		</div>
	</div>
{/snippet}

<div
	class="rounded-2xl shadow-sm overflow-hidden border transition-all duration-200 {approved && approvable
		? 'border-green-200 opacity-60'
		: recipe.pantry_based
			? 'bg-emerald-50 border-green-200 hover:shadow-md'
			: 'bg-white border-warm-100 hover:shadow-md'}"
>
	<a href="/rezepte/{recipe.id}" class="block">
		{@render cardImage()}
		{@render cardContent()}
	</a>

	{#if expandable}
		<div class="border-t border-warm-100">
			<button
				onclick={() => (expanded = !expanded)}
				class="w-full flex items-center justify-center gap-1.5 py-3.5 min-h-[44px] text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
			>
				<span>{expanded ? 'Zuklappen' : 'Details anzeigen'}</span>
				<svg
					class="w-4 h-4 transition-transform duration-200 {expanded ? 'rotate-180' : ''}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>
		</div>
		{#if expanded}
			<div class="border-t border-warm-100" transition:slide={{ duration: 200 }}>
				<RecipeDetails {recipe} {pantryNames} {onPantryAdd} {onPantryRemove} />
			</div>
		{/if}
	{/if}
</div>
