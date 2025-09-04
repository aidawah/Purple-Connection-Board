<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import FlipInner from "$lib/ui/FlipInner.svelte";

  export let text: string;
  export let wordId: string;
  export let selected = false;
  export let locked = false;   // when true: show teal back with category
  export let label = "";       // category/group name for the back
  const dispatch = createEventDispatcher();
  function toggle(){ if(!locked) dispatch("toggle", { wordId }); }
</script>

<!-- Outer card: handles focus/hover/selected ring; NO rotation here -->
<div
  class="cp-card"
  class:is-selected={selected}
  role="button"
  tabindex="0"
  aria-pressed={selected}
  aria-label={locked ? `${label} (solved)` : `Word ${text}`}
  on:click={toggle}
  on:keydown={(e)=> (e.key==='Enter'||e.key===' ') && (e.preventDefault(), toggle())}
>
  <!-- Inner flipper now lives in a reusable component (same DOM/behavior) -->
  <FlipInner {locked}>
    <!-- FRONT -->
    <span slot="front" class="word">{text}</span>

    <!-- BACK (teal category) -->
    <strong slot="back">{label}</strong>
  </FlipInner>
</div>

<style>
  /* Outer shell (unchanged) */
  .cp-card{
    position:relative;
    min-height:88px; aspect-ratio:1/1;
    border-radius:18px; border:1px solid var(--card-border, #1e2a45);
    background: linear-gradient(180deg, #131c30, #0f1830);
    box-shadow: 0 8px 24px rgba(0,0,0,.28);
    overflow:hidden; cursor:pointer;
    transition: box-shadow .2s, border-color .2s, transform .2s;
  }
  .cp-card:hover{ transform: translateY(-2px) scale(1.01); box-shadow: 0 14px 36px rgba(0,0,0,.35); }
  .cp-card:focus-visible{ outline:3px solid var(--teal, #14b8a6); outline-offset:3px; }
  .cp-card.is-selected{ box-shadow: 0 10px 30px rgba(20,184,166,.18); border-color: rgba(20,184,166,.6); }

  /* keep the word styling local to this component so it still applies through the slot */
  .word{
    display:inline-block; padding:4px 8px; border-radius:12px;
    max-width:95%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  }
</style>




