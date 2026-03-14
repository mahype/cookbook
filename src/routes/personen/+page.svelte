<script lang="ts">
	import type { Person } from '$lib/server/db';

	let persons = $state<Person[]>([]);
	let loading = $state(true);

	// Modal state
	let showModal = $state(false);
	let editingPerson = $state<Person | null>(null);
	let formName = $state('');
	let formHousehold = $state(true);
	let formLikes = $state<string[]>([]);
	let formDislikes = $state<string[]>([]);
	let formAllergies = $state<string[]>([]);
	let formHealthConditions = $state<string[]>([]);
	let formNotes = $state('');
	let saving = $state(false);

	// All available health conditions
	const healthConditionOptions = [
		{ id: 'diabetes_typ1', label: 'Diabetes Typ 1', icon: '💉' },
		{ id: 'diabetes_typ2', label: 'Diabetes Typ 2', icon: '🩸' },
		{ id: 'laktoseintoleranz', label: 'Laktoseintoleranz', icon: '🥛' },
		{ id: 'glutenunvertraeglichkeit', label: 'Glutenunverträglichkeit / Zöliakie', icon: '🌾' },
		{ id: 'fruktoseintoleranz', label: 'Fruktoseintoleranz', icon: '🍎' },
		{ id: 'histaminintoleranz', label: 'Histaminintoleranz', icon: '⚠️' },
		{ id: 'nussallergie', label: 'Nussallergie', icon: '🥜' },
		{ id: 'sojaallergie', label: 'Sojaallergie', icon: '🫘' },
		{ id: 'fischallergie', label: 'Fisch-/Meeresfrüchte-Allergie', icon: '🐟' },
		{ id: 'eiallergie', label: 'Eiallergie', icon: '🥚' },
		{ id: 'bluthochdruck', label: 'Bluthochdruck (salzarm)', icon: '❤️' },
		{ id: 'gicht', label: 'Gicht (purinarm)', icon: '🦶' },
		{ id: 'nierenerkrankung', label: 'Nierenerkrankung', icon: '🫘' },
		{ id: 'reizdarmsyndrom', label: 'Reizdarmsyndrom (FODMAP)', icon: '🫄' },
		{ id: 'cholesterin', label: 'Hoher Cholesterinspiegel', icon: '🫀' },
		{ id: 'schwangerschaft', label: 'Schwangerschaft', icon: '🤰' },
	];

	// Tag input state
	let likesInput = $state('');
	let dislikesInput = $state('');
	let allergiesInput = $state('');

	async function fetchPersons() {
		try {
			const res = await fetch('/api/personen');
			if (res.ok) {
				const data = await res.json();
				persons = data.persons;
			}
		} catch {
			// ignore
		} finally {
			loading = false;
		}
	}

	fetchPersons();

	function toggleHealthCondition(id: string) {
		if (formHealthConditions.includes(id)) {
			formHealthConditions = formHealthConditions.filter(c => c !== id);
		} else {
			formHealthConditions = [...formHealthConditions, id];
		}
	}

	function openNew() {
		editingPerson = null;
		formName = '';
		formHousehold = true;
		formLikes = [];
		formDislikes = [];
		formAllergies = [];
		formHealthConditions = [];
		formNotes = '';
		likesInput = '';
		dislikesInput = '';
		allergiesInput = '';
		showModal = true;
	}

	function openEdit(person: Person) {
		editingPerson = person;
		formName = person.name;
		formHousehold = person.is_household === 1;
		formLikes = [...person.likes];
		formDislikes = [...person.dislikes];
		formAllergies = [...person.allergies];
		formHealthConditions = [...(person.health_conditions ?? [])];
		formNotes = person.notes;
		likesInput = '';
		dislikesInput = '';
		allergiesInput = '';
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editingPerson = null;
	}

	function addTag(list: string[], value: string): string[] {
		const tag = value.trim().replace(/,$/g, '');
		if (tag && !list.includes(tag)) {
			return [...list, tag];
		}
		return list;
	}

	function removeTag(list: string[], index: number): string[] {
		return list.filter((_, i) => i !== index);
	}

	function handleTagKeydown(
		e: KeyboardEvent,
		inputValue: string,
		list: string[],
		setList: (v: string[]) => void,
		setInput: (v: string) => void
	) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			setList(addTag(list, inputValue));
			setInput('');
		}
	}

	async function handleSave() {
		if (!formName.trim()) return;
		saving = true;

		const body = {
			name: formName.trim(),
			is_household: formHousehold,
			likes: formLikes,
			dislikes: formDislikes,
			allergies: formAllergies,
			health_conditions: formHealthConditions,
			notes: formNotes
		};

		try {
			if (editingPerson) {
				await fetch(`/api/personen/${editingPerson.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
			} else {
				await fetch('/api/personen', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
			}
			closeModal();
			await fetchPersons();
		} catch {
			// ignore
		} finally {
			saving = false;
		}
	}

	async function handleDelete(person: Person) {
		if (!confirm(`"${person.name}" wirklich löschen?`)) return;
		await fetch(`/api/personen/${person.id}`, { method: 'DELETE' });
		await fetchPersons();
	}
</script>

<div class="max-w-lg mx-auto px-4 pt-6">
	<header class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-warm-900">Personen</h1>
		<button
			onclick={openNew}
			class="bg-spice-500 hover:bg-spice-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
		>
			Neue Person
		</button>
	</header>

	{#if loading}
		<div class="text-center py-16 text-warm-500">Laden...</div>
	{:else if persons.length === 0}
		<div class="text-center py-16">
			<div class="mb-3">
				<svg class="w-12 h-12 mx-auto text-warm-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
				</svg>
			</div>
			<p class="text-warm-500 mb-4">Noch keine Personen angelegt</p>
			<button
				onclick={openNew}
				class="bg-spice-500 hover:bg-spice-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
			>
				Erste Person anlegen
			</button>
		</div>
	{:else}
		<div class="space-y-3 mb-6">
			{#each persons as person (person.id)}
				<div class="bg-white rounded-2xl border border-warm-100 shadow-sm p-4">
					<div class="flex items-start justify-between mb-2">
						<div class="flex items-center gap-2">
							<h2 class="font-semibold text-warm-900">{person.name}</h2>
							{#if person.is_household}
								<span class="text-[11px] font-medium bg-warm-100 text-warm-600 px-2 py-0.5 rounded-full">Haushalt</span>
							{/if}
						</div>
						<div class="flex gap-1">
							<button
								onclick={() => openEdit(person)}
								class="p-2 text-warm-400 hover:text-spice-500 transition-colors rounded-lg hover:bg-warm-50"
								aria-label="Bearbeiten"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
								</svg>
							</button>
							<button
								onclick={() => handleDelete(person)}
								class="p-2 text-warm-400 hover:text-red-500 transition-colors rounded-lg hover:bg-warm-50"
								aria-label="Löschen"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</button>
						</div>
					</div>

					{#if person.likes.length > 0 || person.dislikes.length > 0 || person.allergies.length > 0 || (person.health_conditions ?? []).length > 0}
						<div class="flex flex-wrap gap-1.5 mt-2">
							{#each person.likes as tag}
								<span class="text-[11px] font-medium bg-herb-100 text-herb-800 px-2 py-0.5 rounded-full">{tag}</span>
							{/each}
							{#each person.dislikes as tag}
								<span class="text-[11px] font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{tag}</span>
							{/each}
							{#each person.allergies as tag}
								<span class="text-[11px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{tag}</span>
							{/each}
							{#each (person.health_conditions ?? []) as condId}
								{@const cond = healthConditionOptions.find(c => c.id === condId)}
								{#if cond}
									<span class="text-[11px] font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{cond.icon} {cond.label}</span>
								{/if}
							{/each}
						</div>
					{/if}

					{#if person.notes}
						<p class="text-xs text-warm-500 mt-2 line-clamp-2">{person.notes}</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal -->
{#if showModal}
	<div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
		<!-- Backdrop -->
		<button
			class="absolute inset-0 bg-black/40"
			onclick={closeModal}
			aria-label="Schliessen"
		></button>

		<!-- Modal content -->
		<div class="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto safe-area-bottom">
			<h2 class="text-lg font-bold text-warm-900 mb-4">
				{editingPerson ? 'Person bearbeiten' : 'Neue Person'}
			</h2>

			<div class="space-y-4">
				<!-- Name -->
				<div>
					<label for="person-name" class="block text-sm font-medium text-warm-700 mb-1">Name</label>
					<input
						id="person-name"
						type="text"
						bind:value={formName}
						placeholder="Name eingeben"
						class="w-full border border-warm-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-spice-400 focus:ring-1 focus:ring-spice-400"
					/>
				</div>

				<!-- Household toggle -->
				<div class="flex items-center justify-between">
					<label for="person-household" class="text-sm font-medium text-warm-700">Haushaltsmitglied</label>
					<button
						id="person-household"
						type="button"
						onclick={() => (formHousehold = !formHousehold)}
						class="relative w-11 h-6 rounded-full transition-colors {formHousehold ? 'bg-spice-500' : 'bg-warm-200'}"
						role="switch"
						aria-checked={formHousehold}
					>
						<span
							class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform {formHousehold ? 'translate-x-5' : 'translate-x-0'}"
						></span>
					</button>
				</div>

				<!-- Likes -->
				<div>
					<label for="person-likes" class="block text-sm font-medium text-warm-700 mb-1">Mag gerne</label>
					{#if formLikes.length > 0}
						<div class="flex flex-wrap gap-1.5 mb-2">
							{#each formLikes as tag, i}
								<span class="inline-flex items-center gap-1 text-xs font-medium bg-herb-100 text-herb-800 px-2 py-1 rounded-full">
									{tag}
									<button onclick={() => (formLikes = removeTag(formLikes, i))} class="hover:text-herb-950" aria-label="Entfernen">
										<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
									</button>
								</span>
							{/each}
						</div>
					{/if}
					<input
						id="person-likes"
						type="text"
						bind:value={likesInput}
						onkeydown={(e) => handleTagKeydown(e, likesInput, formLikes, (v) => (formLikes = v), (v) => (likesInput = v))}
						placeholder="Eingeben und Enter drücken"
						class="w-full border border-warm-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-herb-400 focus:ring-1 focus:ring-herb-400"
					/>
				</div>

				<!-- Dislikes -->
				<div>
					<label for="person-dislikes" class="block text-sm font-medium text-warm-700 mb-1">Mag nicht</label>
					{#if formDislikes.length > 0}
						<div class="flex flex-wrap gap-1.5 mb-2">
							{#each formDislikes as tag, i}
								<span class="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 px-2 py-1 rounded-full">
									{tag}
									<button onclick={() => (formDislikes = removeTag(formDislikes, i))} class="hover:text-red-900" aria-label="Entfernen">
										<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
									</button>
								</span>
							{/each}
						</div>
					{/if}
					<input
						id="person-dislikes"
						type="text"
						bind:value={dislikesInput}
						onkeydown={(e) => handleTagKeydown(e, dislikesInput, formDislikes, (v) => (formDislikes = v), (v) => (dislikesInput = v))}
						placeholder="Eingeben und Enter drücken"
						class="w-full border border-warm-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
					/>
				</div>

				<!-- Allergies -->
				<div>
					<label for="person-allergies" class="block text-sm font-medium text-warm-700 mb-1">Allergien</label>
					{#if formAllergies.length > 0}
						<div class="flex flex-wrap gap-1.5 mb-2">
							{#each formAllergies as tag, i}
								<span class="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
									{tag}
									<button onclick={() => (formAllergies = removeTag(formAllergies, i))} class="hover:text-amber-900" aria-label="Entfernen">
										<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
									</button>
								</span>
							{/each}
						</div>
					{/if}
					<input
						id="person-allergies"
						type="text"
						bind:value={allergiesInput}
						onkeydown={(e) => handleTagKeydown(e, allergiesInput, formAllergies, (v) => (formAllergies = v), (v) => (allergiesInput = v))}
						placeholder="Eingeben und Enter drücken"
						class="w-full border border-warm-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
					/>
				</div>

				<!-- Health Conditions -->
				<div>
					<label class="block text-sm font-medium text-warm-700 mb-2">Gesundheit & Verträglichkeiten</label>
					<div class="grid grid-cols-1 gap-2">
						{#each healthConditionOptions as option}
							<button
								type="button"
								onclick={() => toggleHealthCondition(option.id)}
								class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left text-sm transition-all min-h-[44px]
									{formHealthConditions.includes(option.id) ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-warm-200 text-warm-600 hover:border-warm-300'}"
							>
								<span class="text-base flex-shrink-0">{option.icon}</span>
								<span class="flex-1">{option.label}</span>
								{#if formHealthConditions.includes(option.id)}
									<svg class="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<!-- Notes -->
				<div>
					<label for="person-notes" class="block text-sm font-medium text-warm-700 mb-1">Notizen</label>
					<textarea
						id="person-notes"
						bind:value={formNotes}
						rows="2"
						placeholder="Optionale Anmerkungen"
						class="w-full border border-warm-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-spice-400 focus:ring-1 focus:ring-spice-400 resize-none"
					></textarea>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex gap-3 mt-5">
				<button
					onclick={closeModal}
					class="flex-1 border border-warm-200 text-warm-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-warm-50 transition-colors"
				>
					Abbrechen
				</button>
				<button
					onclick={handleSave}
					disabled={!formName.trim() || saving}
					class="flex-1 bg-spice-500 hover:bg-spice-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
				>
					{saving ? 'Speichern...' : 'Speichern'}
				</button>
			</div>
		</div>
	</div>
{/if}
