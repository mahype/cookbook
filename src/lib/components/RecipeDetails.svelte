<script lang="ts">
	import type { Recipe } from '$lib/server/db';
	import { isMatchedByPantry } from '$lib/pantryMatch';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import Toast from './Toast.svelte';

	type Props = {
		recipe: Recipe;
		pantryNames: string[];
		onPantryAdd?: (name: string) => void;
		onPantryRemove?: (name: string) => void;
	};

	let { recipe, pantryNames, onPantryAdd, onPantryRemove }: Props = $props();

	let addingIngredient = $state<string | null>(null);
	let pendingIngredient = $state<string | null>(null);
	let removingIngredient = $state<string | null>(null);
	let pendingRemoveIngredient = $state<string | null>(null);
	let addingToCart = $state<string | null>(null);
	let addingAllToCart = $state(false);
	let toastMessage = $state('');

	const storeColors: Record<string, string> = {
		Discounter: 'bg-blue-100 text-blue-700',
		Supermarkt: 'bg-purple-100 text-purple-700',
		Gemüsehändler: 'bg-herb-100 text-herb-700',
		'Asia-Laden': 'bg-red-100 text-red-700',
		Theke: 'bg-amber-100 text-amber-700'
	};

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

	function formatPrice(price: number): string {
		return price.toFixed(2).replace('.', ',');
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
				onPantryAdd?.(name);
				toastMessage = `✅ ${name} zu deinen Vorräten hinzugefügt`;
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
				onPantryRemove?.(name);
				toastMessage = `❌ ${name} aus Vorräten entfernt`;
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
				toastMessage = `Bereits auf der Einkaufsliste`;
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
			if (res.ok) {
				toastMessage = `🛒 ${ingredient.name} zur Einkaufsliste hinzugefügt`;
			}
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
			if (res.ok) {
				toastMessage = `🛒 ${items.length} Zutaten zur Einkaufsliste hinzugefügt`;
			}
		} finally {
			addingAllToCart = false;
		}
	}
</script>

<div class="px-4 pb-4 pt-3 space-y-4">
	<!-- Ingredients: To Buy -->
	<div>
		{#if toBuy.length > 0}
			<h4 class="text-sm font-semibold text-warm-800 mb-3">🛒 Das brauchst du</h4>
			<ul class="space-y-1">
				{#each toBuy as ingredient (ingredient.name)}
					<li class="flex items-center justify-between gap-2 py-2">
						<div class="flex-1 min-w-0">
							<span class="text-base text-warm-800">{ingredient.name}</span>
							<span class="text-sm text-warm-400 ml-1">– {ingredient.amount}</span>
							{#if ingredient.estimated_price}
								<span class="text-sm text-warm-400 ml-1">— ~{formatPrice(ingredient.estimated_price)} €</span>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							<span
								class="text-xs px-2 py-1 rounded-full whitespace-nowrap {storeColors[ingredient.store] || 'bg-warm-100 text-warm-600'}"
							>
								{ingredient.store}
							</span>
							<button
								onclick={() => addToShoppingList(ingredient)}
								disabled={addingToCart === ingredient.name}
								class="w-10 h-10 rounded-full bg-spice-100 text-spice-700 flex items-center justify-center hover:bg-spice-200 transition-colors disabled:opacity-50 flex-shrink-0"
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
							{#if onPantryAdd}
								<button
									onclick={() => requestAddToPantry(ingredient.name)}
									disabled={addingIngredient === ingredient.name}
									class="w-10 h-10 rounded-full bg-herb-100 text-herb-700 flex items-center justify-center hover:bg-herb-200 transition-colors disabled:opacity-50 flex-shrink-0"
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
							{/if}
						</div>
					</li>
				{/each}
			</ul>

			<!-- Subtotal & Add All -->
			<div class="mt-3 pt-3 border-t border-warm-200 space-y-3">
				{#if toBuySubtotal > 0}
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-warm-600">Geschätzte Kosten</span>
						<span class="text-sm font-bold text-warm-800">~{formatPrice(toBuySubtotal)} €</span>
					</div>
				{/if}
				<button
					onclick={addAllToShoppingList}
					disabled={addingAllToCart}
					class="w-full min-h-[44px] py-2.5 rounded-xl bg-spice-500 text-white text-sm font-semibold hover:bg-spice-600 transition-colors disabled:opacity-50"
				>
					{addingAllToCart ? 'Wird hinzugefügt...' : '🛒 Alle Zutaten zur Einkaufsliste'}
				</button>
			</div>
		{:else}
			<p class="text-base text-warm-500">Alle Zutaten zuhause! 🎉</p>
		{/if}

		<!-- Ingredients: At Home -->
		{#if atHome.length > 0}
			<div class="mt-3 pt-3 border-t border-warm-200">
				<h4 class="text-sm font-semibold text-warm-500 mb-2">🏠 Hast du im Vorrat</h4>
				<ul class="space-y-1 rounded-xl bg-warm-50 px-3 py-1">
					{#each atHome as ingredient (ingredient.name)}
						<li class="flex items-center justify-between gap-2 opacity-60 py-2">
							<div class="flex-1 min-w-0">
								<span class="text-base text-warm-800">{ingredient.name}</span>
								<span class="text-sm text-warm-400 ml-1">– {ingredient.amount}</span>
							</div>
							<div class="flex items-center gap-2">
								<span
									class="text-xs px-2 py-1 rounded-full whitespace-nowrap {storeColors[ingredient.store] || 'bg-warm-100 text-warm-600'}"
								>
									{ingredient.store}
								</span>
								{#if onPantryRemove}
									<button
										onclick={() => requestRemoveFromPantry(ingredient.name)}
										disabled={removingIngredient === ingredient.name}
										class="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors disabled:opacity-50 flex-shrink-0"
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
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>

	<!-- Steps -->
	<div>
		<h4 class="text-sm font-semibold text-warm-800 mb-2">Zubereitung</h4>
		<ol class="space-y-2">
			{#each recipe.steps as step, i}
				<li class="flex gap-2">
					<span
						class="flex-shrink-0 w-6 h-6 rounded-full bg-spice-500 text-white text-xs font-semibold flex items-center justify-center mt-0.5"
					>
						{i + 1}
					</span>
					<p class="text-sm text-warm-700 leading-relaxed">{step}</p>
				</li>
			{/each}
		</ol>
	</div>
</div>

<ConfirmDialog
	open={pendingIngredient !== null}
	title="Zum Vorrat hinzufügen?"
	message="«{pendingIngredient}» zu deinen Vorräten hinzufügen? Die Zutat wird künftig in allen Rezepten als vorhanden markiert."
	confirmLabel="Ja, hinzufügen"
	cancelLabel="Abbrechen"
	onConfirm={confirmAddToPantry}
	onCancel={() => (pendingIngredient = null)}
/>

<ConfirmDialog
	open={pendingRemoveIngredient !== null}
	title="Aus Vorrat entfernen?"
	message="«{pendingRemoveIngredient}» aus deinen Vorräten entfernen?"
	confirmLabel="Ja, entfernen"
	cancelLabel="Abbrechen"
	onConfirm={confirmRemoveFromPantry}
	onCancel={() => (pendingRemoveIngredient = null)}
/>

<Toast message={toastMessage} onClose={() => (toastMessage = '')} />
