<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';

  // ---- theme + data toggles ----
  const BRAND = '#14b8a6';
  const USE_FIREBASE = true; // ⬅️ turn on Firebase

  // ---- types ----
  type Profile = {
    uid?: string;
    name: string;
    email: string;
    photoURL?: string;
    bio?: string;
    theme: 'light'|'dark'|'system';
    publicProfile: boolean;
    notifications: { product: boolean; community: boolean; marketing: boolean; };
    socials: { twitter: string; github: string; website: string; };
    stats: { puzzlesCreated: number; puzzlesSolved: number; streakDays: number; };
  };

type MyPuzzle = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  difficulty?: 'Easy'|'Medium'|'Hard';
  imageUrl?: string;
  isPinned?: boolean;
  solveCount?: number;
  createdAt?: string;

  // NEW (optional)
  isPublished?: boolean;
  status?: 'draft' | 'published';
};

  // ---- state ----
  let loading = true;
  let saving = false;
  let flash: { type: 'success'|'error'|'info'; text: string } | null = null;

  // tab order: overview → mypuzzles → activity → settings
  let tab: 'overview' | 'mypuzzles' | 'activity' | 'settings' = 'overview';

  // Start with empty/neutral values; Firebase will hydrate everything.
  let profile: Profile = {
    name: '',
    email: '',
    photoURL: '',
    bio: '',
    theme: 'system',
    publicProfile: true,
    notifications: { product: true, community: true, marketing: false },
    socials: { twitter: '', github: '', website: '' },
    stats: { puzzlesCreated: 0, puzzlesSolved: 0, streakDays: 0 }
  };

  // Most recently played (from `plays` collection). Null => show the “no recent puzzle” card.
  let lastPlayed: { id: string; title: string; progress?: number } | null = null;

  // Recent activity timeline
  let recentActivity: Array<{ at: string; text: string }> = [];

  // Left-rail pinned list
  let pinnedPuzzles: Array<{ id: string; title: string; difficulty: 'Easy'|'Medium'|'Hard' }> = [];

  // “My Puzzles”
  let myPuzzles: MyPuzzle[] = [];

  // ---- firebase (lazy) ----
  let fb: any = null;    // your $lib/firebase wrapper (if present)
  let ffs: any = null;   // firebase/firestore
  let auth: any = null;  // firebase/auth
  let db: any = null;
  let currentUID: string | null = null;
  let unsubscribeAuth: (() => void) | null = null;

  const toTitle = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);


  //publish shit 

  
  async function ensureFirebase() {
    if (!browser || !USE_FIREBASE) return;
    if (!fb)  fb  = await import('$lib/firebase').catch(()=>null);
    if (!ffs) ffs = await import('firebase/firestore').catch(()=>null);
    if (!auth) auth = await import('firebase/auth').catch(()=>null);
    db = fb?.db ?? fb?.getFirestore?.(fb?.app) ?? null;
  }

