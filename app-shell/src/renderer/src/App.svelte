<script lang="ts">
  import { onMount } from 'svelte'
  import AppShell from './shell/AppShell.svelte'
  import { initStore } from './store'

  onMount(() => { initStore() })
</script>

<AppShell />
