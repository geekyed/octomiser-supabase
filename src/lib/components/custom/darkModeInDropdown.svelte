<script lang="ts">
  import { toggleMode, mode } from "mode-watcher";

  import Sun from "@lucide/svelte/icons/sun";
  import Moon from "@lucide/svelte/icons/moon";
	import { Button } from "../ui/button";

  let currentMode = $state("dark")

  $effect(() => {
    mode.subscribe((modeChangedTo) => {
      currentMode = modeChangedTo || 'dark' 
    })
  })
</script>

<Button variant="ghost" class='flex flex-row w-full focus:border-none justify-start text-lg' onclick={toggleMode}>
  {#if currentMode=== 'light'}
    <Moon class="mr-2"/> Dark
  {:else}
    <Sun class="mr-2"/> Light
  {/if}
</Button>