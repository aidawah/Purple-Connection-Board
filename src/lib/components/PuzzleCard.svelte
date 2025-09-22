<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let text: string;
	export let wordId: string;
	export let selected = false;
	export let locked = false; // <- drives the flip
	export let label = '';

	const dispatch = createEventDispatcher();
	function toggle() {
		if (!locked) dispatch('toggle', { wordId });
	}

	// teal glow when selected (kept as-is)
	$: selectedGlow = selected
		? 'ring-2 ring-[rgba(20,184,166,.65)] shadow-[0_10px_30px_rgba(20,184,166,.18)] border-[rgba(20,184,166,.65)]'
		: '';
</script>

<!-- Perspective on wrapper (ancestor of the rotating element) -->
<div class="relative h-full w-full select-none [perspective:1100px]">
	<!-- Card container (no transform here to avoid interfering with 3D) -->
	<button
		type="button"
		on:click={toggle}
		on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle())}
		aria-pressed={selected}
		aria-label={locked ? `${label} (solved)` : `Word ${text}`}
		class={`relative h-full w-full overflow-hidden rounded-2xl border
            border-zinc-200 bg-white text-slate-900 shadow
            transition-[box-shadow,border-color,background-color,color] duration-200 focus-visible:ring-2 focus-visible:ring-teal-400/60
            focus-visible:outline-none dark:border-zinc-700 dark:bg-zinc-900
            dark:text-zinc-100 dark:shadow-lg
            ${selectedGlow}`}
		style="min-height:88px;"
	>
		<!-- FLIPPER: the ONLY element with transform -->
		<div
			class="absolute inset-0 rounded-2xl will-change-transform [transform-style:preserve-3d]"
			style:transform={`rotateY(${locked ? 180 : 0}deg)`}
			style="transition: transform 500ms cubic-bezier(.2,.6,.2,1);"
		>
			<!-- FRONT -->
			<div
				class="absolute inset-0 grid place-items-center rounded-2xl"
				style="backface-visibility:hidden; -webkit-backface-visibility:hidden;"
			>
				<span class="max-w-[95%] truncate rounded-md px-2 py-0.5 font-medium tracking-wide">
					{text}
				</span>
			</div>

			<!-- BACK (visible when flipped) -->
			<div
				class="absolute inset-0 grid place-items-center rounded-2xl
               border border-teal-500/50 bg-teal-500/15
               dark:border-teal-400/40 dark:bg-teal-400/20"
				style="backface-visibility:hidden; -webkit-backface-visibility:hidden; transform:rotateY(180deg);"
			>
				<div class="flex items-center gap-2">
					<span class="h-2 w-2 rounded-full bg-teal-500 dark:bg-teal-400"></span>
					<strong class="px-3 text-center text-teal-600 dark:text-teal-300"
						>{label || 'Solved'}</strong
					>
				</div>
			</div>
		</div>
	</button>
</div>
