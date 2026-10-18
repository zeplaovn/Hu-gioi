<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { base } from "$app/paths";
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

<svelte:head><link rel="icon" href="{base}/assets/icons/orb_gold_22.png" /></svelte:head>

{#if signedIn}
  <header class="topbar">
    <a class="game-title" href="/play">Thiên Vân Đại Lục</a>
    <nav class="topnav" aria-label="Chính">
      {#each nav as n}<a href={n.href} aria-current={path === n.href ? "page" : undefined}>{n.label}</a>{/each}
    </nav>
    {#if game.state}
      <span class="chip gold" title="Điểm Thiên Mệnh"><img class="btn-ico" style="width:16px;height:16px" src="{base}/assets/icons/orb_gold_22.png" alt="" /> Thiên Mệnh <b class="num">{num(game.state.account.tm_balance)}</b></span>
    {/if}
    <button class="btn ghost" onclick={() => auth.signOut()}>Thoát</button>
  </header>
{/if}
<main class={path === "/play" ? "page" : "page narrow"}>
  {#if !auth.ready}<p class="dim">Đang tải…</p>{:else}{@render children()}{/if}
</main>
