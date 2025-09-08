<script lang="ts">
  import { createEventDispatcher } from "svelte";

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

  // Teal glow when the tile is selected
  $: selectedGlow = selected
    ? "ring-2 ring-[rgba(20,184,166,.65)] shadow-[0_10px_30px_rgba(20,184,166,.18)] border-[rgba(20,184,166,.65)]"
    : "";
</script>

<!-- OUTER: shell (no rotation here) -->
<div
  role="button"
  tabindex="0"
  aria-pressed={selected}
  aria-label={locked ? `${label} (solved)` : `Word ${text}`}
  on:click={toggle}
  on:keydown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle())}
  class={`relative select-none cursor-pointer rounded-2xl border
          bg-[#0f1830] border-[#2a4067] text-[#eaf2ff]
          shadow-[0_8px_24px_rgba(0,0,0,.28)]
          transition-[transform,box-shadow,border-color] duration-200
          hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(0,0,0,.35)]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(20,184,166,.65)]
          ${selectedGlow}`}
  style="min-height:88px;"
>
  <!-- INNER: the flipper (this element rotates) -->
  <div
    class="absolute inset-0 rounded-2xl transition-transform duration-500 will-change-transform"
    style="
      transform-style: preserve-3d;
      transform: rotateY({locked ? 180 : 0}deg);
    "
  >
    <!-- FRONT (navy) -->
    <div
      class="absolute inset-0 grid place-items-center rounded-2xl"
      style="backface-visibility: hidden; transform: rotateY(0deg);"
    >
      <span class="px-2 py-0.5 rounded-md max-w-[95%] truncate font-medium tracking-wide">
        {text}
      </span>
    </div>

    <!-- BACK (teal with group title) -->
    <div
      class="absolute inset-0 grid place-items-center rounded-2xl
             border border-[#0ea5a5] bg-[#14b8a6] text-[#053b3a]"
      style="backface-visibility: hidden; transform: rotateY(180deg);"
    >
      <strong class="px-3 text-center">{label}</strong>
    </div>
  </div>
</div>


