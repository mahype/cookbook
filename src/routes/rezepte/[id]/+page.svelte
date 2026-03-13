<script lang="ts">
	import { goto } from '$app/navigation';
	import { isMatchedByPantry } from '$lib/pantryMatch';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const recipe = data.recipe;

	let pantryNames = $state(data.pantryNames);
	let showDeleteDialog = $state(false);
	let deleting = $state(false);
	let addingIngredient = $state<string | null>(null);
	let pendingIngredient = $state<string | null>(null);
	let removingIngredient = $state<string | null>(null);
	let pendingRemoveIngredient = $state<string | null>(null);
	let addingToCart = $state<string | null>(null);
	let addingAllToCart = $state(false);

	const toBuy = $derived(
		recipe.ingredients.filter(
			(ing) => !isMatchedByPantry(ing.name, pantryNames)
		)
	);

	const atHome = $derived(
		recipe.ingredients.filter((ing) =>
			isMatchedByPantry(ing.name, pantryNames)
		)
	);

	const toBuySubtotal = $derived(
		toBuy.reduce((sum, ing) => sum + (ing.estimated_price || 0), 0)
	);

	const storeColors: Record<string, string> = {
		Discounter: 'bg-blue-100 text-blue-700',
		Supermarkt: 'bg-purple-100 text-purple-700',
		'Gemüsehändler': 'bg-herb-100 text-herb-700',
		'Asia-Laden': 'bg-red-100 text-red-700',
		Theke: 'bg-amber-100 text-amber-700'
	};

	const cuisineEmojis: Record<string, string> = {
		Deutsch: '🇩🇪',
		Asiatisch: '🥢',
		Italienisch: '🇮🇹',
		Mexikanisch: '🌮'
	};

	function formatPrice(price: number): string {
		return price.toFixed(2).replace('.', ',');
	}

	function placeholderGradient(name: string) {
		const hash = name.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
		const h1 = Math.abs(hash % 360);
		const h2 = (h1 + 40) % 360;
		return `linear-gradient(135deg, hsl(${h1}, 70%, 80%), hsl(${h2}, 60%, 70%))`;
	}

	function requestAddToPantry(name: string) {
		pendingIngredient = name;
	}

	async function confirmAddToPantry() {
		if (!pendingIngredient) return;
		const name = pendingIngredient;
		pendingIngredient = null;
		addingIngredient = name;
		try {
			const res = await fetch('/api/vorrat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});
			if (res.ok || res.status === 409) {
				const lower = name.toLowerCase();
				if (!pantryNames.includes(lower)) {
					pantryNames = [...pantryNames, lower];
				}
			}
		} finally {
			addingIngredient = null;
		}
	}

	function requestRemoveFromPantry(name: string) {
		pendingRemoveIngredient = name;
	}

	async function confirmRemoveFromPantry() {
		if (!pendingRemoveIngredient) return;
		const name = pendingRemoveIngredient;
		pendingRemoveIngredient = null;
		removingIngredient = name;
		try {
			const res = await fetch('/api/vorrat', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});
			if (res.ok) {
				pantryNames = pantryNames.filter((p) => p !== name.toLowerCase());
			}
		} finally {
			removingIngredient = null;
		}
	}

	async function addToShoppingList(ingredient: { name: string; amount: string; store: string; estimated_price?: number }) {
		addingToCart = ingredient.name;
		try {
			const checkRes = await fetch('/api/einkaufsliste/check', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ingredient_name: ingredient.name })
			});
			const checkData = await checkRes.json();
			if (checkData.exists) {
				return;
			}

			const res = await fetch('/api/einkaufsliste', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					items: [{
						ingredient_name: ingredient.name,
						ingredient_amount: ingredient.amount,
						recipe_name: recipe.name,
						store: ingredient.store,
						estimated_price: ingredient.estimated_price || 0
					}]
				})
			});
			} finally {
			addingToCart = null;
		}
	}

	async function addAllToShoppingList() {
		addingAllToCart = true;
		try {
			const items = toBuy.map((ing) => ({
				ingredient_name: ing.name,
				ingredient_amount: ing.amount,
				recipe_name: recipe.name,
				store: ing.store,
				estimated_price: ing.estimated_price || 0
			}));

			const res = await fetch('/api/einkaufsliste', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ items })
			});
			} finally {
			addingAllToCart = false;
		}
	}

	async function deleteRecipe() {
		deleting = true;
		const res = await fetch(`/api/rezepte/${recipe.id}`, { method: 'DELETE' });
		if (res.ok) {
			goto('/rezepte');
		} else {
			deleting = false;
			showDeleteDialog = false;
		}
	}
