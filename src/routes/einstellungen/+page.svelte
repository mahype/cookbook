<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const allCuisines = [
		'Deutsch',
		'Asiatisch',
		'Thailändisch',
		'Japanisch',
		'Koreanisch',
		'Indisch',
		'Arabisch/Orientalisch',
		'Italienisch',
		'Mexikanisch',
		'Griechisch',
		'Amerikanisch',
		'Französisch'
	];

	const cuisineEmojis: Record<string, string> = {
		Deutsch: '🇩🇪',
		Asiatisch: '🥢',
		Thailändisch: '🇹🇭',
		Japanisch: '🇯🇵',
		Koreanisch: '🇰🇷',
		Indisch: '🇮🇳',
		'Arabisch/Orientalisch': '🕌',
		Italienisch: '🇮🇹',
		Mexikanisch: '🌮',
		Griechisch: '🇬🇷',
		Amerikanisch: '🇺🇸',
		Französisch: '🇫🇷'
	};

	let selected = $state<Set<string>>(new Set(data.cuisinePreferences));
	let recipeNotes = $state(data.recipeNotes);
	let saving = $state(false);
	let savingNotes = $state(false);
	let message = $state('');

	function toggle(cuisine: string) {
		const next = new Set(selected);
		if (next.has(cuisine)) {
			next.delete(cuisine);
		} else {
			next.add(cuisine);
		}
		selected = next;
		save(next);
	}

	async function save(current: Set<string>) {
		saving = true;
		message = '';
		try {
			const res = await fetch('/api/einstellungen', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cuisine_preferences: Array.from(current) })
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
</script>

<div class="max-w-lg mx-auto px-4 pt-6">
	<h1 class="text-2xl font-bold text-warm-900 mb-2">⚙️ Einstellungen</h1>
	<p class="text-sm text-warm-500 mb-6">
		Wähle deine bevorzugten Küchen – deine Rezeptvorschläge werden entsprechend gewichtet.
	</p>

	<div class="bg-white rounded-2xl shadow-sm border border-warm-100 overflow-hidden">
		<h2 class="px-5 pt-4 pb-2 text-sm font-semibold text-warm-500 uppercase tracking-wide">
			Küchen-Präferenzen
		</h2>
		<ul>
			{#each allCuisines as cuisine}
				{@const isSelected = selected.has(cuisine)}
				<li>
					<button
						onclick={() => toggle(cuisine)}
						class="w-full flex items-center justify-between px-5 py-4 min-h-[52px] hover:bg-warm-50 transition-colors active:bg-warm-100"
					>
						<div class="flex items-center gap-3">
							<span class="text-xl w-8 text-center">{cuisineEmojis[cuisine] || '🍽️'}</span>
							<span class="text-base font-medium text-warm-800">{cuisine}</span>
						</div>
						<div
							class="w-12 h-7 rounded-full transition-colors duration-200 flex items-center {isSelected
								? 'bg-spice-500'
								: 'bg-warm-200'}"
						>
							<div
								class="w-5.5 h-5.5 bg-white rounded-full shadow-sm transition-transform duration-200 mx-0.5 {isSelected
									? 'translate-x-5'
									: 'translate-x-0'}"
							></div>
						</div>
					</button>
				</li>
			{/each}
		</ul>
	</div>

	<div class="bg-white rounded-2xl shadow-sm border border-warm-100 overflow-hidden mt-6">
		<h2 class="px-5 pt-4 pb-2 text-sm font-semibold text-warm-500 uppercase tracking-wide">
			📝 Deine Wünsche & Präferenzen
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
		{selected.size} {selected.size === 1 ? 'Küche' : 'Küchen'} ausgewählt
		{#if saving}· Speichert...{/if}
	</p>
</div>
