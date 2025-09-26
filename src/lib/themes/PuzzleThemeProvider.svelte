<script lang="ts">
  import { onMount, onDestroy, setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import { getTheme, type ThemeKey, type Theme } from './themes';

  export let themeKey: ThemeKey | undefined = undefined;
  export let fallbackKey: ThemeKey | undefined = undefined;

  // Provide theme via context for children that need it
  const puzzleTheme = writable<Theme | null>(
    themeKey ? getTheme(themeKey) : (fallbackKey ? getTheme(fallbackKey) : null)
  );
  setContext('puzzleTheme', puzzleTheme);

  // Reactively resolve theme whenever keys change
  $: {
    const k = themeKey || fallbackKey;
    puzzleTheme.set(k ? getTheme(k) : null);
  }

  $: theme = $puzzleTheme;

  // Apply CSS variables globally so any component can use them
  function applyCssVarsToDocument() {
    if (!theme) return;
    const root = document.documentElement;
    const pairs: [string, string][] = [
      ['--puzzle-brand', theme.colors.brand],
      ['--puzzle-bg', 'transparent'], // was theme.colors.bg
      ['--puzzle-card', theme.colors.card],
      ['--puzzle-text', theme.colors.text],
      ['--puzzle-ring', theme.colors.ring],
      ['--puzzle-border', theme.colors.border],
      ['--puzzle-bg-image', theme.assets?.background ? `url(${theme.assets.background})` : 'none']
    ];
    for (const [key, val] of pairs) root.style.setProperty(key, val);
  }

  // ---- Make the THEME BACKGROUND the BODY BACKGROUND (no distortion) ----
  let prev = { image: '', size: '', repeat: '', position: '', color: '' };

  function rememberBodyInlineStyles() {
    const s = document.body.style;
    prev.image = s.backgroundImage;
    prev.size = s.backgroundSize;
    prev.repeat = s.backgroundRepeat;
    prev.position = s.backgroundPosition;
    prev.color = s.backgroundColor;
  }

  function applyBodyBackground() {
    const s = document.body.style;
    const image = getComputedStyle(document.documentElement)
      .getPropertyValue('--puzzle-bg-image')
      .trim();
    s.backgroundColor = 'transparent';
    s.backgroundImage = image && image !== 'none' ? image : 'none';
    s.backgroundRepeat = 'no-repeat';
    s.backgroundPosition = 'center center';
    s.backgroundSize = 'cover'; // fills viewport without stretching (may crop)
  }

  function restoreBodyBackground() {
    const s = document.body.style;
    s.backgroundImage = prev.image;
    s.backgroundSize = prev.size;
    s.backgroundRepeat = prev.repeat;
    s.backgroundPosition = prev.position;
    s.backgroundColor = prev.color;
  }

  // ---- Remove duplicate backgrounds on other elements (old wrappers, etc.) ----
  function stripDuplicateBackgrounds() {
    const bodyBg = getComputedStyle(document.body).backgroundImage;
    if (!bodyBg || bodyBg === 'none') return;

    // Look for any element that renders the *same* background image and turn it off.
    // This is safe and very fast on typical app-sized DOMs.
    const all = document.querySelectorAll<HTMLElement>('body *');
    for (const el of all) {
      const bg = getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none' && bg === bodyBg) {
        el.style.backgroundImage = 'none';
      }
    }
  }

  onMount(() => {
    rememberBodyInlineStyles();
    if (theme) {
      applyCssVarsToDocument();
      applyBodyBackground();
      stripDuplicateBackgrounds();
    }
  });

  // Re-apply on theme change
  $: if (theme) {
    applyCssVarsToDocument();
    applyBodyBackground();
    stripDuplicateBackgrounds();
  }

  onDestroy(() => {
    restoreBodyBackground();
  });
</script>

<div class="puzzle-theme-container">
  <slot />
</div>

<style>
  .puzzle-theme-container {
    /* intentionally empty – your app controls layout */
  }
</style>
