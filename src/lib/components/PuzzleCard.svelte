<script lang="ts">
  import { createEventDispatcher } from "svelte";
  export let text = "";
  export let wordId = "";
  export let selected = false;
  export let locked = false;   // when true: show teal back (category)
  export let label = "";       // group/category label (back)
  const dispatch = createEventDispatcher();

  function toggle() {
    if (!locked) dispatch("toggle", { wordId });
  }

  // keyboard a11y
  function onKey(e: KeyboardEvent){
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
  }
</script>

<!-- Outer shell (focus/hover ring) -->
<div
  role="button"
  tabindex="0"
  aria-pressed={selected}
  aria-label={locked ? `${label} (solved)` : `Word ${text}`}
  on:click={toggle}
  on:keydown={onKey}
  data-selected={selected}
  class="relative w-full h-full rounded-2xl border border-[#1e2a45]
         bg-gradient-to-b from-[#131c30] to-[#0f1830]
         shadow-[0_8px_24px_rgba(0,0,0,.28)]
         cursor-pointer outline-none
         transition-transform duration-200
         hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_14px_36px_rgba(0,0,0,.35)]
         focus-visible:ring-2 focus-visible:ring-[#14b8a6]/80
         data-[selected=true]:shadow-[0_10px_30px_rgba(20,184,166,.18)]
         data-[selected=true]:border-[rgba(20,184,166,.6)]"
>
  <!-- Flipper (rotates on lock) -->
  <div
    class="absolute inset-0 transition-transform duration-300"
    style={`transform: rotateY(${locked ? 180 : 0}deg); transform-style: preserve-3d;`}
  >
    <!-- Front -->
    <div
      class="absolute inset-0 grid place-items-center rounded-2xl px-2 text-center"
      style="backface-visibility:hidden; transform: rotateY(0deg) translateZ(1px);"
    >
      <span
        class="inline-block px-2 py-1 rounded-md max-w-[95%] truncate
               text-[var(--text,#eaf2ff)]"
        class:selected={selected}
        style={selected ? "outline:2px solid #14b8a6; outline-offset:2px;" : ""}
      >
        {text}
      </span>
    </div>

    <!-- Back (teal category) -->
    <div
      class="absolute inset-0 grid place-items-center rounded-2xl
             border border-[#0ea5a5] text-[#053b3a] font-bold"
      style="backface-visibility:hidden; transform: rotateY(180deg) translateZ(1px); background:#14b8a6;"
    >
      <strong>{label}</strong>
    </div>
  </div>
</div>





