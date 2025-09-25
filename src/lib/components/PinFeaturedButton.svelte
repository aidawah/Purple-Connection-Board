<script lang="ts">
  import { onMount } from "svelte";
  import { auth, db, getDomainAdminClaim } from "$lib/firebase";
  import { onAuthStateChanged } from "firebase/auth";
  import { doc, updateDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";

  export let puzzleId: string;
  export let pinned: boolean;

  const WORK_DOMAIN = "healthspaces.com"; // <- your domain

  let isAdmin = false;
  let saving = false;
  let errorMsg = "";

  onMount(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { isAdmin = false; return; }
      await u.getIdToken(true);
      const hasClaim = await getDomainAdminClaim(false);
      const fallback = !!u.email && u.emailVerified && u.email.toLowerCase().endsWith(`@${WORK_DOMAIN}`);
      isAdmin = hasClaim || fallback;
    });
    return () => unsub();
  });

  async function togglePin() {
    if (!isAdmin || saving || !puzzleId) return;
    const u = auth.currentUser;
    if (!u) return;

    const prev = pinned;
    const next = !pinned;

    // optimistic UI (lights icon immediately)
    pinned = next;
    saving = true;
    errorMsg = "";

    try {
      const r = doc(db, "puzzles", puzzleId);
      const actor = { uid: u.uid, email: u.email ?? null, name: u.displayName ?? null };

      if (next) {
        await updateDoc(r, {
          featured: true,
          isPinned: true,
          featuredBy: actor.uid,
          featuredByEmail: actor.email,
          featuredByName: actor.name,
          featuredAt: serverTimestamp()
        });
        await addDoc(collection(db, "puzzles", puzzleId, "featuredHistory"), {
          action: "pin",
          actor,
          at: serverTimestamp()
        });
      } else {
        await updateDoc(r, {
          featured: false,
          isPinned: false,
          featuredBy: null,
          featuredByEmail: null,
          featuredByName: null,
          featuredAt: null
        });
        await addDoc(collection(db, "puzzles", puzzleId, "featuredHistory"), {
          action: "unpin",
          actor,
          at: serverTimestamp()
        });
      }
    } catch (e: any) {
      pinned = prev; // revert on failure
      errorMsg = e?.message ?? "Failed to update";
      console.error("Pin toggle failed:", e);
    } finally {
      saving = false;
    }
  }
</script>

{#if isAdmin}
  <button
    class="absolute top-2 right-2 z-50 inline-flex items-center justify-center rounded-full
           bg-white/90 p-2 shadow-sm ring-1 ring-zinc-300 backdrop-blur transition
           hover:bg-white hover:shadow disabled:opacity-70
           dark:bg-zinc-800/90 dark:ring-zinc-700"
    aria-label={pinned ? "Unpin featured" : "Pin as featured"}
    title={pinned ? "Unpin featured" : "Pin as featured"}
    aria-pressed={pinned}
    on:click|stopPropagation={togglePin}
    disabled={saving}
  >
{#if pinned}
  <!-- Lit (uses --brand) -->
  <svg
    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="currentColor"                                  
    class="h-5 w-5 rotate-[-20deg] text-[var(--brand)] transition-colors"
  >
    <circle cx="12" cy="7" r="3" />
    <rect x="11" y="9.5" width="2" height="7.5" rx="1" />
    <path d="M12 17l-2 5h4l-2-5z" />
  </svg>
{:else}
  <!-- Unlit -->
  <svg
    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="currentColor"                                  
    class="h-5 w-5 rotate-[-20deg] text-zinc-700 dark:text-zinc-200 transition-colors"
  >
    <circle cx="12" cy="7" r="3" />
    <rect x="11" y="9.5" width="2" height="7.5" rx="1" />
    <path d="M12 17l-2 5h4l-2-5z" />
  </svg>
{/if}

  </button>

  {#if errorMsg}
    <div class="absolute top-11 right-2 z-50 rounded-md bg-red-600 px-2 py-1 text-xs text-white shadow">
      {errorMsg}
    </div>
  {/if}
{/if}
