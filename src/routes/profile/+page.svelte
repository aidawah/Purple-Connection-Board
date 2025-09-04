<script lang="ts">
  import { onMount } from 'svelte';

  type ProfileSettings = {
    displayName: string;
    email: string;
    bio: string;
    theme: 'light' | 'dark';
  };

  const SETTINGS_KEY = 'profile.settings';
  const THEME_KEY = 'theme';

  let form: ProfileSettings = {
    displayName: '',
    email: '',
    bio: '',
    theme: 'dark'
  };
  let saved = false;

  function applyTheme(mode: 'light' | 'dark') {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    localStorage.setItem(THEME_KEY, mode);
    form.theme = mode;
  }

  function submit(e: Event) {
    e.preventDefault();
    const { displayName, email, bio } = form;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ displayName, email, bio }));
    saved = true;
    setTimeout(() => (saved = false), 1500);
  }

  onMount(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        form.displayName = s.displayName ?? '';
        form.email = s.email ?? '';
        form.bio = s.bio ?? '';
      }
      const stored = localStorage.getItem(THEME_KEY);
      form.theme =
        stored === 'light' || stored === 'dark'
          ? (stored as 'light' | 'dark')
          : document.documentElement.classList.contains('dark')
            ? 'dark'
            : 'light';
    } catch {}
  });
</script>

<main class="mx-auto max-w-4xl px-4 py-6">
  <header class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">My Profile</h1>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">Manage your account and preferences.</p>
    </div>

    <a
      href="/profile/puzzles"
      class="rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      My Puzzles →
    </a>
  </header>

  <!-- Settings card -->
  <form on:submit|preventDefault={submit} class="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
    <h2 class="mb-4 text-lg font-semibold">Settings</h2>

    <div class="grid gap-4 md:grid-cols-2">
      <label class="block">
        <span class="mb-1 block text-sm">Display name</span>
        <input
          class="w-full rounded-md border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          bind:value={form.displayName}
          name="displayName"
          autocomplete="name"
        />
      </label>

      <label class="block">
        <span class="mb-1 block text-sm">Email</span>
        <input
          class="w-full rounded-md border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          type="email"
          bind:value={form.email}
          name="email"
          autocomplete="email"
        />
      </label>

      <label class="md:col-span-2 block">
        <span class="mb-1 block text-sm">Bio</span>
        <textarea
          class="w-full rounded-md border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          rows="4"
          bind:value={form.bio}
          name="bio"
        />
      </label>
    </div>

    <div class="mt-6">
      <h3 class="mb-2 text-sm font-medium">Theme</h3>
      <div class="flex items-center gap-3">
        <label class="inline-flex items-center gap-2">
          <input
            type="radio"
            name="theme"
            value="light"
            checked={form.theme === 'light'}
            on:change={() => applyTheme('light')}
            class="accent-indigo-600"
          />
          <span class="text-sm">Light</span>
        </label>
        <label class="inline-flex items-center gap-2">
          <input
            type="radio"
            name="theme"
            value="dark"
            checked={form.theme === 'dark'}
            on:change={() => applyTheme('dark')}
            class="accent-indigo-600"
          />
          <span class="text-sm">Dark</span>
        </label>
      </div>
    </div>

    <div class="mt-6 flex items-center gap-3">
      <button
        type="submit"
        class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:brightness-105"
      >
        Save changes
      </button>
      {#if saved}
        <span class="text-sm text-emerald-600">Saved ✓</span>
      {/if}
    </div>
  </form>

  <!-- Quick links -->
  <div class="mt-6 grid gap-3 md:grid-cols-2">
    <a
      href="/create"
      class="rounded-2xl border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <div class="font-semibold">Create a new puzzle</div>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">Jump straight into the creator.</p>
    </a>

    <a
      href="/profile/puzzles"
      class="rounded-2xl border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <div class="font-semibold">My Puzzles</div>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">View, edit, and publish your puzzles.</p>
    </a>
  </div>
</main>
