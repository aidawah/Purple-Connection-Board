<script lang="ts">
  export let options: string[] = [];
  export let value: string = '';
  export let label: string = '';
  export let ariaLabel: string = label;

  let open = false;
  let root: HTMLElement;
  let activeIndex = -1;

  function toggle() {
    open = !open;
    if (open) activeIndex = Math.max(0, options.indexOf(value));
  }

  function choose(idx: number) {
    value = options[idx];
    open = false;
  }

  function onKey(e: KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ')) {
      e.preventDefault();
      open = true;
      activeIndex = Math.max(0, options.indexOf(value));
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        activeIndex = (activeIndex + 1) % options.length;
        break;
      case 'ArrowUp':
        e.preventDefault();
        activeIndex = (activeIndex - 1 + options.length) % options.length;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open) choose(activeIndex >= 0 ? activeIndex : 0);
        break;
      case 'Escape':
        open = false;
        break;
    }
  }

  // simple click-outside action
  function clickOutside(node: HTMLElement) {
    const handler = (ev: MouseEvent) => {
      if (!node.contains(ev.target as Node)) open = false;
    };
    document.addEventListener('mousedown', handler);
    return { destroy() { document.removeEventListener('mousedown', handler); } };
  }
</script>

<div class="relative" bind:this={root} use:clickOutside>
  {#if label}
    <label class="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
  {/if}

  <!-- Trigger -->
  <button
    type="button"
    class="flex w-full items-center justify-between rounded-full border border-zinc-300 bg-white px-4 py-2 pr-10
           text-zinc-900 shadow-sm transition
           focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]
           dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-label={ariaLabel}
    on:click={toggle}
    on:keydown={onKey}
  >
    <span class="truncate">{value}</span>
    <svg class="ml-2 h-5 w-5 text-zinc-500 transition"
         xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z" clip-rule="evenodd"/>
    </svg>
  </button>

  <!-- Dropdown panel -->
  {#if open}
    <ul
      role="listbox"
      class="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl
             dark:border-zinc-700 dark:bg-zinc-800"
    >
      {#each options as opt, i}
        <li role="option" aria-selected={opt === value}>
          <button
            class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left
                   text-zinc-700 hover:bg-[color:var(--brand)]/10 hover:text-[color:var(--brand)]
                   dark:text-zinc-200 dark:hover:bg-[color:var(--brand)]/20
                   {opt === value ? 'bg-[color:var(--brand)]/10 text-[color:var(--brand)] dark:bg-[color:var(--brand)]/20' : ''} 
                   {i === activeIndex ? 'ring-1 ring-[color:var(--brand)]/40' : ''}"
            on:click={() => choose(i)}
          >
            <span class="truncate">{opt}</span>
            {#if opt === value}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-[color:var(--brand)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.53 16.28 4.75 11.5l1.5-1.5 3.28 3.28L17.75 5l1.5 1.5-9.72 9.78Z"/>
              </svg>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
