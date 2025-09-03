<script lang="ts">
	const year = new Date().getFullYear();
</script>

<footer
	class="mt-12 border-t border-zinc-200/60 bg-zinc-50/60 px-4 py-8 dark:border-zinc-800/60 dark:bg-zinc-900/40"
>
	<div class="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
		<section>
			<h3 class="text-base font-semibold text-zinc-900 dark:text-zinc-100">
				Healthspaces Purple Team
			</h3>
			<p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
				Svelte and Typescript Connection Board
			</p>
		</section>

		<nav aria-label="Footer links">
			<h4 class="text-sm font-medium text-zinc-900 dark:text-zinc-100">Links</h4>
			<ul class="mt-2 space-y-1 text-sm">
				<li>
					<a
						class="text-zinc-700 hover:underline dark:text-zinc-200"
						href="https://healthspaces.com/about/">About Us</a
					>
				</li>
				<li>
					<a class="text-zinc-700 hover:underline dark:text-zinc-200" href="/contact">Contact</a>
				</li>
			</ul>
		</nav>

		<section>
			<h4 class="text-sm font-medium text-zinc-900 dark:text-zinc-100">Stay in touch</h4>
			<p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">teamx@healthspaces.com</p>
		</section>
	</div>

	<div
		class="mx-auto mt-6 flex max-w-6xl items-center justify-between text-xs text-zinc-600 dark:text-zinc-400"
	>
		<span>© {year} Healthspaces-Purple</span>
		<a href="/privacy" class="hover:underline">Privacy</a>
	</div>
</footer>
