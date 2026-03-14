<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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

	let ratings = $state<Record<string, number>>({ ...data.cuisinePreferences });

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

	let recipeNotes = $state(data.recipeNotes);
	let saving = $state(false);
	let savingNotes = $state(false);
	let message = $state('');

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
		saving = true;
		message = '';
		try {
			// Send only non-zero ratings
			const prefs: Record<string, number> = {};
			for (const [k, v] of Object.entries(ratings)) {
				if (v > 0) prefs[k] = v;
			}
			const res = await fetch('/api/einstellungen', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cuisine_preferences: prefs })
			});
			if (res.ok) {
				message = 'Gespeichert!';
				setTimeout(() => (message = ''), 2000);
			} else {
				message = 'Fehler beim Speichern';
			}
		} catch {
			message = 'Netzwerkfehler';
		} finally {
			saving = false;
		}
	}

	async function saveNotes() {
		savingNotes = true;
		message = '';
		try {
			const res = await fetch('/api/einstellungen', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ recipe_notes: recipeNotes })
			});
			if (res.ok) {
				message = 'Gespeichert!';
				setTimeout(() => (message = ''), 2000);
			} else {
				message = 'Fehler beim Speichern';
			}
		} catch {
			message = 'Netzwerkfehler';
		} finally {
			savingNotes = false;
		}
	}

	function totalActive(): number {
		return Object.values(ratings).filter(v => v > 0).length;
	}
</script>

<div class="max-w-lg mx-auto px-4 pt-6">
	<h1 class="text-2xl font-bold text-warm-900 mb-2 flex items-center gap-2"><svg class="w-6 h-6 text-warm-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> Einstellungen</h1>
	<p class="text-sm text-warm-500 mb-6">
		Bewerte deine bevorzugten Küchen – deine Rezeptvorschläge werden entsprechend gewichtet.
	</p>

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
				disabled={savingNotes}
				class="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-spice-500 hover:bg-spice-600 active:bg-spice-700 transition-colors disabled:opacity-50"
			>
				{savingNotes ? 'Speichert...' : 'Wünsche speichern'}
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

	{#if message}
		<div
			class="mt-4 text-center text-sm font-medium py-2 px-4 rounded-xl {message.includes('Fehler') || message.includes('Netzwerk')
				? 'bg-red-50 text-red-700'
				: 'bg-herb-50 text-herb-700'}"
		>
			{message}
		</div>
	{/if}

	<p class="text-xs text-warm-400 text-center mt-4 mb-6">
		{totalActive()} {totalActive() === 1 ? 'Küche' : 'Küchen'} ausgewählt
		{#if saving}· Speichert...{/if}
	</p>
</div>
