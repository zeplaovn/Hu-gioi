<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { auth } from "$lib/auth.svelte";
  import { game } from "$lib/game.svelte";
  import { num } from "$lib/format";
  let { children } = $props();

  onMount(() => { void auth.init(); });

  const path = $derived(page.url.pathname);
  const signedIn = $derived(!!auth.session);

  $effect(() => {
    if (!auth.ready) return;
    if (!signedIn && path !== "/") { game.reset(); void goto("/"); }
    if (signedIn && path === "/") void goto("/play");
    if (signedIn) game.start(); else game.stop();
  });

  const nav = [
    { href: "/play", label: "Tu luyện" },
    { href: "/quan-dinh", label: "Quán Đỉnh" },
    { href: "/lich-su", label: "Bia Thiên Mệnh" },
  ];
</script>

<div class="shell">
  {#if signedIn}
    <header>
      <a class="brand" href="/play">Thiên Vân Đại Lục</a>
      <nav aria-label="Chính">
        {#each nav as n}<a href={n.href} aria-current={path === n.href ? "page" : undefined}>{n.label}</a>{/each}
      </nav>
      <div class="who">
        {#if game.state}<span class="chip gold" title="Điểm Thiên Mệnh">Thiên Mệnh <b class="num">{num(game.state.account.tm_balance)}</b></span>{/if}
        <button class="btn ghost" onclick={() => auth.signOut()}>Thoát</button>
      </div>
    </header>
  {/if}
  <main>
    {#if !auth.ready}<p class="dim">Đang tải…</p>{:else}{@render children()}{/if}
  </main>
</div>

<style>
  .shell { max-width: 960px; margin: 0 auto; padding: 0 var(--gutter) 4rem; }
  header { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem 1.5rem; padding: 1rem 0; border-bottom: 1px solid var(--line); margin-bottom: 1.5rem; }
  .brand { font-family: var(--serif); font-size: 1.2rem; color: var(--gold); text-decoration: none; margin-right: auto; }
  nav { display: flex; gap: 0.25rem; flex-wrap: wrap; }
  nav a { color: var(--paper-dim); text-decoration: none; padding: 0.5rem 0.75rem; border-radius: 8px; min-height: 44px; display: inline-flex; align-items: center; }
  nav a:hover { color: var(--paper); }
  nav a[aria-current="page"] { color: var(--paper); background: var(--ink-3); }
  .who { display: flex; gap: 0.6rem; align-items: center; }
  main { min-height: 50vh; }
</style>
