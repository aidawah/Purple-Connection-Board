
<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  let host: HTMLDivElement;
  let placeholder: Comment;

  onMount(() => {
    // create a placeholder so Svelte keeps DOM position
    placeholder = document.createComment("portal-placeholder");
    host.parentNode?.insertBefore(placeholder, host);
    document.body.appendChild(host);
  });

  onDestroy(() => {
    // move back so Svelte can unmount cleanly
    placeholder?.parentNode?.insertBefore(host, placeholder);
    placeholder?.parentNode?.removeChild(placeholder);
  });
</script>

<div bind:this={host}>
  <slot />
</div>
