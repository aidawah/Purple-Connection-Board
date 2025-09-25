<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	import type { Theme } from '$lib/themes/themes';

	export let text: string;
	export let wordId: string;
	export let selected = false;
	export let locked = false; // <- drives the flip
	export let label = '';

	const dispatch = createEventDispatcher();
	function toggle() {
		if (!locked) dispatch('toggle', { wordId });
	}

	// Try to get puzzle theme from context, fallback to no special styling
	const puzzleTheme = getContext<Readable<Theme> | undefined>('puzzleTheme');
	
	// Use CSS custom properties instead of hardcoded colors
	$: selectedGlow = selected
		? 'ring-2 shadow-lg'
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
		class={`puzzle-card relative h-full w-full overflow-hidden rounded-2xl border
            transition-[box-shadow,border-color,background-color,color] duration-200 focus-visible:ring-2 focus-visible:outline-none
            ${selectedGlow}`}
		style="
			min-height:88px;
			background: var(--puzzle-card, #fde68a);
			color: var(--puzzle-text, #713f12);
			border-color: var(--puzzle-border, #f59e0b);
			--tw-ring-color: var(--puzzle-ring, rgba(251,191,36,0.65));
			--tw-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
		"
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
				class="absolute inset-0 grid place-items-center rounded-2xl border"
				style="
					backface-visibility:hidden; 
					-webkit-backface-visibility:hidden; 
					transform:rotateY(180deg);
					background: var(--puzzle-brand, #fbbf24);
					border-color: var(--puzzle-border, #f59e0b);
					color: var(--puzzle-bg, #fef9c3);
				"
			>
				<div class="flex items-center gap-2">
					<span 
						class="h-2 w-2 rounded-full" 
						style="background: var(--puzzle-bg, #fef9c3);"
					></span>
					<strong class="px-3 text-center font-semibold">{label || 'Solved'}</strong>
				</div>
			</div>
		</div>
	</button>
</div>
