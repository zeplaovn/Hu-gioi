<script lang="ts">
  import { auth } from "$lib/auth.svelte";
  import { configured } from "$lib/supabase";

  let mode = $state<"in" | "up">("in");
  let email = $state(""), password = $state("");
  let busy = $state(false);
  let msg = $state<string | null>(null);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    busy = true; msg = null;
    msg = mode === "in" ? await auth.signIn(email, password) : await auth.signUp(email, password);
    busy = false;
  }
</script>

<svelte:head><title>Thiên Vân Đại Lục</title></svelte:head>

<section class="hero">
  <p class="dim eyebrow">Sau Thiên Biến, nhân loại bị dịch chuyển khỏi Trái Đất…</p>
  <h1>Thiên Vân Đại Lục</h1>
  <p class="lede">Một kiếp tu sĩ, ba đại giới. Tu luyện theo thời gian thật, vượt Hạ Giới, Linh Giới, Tiên Giới. Chết thật là mất tất cả, chỉ còn Thiên Mệnh theo ngươi qua kiếp sau.</p>

  {#if !configured()}
    <p class="notice error" role="alert">Chưa cấu hình Supabase. Đặt <code>PUBLIC_SUPABASE_URL</code> và <code>PUBLIC_SUPABASE_ANON_KEY</code> trong <code>apps/web/.env</code> (xem README).</p>
  {:else}
    <form class="card gold stack" onsubmit={submit}>
      <h2>{mode === "in" ? "Nhập đạo" : "Lập đạo hiệu"}</h2>
      <div><label for="email">Email</label><input id="email" type="email" bind:value={email} autocomplete="email" required /></div>
      <div><label for="pw">Mật khẩu</label><input id="pw" type="password" bind:value={password} minlength="8" autocomplete={mode === "in" ? "current-password" : "new-password"} required /></div>
      {#if msg}<p class="notice" role="status">{msg}</p>{/if}
      <div class="row between">
        <button class="btn" disabled={busy}>{mode === "in" ? "Đăng nhập" : "Đăng ký"}</button>
        <button type="button" class="btn ghost" onclick={() => { mode = mode === "in" ? "up" : "in"; msg = null; }}>
          {mode === "in" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
        </button>
      </div>
    </form>
  {/if}
</section>

<style>
  .hero { max-width: 520px; margin: 6vh auto 0; }
  .eyebrow { font-style: italic; margin-bottom: 0.2rem; }
  .lede { color: var(--paper-dim); margin-bottom: 1.5rem; }
  code { background: var(--ink-3); padding: 0.05rem 0.35rem; border-radius: 4px; }
</style>
