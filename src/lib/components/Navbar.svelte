<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/firebase';
  import { onMount } from 'svelte';

  const handleLogout = async () => {
    try {
      await auth.signOut();
      goto('/signinPage');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const items = [
    { href: '/', label: 'Home' },
    { href: '/browse', label: 'Browse Puzzles' },
    { href: '/create', label: 'Create' }
  ];

  let showUserMenu = false;

  let userData = { name: '', email: '', bio: '', photoURL: '' };
  let userSettings = { darkMode: false, emailNotifications: true };
  
  // Firebase
  let db: any = null;
  let ffs: any = null;
  let currentUID: string | null = null;

  // Initialize Firebase
  async function initFirebase() {
    if (!browser) return;
    try {
      const fb = await import('$lib/firebase');
      const firestore = await import('firebase/firestore');
      db = fb.db;
      ffs = firestore;
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
    }
  }

  // Load user settings from Firebase
  async function loadUserSettings(uid: string) {
    if (!db || !ffs) return;
    try {
      const docRef = ffs.doc(db, 'users', uid);
      const snap = await ffs.getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        userSettings = {
          darkMode: data.settings?.darkMode ?? false,
          emailNotifications: data.settings?.emailNotifications ?? true
        };
        // Update theme based on Firebase settings
        themeMode = userSettings.darkMode ? 'dark' : 'light';
        applyTheme(themeMode);
      }
    } catch (error) {
      console.error('Failed to load user settings:', error);
    }
  }

  onMount(async () => {
    if (!browser) return;

    await initFirebase();

    // Get user data from Firebase auth
    const unsubscribe = auth.onAuthStateChanged(async user => {
      if (user) {
        currentUID = user.uid;
        userData = {
          name: user.displayName || '',
          email: user.email || '',
          bio: '',
          photoURL: user.photoURL || ''
        };
        await loadUserSettings(user.uid);
      } else {
        currentUID = null;
        userData = { name: '', email: '', bio: '', photoURL: '' };
        userSettings = { darkMode: false, emailNotifications: true };
        themeMode = 'light';
        applyTheme('light');
      }
    });

    return () => unsubscribe();
  });

  function initials(name: string) {
    if (!name?.trim() || !userData.email) return '';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
  }

  function clickOutside(node: HTMLElement, cb: () => void) {
    const onDocClick = (e: MouseEvent) => {
      if (!node.contains(e.target as Node)) cb();
    };
    document.addEventListener('mousedown', onDocClick, true);
    return {
      destroy() {
        document.removeEventListener('mousedown', onDocClick, true);
      }
    };
  }

  // --- Theme state (light | dark | system) moved into profile dropdown ---
  let themeMode: 'light' | 'dark' | 'system' = 'light';
  let systemMql: MediaQueryList | null = null;

  function applyTheme(mode: 'light' | 'dark' | 'system') {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // Resolve system preference
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    const isDark = mode === 'dark' || (mode === 'system' && prefersDark);
    root.classList.toggle('dark', isDark);
  }

  // Save theme to Firebase
  async function saveThemeToFirebase(isDark: boolean) {
    if (!currentUID || !db || !ffs) return;
    try {
      const docRef = ffs.doc(db, 'users', currentUID);
      await ffs.setDoc(docRef, {
        settings: {
          ...userSettings,
          darkMode: isDark
        },
        updatedAt: ffs.serverTimestamp()
      }, { merge: true });
      userSettings.darkMode = isDark;
    } catch (error) {
      console.error('Failed to save theme to Firebase:', error);
    }
  }

  function setThemeMode(mode: 'light' | 'dark' | 'system') {
    themeMode = mode;
    
    // Determine if dark mode should be active
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = mode === 'dark' || (mode === 'system' && prefersDark);
    
    // Save to Firebase (only dark/light, not system)
    if (mode !== 'system') {
      saveThemeToFirebase(isDark);
    }
    
    applyTheme(mode);
  }
</script>

<!-- Desktop navbar -->
<nav class="sticky top-0 z-50 hidden border-b border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:block">
  <div class="relative flex items-center justify-between px-4 py-3">

    <!-- Left: brand -->
    <a href="/" class="flex items-center space-x-2 group">
      <img src="/Logo_transparent.png" class="h-8 w-8" alt="Logo" />
      <span class="text-xl font-semibold text-teal-600 transition-colors group-hover:text-teal-700 dark:text-teal-400 dark:group-hover:text-teal-300">
        Purple Connections
      </span>
    </a>

    <!-- Center: nav links (teal active/hover) -->
    <div class="absolute left-1/2 -translate-x-1/2">
      <ul class="flex list-none items-center gap-6 text-sm font-medium">
        {#each items as it}
          <li>
            <a
              href={it.href}
              class={`rounded-md px-3 py-2 transition-colors
                ${$page.url.pathname === it.href || ($page.url.pathname.startsWith('/gameboard') && it.href === '/')
                  ? 'bg-teal-50 text-teal-700 font-semibold dark:bg-teal-900/40 dark:text-teal-300'
                  : 'text-zinc-800 hover:text-teal-700 dark:text-zinc-100 md:dark:hover:text-teal-300'}`}
            >
              {it.label}
            </a>
          </li>
        {/each}
      </ul>
    </div>

    <!-- Right: avatar OR sign in -->
    <div class="flex-shrink-0 relative">
      {#if userData.email}
        <!-- Avatar button -->
        <button
          type="button"
          class="flex items-center justify-center w-10 h-10 rounded-full bg-teal-600 text-white 
                 focus:outline-none focus:ring-4 focus:ring-teal-300 dark:focus:ring-teal-700"
          aria-haspopup="true"
          aria-expanded={showUserMenu}
          on:click={() => (showUserMenu = !showUserMenu)}
        >
          <span class="sr-only">Open user menu</span>
          {#if userData.photoURL}
            <img src={userData.photoURL} alt="Profile" class="w-8 h-8 rounded-full object-cover" />
          {:else}
            <span class="w-8 h-8 rounded-full grid place-items-center font-semibold select-none">
              {initials(userData?.name)}
            </span>
          {/if}
        </button>

        {#if showUserMenu}
          <div
            use:clickOutside={() => (showUserMenu = false)}
            class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg divide-y divide-gray-100 
                   dark:bg-gray-700 dark:divide-gray-600 z-50"
          >
            <div class="px-4 py-3">
              <span class="block text-sm text-gray-900 dark:text-white">{userData?.name}</span>
              <span class="block text-sm text-gray-500 truncate dark:text-gray-400">{userData?.email}</span>
            </div>

            <!-- Theme toggle -->
            <div class="px-3 pt-2 pb-3">
              <div class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Theme</div>
              <div role="group" aria-label="Theme" class="grid grid-cols-3 gap-2">
                <button
                  class={`h-9 rounded-lg flex items-center justify-center gap-2 border transition
                    ${themeMode === 'light'
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-zinc-700 border-zinc-300 hover:border-teal-400 hover:text-teal-700 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 dark:hover:border-teal-500'}`}
                  aria-pressed={themeMode === 'light'}
                  on:click={() => setThemeMode('light')}
                >
                  <!-- sun -->
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42zm10.48 0l1.79-1.8 1.41 1.41-1.8 1.79-1.4-1.4zM12 4h0V1h0v3zm0 19h0v-3h0v3zM4 12H1v0h3zm22 0h-3v0h3zM6.76 19.16l-1.42 1.42-1.79-1.8 1.41-1.41 1.8 1.79zm13.69-.38l-1.41 1.41-1.79-1.8 1.41-1.41 1.79 1.8zM12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
                </button>

                <button
                  class={`h-9 rounded-lg flex items-center justify-center gap-2 border transition
                    ${themeMode === 'dark'
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-zinc-700 border-zinc-300 hover:border-teal-400 hover:text-teal-700 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 dark:hover:border-teal-500'}`}
                  aria-pressed={themeMode === 'dark'}
                  on:click={() => setThemeMode('dark')}
                >
                  <!-- moon -->
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                </button>

                <button
                  class={`h-9 rounded-lg flex items-center justify-center gap-2 border transition
                    ${themeMode === 'system'
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-zinc-700 border-zinc-300 hover:border-teal-400 hover:text-teal-700 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 dark:hover:border-teal-500'}`}
                  aria-pressed={themeMode === 'system'}
                  on:click={() => setThemeMode('system')}
                >
                  <!-- desktop -->
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4a2 2 0 00-2 2v10a2 2 0 002 2h6v2H8v2h8v-2h-2v-2h6a2 2 0 002-2V5a2 2 0 00-2-2zm0 12H4V5h16v10z"/></svg>
                </button>
              </div>
            </div>

            <ul class="py-2">
              <li>
                <a
                  href="/profile"
                  sveltekit:prefetch
                  on:click={() => (showUserMenu = false)}
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 
                         dark:text-gray-200 dark:hover:bg-teal-600/30 dark:hover:text-white"
                >
                  Profile
                </a>
              </li>
              <li>
                <a
                  href="/settings"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 
                         dark:text-gray-200 dark:hover:bg-teal-600/30 dark:hover:text-white"
                >
                  Settings
                </a>
              </li>
              <li>
                <button
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 
                         dark:text-gray-200 dark:hover:bg-teal-600/30 dark:hover:text-white"
                  on:click|preventDefault={handleLogout}
                >
                  Sign out
                </button>
              </li>
            </ul>
          </div>
        {/if}
      {:else}
        <!-- Sign In button -->
        <button
          on:click={() => goto('/signinPage')}
          class="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium 
                 hover:bg-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-300
                 dark:bg-teal-500 dark:hover:bg-teal-400 dark:focus:ring-teal-700"
        >
          Sign In
        </button>
      {/if}
    </div>
  </div>
</nav>

<!-- Mobile bottom nav -->
<nav
  class="fixed inset-x-0 bottom-0 z-50 md:hidden
         border-t border-neutral-800/80
         bg-neutral-900/90 backdrop-blur
         supports-[backdrop-filter]:bg-neutral-900/70"
  role="navigation"
  aria-label="Primary"
  style="padding-bottom: max(env(safe-area-inset-bottom), 0px);"
>
  <div class="mx-auto max-w-screen-sm">
    <ul class="grid h-16 grid-cols-4 items-stretch text-[13px] font-medium text-zinc-200">
      {#each items as it}
        <li class="flex">
          <a
            href={it.href}
            class={`mx-1 my-2 flex w-full flex-col items-center justify-center gap-1
                    rounded-xl px-3 text-center
                    transition-colors duration-150
                    ${$page.url.pathname === it.href
                      ? 'bg-teal-700/25 text-teal-300'
                      : 'text-zinc-300 hover:text-teal-300 hover:bg-neutral-800/70'}`}
          >
            <span class="leading-tight text-center">{it.label}</span>
          </a>
        </li>
      {/each}
      <li class="flex">
        <button
          on:click={() => userData.email ? goto('/profile') : goto('/signinPage')}
          class={`mx-1 my-2 flex w-full flex-col items-center justify-center gap-1 rounded-xl px-3
                  transition-[background,color,transform] duration-150 active:scale-[0.98]
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60
                  ${userData.email ? 'text-zinc-300 hover:text-teal-300 hover:bg-neutral-800/70'
                                   : 'bg-teal-600 text-white hover:bg-teal-700'}`}
        >
          <span class="leading-none">{userData.email ? 'Profile' : 'Sign In'}</span>
        </button>
      </li>
    </ul>
  </div>
</nav>
