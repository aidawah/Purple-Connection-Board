<!-- src/lib/themes/PuzzleThemeProvider.svelte -->
<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import { THEMES, getTheme, type ThemeKey, type Theme } from './themes';

  export let themeKey: ThemeKey | undefined = undefined;
  export let fallbackKey: ThemeKey | undefined = undefined;

  // Create a puzzle-specific theme store
  const resolvedThemeKey = themeKey || fallbackKey;
  const puzzleTheme = writable<Theme | null>(resolvedThemeKey ? getTheme(resolvedThemeKey) : null);
  
  // Set context for child components to access
  setContext('puzzleTheme', puzzleTheme);

  // Update theme when themeKey prop changes
  $: {
    const resolvedKey = themeKey || fallbackKey;
    console.log('PuzzleThemeProvider debug:', { 
      themeKey, 
      fallbackKey, 
      resolvedKey,
      availableThemes: Object.keys(THEMES)
    });
    const newTheme = resolvedKey ? getTheme(resolvedKey) : null;
    console.log('PuzzleThemeProvider resolved theme:', newTheme);
    puzzleTheme.set(newTheme);
  }

  $: theme = $puzzleTheme;

  let containerElement: HTMLDivElement;

  // Apply CSS custom properties to the container
  onMount(() => {
    if (containerElement && theme) {
      const props = [
        ['--puzzle-brand', theme.colors.brand],
        ['--puzzle-bg', theme.colors.bg],
        ['--puzzle-card', theme.colors.card],
        ['--puzzle-text', theme.colors.text],
        ['--puzzle-ring', theme.colors.ring],
        ['--puzzle-border', theme.colors.border],
        ['--puzzle-bg-image', theme.assets?.background ? `url(${theme.assets.background})` : 'none']
      ];
      
      for (const [prop, value] of props) {
        containerElement.style.setProperty(prop, value);
      }
    }
  });

  // Update CSS properties when theme changes
  $: if (containerElement && theme) {
    const props = [
      ['--puzzle-brand', theme.colors.brand],
      ['--puzzle-bg', theme.colors.bg],
      ['--puzzle-card', theme.colors.card],
      ['--puzzle-text', theme.colors.text],
      ['--puzzle-ring', theme.colors.ring],
      ['--puzzle-border', theme.colors.border],
      ['--puzzle-bg-image', theme.assets?.background ? `url(${theme.assets.background})` : 'none']
    ];
    
    for (const [prop, value] of props) {
      containerElement.style.setProperty(prop, value);
    }
  }
</script>

<div 
  bind:this={containerElement}
  class="puzzle-theme-container"
>
  <slot />
</div>

<style>
  .puzzle-theme-container {
    /* No default theme styles - will use app defaults when no theme is selected */
  }
</style>
