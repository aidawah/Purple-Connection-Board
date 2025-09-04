<script lang="ts">
  /** when true, show the back face */
  export let locked = false;
  /** ms */
  export let delay = 0;
  /** ms */
  export let duration = 450;
</script>

<div
  class="cp-flip"
  class:is-locked={locked}
  style="--flip-delay:{delay}ms; --flip-duration:{duration}ms;"
>
  <div class="cp-face cp-front">
    <slot name="front" />
  </div>
  <div class="cp-face cp-back">
    <slot name="back" />
  </div>
</div>

<style>
  /* Flipper (this element rotates) */
  .cp-flip{
    position:absolute; inset:0;
    transform-style: preserve-3d;
    transition: transform var(--flip-duration, 450ms) cubic-bezier(.2,.8,.2,1);
    transition-delay: var(--flip-delay, 0ms);
  }
  .cp-flip.is-locked{ transform: rotateY(180deg); } /* flip to back */

  /* Faces */
  .cp-face{
    position:absolute; inset:0; display:grid; place-items:center;
    padding:10px; text-align:center; border-radius:inherit;
    backface-visibility:hidden;           /* prevents mirrored text */
    transform: translateZ(1px);           /* avoid z-fighting */
  }
  .cp-front{
    transform: rotateY(0deg) translateZ(1px);
    color: var(--text, #eaf2ff);
  }
  .cp-back{
    transform: rotateY(180deg) translateZ(1px);
    background: var(--teal, #14b8a6);
    color: var(--teal-ink, #053b3a);
    font-weight:700; letter-spacing:.2px; border:1px solid #0ea5a5;
  }
</style>
