<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let text: string;
  export let wordId: string;
  export let selected = false;
  export let locked = false;   // <- drives the flip
  export let label = "";

  const dispatch = createEventDispatcher();
  function toggle() { if (!locked) dispatch("toggle", { wordId }); }

  // teal glow when selected
  $: selectedGlow = selected
    ? "ring-2 ring-[rgba(20,184,166,.65)] shadow-[0_10px_30px_rgba(20,184,166,.18)] border-[rgba(20,184,166,.65)]"
    : "";
</script>

<!-- Perspective on wrapper (ancestor of the rotating element) -->
<div class="relative w-full h-full [perspective:1100px] select-none">
  <!-- Card container (no transform here to avoid interfering with 3D) -->
  <button
    type="button"
    on:click={toggle}
    on:keydown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle())}
    aria-pressed={selected}
    aria-label={locked ? `${label} (solved)` : `Word ${text}`}
    class={`relative w-full h-full rounded-2xl overflow-hidden border
            bg-[#0f1729] text-[#cfe1ff] border-[#304a76]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60
            transition-[box-shadow,border-color] duration-200
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
        <span class="px-2 py-0.5 rounded-md max-w-[95%] truncate font-medium tracking-wide">
          {text}
        </span>
      </div>

      <!-- BACK (visible when flipped) -->
      <div
        class="absolute inset-0 grid place-items-center rounded-2xl
               bg-[rgba(20,184,166,.12)] border border-teal-500/50"
        style="backface-visibility:hidden; -webkit-backface-visibility:hidden; transform:rotateY(180deg);"
      >
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-teal-500"></span>
          <strong class="px-3 text-center text-teal-300">{label || "Solved"}</strong>
        </div>
      </div>
    </div>
  </button>
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








