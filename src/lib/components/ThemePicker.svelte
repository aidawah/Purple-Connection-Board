<!-- src/lib/components/ThemePicker.svelte -->
<script lang="ts">
  import { THEMES, type ThemeKey } from "$lib/theme/themes";
  import { themeKey, setThemeByKey } from "$lib/theme/store";
  import { get } from "svelte/store";

  export let value: ThemeKey = get(themeKey);
  export let label = "Theme";
  export let showPreview = true;

  function choose(k: ThemeKey) {
    value = k;
    setThemeByKey(k);
    const ev = new CustomEvent("change", { detail: { themeKey: k } });
    dispatchEvent(ev);
  }
</script>

<div class="space-y-2">
  <div class="text-sm font-medium">{label}</div>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {#each Object.values(THEMES) as t}
      <button
        type="button"
        on:click={() => choose(t.key)}
        class="group rounded-2xl border p-3 text-left transition hover:shadow-md focus:outline-none focus:ring-2"
        style="border-color: {t.colors.border}; color: {t.colors.text}; background: {t.colors.card};"
      >
        <div class="flex items-center gap-2">
          <div class="h-5 w-5 rounded-full border"
               style="background:{t.colors.brand}; border-color:{t.colors.border}" />
          <div class="font-semibold">{t.name}</div>
          {#if value === t.key}
            <span class="ml-auto text-xs" style="color:{t.colors.brand}">Selected</span>
          {/if}
        </div>

        {#if showPreview}
          <div class="mt-3 rounded-xl overflow-hidden border"
               style="border-color:{t.colors.border}">
            <div class="h-24 w-full"
                 style="
                   background: {t.colors.bg} url({t.assets?.background || ''}) center/cover repeat;
                 " />
          </div>
        {/if}
      </button>
    {/each}
  </div>
</div>