async function loadFromFirebase() {
  if (!USE_FIREBASE || !db || !ffs) { loading = false; return; }

  try {
    const _auth = fb?.auth || auth?.getAuth?.();
    const user = _auth?.currentUser;

    if (!user?.uid) {
      loading = false;
      // goto('/signin?next=/profile'); // Optional redirect
      return;
    }

    currentUID = user.uid;

    // Prime with Auth fields
    profile.email = user.email ?? '';
    profile.name = user.displayName ?? '';
    profile.photoURL = user.photoURL ?? '';

    // --- profiles/{uid}
    try {
      const docRef = ffs.doc(db, 'profiles', currentUID);
      const snap = await ffs.getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data() || {};
        profile = {
          uid: currentUID,
          name: (d.name ?? profile.name) || '',
          email: (d.email ?? profile.email) || '',
          photoURL: d.photoURL ?? profile.photoURL ?? '',
          bio: d.bio ?? '',
          theme: (d.theme ?? 'system'),
          publicProfile: !!d.publicProfile,
          notifications: {
            product: d.notifications?.product ?? true,
            community: d.notifications?.community ?? true,
            marketing: d.notifications?.marketing ?? false
          },
          socials: {
            twitter: d.socials?.twitter ?? '',
            github:  d.socials?.github  ?? '',
            website: d.socials?.website ?? ''
          },
          stats: {
            puzzlesCreated: d.stats?.puzzlesCreated ?? 0,
            puzzlesSolved:  d.stats?.puzzlesSolved  ?? 0,
            streakDays:     d.stats?.streakDays     ?? 0
          }
        };
      } else {
        profile.uid = currentUID;
      }
    } catch {
      // keep seeded profile
    }

    // --- activity (recent first)
    try {
      const actQ = ffs.query(
        ffs.collection(db, 'activity'),
        ffs.where('uid', '==', currentUID),
        ffs.orderBy('createdAt', 'desc'),
        ffs.limit(15)
      );
      const actSnap = await ffs.getDocs(actQ);
      recentActivity = actSnap.docs.map((doc: any) => {
        const x = doc.data();
        const when = x?.createdAt?.toDate?.()?.toLocaleString?.() ?? 'recently';
        const txt = x?.type === 'puzzle_solved'
          ? `Solved “${x?.puzzleTitle ?? 'Untitled'}” ✅`
          : x?.type === 'puzzle_created'
          ? `Created “${x?.puzzleTitle ?? 'Untitled'}” 🧩`
          : x?.text ?? 'Did something';
        return { at: when, text: txt };
      });
    } catch { recentActivity = []; }

    // --- pinned puzzles
    try {
      const pinQ = ffs.query(
        ffs.collection(db, 'puzzles'),
        ffs.where('owner', '==', currentUID),
        ffs.where('isPinned', '==', true),
        ffs.limit(8)
      );
      const pinSnap = await ffs.getDocs(pinQ);
      pinnedPuzzles = pinSnap.docs.map((d: any) => {
        const x = d.data() || {};
        const toTitle = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);
        return {
          id: d.id,
          title: x.title ?? 'Untitled',
          difficulty: toTitle((x.difficulty ?? 'Medium').toString()) as 'Easy'|'Medium'|'Hard'
        };
      });
    } catch { pinnedPuzzles = []; }

