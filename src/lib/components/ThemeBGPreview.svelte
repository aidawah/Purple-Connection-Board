<script lang="ts">
  const files = [
    "summer-bg.svg","spring-bg.svg","fall-bg.svg","winter-bg.svg",
    "christmas-bg.svg","thanksgiving-bg.svg","easter-bg.svg",
    "stpatricks-bg.svg","halloween-bg.svg","valentines-bg.svg","july4th-bg.svg"
  ];
  const base = "/images/themes/";
</script>

<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
  {#each files as f}
    <div class="rounded-xl border shadow overflow-hidden">
      <div class="p-3 text-sm font-semibold">{f}</div>
      <div class="h-48 w-full" style="background: url({base + f}) center/cover repeat;"></div>
    </div>
  {/each}
</div>
