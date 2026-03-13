<script lang="ts">
	type Props = {
		message: string;
		onClose: () => void;
		duration?: number;
	};

	let { message, onClose, duration = 3000 }: Props = $props();

	$effect(() => {
		if (message) {
			const timer = setTimeout(onClose, duration);
			return () => clearTimeout(timer);
		}
	});
</script>

{#if message}
	<div class="fixed bottom-24 left-4 right-4 z-[60] flex justify-center pointer-events-none">
		<div class="bg-herb-700 text-white px-5 py-3.5 rounded-xl shadow-lg text-base font-medium max-w-sm text-center pointer-events-auto">
			{message}
		</div>
	</div>
{/if}
