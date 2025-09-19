<script lang="ts">
	export let visible = false;
	export let spotImage: string = '/images/HealthSpaces_Icon6_circle.png';
	export let patternScale = 2.0;
	export let slowFactor = 0.75;
	export let sizeMin = 12;
	export let sizeMax = 20;
	export let pad = 28;
	export let autoHideMs = 2500;

	let seed = 1234567;
	const rand = () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
	const rnd = (min: number, max: number) => min + (max - min) * rand();

	type Spot = {
		i: number;
		x: number;
		y: number;
		size: number;
		dx: number;
		dy: number;
		rotOriginX: number;
		rotOriginY: number;
		delay: number;
		duration: number;
	};
	const SPOT_COUNT = 52;

	function buildSpots(scale: number, slow: number, smin: number, smax: number): Spot[] {
		const raw: { i: number; left: number; top: number }[] = [];
		for (let i = 1; i <= SPOT_COUNT; i++) {
			let left = 0,
				top = 0;
			if (i <= 20) {
				left = -25 + i * 12;
				top = 50;
			} else if (i <= 40) {
				left = -255 + i * 12;
				top = -12;
			} else if (i <= 46) {
				left = 204;
				top = -488 + i * 12;
			} else {
				left = -10;
				top = -568 + i * 12;
			}
			raw.push({ i, left, top });
		}
		const xs = raw.map((p) => p.left),
			ys = raw.map((p) => p.top);
		const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
		const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

		const spots: Spot[] = [];
		for (const { i, left, top } of raw) {
			const x = (left - cx) * scale;
			const y = (top - cy) * scale;
			const size = Math.floor(rnd(smin, smax));
			let dx = 0,
				dy = 0;
			if (i <= 20) {
				dx = (-20 + i * 2) * scale * slow;
				dy = 30 * scale * slow;
			} else if (i <= 40) {
				dx = (-50 + i * 2) * scale * slow;
				dy = -30 * scale * slow;
			} else if (i <= 45) {
				dx = 40 * scale * slow;
				dy = (-86 + i * 2) * scale * slow;
			} else {
				dx = -40 * scale * slow;
				dy = (-99 + i * 2) * scale * slow;
			}
			const rotOriginX = (90 + Math.floor(rnd(-10, 0))) * scale;
			const rotOriginY = (20 + Math.floor(rnd(-10, 0))) * scale;
			const delay = +rnd(0.1, 1.0).toFixed(2);
			const duration = +rnd(0.8, 1.6).toFixed(2);
			spots.push({ i, x, y, size, dx, dy, rotOriginX, rotOriginY, delay, duration });
		}
		return spots;
	}

	let spots = buildSpots(patternScale, slowFactor, sizeMin, sizeMax);
	$: spots = buildSpots(patternScale, slowFactor, sizeMin, sizeMax);

	$: if (visible && autoHideMs > 0) {
		const t = setTimeout(() => (visible = false), autoHideMs);
		() => clearTimeout(t);
	}

	const anchors = [
		{ left: '50%', top: `calc(-1 * var(--pad))`, tx: '-50%', ty: '0', rot: 0 },
		{ left: '100%', top: `calc(-1 * var(--pad))`, tx: '-100%', ty: '0', rot: 15 },
		{ left: '0%', top: `calc(-1 * var(--pad))`, tx: '0', ty: '0', rot: -15 },
		{ left: `calc(100% + var(--pad))`, top: '50%', tx: '0', ty: '-50%', rot: 90 },
		{ left: `calc(-1 * var(--pad))`, top: '50%', tx: '0', ty: '-50%', rot: -90 },
		{ left: '50%', top: `calc(100% + var(--pad))`, tx: '-50%', ty: '-100%', rot: 180 },
		{ left: '100%', top: `calc(100% + var(--pad))`, tx: '-100%', ty: '-100%', rot: 165 },
		{ left: '0%', top: `calc(100% + var(--pad))`, tx: '0', ty: '-100%', rot: -165 }
	];
</script>

{#if visible}
	<div class="pointer-events-none absolute inset-0 z-10" style={`--pad:${pad}px`}>
		{#each anchors as a}
			<div
				class="absolute"
				style={`left:${a.left}; top:${a.top}; transform: translate(${a.tx}, ${a.ty}) rotate(${a.rot}deg);`}
			>
				{#each spots as s}
					<span
						class="absolute opacity-0"
						style="
              left: calc({s.x}px); top: calc({s.y}px);
              width: {s.size}px; height:{s.size}px;
              margin-left: calc({s.size}px / -2); margin-top: calc({s.size}px / -2);
              background-image: url('{spotImage}');
              background-size: contain; background-repeat: no-repeat;
              filter: drop-shadow(0 0 0.4px rgba(0,0,0,.25));
              animation: fly {s.duration}s {s.delay}s linear infinite;
              --dx: {s.dx}px; --dy: {s.dy}px;
            "
					/>
				{/each}
			</div>
		{/each}
	</div>
{/if}

<style>
	@keyframes fly {
		from {
			opacity: 0;
			transform: translate(0, 0);
		}
		to {
			opacity: 0.9;
			transform: translate(var(--dx), var(--dy));
		}
	}
</style>
