<script lang="ts">
  import { createEventDispatcher, tick } from "svelte";

  // Props
  export let cursorSrc = "/demo-cursor.png";
  export let brand = "#14b8a6";
  // From parent: live board state emitted by GameBoard "state" event
  export let solvedByGroup: boolean[] = [false, false, false, false]; // order: A,B,C,D
  export let selectedWords: string[] = []; // current selected words (texts)
  export let disabled = false;

  const dispatch = createEventDispatcher<{ used: void }>();

  let playing = false;
  let abortPlay = false;
  let cursorX = 0, cursorY = 0;
  let showCursor = false;

  const pause = (ms: number) => new Promise((res) => setTimeout(res, ms));

  function groupIds() { return ["A","B","C","D"] as const; }
  function unsolvedGroups(): ("A"|"B"|"C"|"D")[] {
    return groupIds().filter((g, i) => !solvedByGroup[i]);
  }

  function wordButtonsForGroup(gid: "A"|"B"|"C"|"D"): HTMLButtonElement[] {
    // Not locked (data-locked!=true), not currently flipped, not disabled
    const all = Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-group]'));
    return all.filter((b) => {
      const g = b.getAttribute("data-group");
      const locked = b.getAttribute("data-locked") === "true";
      const isSel = b.getAttribute("data-selected") === "true";
      return g === gid && !locked && !isSel && !b.disabled;
    });
  }

  async function moveCursorOver(el: Element, ms = 240) {
    const r = el.getBoundingClientRect();
    cursorX = r.left + r.width / 2 + window.scrollX;
    cursorY = r.top + r.height / 2 + window.scrollY;
    showCursor = true;
    await pause(ms);
  }

  async function clickBtn(btn: HTMLButtonElement) {
    await moveCursorOver(btn, 220);
    btn.click();
    await tick();
    await pause(140);
  }

  function mapSolvedIndexToGid(i: number): "A"|"B"|"C"|"D" {
    return (["A","B","C","D"] as const)[i];
  }

  function pickTargetGroup(): "A"|"B"|"C"|"D" | null {
    // Prefer a group where user already picked 1–2 cards (finish that hint)
    for (let i = 0; i < 4; i++) {
      const gid = mapSolvedIndexToGid(i);
      if (solvedByGroup[i]) continue;
      const buttons = wordButtonsForGroup(gid);
      const selInGroup = buttons.length < 4; // heuristic: if <4 available, some selected already
      if (selInGroup && buttons.length > 0) return gid;
    }
    // Otherwise take the first unsolved group with available buttons
    for (const gid of unsolvedGroups()) {
      const buttons = wordButtonsForGroup(gid);
      if (buttons.length > 0) return gid;
    }
    return null;
  }

  export async function useHint() {
    if (playing || disabled) return;
    playing = true; abortPlay = false;

    try {
      const gid = pickTargetGroup();
      if (!gid) { playing = false; showCursor = false; return; }

      // Get up to 3 buttons to click from this group
      const buttons = wordButtonsForGroup(gid).slice(0, 3);
      for (const b of buttons) {
        if (abortPlay) break;
        await clickBtn(b);
      }
      dispatch("used");
    } finally {
      showCursor = false;
      playing = false;
      abortPlay = false;
    }
  }

  function stop() {
    abortPlay = true;
    showCursor = false;
    playing = false;
  }
</script>

<div class="relative inline-flex items-center gap-2">
  <button
    type="button"
    class="rounded-md px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition
           focus:outline-none focus:ring-2"
    style="background-color: {brand}; --ring-color: {brand}"
    disabled={disabled || playing}
    on:click={useHint}
  >
    {playing ? "Hint…" : "Hint"}
  </button>

  {#if playing}
    <button
      type="button"
      class="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
      on:click={stop}
    >
      Stop
    </button>
  {/if}
</div>

<!-- Floating cursor overlay -->
<div
  class="pointer-events-none fixed z-50 h-6 w-6 -translate-x-1/2 -translate-y-1/2 transform transition-all duration-300 ease-out md:h-7 md:w-7"
  style="
    left: {cursorX}px;
    top: {cursorY}px;
    opacity: {showCursor ? 0.95 : 0};
    background-image: url('{cursorSrc}');
    background-size: contain;
    background-repeat: no-repeat;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,.25));
  "
  aria-hidden="true"
/>
