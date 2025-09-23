<!-- src/lib/theme/ThemeProvider.svelte -->
<script lang="ts">
  import { theme } from "./store";
  import type { Theme } from "./themes";
  let t: Theme;
  const unsubscribe = theme.subscribe((v) => (t = v));
  export let overlay = true;    // readability tint
</script>

<!--
  Wrap pages/components with this provider.
  It sets CSS vars + themed background image.
-->
<div
  data-theme={t?.key}
  style="
    --brand: {t?.colors.brand};
    --bg: {t?.colors.bg};
    --card: {t?.colors.card};
    --text: {t?.colors.text};
    --ring: {t?.colors.ring};
    --border: {t?.colors.border};
  "
  class="relative min-h-screen w-full text-[var(--text)]"
>
  <div
    class="absolute inset-0 -z-10"
    style="
      background-color: var(--bg);
      background-image: url({t?.assets?.background || ''});
      background-position: center;
      background-size: cover;
      background-repeat: repeat;
    "
  />
  {#if overlay}
    <div class="pointer-events-none absolute inset-0 -z-0 bg-black/10 dark:bg-black/20" />
  {/if}
  <slot />
</div>
