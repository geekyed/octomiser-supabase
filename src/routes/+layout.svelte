<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from "mode-watcher";

	import { invalidate } from '$app/navigation';
	import Navigation from '$lib/components/custom/navigation.svelte';
	import { Button } from '$lib/components/ui/button';
	import DarkMode from '$lib/components/custom/darkMode.svelte';
	import Hamburger from '$lib/components/custom/Hamburger.svelte';

	let { data: propsData, children } = $props();
	let { session, supabase, userProfile } = $derived(propsData);

	let windowInnerWidth = $state(0)

	$effect(() => {
		windowInnerWidth = window.innerWidth
		const { data } = supabase.auth.onAuthStateChange((_, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => data.subscription.unsubscribe();
	});
</script>

<div class="flex items-center justify-between p-4 gap-4">
  <div class="w-10 sm:w-24"></div>
  <h1 class="flex-grow text-center text-4xl font-semibold">Octomiser</h1>
	{#if windowInnerWidth > 768}
		<div class="flex gap-2 items-center">
			{#if userProfile === null}
				<Button variant="secondary" href="/auth/login/github">Sign in with GitHub</Button>
			{:else}
				<Button variant="secondary" href="/auth/logout">Logout</Button>
			{/if}
			<DarkMode />
		</div>
	{:else}
	<Hamburger {userProfile}/>
	{/if}

</div>

{#if userProfile && windowInnerWidth>768}
	<Navigation/>
{/if}

<ModeWatcher />

{@render children()}