// --- my puzzles (by author), most recent first
try {
const mapPuzzle = (d: any): MyPuzzle => {
  const x = d.data() || {};
  const norm = (s: any) =>
    (s ? String(s)[0].toUpperCase() + String(s).slice(1).toLowerCase() : 'Medium');

  return {
    id: d.id,
    title: x.title ?? 'Untitled',
    description: x.description ?? '',
    category: x.category ?? 'General',
    difficulty: norm(x.difficulty ?? 'Medium') as 'Easy' | 'Medium' | 'Hard',
    imageUrl: x.imageUrl ?? '',
    isPinned: !!x.isPinned,
    solveCount: x.solveCount ?? 0,
    createdAt:
      x.createdAt?.toDate?.()?.toISOString?.() ??
      x.publishedAt?.toDate?.()?.toISOString?.() ??
      new Date().toISOString(),              // ⬅️ comma was missing here
    isPublished: !!x.isPublished,
    status: (x.status ?? (x.isPublished ? 'published' : 'draft')) as 'draft' | 'published'
  };
};


  const seen: Record<string, MyPuzzle> = {};
  const col = ffs.collection(db, 'puzzles');

  // A) author.uid == currentUID
  try {
    let q = ffs.query(
      col,
      ffs.where('author.uid', '==', currentUID),
      ffs.orderBy('createdAt', 'desc'),
      ffs.limit(60)
    );
    let snap;
    try { snap = await ffs.getDocs(q); }
    catch {
      // Fallback if index missing: same filter without orderBy
      q = ffs.query(col, ffs.where('author.uid', '==', currentUID), ffs.limit(60));
      snap = await ffs.getDocs(q);
    }
    snap.docs.forEach((d: any) => { seen[d.id] = mapPuzzle(d); });
  } catch {}

  // B) Fallback: author.email == profile.email (in case UID wasn’t saved)
  if (Object.keys(seen).length === 0 && profile.email) {
    try {
      let q = ffs.query(
        col,
        ffs.where('author.email', '==', profile.email),
        ffs.orderBy('createdAt', 'desc'),
        ffs.limit(60)
      );
      let snap;
      try { snap = await ffs.getDocs(q); }
      catch {
        q = ffs.query(col, ffs.where('author.email', '==', profile.email), ffs.limit(60));
        snap = await ffs.getDocs(q);
      }
      snap.docs.forEach((d: any) => { seen[d.id] = mapPuzzle(d); });
    } catch {}
  }

  // C) Optional: if puzzles live in subcollections, use collectionGroup fallback
  try {
    if (ffs.collectionGroup && Object.keys(seen).length === 0) {
      const cg = ffs.collectionGroup(db, 'puzzles');
      let q = ffs.query(
        cg,
        ffs.where('author.uid', '==', currentUID),
        ffs.orderBy('createdAt', 'desc'),
        ffs.limit(60)
      );
      let snap;
      try { snap = await ffs.getDocs(q); }
      catch {
        q = ffs.query(cg, ffs.where('author.uid', '==', currentUID), ffs.limit(60));
        snap = await ffs.getDocs(q);
      }
      snap.docs.forEach((d: any) => { seen[d.id] = mapPuzzle(d); });
    }
  } catch {}

  myPuzzles = Object.values(seen).sort(
    (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  );

  console.debug('[MyPuzzles by author]', currentUID, myPuzzles.map(p => p.id));
} catch {
  myPuzzles = [];
}


    // --- most recently played
    try {
      const playsQ = ffs.query(
        ffs.collection(db, 'plays'),
        ffs.where('uid', '==', currentUID),
        ffs.orderBy('updatedAt', 'desc'),
        ffs.limit(1)
      );
      const playsSnap = await ffs.getDocs(playsQ);
      const doc = playsSnap.docs[0];
      if (doc) {
        const x = doc.data() || {};
        lastPlayed = {
          id: x.puzzleId,
          title: x.puzzleTitle ?? 'Untitled Puzzle',
          progress: x.progressPercent ?? undefined
        };
      } else {
        lastPlayed = null;
      }
    } catch { lastPlayed = null; }

  } catch (e) {
    console.error(e);
    flash = { type: 'error', text: 'Failed to load your profile.' };
  } finally {
    loading = false;
    if (flash) setTimeout(() => (flash = null), 2200);
  }
}

// small local helper (used in My Puzzles cards)
function getDifficultyColor(difficulty: string) {
  switch ((difficulty || 'Medium')) {
    case 'Easy':   return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    case 'Medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    case 'Hard':   return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
    default:       return 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900/30';
  }
}

// wire up the Publish button
let publishBusy: string | null = null;