</script>

<div class="max-w-lg mx-auto">
	<!-- Hero Image -->
	<div class="relative">
		{#if recipe.image_url}
			<img
				src={recipe.image_url}
				alt={recipe.name}
				class="h-52 w-full object-cover"
				onerror={(e) => {
					const img = e.currentTarget as HTMLImageElement;
					img.style.display = 'none';
					img.nextElementSibling?.classList.remove('hidden');
				}}
			/>
			<div
				class="h-52 flex items-center justify-center text-6xl hidden"
				style="background: {placeholderGradient(recipe.name)}"
			>
				{cuisineEmojis[recipe.cuisine] || '🍽️'}
			</div>
		{:else}
			<div
				class="h-52 flex items-center justify-center text-6xl"
				style="background: {placeholderGradient(recipe.name)}"
			>
				{cuisineEmojis[recipe.cuisine] || '🍽️'}
			</div>
		{/if}
		<a
			href={recipe.status === 'approved' ? '/rezepte' : '/vorschlaege'}
			class="absolute top-4 left-4 w-11 h-11 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm"
		>
			<svg class="w-5 h-5 text-warm-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</a>
	</div>

	<div class="px-4 -mt-4 relative z-10">
		<!-- Info Card -->
		<div class="bg-white rounded-2xl p-5 shadow-sm border border-warm-100 mb-4">
			<h1 class="text-xl font-bold text-warm-900 mb-2">{recipe.name}</h1>
			<p class="text-warm-500 text-sm mb-4">{recipe.description}</p>

			<div class="flex flex-wrap gap-2 mb-4">
				<span class="text-xs px-3 py-1.5 rounded-full bg-warm-100 text-warm-700 font-medium">
					{recipe.cuisine}
				</span>
				<span class="text-xs px-3 py-1.5 rounded-full bg-warm-100 text-warm-700 font-medium">
					⏱ {recipe.prep_time} Min
				</span>
				<span class="text-xs px-3 py-1.5 rounded-full bg-warm-100 text-warm-700 font-medium">
					{recipe.difficulty}
				</span>
			</div>

			<div class="flex items-center justify-between bg-spice-50 rounded-xl px-4 py-3">
				<span class="text-sm text-spice-700 font-medium">Geschätzte Kosten (2 Pers.)</span>
				<span class="text-lg font-bold text-spice-600">~{formatPrice(recipe.cost_estimate)} €</span>
			</div>
		</div>

		<!-- Ingredients: To Buy -->
		<div class="bg-white rounded-2xl p-5 shadow-sm border border-warm-100 mb-4">
			{#if toBuy.length > 0}
				<h2 class="text-lg font-bold text-warm-900 mb-4">🛒 Das brauchst du</h2>
				<ul class="space-y-2">
					{#each toBuy as ingredient (ingredient.name)}
						<li class="flex items-center justify-between gap-3 rounded-xl bg-warm-50 px-3 py-2.5">
							<div class="flex-1 min-w-0">
								<div class="font-semibold text-base text-warm-800">{ingredient.name}</div>
								<div class="text-sm text-warm-400">
									{ingredient.amount}
									<span class="mx-0.5">·</span>
									<span class="{storeColors[ingredient.store] || 'bg-warm-100 text-warm-500'} px-1.5 py-0.5 rounded-full text-xs">{ingredient.store}</span>
									{#if ingredient.estimated_price}
										<span class="mx-0.5">·</span>
										~{formatPrice(ingredient.estimated_price)} €
									{/if}
								</div>
							</div>
							<div class="flex items-center gap-2 flex-shrink-0">
								<button
									onclick={() => addToShoppingList(ingredient)}
									disabled={addingToCart === ingredient.name}
									class="w-10 h-10 rounded-full bg-spice-100 text-spice-700 flex items-center justify-center hover:bg-spice-200 transition-colors disabled:opacity-50"
									title="Zur Einkaufsliste hinzufügen"
								>
									{#if addingToCart === ingredient.name}
										<span class="text-sm animate-pulse">···</span>
									{:else}
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
										</svg>
									{/if}
								</button>
								<button
									onclick={() => requestAddToPantry(ingredient.name)}
									disabled={addingIngredient === ingredient.name}
									class="w-10 h-10 rounded-full bg-herb-100 text-herb-700 flex items-center justify-center hover:bg-herb-200 transition-colors disabled:opacity-50"
									title="Zum Vorrat hinzufügen"
								>
									{#if addingIngredient === ingredient.name}
										<span class="text-sm animate-pulse">···</span>
									{:else}
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
										</svg>
									{/if}
								</button>
							</div>
						</li>
					{/each}
				</ul>

				<!-- Subtotal & Add All -->
				<div class="mt-4 pt-4 border-t border-warm-200 space-y-3">
					{#if toBuySubtotal > 0}
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium text-warm-600">Geschätzte Kosten</span>
							<span class="text-base font-bold text-warm-800">~{formatPrice(toBuySubtotal)} €</span>
						</div>
					{/if}
					<button
						onclick={addAllToShoppingList}
						disabled={addingAllToCart}
						class="w-full min-h-[48px] py-3 rounded-xl bg-spice-500 text-white text-base font-semibold hover:bg-spice-600 transition-colors disabled:opacity-50"
					>
						{addingAllToCart ? 'Wird hinzugefügt...' : '🛒 Alle Zutaten zur Einkaufsliste'}
					</button>
				</div>
			{:else}
				<p class="text-base text-warm-500">Alle Zutaten hast du zuhause! 🎉</p>
			{/if}

			<!-- Ingredients: At Home -->
			{#if atHome.length > 0}
				<div class="mt-5 pt-4 border-t border-warm-200">
					<h3 class="text-sm font-semibold text-warm-600 mb-3">🏠 Hast du im Vorrat</h3>
					<ul class="space-y-2">
						{#each atHome as ingredient (ingredient.name)}
							<li class="flex items-center justify-between gap-3 rounded-xl bg-warm-50 px-3 py-2.5 opacity-60">
								<div class="flex-1 min-w-0">
									<div class="font-semibold text-base text-warm-800">{ingredient.name}</div>
									<div class="text-sm text-warm-400">{ingredient.amount}</div>
								</div>
								<div class="flex items-center gap-2 flex-shrink-0">
									<button
										onclick={() => requestRemoveFromPantry(ingredient.name)}
										disabled={removingIngredient === ingredient.name}
										class="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors disabled:opacity-50"
										title="Aus Vorrat entfernen"
									>
										{#if removingIngredient === ingredient.name}
											<span class="text-sm animate-pulse">···</span>
										{:else}
											<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M20 12H4" />
											</svg>
										{/if}
									</button>
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

		<!-- Steps -->
		<div class="bg-white rounded-2xl p-5 shadow-sm border border-warm-100 mb-4">
			<h2 class="text-lg font-bold text-warm-900 mb-4">Zubereitung</h2>
			<ol class="space-y-4">
				{#each recipe.steps as step, i}
					<li class="flex gap-3">
						<span class="flex-shrink-0 w-7 h-7 rounded-full bg-spice-500 text-white text-sm font-semibold flex items-center justify-center">
							{i + 1}
						</span>
						<p class="text-sm text-warm-700 leading-relaxed pt-0.5">{step}</p>
					</li>
				{/each}
			</ol>
		</div>

		<!-- Tags -->
		{#if recipe.shopping_tags.length > 0}
			<div class="bg-white rounded-2xl p-5 shadow-sm border border-warm-100 mb-4">
				<h2 class="text-lg font-bold text-warm-900 mb-3">Zutaten-Tags</h2>
				<div class="flex flex-wrap gap-2">
					{#each recipe.shopping_tags as tag}
						<span class="text-xs px-3 py-1.5 rounded-full bg-herb-100 text-herb-700 font-medium">
							{tag}
						</span>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Related Recipes -->
		{#if data.related.length > 0}
			<div class="mb-4">
				<h2 class="text-lg font-bold text-warm-900 mb-3">Ähnliche Zutaten</h2>
				<div class="space-y-3">
					{#each data.related as rel}
						<a href="/rezepte/{rel.id}" class="flex items-center gap-3 bg-white rounded-xl p-3.5 border border-warm-100 shadow-sm hover:shadow-md transition-shadow min-h-[56px]">
							{#if rel.image_url}
								<img
									src={rel.image_url}
									alt={rel.name}
									class="w-14 h-14 rounded-lg object-cover flex-shrink-0"
								/>
							{:else}
								<div
									class="w-14 h-14 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
									style="background: {placeholderGradient(rel.name)}"
								>
									{cuisineEmojis[rel.cuisine] || '🍽️'}
								</div>
							{/if}
							<div class="flex-1 min-w-0">
								<h3 class="text-sm font-semibold text-warm-900 truncate">{rel.name}</h3>
								<p class="text-xs text-warm-400">{rel.cuisine} · {rel.prep_time} Min · ~{formatPrice(rel.cost_estimate)} €</p>
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Delete Button -->
		<div class="mb-8">
			<button
				onclick={() => (showDeleteDialog = true)}
				class="w-full min-h-[48px] py-3.5 rounded-xl border border-red-200 text-red-500 text-base font-medium hover:bg-red-50 transition-colors"
			>
				Rezept löschen
			</button>
		</div>
	</div>
</div>

<!-- Delete Confirmation Dialog -->
{#if showDeleteDialog}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
		<div class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
			<h3 class="text-lg font-bold text-warm-900 mb-2">Rezept löschen?</h3>
			<p class="text-sm text-warm-500 mb-6">Möchtest du dieses Rezept wirklich löschen?</p>
			<div class="flex gap-3">
				<button
					onclick={() => (showDeleteDialog = false)}
					class="flex-1 min-h-[48px] rounded-xl border border-warm-200 text-warm-700 text-base font-medium hover:bg-warm-50 transition-colors"
				>
					Abbrechen
				</button>
				<button
					onclick={deleteRecipe}
					disabled={deleting}
					class="flex-1 min-h-[48px] rounded-xl bg-red-500 text-white text-base font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
				>
					{deleting ? 'Löscht...' : 'Ja, löschen'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Pantry Add Confirmation -->
<ConfirmDialog
	open={pendingIngredient !== null}
	title="Zum Vorrat hinzufügen?"
	message="«{pendingIngredient}» zu deinen Vorräten hinzufügen? Die Zutat wird künftig in allen Rezepten als vorhanden markiert."
	confirmLabel="Ja, hinzufügen"
	cancelLabel="Abbrechen"
	onConfirm={confirmAddToPantry}
	onCancel={() => (pendingIngredient = null)}
/>

<!-- Pantry Remove Confirmation -->
<ConfirmDialog
	open={pendingRemoveIngredient !== null}
	title="Aus Vorrat entfernen?"
	message="«{pendingRemoveIngredient}» aus deinen Vorräten entfernen?"
	confirmLabel="Ja, entfernen"
	cancelLabel="Abbrechen"
	onConfirm={confirmRemoveFromPantry}
	onCancel={() => (pendingRemoveIngredient = null)}
/>
