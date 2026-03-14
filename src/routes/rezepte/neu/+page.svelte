<script lang="ts">
	import { goto } from '$app/navigation';

	let editorEl = $state<HTMLDivElement | null>(null);
	let imageFiles = $state<File[]>([]);
	let submitting = $state(false);
	let error = $state('');

	function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items) return;

		for (const item of items) {
			if (item.type.startsWith('image/')) {
				e.preventDefault();
				const file = item.getAsFile();
				if (file) insertImage(file);
				return;
			}
		}
		// Rich text paste is handled natively by contenteditable
	}

	function insertImage(file: File) {
		imageFiles = [...imageFiles, file];
		const url = URL.createObjectURL(file);
		const img = document.createElement('img');
		img.src = url;
		img.className = 'max-w-full rounded-xl my-3';
		img.dataset.imageIndex = String(imageFiles.length - 1);
		editorEl?.appendChild(img);
		editorEl?.appendChild(document.createElement('br'));
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = input.files;
		if (!files) return;
		for (const file of files) {
			if (file.type.startsWith('image/')) {
				insertImage(file);
			}
		}
		input.value = '';
	}

	async function fileToBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}

	async function submit() {
		if (!editorEl) return;
		const html = editorEl.innerHTML.trim();
		const text = editorEl.innerText.trim();

		if (!text && imageFiles.length === 0) {
			error = 'Bitte füge mindestens Text oder ein Bild ein.';
			return;
		}

		submitting = true;
		error = '';

		try {
			const images = await Promise.all(imageFiles.map(fileToBase64));

			const res = await fetch('/api/rezepte/parse', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ html, text, images })
			});

			if (!res.ok) {
				const data = await res.json();
				error = data.error || 'Fehler beim Verarbeiten';
				return;
			}

			const data = await res.json();
			goto(`/rezepte/${data.id}`);
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="max-w-lg mx-auto px-4 pt-6 pb-24">
	<h1 class="text-2xl font-bold text-warm-900 mb-1">Rezept hinzufügen</h1>
	<p class="text-sm text-warm-500 mb-6">Füge ein Rezept per Text, Bild oder Copy & Paste hinzu.</p>

	<!-- Rich text editor -->
	<div class="relative">
		<div
			bind:this={editorEl}
			contenteditable="true"
			role="textbox"
			aria-multiline="true"
			onpaste={handlePaste}
			class="min-h-[250px] w-full rounded-2xl border-2 border-warm-200 bg-white px-4 py-4 text-sm text-warm-800 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 focus:outline-none overflow-y-auto"
			data-placeholder="Rezept hier einfügen – Text, Bilder, oder beides..."
		></div>
	</div>

	<!-- Image upload button -->
	<label
		class="mt-3 flex items-center gap-2 justify-center w-full py-2.5 rounded-xl border-2 border-dashed border-warm-300 text-warm-500 hover:border-orange-400 hover:text-orange-600 cursor-pointer transition-colors"
	>
		<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
			<rect x="3" y="3" width="18" height="18" rx="2" />
			<circle cx="8.5" cy="8.5" r="1.5" />
			<path d="m21 15-5-5L5 21" />
		</svg>
		<span class="text-sm font-medium">Bild hinzufügen</span>
		<input type="file" accept="image/*" multiple class="hidden" onchange={handleFileSelect} />
	</label>

	{#if error}
		<div class="mt-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</div>
	{/if}

	<!-- Submit -->
	<button
		onclick={submit}
		disabled={submitting}
		class="mt-6 w-full bg-orange-500 hover:bg-orange-600 disabled:bg-warm-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
	>
		{#if submitting}
			<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
			</svg>
			Wird verarbeitet...
		{:else}
			Rezept verarbeiten
		{/if}
	</button>

	<p class="text-xs text-warm-400 text-center mt-3">
		Das Rezept wird automatisch strukturiert und direkt in dein Rezeptbuch übernommen.
	</p>
</div>

<style>
	[data-placeholder]:empty::before {
		content: attr(data-placeholder);
		color: #b8a89a;
		pointer-events: none;
	}

	[contenteditable] :global(img) {
		max-width: 100%;
		border-radius: 0.75rem;
		margin: 0.75rem 0;
	}
</style>
