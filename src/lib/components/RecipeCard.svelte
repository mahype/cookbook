<script lang="ts">
	import type { Recipe } from '$lib/server/db';
	import { slide } from 'svelte/transition';
	import RecipeDetails from './RecipeDetails.svelte';

	type Props = {
		recipe: Recipe;
		selectable?: boolean;
		selected?: boolean;
		onToggle?: (id: number) => void;
		expandable?: boolean;
		pantryNames?: string[];
		onPantryAdd?: (name: string) => void;
		onPantryRemove?: (name: string) => void;
	};

	let {
		recipe,
		selectable = false,
		selected = false,
		onToggle,
		expandable = false,
		pantryNames = [],
		onPantryAdd,
		onPantryRemove
	}: Props = $props();

	let expanded = $state(false);

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
	<div class="relative">
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
		{#if selectable}
			<div class="absolute top-3 right-3">
				<div
					class="w-9 h-9 rounded-full border-2 flex items-center justify-center transition-colors {selected
						? 'bg-spice-500 border-spice-500'
						: 'bg-white/80 border-warm-300'}"
				>
					{#if selected}
						<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
						</svg>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet cardContent()}
	<div class="p-4">
		<div class="flex items-start justify-between gap-2 mb-2">
			<h3 class="font-semibold text-warm-900 text-base leading-tight">{recipe.name}</h3>
		</div>
		{#if recipe.pantry_based}
			<span class="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-herb-100 text-herb-700 mb-2">
				🏠 Aus deinem Vorrat
			</span>
		{/if}
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
	class="bg-white rounded-2xl shadow-sm overflow-hidden border border-warm-100 transition-all duration-200 {selected
		? 'ring-2 ring-spice-500 shadow-md'
		: 'hover:shadow-md'}"
>
	{#if selectable}
		<button class="w-full text-left" onclick={() => onToggle?.(recipe.id)}>
			{@render cardImage()}
			{@render cardContent()}
		</button>
	{:else}
		<a href="/rezepte/{recipe.id}" class="block">
			{@render cardImage()}
			{@render cardContent()}
		</a>
	{/if}

	{#if expandable}
		<div class="border-t border-warm-100">
			<button
				onclick={() => (expanded = !expanded)}
				class="w-full flex items-center justify-center gap-1.5 py-3.5 min-h-[44px] text-sm text-warm-500 hover:text-warm-700 transition-colors"
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
