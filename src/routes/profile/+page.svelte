<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  // ---- theme + data toggles ----
  const BRAND = '#14b8a6';
  const USE_FIREBASE = false; // flip to true when ready

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
  };

  // ---- state ----
  let loading = true;
  let saving = false;
  let flash: { type: 'success'|'error'|'info'; text: string } | null = null;

  // tab order: overview → mypuzzles → activity → settings
  let tab: 'overview' | 'mypuzzles' | 'activity' | 'settings' = 'overview';

  let profile: Profile = {
    name: 'Your Name',
    email: 'you@example.com',
    photoURL: '',
    bio: 'Tell the community a bit about you.',
    theme: 'system',
    publicProfile: true,
    notifications: { product: true, community: true, marketing: false },
    socials: { twitter: '', github: '', website: '' },
    stats: { puzzlesCreated: 3, puzzlesSolved: 42, streakDays: 7 }
  };

  // Placeholder “most recently played”
  let lastPlayed: { id: string; title: string; progress?: number } | null =
    USE_FIREBASE ? null : { id: 'demo-last', title: 'Tech Giants Connection', progress: 72 };

  // Placeholder “recent activity”
  let recentActivity: Array<{ at: string; text: string }> = [
    { at: 'Today',      text: 'Solved “Tech Giants Connection” ✅' },
    { at: 'Yesterday',  text: 'Created “World Capitals” 🧩' },
    { at: '2 days ago', text: 'Solved “Movie Directors” ✅' }
  ];

  // Placeholder pinned list (left rail)
  let pinnedPuzzles: Array<{ id: string; title: string; difficulty: 'Easy'|'Medium'|'Hard' }> = [
    { id: 'demo-1', title: 'Movie Directors',     difficulty: 'Medium' },
    { id: 'demo-2', title: 'Chemical Elements',   difficulty: 'Hard' }
  ];

  // Placeholder “My Puzzles”
  let myPuzzles: MyPuzzle[] = [
    { id: 'p1', title: 'Daily Challenge: Sports Teams', difficulty: 'Medium', category: 'Sports',     solveCount: 1247, isPinned: true },
    { id: 'p2', title: 'Classic Literature Characters', difficulty: 'Hard',   category: 'Literature', solveCount: 892  }
  ];

  // ---- firebase (lazy) ----
  let fb: any = null; let ffs: any = null; let auth: any = null; let db: any = null;
  let currentUID: string | null = null;

  async function ensureFirebase() {
    if (!browser || !USE_FIREBASE) return;
    if (!fb) fb = await import('$lib/firebase');
    if (!ffs) ffs = await import('firebase/firestore');
    if (!auth) auth = await import('firebase/auth');
    db = fb?.db || fb?.getFirestore?.(fb.app);
  }

  async function loadFromFirebase() {
    if (!USE_FIREBASE || !db) { loading = false; return; }
    try {
      const _auth = fb?.auth || auth?.getAuth?.();
      const user = _auth?.currentUser;
      if (user?.uid) {
        currentUID = user.uid;
        profile.email = user.email ?? profile.email;
        profile.name = user.displayName ?? profile.name;
        profile.photoURL = user.photoURL ?? profile.photoURL;
      }
      if (!currentUID) { loading = false; return; }

      const docRef = ffs.doc(db, 'profiles', currentUID);
      const snap = await ffs.getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data();
        profile = {
          uid: currentUID,
          name: d.name ?? profile.name,
          email: d.email ?? profile.email,
          photoURL: d.photoURL ?? profile.photoURL,
          bio: d.bio ?? profile.bio,
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
      }

      // recent activity
      const actQ = ffs.query(
        ffs.collection(db, 'activity'),
        ffs.where('uid', '==', currentUID),
        ffs.orderBy('createdAt', 'desc'),
        ffs.limit(15)
      );
      const actSnap = await ffs.getDocs(actQ);
      recentActivity = actSnap.docs.map((doc: any) => {
        const x = doc.data();
        const when = x.createdAt?.toDate?.()?.toLocaleString?.() ?? 'recently';
        const txt = x.type === 'puzzle_solved'
          ? `Solved “${x.puzzleTitle ?? 'Untitled'}” ✅`
          : `Created “${x.puzzleTitle ?? 'Untitled'}” 🧩`;
        return { at: when, text: txt };
      });

      // pinned
      const pinQ = ffs.query(
        ffs.collection(db, 'puzzles'),
        ffs.where('owner', '==', currentUID),
        ffs.where('isPinned', '==', true),
        ffs.limit(8)
      );
      const pinSnap = await ffs.getDocs(pinQ);
      pinnedPuzzles = pinSnap.docs.map((d: any) => {
        const x = d.data();
        return { id: d.id, title: x.title ?? 'Untitled', difficulty: (x.difficulty ?? 'Medium') };
      });

      // my puzzles
      const myQ = ffs.query(
        ffs.collection(db, 'puzzles'),
        ffs.where('owner', '==', currentUID),
        ffs.orderBy('createdAt', 'desc'),
        ffs.limit(50)
      );
      const mySnap = await ffs.getDocs(myQ);
      myPuzzles = mySnap.docs.map((d: any) => {
        const x = d.data();
        return {
          id: d.id,
          title: x.title ?? 'Untitled',
          description: x.description ?? '',
          category: x.category ?? 'General',
          difficulty: (x.difficulty ?? 'Medium'),
          imageUrl: x.imageUrl ?? '',
          isPinned: !!x.isPinned,
          solveCount: x.solveCount ?? 0,
          createdAt: x.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString()
        } as MyPuzzle;
      });

      // most recently played (optional when you wire Firestore)
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
          const x = doc.data();
          lastPlayed = {
            id: x.puzzleId,
            title: x.puzzleTitle ?? 'Untitled Puzzle',
            progress: x.progressPercent ?? undefined
          };
        } else {
          lastPlayed = null;
        }
      } catch { /* ignore */ }

    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  async function saveProfile() {
    if (!USE_FIREBASE) { flash = { type: 'info', text: 'Firebase disabled (mock save).' }; setTimeout(()=>flash=null,2200); return; }
    if (!db) return;
    try {
      saving = true;
      const docRef = ffs.doc(db, 'profiles', currentUID ?? 'demo-user');
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
    await loadFromFirebase();
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
      <h1 class="text-2xl font-bold text-white drop-shadow-sm">{profile.name}</h1>
      <p class="text-white/90">{profile.email}</p>
    </div>
    <!-- Save button removed per request -->
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
      <p class="text-sm text-zinc-700 dark:text-zinc-300">{profile.bio}</p>
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
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                         class="absolute right-2 top-2 h-5 w-5 rotate-[-20deg] text-[color:var(--brand)] drop-shadow"
                         aria-label="Pinned">
                      <circle cx="12" cy="7" r="3"/><rect x="11" y="9.5" width="2" height="7.5" rx="1"/><path d="M12 17l-2 5h4l-2-5z"/>
                    </svg>
                  {/if}
                </div>

                <div class="p-5">
                  <div class="mb-2 flex items-start justify-between gap-3">
                    <h4 class="line-clamp-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">{p.title}</h4>
                    {#if p.difficulty}
                      <span class="rounded px-2 py-1 text-xs font-medium ring-1 ring-inset ring-[color:var(--brand)]/30">{p.difficulty}</span>
                    {/if}
                  </div>

                  {#if p.description}
                    <p class="mb-3 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{p.description}</p>
                  {/if}

                  <div class="mb-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{p.category ?? 'General'}</span>
                    <span>{p.solveCount ?? 0} solves</span>
                  </div>

                  <!-- Centered actions -->
                  <div class="flex items-center justify-center gap-3">
                    <a href={"/gameboard/" + p.id}
                       class="rounded-md border border-[color:var(--brand)]/30 px-3 py-2 text-sm font-medium text-[color:var(--brand)] transition hover:bg-[color:var(--brand)]/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
                      Play
                    </a>
                    <a href={"/edit/" + p.id}
                       class="rounded-md bg-[color:var(--brand)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
                      Edit
                    </a>
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
        <ol class="relative ml-3 border-l border-zinc-200 pl-6 dark:border-zinc-800">
          {#each recentActivity as a}
            <li class="mb-6">
              <span class="absolute -left-2.5 mt-1.5 h-2.5 w-2.5 rounded-full bg-[color:var(--brand)]"></span>
              <div class="text-sm text-zinc-800 dark:text-zinc-200">{a.text}</div>
              <div class="text-xs text-zinc-500 dark:text-zinc-400">{a.at}</div>
            </li>
          {/each}
        </ol>
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
