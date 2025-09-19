<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import { get } from "svelte/store";

  export let puzzleId: string;
  export let puzzleTitle = "Puzzle";
  export let fullWidth = false;           // ⬅️ NEW: fill parent (grid cell)
  const routeBase = "/gameboard";

  let open = false;
  let phone = "";
  let copied = false;
  let canWebShare = false;

  // Route-aware styling (outline on /profile, filled elsewhere)
  type Variant = "cardAction" | "filled";
  function pickVariant(pathname: string): Variant {
    return pathname.startsWith("/profile") ? "cardAction" : "filled";
  }
  $: currentPath = get(page).url.pathname;
  $: variant = pickVariant(currentPath);

  $: widthClass = fullWidth ? "w-full" : "";
  $: btnClass =
    `flex h-10 ${widthClass} items-center justify-center gap-2 rounded-md text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40 ` +
    (variant === "cardAction"
      ? "border border-[color:var(--brand)]/30 px-3 text-[color:var(--brand)] hover:bg-[color:var(--brand)]/10"
      : "bg-[color:var(--brand)] px-4 text-white shadow-sm hover:brightness-95");

  function getOrigin() {
    if (!browser) return "https://example.com";
    return window.location.origin;
  }
  function shareUrl() {
    return `${getOrigin()}${routeBase}/${encodeURIComponent(puzzleId)}`;
  }

  onMount(() => {
    canWebShare = typeof navigator !== "undefined" && !!navigator.share;
  });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareUrl();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    }
  }

  async function webShare() {
    if (!canWebShare) return;
    try {
      await navigator.share({
        title: `Play “${puzzleTitle}”`,
        text: `Try my puzzle: ${puzzleTitle}`,
        url: shareUrl()
      });
      open = false;
    } catch {}
  }

  function normalizePhone(input: string) {
    const digits = input.replace(/[^\d+]/g, "");
    if (digits.startsWith("+")) return digits;
    const just = digits.replace(/\D/g, "");
    if (just.length === 10) return `+1${just}`;
    return just || "";
  }
  function makeSmsUrl(targetPhone: string, body: string) {
    const isIOS =
      typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const encoded = encodeURIComponent(body);
    return `sms:${targetPhone}${isIOS ? "&" : "?"}body=${encoded}`;
  }
let sending = false;
let smsError = '';

async function sendSms() {
  const n = normalizePhone(phone);
  if (!n) return;
  sending = true;
  smsError = '';

  const res = await fetch('/api/share-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: n,
      title: puzzleTitle,
      url: shareUrl()
    })
  });

  sending = false;

  if (res.ok) {
    open = false;
    phone = '';
  } else {
    const { error } = await res.json().catch(() => ({ error: 'Unknown error' }));
    smsError = error || 'Failed to send.';
  }
}


  $: phone = phone.trim();
</script>

<div class="relative">
<button
  type="button"
  class={`flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40
    ${variant === "cardAction"
      ? "border border-[color:var(--brand)]/30 text-[color:var(--brand)] hover:bg-[color:var(--brand)]/10"
      : "bg-[color:var(--brand)] text-white shadow-sm hover:brightness-95"}`}
  on:click={() => (open = !open)}
  aria-haspopup="dialog"
  aria-expanded={open}
>
  Share
</button>


  {#if open}
    <div
      class="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
      role="dialog"
    >
      <div class="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Share “{puzzleTitle}”
      </div>

      <div class="mb-3">
        <div class="break-all rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
          {shareUrl()}
        </div>
        <div class="mt-2 flex items-center gap-2">
          <button
            type="button"
            class="rounded-md bg-[color:var(--brand)] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40"
            on:click={copyLink}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          {#if canWebShare}
            <button
              type="button"
              class="rounded-md border border-[color:var(--brand)]/30 px-3 py-2 text-xs font-medium text-[color:var(--brand)] transition hover:bg-[color:var(--brand)]/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40"
              on:click={webShare}
            >
              System share
            </button>
          {/if}
        </div>
      </div>

      <div class="mt-3">
        <label class="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Send via SMS</label>
        <div class="flex items-center gap-2">
          <input
            type="tel"
            inputmode="tel"
            placeholder="Phone number"
            bind:value={phone}
            class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
<button
  type="button"
  class="shrink-0 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
  on:click={sendSms}
  disabled={sending || !normalizePhone(phone)}
>
  {sending ? 'Sending…' : 'Send'}
</button>

        </div>
        <p class="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          This opens your device’s Messages app with the link prefilled.
        </p>
      </div>

      <div class="mt-4 flex justify-end">
        <button
          type="button"
          class="rounded-md px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          on:click={() => (open = false)}
        >
          Close
        </button>
      </div>
    </div>
  {/if}
</div>
