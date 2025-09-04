<script lang="ts">
  // Public knobs (tweak freely)
  export let visible = false;
  export let spotImage = "/images/HealthSpaces_Icon6_circle.png";

  export let pad = 36;                 // how far the ring sits from the board
  export let density = 24;             // sprites per edge
  export let sizeMin = 28;             // logo size
  export let sizeMax = 48;

  // OUTWARD “burst” distance (away from board)
  export let spreadMin = 120;
  export let spreadMax = 240;

  // Duration of the outward flight
  export let speedMin = 5.0;           // seconds
  export let speedMax = 9.0;

  // Small lateral wiggle along the edge while moving out
  export let tangentJitter = 40;       // px

  // Show longer (previous was 15s) → +10s
  export let autoHideMs = 25000;       // 25s

  type Edge = "top" | "right" | "bottom" | "left";
  type Spot = {
    edge: Edge; pct: number; size: number;
    delay: number; duration: number; grow: number;
    tan1: number; tan2: number; rot: number;
  };

  // simple PRNG
  let seed = 1_234_567;
  const rnd = (a: number, b: number) => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return a + (b - a) * (seed / 2 ** 32);
  };

  const EDGES: Edge[] = ["top", "right", "bottom", "left"];
  function buildSpots(): Spot[] {
    const arr: Spot[] = [];
    for (const edge of EDGES) {
      for (let i = 0; i < density; i++) {
        arr.push({
          edge,
          pct: ((i + rnd(0, 1)) / density) * 100,
          size: Math.round(rnd(sizeMin, sizeMax)),
          delay: +rnd(0, 0.8).toFixed(2),
          duration: +rnd(speedMin, speedMax).toFixed(2),
          grow: Math.round(rnd(spreadMin, spreadMax)),
          tan1: +rnd(-tangentJitter, tangentJitter).toFixed(1),
          tan2: +rnd(-tangentJitter, tangentJitter).toFixed(1),
          rot: +rnd(-6, 6).toFixed(1)
        });
      }
    }
    return arr;
  }

  let spots = buildSpots();
  $: spots = buildSpots(); // rebuild if props change

  // auto-hide after a while (set to 0 to keep visible)
  $: if (visible && autoHideMs > 0) {
    const t = setTimeout(() => (visible = false), autoHideMs);
    () => clearTimeout(t);
  }
</script>

{#if visible}
  <div class="halo" style={`--pad:${pad}px`} aria-hidden="true">
    {#each spots as s}
      <div
        class="slot {s.edge}"
        style={`--pct:${s.pct}%; --size:${s.size}px; --delay:${s.delay}s; --dur:${s.duration}s; --grow:${s.grow}px; --tan1:${s.tan1}px; --tan2:${s.tan2}px; --rot:${s.rot}deg;`}
      >
        <img class="dot" src={spotImage} alt="" />
      </div>
    {/each}
  </div>
{/if}

<style>
  /* Anchored to the board (parent .board-wrap must be position:relative) */
  .halo {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 6;
  }

  /* Edge anchor points – start just OUTSIDE the grid */
  .slot { position: absolute; }
  .slot.top    { top:    calc(-1 * var(--pad)); left: var(--pct); transform: translate(-50%, 0); }
  .slot.bottom { bottom: calc(-1 * var(--pad)); left: var(--pct); transform: translate(-50%, 0); }
  .slot.left   { left:   calc(-1 * var(--pad)); top:  var(--pct); transform: translate(0, -50%); }
  .slot.right  { right:  calc(-1 * var(--pad)); top:  var(--pct); transform: translate(0, -50%); }

  /* The image itself: crisp, no distortion */
  .dot {
    display: block;
    width: var(--size);
    height: var(--size);
    object-fit: contain;
    image-rendering: auto;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,.35));
    opacity: .95;
    will-change: transform, opacity;
    transform: translateZ(0) rotate(var(--rot));
  }

  /* OUTWARD burst: starts at the edge, flies away from the board.
     IMPORTANT: use individual animation-* properties (var() works everywhere) */
  .slot.top .dot    {
    animation-name: outTop;
    animation-duration: var(--dur);
    animation-timing-function: cubic-bezier(.22,1,.36,1); /* smooth ease-out */
    animation-delay: var(--delay);
    animation-iteration-count: 1;
    animation-direction: normal;
    animation-fill-mode: forwards;
    animation-play-state: running;
  }
  .slot.bottom .dot {
    animation-name: outBottom;
    animation-duration: var(--dur);
    animation-timing-function: cubic-bezier(.22,1,.36,1);
    animation-delay: var(--delay);
    animation-iteration-count: 1;
    animation-direction: normal;
    animation-fill-mode: forwards;
    animation-play-state: running;
  }
  .slot.left .dot   {
    animation-name: outLeft;
    animation-duration: var(--dur);
    animation-timing-function: cubic-bezier(.22,1,.36,1);
    animation-delay: var(--delay);
    animation-iteration-count: 1;
    animation-direction: normal;
    animation-fill-mode: forwards;
    animation-play-state: running;
  }
  .slot.right .dot  {
    animation-name: outRight;
    animation-duration: var(--dur);
    animation-timing-function: cubic-bezier(.22,1,.36,1);
    animation-delay: var(--delay);
    animation-iteration-count: 1;
    animation-direction: normal;
    animation-fill-mode: forwards;
    animation-play-state: running;
  }

  /* Keyframes: move outward perpendicular to the edge with a tiny side wiggle */
  @keyframes outTop {
    from { transform: translate3d(0, 0, 0) rotate(var(--rot)); opacity:.98; }
    to   { transform: translate3d(var(--tan2), calc(-1 * var(--grow)), 0) rotate(var(--rot)); opacity:.6; }
  }
  @keyframes outBottom {
    from { transform: translate3d(0, 0, 0) rotate(var(--rot)); opacity:.98; }
    to   { transform: translate3d(var(--tan2), var(--grow), 0) rotate(var(--rot)); opacity:.6; }
  }
  @keyframes outLeft {
    from { transform: translate3d(0, 0, 0) rotate(var(--rot)); opacity:.98; }
    to   { transform: translate3d(calc(-1 * var(--grow)), var(--tan2), 0) rotate(var(--rot)); opacity:.6; }
  }
  @keyframes outRight {
    from { transform: translate3d(0, 0, 0) rotate(var(--rot)); opacity:.98; }
    to   { transform: translate3d(var(--grow), var(--tan2), 0) rotate(var(--rot)); opacity:.6; }
  }

  @media (prefers-reduced-motion: reduce) {
    .dot { animation: none; }
  }
</style>