async function togglePublishPuzzle(p: MyPuzzle) {
  if (!db || !ffs) return;
  try {
    publishBusy = p.id;

    const next = !p.isPublished; // true → publish, false → unpublish
    const ref = ffs.doc(db, 'puzzles', p.id);

    const payload: any = {
      isPublished: next,
      status: next ? 'published' : 'draft',
      updatedAt: ffs.serverTimestamp()
    };

    if (next) {
      // going published: set publishedAt and (re)ensure author is present
      payload.publishedAt = ffs.serverTimestamp();
      payload.author = {
        uid: currentUID,
        email: profile.email ?? '',
        name: profile.name ?? '',
        photoURL: profile.photoURL ?? ''
      };
    } else {
      // going unpublished: remove publishedAt (or keep it if you prefer)
      payload.publishedAt = ffs.deleteField ? ffs.deleteField() : null;
    }

    await ffs.setDoc(ref, payload, { merge: true });

    // Optimistic UI update
    myPuzzles = myPuzzles.map(x =>
      x.id === p.id ? { ...x, isPublished: next, status: payload.status } : x
    );

    flash = { type: 'success', text: next ? 'Puzzle published.' : 'Puzzle unpublished.' };
  } catch (e) {
    console.error('toggle publish failed', e);
    flash = { type: 'error', text: 'Could not update publish state.' };
  } finally {
    publishBusy = null;
    setTimeout(() => (flash = null), 2200);
  }
}


    // Save profile changes to Firestore
    async function saveProfile() {
      if (!db || !ffs || !currentUID) return;
      try {
        saving = true;
        const docRef = ffs.doc(db, 'profiles', currentUID);
        await ffs.setDoc(docRef, { ...profile, updatedAt: ffs.serverTimestamp() }, { merge: true });
        flash = { type: 'success', text: 'Profile saved!' };
      } catch (e) {
        console.error(e);
        flash = { type: 'error', text: 'Failed to save profile.' };
      } finally {
        saving = false;
        setTimeout(()=>flash=null,2200);
      }
    }
  

  function initials(name: string) {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] ?? 'U') + (parts[1]?.[0] ?? '');
  }

  onMount(async () => {
    document.documentElement.style.setProperty('--brand', BRAND);
    await ensureFirebase();

    if (USE_FIREBASE && fb?.onUserChanged) {
      // Keep page reactive to auth changes
      unsubscribeAuth = fb.onUserChanged(async (u: any) => {
        loading = true;
        if (!u) {
          currentUID = null;
          // goto('/signin?next=/profile'); // Optional redirect
          loading = false;
          return;
        }
        currentUID = u.uid;
        // prime with auth
        profile.email = u.email ?? '';
        profile.name = u.displayName ?? '';
        profile.photoURL = u.photoURL ?? '';
        await loadFromFirebase();
      });
    } else {
      // Fallback: attempt a one-time load
      await loadFromFirebase();
    }
  });

  onDestroy(() => {
    try { unsubscribeAuth?.(); } catch {}
  });
</script>

<svelte:head>
  <title>Profile • Purple Connection Board</title>
</svelte:head>

