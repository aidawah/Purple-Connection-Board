<script lang="ts">
	const year = new Date().getFullYear();
</script>

<footer
	class="mt-8 border-t border-zinc-200/60 bg-zinc-50/60 px-4 py-6 backdrop-blur-sm transition-colors duration-300 dark:border-zinc-800/60 dark:bg-zinc-900/40"
>
	<!--  (Main footer content) -->
	<div class="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
		<!-- Company section -->
		<section class="space-y-2">
			<h3 class="text-sm font-semibold text-zinc-900 transition-colors duration-200 dark:text-zinc-100">
				Healthspaces Purple Team
			</h3>
			<p class="text-xs text-zinc-600 transition-colors duration-200 dark:text-zinc-400">
				Svelte and Typescript Connection Board
			</p>
		</section>

		<!-- Links section -->
		<nav aria-label="Footer links" class="text-center">
			<h4 class="text-sm font-semibold text-zinc-900 transition-colors duration-200 dark:text-zinc-100">Quick Links</h4>
			<ul class="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
				<li>
					<a
						class="text-zinc-700 transition-all duration-200 hover:text-teal-600 hover:underline dark:text-zinc-300 dark:hover:text-teal-400"
						href="https://healthspaces.com/about/">About</a
					>
				</li>
				<li>
					<a
						class="text-zinc-700 transition-all duration-200 hover:text-teal-600 hover:underline dark:text-zinc-300 dark:hover:text-teal-400"
						href="https://healthspaces.com/contact/">Contact</a
					>
				</li>
				<li>
					<a
						class="text-zinc-700 transition-all duration-200 hover:text-teal-600 hover:underline dark:text-zinc-300 dark:hover:text-teal-400"
						href="https://healthspaces.com/blog/">Blog</a
					>
				</li>
				<li>
					<a
						class="text-zinc-700 transition-all duration-200 hover:text-teal-600 hover:underline dark:text-zinc-300 dark:hover:text-teal-400"
						href="https://healthspaces.com/privacy-policy/">Privacy</a
					>
				</li>
			</ul>
		</nav>

		<!-- Contact and social section -->
		<section class="text-right space-y-3">
			<div>
				<h4 class="text-sm font-semibold text-zinc-900 transition-colors duration-200 dark:text-zinc-100">Stay Connected</h4>
				<p class="mt-1 text-xs text-zinc-600 transition-colors duration-200 dark:text-zinc-400">teamx@healthspaces.com</p>
			</div>
			<div class="flex justify-end gap-3">
				<a
					href="https://twitter.com/healthspacers"
					aria-label="Follow us on X (Twitter)"
					class="group"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						fill="currentColor"
						viewBox="0 0 24 24"
						class="text-zinc-600 transition-all duration-200 group-hover:scale-110 group-hover:text-teal-600 dark:text-zinc-400 dark:group-hover:text-teal-400"
					>
						<path
							d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.822L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.162 17.52h1.833L7.084 4.126H5.117l11.965 15.644Z"
						/>
					</svg>
				</a>
				<a
					href="https://www.linkedin.com/company/healthspaces/"
					aria-label="Follow us on LinkedIn"
					class="group"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						fill="currentColor"
						viewBox="0 0 24 24"
						class="text-zinc-600 transition-all duration-200 group-hover:scale-110 group-hover:text-teal-600 dark:text-zinc-400 dark:group-hover:text-teal-400"
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
	<div class="mx-auto mt-4 flex max-w-6xl items-center justify-center gap-4 border-t border-zinc-200/40 pt-4 text-xs text-zinc-500 dark:border-zinc-800/40 dark:text-zinc-500">
		<span class="transition-colors duration-200">© {year} Healthspaces-Purple</span>
		<span class="text-zinc-300 dark:text-zinc-700">•</span>
		<a 
			href="/privacy" 
			class="transition-all duration-200 hover:text-teal-600 hover:underline dark:hover:text-teal-400"
		>
			Privacy Policy
		</a>
	</div>
</footer>
