<script lang="ts">
  import ActivityRail from './ActivityRail.svelte'
  import Sidebar from './Sidebar.svelte'
  import MainPane from './MainPane.svelte'
  import Inspector from './Inspector.svelte'
  import StatusBar from './StatusBar.svelte'
</script>

<div class="app-shell">
  <ActivityRail />
  <Sidebar />
  <MainPane />
  <Inspector />
  <StatusBar />
</div>

<style>
  .app-shell {
    display: grid;
    grid-template-areas:
      "rail sidebar main inspector"
      "rail sidebar statusbar statusbar";
    grid-template-columns: 48px 240px 1fr 280px;
    grid-template-rows: 1fr 28px;
    height: 100vh;
    overflow: hidden;
    background: var(--color-bg-base);
  }
</style>
