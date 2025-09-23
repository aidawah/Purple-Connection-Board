<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import { get } from "svelte/store";

  // ---- Props ----
  export let puzzleId: string;
  export let puzzleTitle = "Puzzle";
  export let fullWidth = false; // fill parent (grid cell)
  // Optional: set a public origin if you test on localhost
  export let publicBaseUrl: string | null = null;

  // ---- Constants ----
  const routeBase = "/gameboard";

  // ---- State ----
  let open = false;
  let phone = "";
  let copied = false;
  let canWebShare = false;
  let canWebShareWithUrl = false;
  let sending = false;
  let smsError = "";
  let toast = "";
  let toastTimer: number | null = null;

  // ---- Variant (route-aware styling) ----
  type Variant = "cardAction" | "filled";
  function pickVariant(pathname: string): Variant {
    return pathname.startsWith("/profile") ? "cardAction" : "filled";
  }
  $: currentPath = get(page).url.pathname;
  $: variant = pickVariant(currentPath);

  // ---- Classes ----
  $: widthClass = fullWidth ? "w-full" : "";
  $: btnClass =
    `flex h-10 ${widthClass} items-center justify-center gap-2 rounded-md text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40 ` +
    (variant === "cardAction"
      ? "border border-[color:var(--brand)]/30 px-3 text-[color:var(--brand)] hover:bg-[color:var(--brand)]/10"
      : "bg-[color:var(--brand)] px-4 text-white shadow-sm hover:brightness-95");

  // ---- URL helpers ----
  function getOrigin() {
    if (publicBaseUrl) return publicBaseUrl.replace(/\/+$/, "");
    if (!browser) return "https://example.com";
    return window.location.origin;
  }
  function shareUrl() {
    return `${getOrigin()}${routeBase}/${encodeURIComponent(puzzleId)}`;
  }

  // ---- Lifecycle ----
  onMount(() => {
    canWebShare = typeof navigator !== "undefined" && !!navigator.share;
    try {
      // @ts-expect-error: optional API
      canWebShareWithUrl = !!navigator?.canShare?.({ url: shareUrl() }) || canWebShare;
    } catch {
      canWebShareWithUrl = canWebShare;
    }
  });

  // ---- Toast helper ----
  function showToast(msg: string, ms = 1800) {
    toast = msg;
    if (toastTimer) window.clearTimeout(toastTimer);
    // @ts-expect-error setTimeout typing
    toastTimer = window.setTimeout(() => (toast = ""), ms);
  }

  // ---- Actions ----
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      copied = true;
      showToast("Link copied");
      setTimeout(() => (copied = false), 1200);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareUrl();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      copied = true;
      showToast("Link copied");
      setTimeout(() => (copied = false), 1200);
    }
  }

  // System Share (kept for convenience)
  async function webShare() {
    if (!canWebShareWithUrl) return;

    const url = shareUrl();
    const title = `Play "${puzzleTitle}"`;
    const text = `Try my puzzle: ${puzzleTitle}\n${url}`;

    await copySilently(url);
    showToast("Link copied — paste in LinkedIn");

    try {
      await navigator.share({ title, text, url });
      open = false;
    } catch {
      // user canceled; no-op
    }
  }

  async function copySilently(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  // Accepts "217-440-4327", "(217) 440-4327", "2174404327", or "+12174404327"
  function normalizePhone(input: string) {
    if (!input) return "";
    const trimmed = input.trim();
    if (trimmed.startsWith("+")) return trimmed; // user provided E.164
    const digits = trimmed.replace(/[^\d]/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    // let server decide; send raw if they typed +<country><number>
    return digits || "";
  }

  async function sendSms() {
    const to = normalizePhone(phone);
    if (!to) {
      smsError = "Enter a valid phone (e.g., 217-440-4327).";
      return;
    }
    sending = true;
    smsError = "";

    try {
      // 🔑 Twilio via your SvelteKit server route (NOT system messages)
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, puzzleId })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      showToast("Text sent!");
      open = false;
      phone = "";
    } catch (e: any) {
      smsError = e?.message || "Failed to send.";
    } finally {
      sending = false;
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
      aria-label="Share menu"
    >
      <div class="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Share “{puzzleTitle}”
      </div>

      <!-- Link preview + actions -->
      <div class="mb-3">
        <div class="break-all rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
          {shareUrl()}
        </div>

        <div class="mt-2 flex flex-wrap items-center gap-2">
          <!-- Copy -->
          <button
            type="button"
            class="rounded-md bg-[color:var(--brand)] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40"
            on:click={copyLink}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>

          <!-- System Share (optional) -->
          {#if canWebShareWithUrl}
            <button
              type="button"
              class="rounded-md border border-[color:var(--brand)]/30 px-3 py-2 text-xs font-medium text-[color:var(--brand)] transition hover:bg-[color:var(--brand)]/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40"
              on:click={webShare}
              aria-label="Open system share"
              title="System share"
            >
              System share
            </button>
          {/if}
        </div>
      </div>

      <!-- SMS via Twilio -->
      <div class="mt-3">
        <label class="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Send via SMS</label>
        <div class="flex items-center gap-2">
          <input
            type="tel"
            inputmode="tel"
            placeholder="Phone number (e.g., 217-440-4327)"
            bind:value={phone}
            class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            type="button"
            class="shrink-0 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            on:click={sendSms}
            disabled={sending || !normalizePhone(phone)}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
        {#if smsError}
          <p class="mt-1 text-xs text-red-600 dark:text-red-400">{smsError}</p>
        {/if}
        <p class="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          Uses Twilio to send a text with your puzzle link.
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

  <!-- Tiny toast -->
  {#if toast}
    <div class="pointer-events-none fixed bottom-4 right-4 z-[60] rounded-md bg-zinc-900/90 px-3 py-2 text-xs text-white shadow-lg">
      {toast}
    </div>
  {/if}
</div>
