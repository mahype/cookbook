<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import { isCapacitor, savePreference } from '$lib/stores/data';

	let step = $state(1);
	let direction = $state(1); // 1 = forward, -1 = back

	// --- Step 1: AI Provider ---
	const providerList = [
		{ id: 'openai', name: 'OpenAI', defaultUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' },
		{ id: 'anthropic', name: 'Anthropic', defaultUrl: 'https://api.anthropic.com/v1', defaultModel: 'claude-sonnet-4-20250514' },
		{ id: 'mistral', name: 'Mistral', defaultUrl: 'https://api.mistral.ai/v1', defaultModel: 'mistral-small-latest' },
		{ id: 'openrouter', name: 'OpenRouter', defaultUrl: 'https://openrouter.ai/api/v1', defaultModel: 'auto' },
		{ id: 'ollama', name: 'Ollama', defaultUrl: 'http://localhost:11434/v1', defaultModel: 'llama3.2' },
		{ id: 'custom', name: 'Custom', defaultUrl: '', defaultModel: '' }
	];

	let aiProviderId = $state('');
	let aiApiKey = $state('');
	let aiModel = $state('');
	let aiBaseUrl = $state('');
	let showApiKey = $state(false);
	let aiTestState: 'idle' | 'loading' | 'success' | 'error' = $state('idle');
	let aiTestError = $state('');

	function selectProvider(id: string) {
		const p = providerList.find(p => p.id === id);
		if (!p) return;
		aiProviderId = id;
		aiBaseUrl = p.defaultUrl;
		aiModel = p.defaultModel;
		aiApiKey = '';
		aiTestState = 'idle';
		aiTestError = '';
	}

	async function testAI() {
		aiTestState = 'loading';
		aiTestError = '';
		try {
			const provider = {
				id: aiProviderId,
				name: providerList.find(p => p.id === aiProviderId)?.name ?? aiProviderId,
				baseUrl: aiBaseUrl,
				model: aiModel,
				apiKey: aiApiKey
			};

			if (isCapacitor()) {
				// Direct API test
				const isAnthropic = aiProviderId === 'anthropic';
				const url = isAnthropic
					? `${aiBaseUrl}/messages`
					: `${aiBaseUrl}/chat/completions`;

				const headers: Record<string, string> = { 'Content-Type': 'application/json' };
				if (isAnthropic) {
					headers['x-api-key'] = aiApiKey;
					headers['anthropic-version'] = '2023-06-01';
					headers['anthropic-dangerous-direct-browser-access'] = 'true';
				} else {
					headers['Authorization'] = `Bearer ${aiApiKey}`;
				}

				const body = isAnthropic
					? { model: aiModel, max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }
					: { model: aiModel, max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] };

				const res = await fetch(url, {
					method: 'POST',
					headers,
					body: JSON.stringify(body)
				});

				if (!res.ok) {
					const err = await res.text();
					throw new Error(err.slice(0, 100));
				}
			} else {
				const res = await fetch('/api/ai/test', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ provider })
				});
				if (!res.ok) throw new Error('Test fehlgeschlagen');
			}

			aiTestState = 'success';
			setTimeout(() => aiTestState = 'idle', 2000);
		} catch (e: any) {
			aiTestState = 'error';
			aiTestError = e.message || 'Verbindung fehlgeschlagen';
			setTimeout(() => aiTestState = 'idle', 3000);
		}
	}

	// --- Step 2: Preferences ---
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

	let ratings = $state<Record<string, number>>({});
	let recipeNotes = $state('');
	let defaultServings = $state(2);
	let expandedCategories = $state<Set<string>>(new Set());

	function toggleCategory(name: string) {
		const next = new Set(expandedCategories);
		if (next.has(name)) next.delete(name);
		else next.add(name);
		expandedCategories = next;
	}

	function setRating(cuisine: string, star: number) {
		const current = ratings[cuisine] ?? 0;
		ratings = { ...ratings, [cuisine]: current === star ? 0 : star };
	}

	function activeCount(cuisines: string[]): number {
		return cuisines.filter(c => (ratings[c] ?? 0) > 0).length;
	}

	function adjustServings(delta: number) {
		defaultServings = Math.min(12, Math.max(1, defaultServings + delta));
	}

	// --- Navigation ---
	function nextStep() {
		if (step === 1 && !aiProviderId) return;
		direction = 1;
		step = Math.min(3, step + 1);
	}

	function prevStep() {
		direction = -1;
		step = Math.max(1, step - 1);
	}

	let saving = $state(false);

	async function finish() {
		saving = true;
		try {
			// Save AI provider
			const aiProvider = {
				id: aiProviderId,
				name: providerList.find(p => p.id === aiProviderId)?.name ?? aiProviderId,
				baseUrl: aiBaseUrl,
				model: aiModel,
				apiKey: aiApiKey
			};

			// Save cuisine preferences
			const cuisinePrefs: Record<string, number> = {};
			for (const [k, v] of Object.entries(ratings)) {
				if (v > 0) cuisinePrefs[k] = v;
			}

			if (isCapacitor()) {
				await savePreference('aiProvider', JSON.stringify(aiProvider));
				await savePreference('cuisinePreferences', JSON.stringify(cuisinePrefs));
				if (recipeNotes) await savePreference('recipeNotes', recipeNotes);
				await savePreference('defaultServings', String(defaultServings));
			} else {
				await fetch('/api/einstellungen', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						ai_provider: aiProvider,
						cuisine_preferences: cuisinePrefs,
						recipe_notes: recipeNotes,
						default_servings: defaultServings
					})
				});
			}

			goto('/rezepte');
		} catch {
			saving = false;
		}
	}

	let canContinue = $derived(step === 1 ? !!aiProviderId && !!aiApiKey : true);