<!-- Cover / Hero -->
<section class="relative">
  <div class="h-40 w-full rounded-b-3xl bg-gradient-to-r from-[color:var(--brand)]/90 via-[color:var(--brand)] to-emerald-500/80"></div>
  <!-- Avatar overlap -->
  <div class="mx-auto -mt-10 flex max-w-5xl items-end gap-4 px-4">
    <div class="shrink-0">
      {#if profile.photoURL}
        <img src={profile.photoURL} alt="Profile photo"
             class="h-24 w-24 rounded-full object-cover ring-4 ring-white dark:ring-zinc-900" />
      {:else}
        <div class="flex h-24 w-24 items-center justify-center rounded-full bg-white text-3xl font-semibold text-[color:var(--brand)] ring-4 ring-white dark:ring-zinc-900">
          {initials(profile.name).toUpperCase()}
        </div>
      {/if}
    </div>
    <div class="grow pb-2">
      <h1 class="text-2xl font-bold text-white drop-shadow-sm">{profile.name || 'Your Profile'}</h1>
      <p class="text-white/90">{profile.email || '—'}</p>
    </div>
  </div>
</section>

{#if flash}
  <div class="mx-auto mt-4 max-w-5xl px-4">
    <div class="rounded-lg border px-4 py-2 text-sm
                {flash.type === 'success' ? 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900' :
                 flash.type === 'error'   ? 'border-red-200 text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900' :
                                            'border-zinc-200 text-zinc-700 bg-white dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800'}">
      {flash.text}
    </div>
  </div>
{/if}

<!-- Sticky Tabs -->
<nav class="sticky top-0 z-10 mt-6 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
  <div class="mx-auto flex max-w-5xl gap-2 px-4">
    {#each (['overview','mypuzzles','activity','settings'] as const) as t}
      <button on:click={()=>tab=t}
        class="relative -mb-px rounded-t-lg px-4 py-3 text-sm font-medium transition
               {tab===t ? 'text-[color:var(--brand)]' : 'text-zinc-600 dark:text-zinc-300'}">
        {t === 'mypuzzles' ? 'My Puzzles' : t.charAt(0).toUpperCase()+t.slice(1)}
        <span class="{tab===t ? 'absolute inset-x-0 -bottom-px h-0.5 bg-[color:var(--brand)]' : ''}"></span>
      </button>
    {/each}
  </div>
</nav>

<!-- Content -->
<main class="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-3">
  <!-- Left rail -->
  <aside class="space-y-6 lg:col-span-1">
    <!-- About -->
    <div class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 class="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">About</h3>
      <p class="text-sm text-zinc-700 dark:text-zinc-300">{profile.bio || 'Tell the community a bit about you.'}</p>
      <div class="mt-4 grid grid-cols-3 gap-3 text-center">
        <div class="rounded-xl border border-[color:var(--brand)]/20 p-3">
          <div class="text-xl font-bold text-[color:var(--brand)]">{profile.stats.puzzlesCreated}</div>
          <div class="text-xs text-zinc-600 dark:text-zinc-400">Created</div>
        </div>
        <div class="rounded-xl border border-[color:var(--brand)]/20 p-3">
          <div class="text-xl font-bold text-[color:var(--brand)]">{profile.stats.puzzlesSolved}</div>
          <div class="text-xs text-zinc-600 dark:text-zinc-400">Solved</div>
        </div>
        <div class="rounded-xl border border-[color:var(--brand)]/20 p-3">
          <div class="text-xl font-bold text-[color:var(--brand)]">{profile.stats.streakDays}</div>
          <div class="text-xs text-zinc-600 dark:text-zinc-400">Streak</div>
        </div>
      </div>
    </div>

<!-- Pinned puzzles -->

    <div class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div class="mb-2 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Pinned Puzzles</h3>
        <a href="/browse" class="text-sm font-medium text-[color:var(--brand)] underline-offset-4 hover:underline">Browse →</a>
      </div>

      {#if pinnedPuzzles.length > 0}
        <ul class="space-y-2">
          {#each pinnedPuzzles as p}
            <li class="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <div class="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4 rotate-[-20deg] text-[color:var(--brand)]">
                  <circle cx="12" cy="7" r="3"/><rect x="11" y="9.5" width="2" height="7.5" rx="1"/><path d="M12 17l-2 5h4l-2-5z"/>
                </svg>
                <span class="text-sm text-zinc-800 dark:text-zinc-200">{p.title}</span>
              </div>
              <span class="rounded px-2 py-1 text-xs font-medium ring-1 ring-inset ring-[color:var(--brand)]/30">{p.difficulty}</span>
            </li>
          {/each}
        </ul>
      {:else}
        <div class="text-sm text-zinc-600 dark:text-zinc-400">No pinned puzzles.</div>
      {/if}
    </div>
  </aside>

  <!-- Main panel -->
  <section class="space-y-6 lg:col-span-2">
    {#if tab === 'overview'}
      <!-- Continue playing -->
      <div class="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div class="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Continue playing</h3>
          {#if lastPlayed}
            <a href={"/gameboard/" + lastPlayed.id}
               class="rounded-md bg-[color:var(--brand)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
              Resume
            </a>
          {/if}
        </div>

        {#if lastPlayed}
          <div class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-base font-semibold text-zinc-900 dark:text-zinc-100">{lastPlayed.title}</div>
                {#if lastPlayed.progress !== undefined}
                  <div class="mt-2 h-2 w-56 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div class="h-full bg-[color:var(--brand)]" style={`width:${Math.min(100, Math.max(0, lastPlayed.progress))}%`}></div>
                  </div>
                  <div class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{lastPlayed.progress}% complete</div>
                {/if}
              </div>
              <a href={"/gameboard/" + lastPlayed.id}
                 class="rounded-md border border-[color:var(--brand)]/30 px-3 py-2 text-sm font-medium text-[color:var(--brand)] transition hover:bg-[color:var(--brand)]/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
                Open puzzle →
              </a>
            </div>
          </div>
        {:else}
          <div class="p-8 text-center">
            <div class="mb-2 text-5xl">🧩</div>
            <p class="mb-3 text-zinc-700 dark:text-zinc-300">No recent puzzle found.</p>
            <a href="/browse"
               class="rounded-md bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
              Browse puzzles
            </a>
          </div>
        {/if}
      </div>

      <!-- Recent Activity -->
      <div class="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div class="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Recent Activity</h3>
        </div>

        {#if recentActivity.length > 0}
          <ul class="divide-y divide-zinc-200 dark:divide-zinc-800">
            {#each recentActivity as a}
              <li class="px-6 py-4">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-zinc-800 dark:text-zinc-200">{a.text}</span>
                  <span class="text-xs text-zinc-500 dark:text-zinc-400">{a.at}</span>
                </div>
              </li>
            {/each}
          </ul>
        {:else}
          <div class="p-8 text-center text-sm text-zinc-600 dark:text-zinc-400">No recent activity.</div>
        {/if}
      </div>

{:else if tab === 'mypuzzles'}
  <!-- My Puzzles -->
  <div class="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
    <div class="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">My Puzzles</h3>
      <a href="/create"
         class="rounded-md bg-[color:var(--brand)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
        + New Puzzle
      </a>
    </div>

    {#if myPuzzles.length > 0}
      <div class="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
        {#each myPuzzles as p}
          <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
            <div class="relative flex aspect-video items-center justify-center bg-gradient-to-br from-[color:var(--brand)]/10 to-emerald-200/20 dark:from-[color:var(--brand)]/20 dark:to-emerald-900/10">
              {#if p.imageUrl}
                <img src={p.imageUrl} alt={p.title} class="h-full w-full object-cover" loading="lazy" />
              {/if}
              {#if p.isPinned}
                <svg viewBox="0 0 24 24" fill="currentColor"
                     class="absolute right-2 top-2 h-5 w-5 rotate-[-20deg] text-[color:var(--brand)] drop-shadow"
                     aria-label="Pinned">
                  <circle cx="12" cy="7" r="3" />
                  <rect x="11" y="9.5" width="2" height="7.5" rx="1" />
                  <path d="M12 17l-2 5h4l-2-5z" />
                </svg>
              {/if}
            </div>

            <div class="p-6">
              <div class="mb-3 flex items-start justify-between gap-3">
                <h4 class="line-clamp-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">{p.title}</h4>
                <span class={`rounded px-2 py-1 text-xs font-medium ${getDifficultyColor(p.difficulty ?? 'Medium')}`}>
                  {p.difficulty ?? 'Medium'}
                </span>
              </div>

              {#if p.description}
                <p class="mb-3 overflow-hidden text-sm text-zinc-600 [display:-webkit-box] [WebkitLineClamp:2] [WebkitBoxOrient:vertical] dark:text-zinc-400">
                  {p.description}
                </p>
              {/if}

              <div class="mb-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>{p.category ?? 'General'}</span>
                <span>{p.solveCount ?? 0} solves</span>
              </div>

              <div class="flex items-center justify-center gap-3">
                <a href={"/gameboard/" + encodeURIComponent(p.id)}
                   data-sveltekit-preload-data="hover"
                   data-sveltekit-preload-code="hover"
                   class="rounded-md border border-[color:var(--brand)]/30 px-3 py-2 text-sm font-medium text-[color:var(--brand)] transition hover:bg-[color:var(--brand)]/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
                  Play
                </a>
                <a href={"/edit/" + encodeURIComponent(p.id)}
                   class="rounded-md bg-[color:var(--brand)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
                  Edit
                </a>
<button
  type="button"
  on:click={() => togglePublishPuzzle(p)}
  disabled={publishBusy === p.id}
  class="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed">
  {publishBusy === p.id ? 'Updating…' : (p.isPublished ? 'Unpublish' : 'Publish')}
</button>

              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="p-10 text-center">
        <div class="mb-2 text-5xl">🧩</div>
        <p class="mb-4 text-zinc-700 dark:text-zinc-300">You haven’t created any puzzles yet.</p>
        <a href="/create"
           class="rounded-md bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
          Create your first puzzle
        </a>
      </div>
    {/if}
  </div>


    {:else if tab === 'activity'}
      <!-- Activity timeline -->
      <div class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 class="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Your Timeline</h3>

        {#if recentActivity.length > 0}
          <ol class="relative ml-3 border-l border-zinc-200 pl-6 dark:border-zinc-800">
            {#each recentActivity as a}
              <li class="mb-6">
                <span class="absolute -left-2.5 mt-1.5 h-2.5 w-2.5 rounded-full bg-[color:var(--brand)]"></span>
                <div class="text-sm text-zinc-800 dark:text-zinc-200">{a.text}</div>
                <div class="text-xs text-zinc-500 dark:text-zinc-400">{a.at}</div>
              </li>
            {/each}
          </ol>
        {:else}
          <div class="text-sm text-zinc-600 dark:text-zinc-400">No recent activity.</div>
        {/if}
      </div>

    {:else}
      <!-- Settings -->
      <div class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 class="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Profile Settings</h3>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Display Name</label>
            <input bind:value={profile.name}
              class="w-full rounded-full border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
            <input bind:value={profile.email} readonly
              class="w-full cursor-not-allowed rounded-full border border-zinc-300 bg-zinc-100 px-4 py-2 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400" />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Photo URL</label>
            <input bind:value={profile.photoURL} placeholder="https://…"
              class="w-full rounded-full border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          </div>

          <div class="md:col-span-2">
            <label class="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Bio</label>
            <textarea bind:value={profile.bio} rows="3"
              class="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"></textarea>
          </div>

          <!-- Theme -->
          <div>
            <label class="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Theme</label>
            <div class="flex gap-2">
              {#each (['light','dark','system'] as const) as t}
                <button type="button"
                  class="rounded-full border px-4 py-2 text-sm capitalize transition
                         {profile.theme === t
                           ? 'border-[color:var(--brand)] text-[color:var(--brand)] bg-[color:var(--brand)]/10'
                           : 'border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200'}"
                  on:click={() => profile.theme = t}>
                  {t}
                </button>
              {/each}
            </div>
          </div>

          <!-- Visibility -->
          <div>
            <label class="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Visibility</label>
            <label class="inline-flex cursor-pointer items-center gap-3">
              <input type="checkbox" bind:checked={profile.publicProfile} class="peer sr-only" />
              <span class="h-6 w-11 rounded-full bg-zinc-300 transition peer-checked:bg-[color:var(--brand)]/70 dark:bg-zinc-700"></span>
              <span class="text-sm text-zinc-700 dark:text-zinc-200">{profile.publicProfile ? 'Public' : 'Private'}</span>
            </label>
          </div>

          <!-- Socials -->
          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Twitter</label>
            <input bind:value={profile.socials.twitter} placeholder="@handle"
              class="w-full rounded-full border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">GitHub</label>
            <input bind:value={profile.socials.github} placeholder="username"
              class="w-full rounded-full border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          </div>
          <div class="md:col-span-2">
            <label class="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Website</label>
            <input bind:value={profile.socials.website} placeholder="https://example.com"
              class="w-full rounded-full border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          </div>

          <!-- Notifications -->
          <div class="md:col-span-2">
            <label class="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Notifications</label>
            <div class="grid grid-cols-1 gap-2 md:grid-cols-3">
              {#each Object.entries(profile.notifications) as [k, v]}
                <label class="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                  <span class="text-sm capitalize text-zinc-700 dark:text-zinc-200">{k}</span>
                  <input type="checkbox" bind:checked={(profile.notifications as any)[k]} class="h-4 w-4 accent-[color:var(--brand)]" />
                </label>
              {/each}
            </div>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" on:click={() => history.back()}
                  class="rounded-md border border-[color:var(--brand)]/30 px-4 py-2 text-sm font-medium text-[color:var(--brand)] hover:bg-[color:var(--brand)]/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
            Cancel
          </button>
          <button type="button" on:click={saveProfile}
                  class="rounded-md bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    {/if}
  </section>
</main>

{#if loading}
  <div class="fixed inset-0 z-50 grid place-items-center bg-white/70 dark:bg-zinc-900/70">
    <div class="rounded-xl bg-white px-4 py-3 text-sm shadow dark:bg-zinc-900">
      Loading profile…
    </div>
  </div>
{/if}
