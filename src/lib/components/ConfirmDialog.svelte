<script lang="ts">
	type Props = {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		onConfirm: () => void;
		onCancel: () => void;
	};

	let {
		open,
		title,
		message,
		confirmLabel = 'Bestätigen',
		cancelLabel = 'Abbrechen',
		onConfirm,
		onCancel
	}: Props = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
		onclick={onCancel}
		onkeydown={(e) => { if (e.key === 'Escape') onCancel(); }}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onclick={(e) => e.stopPropagation()}>
			<h3 class="text-lg font-bold text-warm-900 mb-2">{title}</h3>
			<p class="text-sm text-warm-500 mb-6 leading-relaxed">{message}</p>
			<div class="flex gap-3">
				<button
					onclick={onCancel}
					class="flex-1 min-h-[48px] rounded-xl border border-warm-200 text-warm-700 text-base font-medium hover:bg-warm-50 transition-colors"
				>
					{cancelLabel}
				</button>
				<button
					onclick={onConfirm}
					class="flex-1 min-h-[48px] rounded-xl bg-herb-500 text-white text-base font-semibold hover:bg-herb-600 transition-colors"
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