</script>

<div class="fixed inset-0 bg-white z-[100] flex flex-col" style="padding-top: env(safe-area-inset-top);">
	<!-- Header -->
	<div class="flex items-center justify-between px-6 py-4">
		{#if step > 1}
			<button onclick={prevStep} class="text-warm-500 text-sm font-medium flex items-center gap-1 min-h-[44px]">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				Zurück
			</button>
		{:else}
			<div></div>
		{/if}
		<img src="/icons/cokko-icon.svg" alt="Cokko" class="w-10 h-10 rounded-xl" />
		<div class="w-16"></div>
	</div>

	<!-- Step indicator -->
	<div class="flex justify-center gap-2 pb-4">
		{#each [1, 2, 3] as s}
			<div class="w-2.5 h-2.5 rounded-full transition-all duration-300 {s === step ? 'bg-orange-500 scale-110' : s < step ? 'bg-orange-300' : 'bg-warm-200'}"></div>
		{/each}
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto px-6">
		{#key step}
			<div in:fly={{ x: direction * 200, duration: 300, delay: 100 }} out:fly={{ x: direction * -200, duration: 200 }}>
				{#if step === 1}
					<!-- Step 1: AI Setup -->
					<h1 class="text-2xl font-bold text-warm-900 mb-2">Deine KI einrichten</h1>
					<p class="text-warm-500 mb-6">Cokko nutzt KI um dir persönliche Rezepte vorzuschlagen.</p>

					<div class="space-y-3 mb-6">
						{#each providerList as p}
							<button
								onclick={() => selectProvider(p.id)}
								class="w-full text-left px-4 py-3 rounded-xl border-2 transition-all min-h-[48px]
									{aiProviderId === p.id ? 'border-orange-500 bg-orange-50' : 'border-warm-200 hover:border-warm-300'}"
							>
								<span class="font-semibold text-warm-900">{p.name}</span>
								{#if p.id !== 'custom' && p.id !== 'ollama'}
									<span class="text-xs text-warm-400 ml-2">{p.defaultModel}</span>
								{/if}
							</button>
						{/each}
					</div>

					{#if aiProviderId}
						<div class="space-y-4" in:fade={{ duration: 200 }}>
							<div>
								<label class="block text-sm font-medium text-warm-700 mb-1">API-Key</label>
								<div class="relative">
									{#if showApiKey}
										<input type="text" bind:value={aiApiKey} placeholder="sk-..." class="w-full px-4 py-3 rounded-xl border border-warm-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none pr-12" />
									{:else}
										<input type="password" bind:value={aiApiKey} placeholder="sk-..." class="w-full px-4 py-3 rounded-xl border border-warm-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none pr-12" />
									{/if}
									<button onclick={() => showApiKey = !showApiKey} class="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 min-w-[44px] min-h-[44px] flex items-center justify-center">
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											{#if showApiKey}
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
											{:else}
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
											{/if}
										</svg>
									</button>
								</div>
							</div>

							<div>
								<label class="block text-sm font-medium text-warm-700 mb-1">Modell</label>
								<input type="text" bind:value={aiModel} class="w-full px-4 py-3 rounded-xl border border-warm-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none" />
							</div>

							{#if aiProviderId === 'custom' || aiProviderId === 'ollama'}
								<div>
									<label class="block text-sm font-medium text-warm-700 mb-1">API-URL</label>
									<input type="text" bind:value={aiBaseUrl} class="w-full px-4 py-3 rounded-xl border border-warm-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none" />
								</div>
							{/if}

							{#if aiApiKey}
								<button
									onclick={testAI}
									disabled={aiTestState === 'loading'}
									class="w-full py-3 rounded-xl font-semibold text-sm transition-all min-h-[48px]
										{aiTestState === 'success' ? 'border-2 border-green-500 text-green-600 bg-white' :
										 aiTestState === 'error' ? 'border-2 border-red-500 text-red-600 bg-white' :
										 'border-2 border-warm-200 text-warm-600 hover:border-orange-300'}"
								>
									{#if aiTestState === 'loading'}
										<svg class="w-5 h-5 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
											<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
											<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
										</svg>
									{:else if aiTestState === 'success'}
										<span class="flex items-center justify-center gap-2">
											<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
											</svg>
											Verbunden!
										</span>
									{:else if aiTestState === 'error'}
										<span class="flex items-center justify-center gap-2">
											<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
											</svg>
											Fehlgeschlagen
										</span>
									{:else}
										Verbindung testen
									{/if}
								</button>
								{#if aiTestState === 'error' && aiTestError}
									<p class="text-red-500 text-xs mt-1">{aiTestError}</p>
								{/if}
							{/if}
						</div>
					{/if}

				{:else if step === 2}
					<!-- Step 2: Preferences -->
					<h1 class="text-2xl font-bold text-warm-900 mb-2">Was isst du gerne?</h1>
					<p class="text-warm-500 mb-6">Bewerte deine Lieblings-Küchen – Cokko schlägt dir passende Rezepte vor.</p>

					<!-- Cuisine categories -->
					<div class="space-y-2 mb-6">
						{#each cuisineCategories as cat}
							<div class="border border-warm-200 rounded-xl overflow-hidden">
								<button
									onclick={() => toggleCategory(cat.name)}
									class="w-full flex items-center justify-between px-4 py-3 min-h-[48px] text-left"
								>
									<span class="font-semibold text-warm-900">{cat.name}</span>
									<span class="flex items-center gap-2">
										{#if activeCount(cat.cuisines) > 0}
											<span class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{activeCount(cat.cuisines)}</span>
										{/if}
										<svg class="w-4 h-4 text-warm-400 transition-transform {expandedCategories.has(cat.name) ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
										</svg>
									</span>
								</button>
								{#if expandedCategories.has(cat.name)}
									<div class="px-4 pb-3 space-y-2 border-t border-warm-100">
										{#each cat.cuisines as cuisine}
											<div class="flex items-center justify-between py-1">
												<span class="text-sm text-warm-700">{cuisine}</span>
												<div class="flex gap-1">
													{#each [1, 2, 3] as star}
														<button
															onclick={() => setRating(cuisine, star)}
															class="w-8 h-8 flex items-center justify-center text-lg transition-all
																{(ratings[cuisine] ?? 0) >= star ? 'text-orange-400' : 'text-warm-200'}"
														>
															★
														</button>
													{/each}
												</div>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>

					<!-- Recipe notes -->
					<div class="mb-6">
						<label class="block text-sm font-medium text-warm-700 mb-2">Persönliche Vorlieben</label>
						<textarea
							bind:value={recipeNotes}
							rows="3"
							placeholder="z.B. Ich mag Joghurt-Gerichte und gesundes Essen..."
							class="w-full px-4 py-3 rounded-xl border border-warm-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none text-sm"
						></textarea>
					</div>

					<!-- Servings -->
					<div class="mb-6">
						<label class="block text-sm font-medium text-warm-700 mb-2">Standard-Portionen</label>
						<div class="flex items-center gap-4">
							<button onclick={() => adjustServings(-1)} class="w-10 h-10 rounded-full border-2 border-warm-200 flex items-center justify-center text-warm-600 font-bold text-lg hover:border-orange-500 active:scale-95 transition-all">−</button>
							<span class="text-2xl font-bold text-warm-900 min-w-[2ch] text-center">{defaultServings}</span>
							<button onclick={() => adjustServings(1)} class="w-10 h-10 rounded-full border-2 border-warm-200 flex items-center justify-center text-warm-600 font-bold text-lg hover:border-orange-500 active:scale-95 transition-all">+</button>
						</div>
					</div>

				{:else if step === 3}
					<!-- Step 3: Done -->
					<div class="text-center py-8">
						<div class="text-6xl mb-6">🎉</div>
						<h1 class="text-2xl font-bold text-warm-900 mb-4">Alles bereit!</h1>

						<div class="text-left space-y-4 text-sm text-warm-600 bg-warm-50 rounded-2xl p-5">
							<div class="flex gap-3">
								<span class="text-orange-500 text-lg flex-shrink-0">➕</span>
								<p>Drücke auf den <strong class="text-warm-900">➕ Button</strong> und wähle <strong class="text-warm-900">„Rezepte generieren"</strong>. Cokko erstellt dir 5 neue Rezeptvorschläge.</p>
							</div>
							<div class="flex gap-3">
								<span class="text-orange-500 text-lg flex-shrink-0">✅</span>
								<p>Gefällt dir ein Rezept? Tippe auf den <strong class="text-warm-900">orangenen ➕</strong> auf der Karte – es wird dauerhaft auf deinem Handy gespeichert.</p>
							</div>
							<div class="flex gap-3">
								<span class="text-red-400 text-lg flex-shrink-0">🗑️</span>
								<p>Rezepte die du nicht magst kannst du mit dem <strong class="text-warm-900">Papierkorb-Button</strong> verwerfen.</p>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/key}
	</div>

	<!-- Bottom button -->
	<div class="px-6 pb-6" style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);">
		{#if step < 3}
			<button
				onclick={nextStep}
				disabled={!canContinue}
				class="w-full py-4 rounded-2xl font-bold text-lg transition-all min-h-[56px]
					{canContinue ? 'bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98] shadow-lg shadow-orange-500/25' : 'bg-warm-200 text-warm-400 cursor-not-allowed'}"
			>
				Weiter
			</button>
			<button
				onclick={() => goto('/rezepte')}
				class="w-full py-3 text-sm text-warm-400 hover:text-warm-600 transition-colors min-h-[44px]"
			>
				Überspringen
			</button>
		{:else}
			<button
				onclick={finish}
				disabled={saving}
				class="w-full py-4 rounded-2xl font-bold text-lg bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98] shadow-lg shadow-orange-500/25 transition-all min-h-[56px]"
			>
				{#if saving}
					<svg class="w-6 h-6 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
					</svg>
				{:else}
					Los geht's! 🍳
				{/if}
			</button>
		{/if}
	</div>
</div>
