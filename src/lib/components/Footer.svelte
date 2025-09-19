<script lang="ts">
	const year = new Date().getFullYear();
</script>

<footer
	class="mt-12 border-t border-zinc-200/60 bg-zinc-50/60 px-4 py-8 dark:border-zinc-800/60 dark:bg-zinc-900/40"
>
	<!--  (Purple team section) -->
	<div class="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
		<section>
			<h3 class="text-base font-semibold text-zinc-900 dark:text-zinc-100">
				Healthspaces Purple Team
			</h3>
			<p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
				Svelte and Typescript Connection Board
			</p>
		</section>

		<!--  (Links section) -->
		<nav aria-label="Footer links" class="text-center">
			<h4 class="text-base font-semibold text-zinc-900 dark:text-zinc-100">Links</h4>
			<ul class="mt-2 space-y-1 text-sm">
				<li>
					<a
						class="text-zinc-700 hover:underline dark:text-zinc-200"
						href="https://healthspaces.com/about/">About</a
					>
				</li>
				<li>
					<a
						class="text-zinc-700 hover:underline dark:text-zinc-200"
						href="https://healthspaces.com/contact/">Contact</a
					>
				</li>
				<li>
					<a
						class="text-zinc-700 hover:underline dark:text-zinc-200"
						href="https://healthspaces.com/blog/">Blog</a
					>
				</li>
				<li>
					<a
						class="text-zinc-700 hover:underline dark:text-zinc-200"
						href="https://healthspaces.com/privacy-policy/">Privacy Policy</a
					>
				</li>
			</ul>
		</nav>

		<!--  (Stay in touch section) -->
		<section class="text-right">
			<h4 class="text-base font-semibold text-zinc-900 dark:text-zinc-100">Stay in touch</h4>
			<p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">teamx@healthspaces.com</p>
		</section>

		<!--  (Social Media section) -->
		<section>
			<h4 class="text-sm font-medium text-zinc-900 dark:text-zinc-100">Follow us</h4>
			<div class="mt-3 flex gap-5 text-teal-600 dark:text-teal-400">
				<a
					href="https://twitter.com/healthspacers"
					aria-label="X"
					class="hover:text-zinc-700 dark:hover:text-zinc-200"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="50"
						height="50"
						fill="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.822L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.162 17.52h1.833L7.084 4.126H5.117l11.965 15.644Z"
						/>
					</svg>
				</a>
				<a
					href="https://www.linkedin.com/company/healthspaces/"
					aria-label="LinkedIn"
					class="hover:text-zinc-700 dark:hover:text-zinc-200"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="60"
						height="64"
						fill="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							d="M6.94 8.6v8.8H4.2V8.6h2.74ZM5.57 7.32a1.58 1.58 0 1 1 0-3.16 1.58 1.58 0 0 1 0 3.16Zm4.58 1.28h2.62v1.2h.04c.36-.69 1.25-1.42 2.57-1.42 2.75 0 3.26 1.81 3.26 4.16v4.86h-2.74v-4.31c0-1.03-.02-2.35-1.43-2.35-1.43 0-1.65 1.12-1.65 2.28v4.38h-2.67V8.6Z"
						/>
					</svg>
				</a>
			</div>
		</section>
	</div>

	<!--  (Copyright section) -->
	<div class="mx-auto mt-6 max-w-6xl text-center text-xs text-zinc-600 dark:text-zinc-400">
		<span>© {year} Healthspaces-Purple</span>
		<a href="/privacy" class="hover:underline">Privacy</a>
	</div>
</footer>
