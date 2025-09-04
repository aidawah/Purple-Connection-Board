<script lang="ts">
  import { createEventDispatcher } from "svelte";
  export let text: string;
  export let wordId: string;
  export let selected = false;
  export let locked = false;   // show teal back with category
  export let label = "";       // category name for back
  const dispatch = createEventDispatcher();
  function toggle(){ if(!locked) dispatch("toggle", { wordId }); }
</script>

<!-- Outer (no rotation) -->
<div
  class="relative cursor-pointer rounded-2xl border border-[#1e2a45] bg-gradient-to-b from-[#131c30] to-[#0f1830]
         shadow-[0_8px_24px_rgba(0,0,0,.28)] transition
         hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_14px_36px_rgba(0,0,0,.35)]
         focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#14b8a6]
         aria-pressed:shadow-[0_10px_30px_rgba(20,184,166,.18)]"
  role="button"
  tabindex="0"
  aria-pressed={selected}
  aria-label={locked ? `${label} (solved)` : `Word ${text}`}
  on:click={toggle}
  on:keydown={(e)=> (e.key==='Enter'||e.key===' ') && (e.preventDefault(), toggle())}
  style="min-height:88px; aspect-ratio:1/1;"
>
  <!-- Flipper -->
  <div class="absolute inset-0 [transform-style:preserve-3d] transition-[transform] duration-500 [backface-visibility:hidden]"
       class:![transform:rotateY(180deg)]={locked}>
    <!-- FRONT -->
    <div class="absolute inset-0 grid place-items-center rounded-2xl [backface-visibility:hidden] [transform:rotateY(0deg) translateZ(1px)]">
      <span class="inline-block px-2 py-1 rounded-lg max-w-[95%] truncate"
            style={selected ? 'outline:2px solid #14b8a6; outline-offset:2px;' : ''}>
        {text}
      </span>
    </div>
    <!-- BACK -->
    <div class="absolute inset-0 grid place-items-center rounded-2xl [backface-visibility:hidden]
                [transform:rotateY(180deg) translateZ(1px)] bg-[#14b8a6] text-[#053b3a] font-bold border border-[#0ea5a5]">
      <strong>{label}</strong>
    </div>
  </div>
</div>

