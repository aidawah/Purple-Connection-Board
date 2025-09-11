<script lang="ts">
  import { onMount } from "svelte";
  import { createEventDispatcher } from "svelte";

  const PCARD_VERSION = "PuzzleCard v2025-09-11c";
  onMount(() => console.log("[PuzzleCard] mounted:", PCARD_VERSION));

  /** Front word (e.g., "Apple") */
  export let text: string;
  /** Unique word id (used in the toggle event) */
  export let wordId: string;
  /** While the player has this tile selected (pre-submission) */
  export let selected = false;
  /** When the 4-word group is solved, lock+flip this tile */
  export let locked = false;
  /** Group title shown on the back (e.g., "Fruits") */
  export let label = "";

  const dispatch = createEventDispatcher();
  function toggle() { if (!locked) dispatch("toggle", { wordId }); }

  // EXACTLY the original teal-glow classes you had before
  $: selectedGlow = selected
    ? "ring-2 ring-[rgba(20,184,166,.65)] shadow-[0_10px_30px_rgba(20,184,166,.18)] border-[rgba(20,184,166,.65)]"
    : "";

  // Debug
  $: console.log("[PuzzleCard] wordId=", wordId, "locked=", locked);
</script>

<div
  data-locked={locked ? "true" : "false"}
  role="button"
  tabindex="0"
  aria-pressed={selected}
  aria-label={locked ? `${label} (solved)` : `Word ${text}`}
  on:click={toggle}
  on:keydown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle())}

  class={`brand-scope relative select-none cursor-pointer rounded-2xl border overflow-hidden
          transition-[transform,box-shadow,border-color] duration-200
          hover:-translate-y-0.5
          focus-visible:outline-none focus-visible:brand-ring
          brand-card brand-border
          ${selectedGlow}
          perspective-1200`}
  style="min-height:88px;"
>
  <!-- Flipper -->
  <div
    class="absolute inset-0 rounded-2xl transition-transform duration-500 ease-[cubic-bezier(.2,.6,.2,1)]
           transform-gpu preserve-3d will-change-transform"
    style="
      transform: rotateY({locked ? 180 : 0}deg);
      transform-style: preserve-3d;
      -webkit-transform-style: preserve-3d;
    "
  >
    <!-- FRONT -->
    <div
      class="absolute inset-0 grid place-items-center rounded-2xl"
      style="
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        transform: rotateY(0deg);
      "
    >
      <span class="px-2 py-0.5 rounded-md max-w-[95%] truncate font-medium tracking-wide">
        {text}
      </span>
    </div>

    <!-- BACK (solid teal/brand) -->
    <div
      class="absolute inset-0 grid place-items-center rounded-2xl brand-back"
      style="
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        transform: rotateY(180deg);
      "
    >
      <strong class="px-3 text-center">{label}</strong>
    </div>
  </div>
</div>

<style>
  /* Use either --brand (Browse) or --color-brand (app.css) */
  .brand-scope { --pc-brand: var(--brand, var(--color-brand, #14b8a6)); }

  /* CARD SURFACE (exact colors you asked for) */
  /* Light = #FFFFFF */
  .brand-card {
    background: #ffffff;
    color: #0f172a;

    /* ❤️ IMPORTANT: make Tailwind rings and our shadow COMPOSE instead of overwrite */
    --tw-shadow: 0 8px 24px rgba(0,0,0,.10);
    box-shadow:
      var(--tw-ring-offset-shadow, 0 0 #0000),
      var(--tw-ring-shadow, 0 0 #0000),
      var(--tw-shadow);
  }
  /* Dark = #18181B */
  :global(.dark) .brand-card {
    background: #18181B;
    color: #eaf2ff;

    --tw-shadow: 0 8px 24px rgba(0,0,0,.28);
    box-shadow:
      var(--tw-ring-offset-shadow, 0 0 #0000),
      var(--tw-ring-shadow, 0 0 #0000),
      var(--tw-shadow);
  }

  /* BORDER (neutral by default; teal only when selected via your selectedGlow classes) */
  .brand-border { border-color: #e5e7eb; }            /* light: zinc-200 */
  :global(.dark) .brand-border { border-color: #27272a; } /* dark: zinc-800 */

  /* Keyboard focus (kept brandy) */
  .brand-ring {
    box-shadow:
      0 0 0 2px color-mix(in oklab, var(--pc-brand) 60%, transparent),
      var(--tw-shadow, 0 0 #0000);
  }

  /* Back face (solid teal/brand) */
  .brand-back {
    background: var(--pc-brand);
    color: color-mix(in oklab, black 82%, var(--pc-brand) 18%);
    border: 1px solid color-mix(in oklab, black 20%, var(--pc-brand) 80%);
  }

  /* 3D smoothing */
  .preserve-3d { transform-style: preserve-3d; -webkit-transform-style: preserve-3d; }
</style>








