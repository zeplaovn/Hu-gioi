<script lang="ts">
  import { STAT_KEYS, STAT_LABEL, type StatKey } from "@hu-gioi/game-core";
  import { base } from "$app/paths";
  import { game } from "$lib/game.svelte";
  import ProgressBar from "$lib/components/ProgressBar.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import Scene, { type WorldId } from "$lib/components/Scene.svelte";
  import { causeLabel, num, pct } from "$lib/format";

  const s = $derived(game.state);
  const life = $derived(s?.life ?? null);
  const pending = $derived(s?.pending_intent ?? null);
  let understood = $state(false);
  $effect(() => { if (!game.prepared) understood = false; });

  const WORLD: Record<string, { id: WorldId; color: string }> = {
    "Hạ Giới": { id: "ha_gioi", color: "#7fffa0" },
    "Linh Giới": { id: "linh_gioi", color: "#7fdcff" },
    "Tiên Giới": { id: "tien_gioi", color: "#ffe27a" },
  };
  const ICON: Record<StatKey, string> = { TuongMao: "portrait", PhucDuyen: "clover", CanCot: "sword", NgoTinh: "brain", VanKhi: "charm" };
  const w = $derived(WORLD[life?.stage.world ?? "Hạ Giới"] ?? WORLD["Hạ Giới"]!);
  // Mùa chạy theo tầng: tầng 1–2 Xuân, 3–4 Hạ, 5–6 Thu, 7–9 Đông (9 tầng = một vòng bốn mùa).
  const season = $derived(life ? Math.min(3, Math.floor((life.tang - 1) / 2.25)) : 0);
  const prog = $derived(life ? Math.min(1, life.progress_s / life.need_s) : 0);
  const SEASON_NAME = ["Xuân", "Hạ", "Thu", "Đông"];

  function resume() {
    if (!life || !pending) return;
    game.prepared = {
      intent_id: pending.intent_id, stage_idx: life.stage.idx, death_prob: pending.death_prob, success_prob: 1 - pending.death_prob,
      lethal: pending.death_prob > 0, expires_at: pending.expires_at, warning: "Chết thật = mất toàn bộ tài sản của kiếp (giữ Thiên Mệnh).",
    };
  }
  const r = $derived(game.result);

  // Nhật ký: tự cuộn xuống cuối trừ khi người chơi đang kéo lên đọc dòng cũ.
  let logEl: HTMLElement | undefined = $state();
  let follow = $state(true);
  const onScroll = () => { if (logEl) follow = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 40; };
  $effect(() => { void game.log.length; if (follow && logEl) queueMicrotask(() => { if (logEl) logEl.scrollTop = logEl.scrollHeight; }); });
  const jump = () => { follow = true; if (logEl) logEl.scrollTop = logEl.scrollHeight; };
</script>

<svelte:head><title>Tu luyện · Thiên Vân Đại Lục</title></svelte:head>

{#if game.error}<p class="notice error" role="alert" style="margin-bottom:12px">{game.error}</p>{/if}

{#if game.loading && !s}
  <p class="dim">Đang đọc thiên cơ…</p>
{:else if s && !life}
  <div class="main" style="grid-template-columns: minmax(0, 700px); justify-content: center">
    <div class="col-center">
      <Scene world="ha_gioi" season={0} label="Hạ Giới" />
      <section class="card gold stack" style="margin-top:12px">
        <h1>Bắt đầu một kiếp</h1>
        <p class="dim">Ngươi sẽ thức tỉnh ở Hạ Giới với tay trắng. Kiếp này chỉ kết thúc khi tọa hóa, đại đột phá thất bại hoặc chết trong nội dung sinh tử.</p>
        <button class="btn gold" onclick={() => game.startLife()} disabled={game.busy}><img class="btn-ico" src="{base}/assets/icons/orb_gold_22.png" alt="" />Nhập thế</button>
      </section>
    </div>
  </div>
{:else if s && life}
  <div class="main">
    <!-- trái: nhân vật -->
    <aside class="col-left">
      <section class="panel">
        <p class="realm" style:color={w.color}>{life.stage.name}</p>
        <p class="dim">Kiếp thứ {life.life_no} · {life.stage.world} · tầng {life.tang}/9</p>
        {#if life.status === "alive"}
          <ProgressBar label="Tu vi tầng {life.tang}" tone="cyan" value={prog} text={pct(prog, 0)} />
        {/if}
        <ProgressBar label="Thọ nguyên" tone="gold" value={life.lifespan.used_years / life.lifespan.cap_years}
          text="{num(Math.round(life.lifespan.used_years))} / {num(life.lifespan.cap_years)} năm" />

        <p class="sec">Chỉ số vĩnh viễn (Thiên Mệnh)</p>
        {#each STAT_KEYS as k (k)}
          {@const st = s.account.stats[k]}
          <div class="mini-stat">
            <img src="{base}/assets/icons/{ICON[k]}_22.png" alt="" />
            <span>{STAT_LABEL[k]}</span>
            <div class="bar" style="border-color:#2fb86a" title="{st.level} / {st.cap}">
              <div class="bar-fill" style:width="{(st.level / st.cap) * 100}%" style="background:#2fb86a"></div>
              <div class="bar-text">{st.level} / {st.cap}</div>
            </div>
          </div>
        {/each}

        <p class="sec">Thân thể</p>
        <dl class="kv small">
          <dt>Tốc độ tu luyện</dt><dd class="num">×{life.speed_mult.toFixed(3).replace(".", ",")}</dd>
          <dt>Hệ số rủi ro</dt><dd class="num">×{life.risk_mult.toFixed(3).replace(".", ",")}</dd>
          <dt>Thiên Mệnh kiếp này</dt><dd class="num t-gold">{num(life.tm_earned_life)}</dd>
          <dt>Linh Thạch</dt><dd class="num">{num(life.wallet.ls)}</dd>
          <dt>Linh Tinh</dt><dd class="num">{num(life.wallet.lt)}</dd>
          <dt>Tiên Ngọc</dt><dd class="num">{num(life.wallet.tn)}</dd>
        </dl>
      </section>
    </aside>

    <!-- giữa: cảnh + nhật ký -->
    <div class="col-center">
      <Scene world={w.id} {season} color={w.color} pulse={game.pulse} label="{life.stage.world} · mùa {SEASON_NAME[season]}" />
      {#if life.status === "cleared"}
        <p class="notice" role="status" style="margin-top:10px">Ngươi đã hoàn tất tuyến chính và đứng tại Đài Quy Hương. Kiếp này kết thúc trong vinh quang; Thiên Mệnh đã được ghi vào Bia.</p>
      {/if}
      <div class="log-wrap">
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <ol class="log" bind:this={logEl} onscroll={onScroll} aria-live="polite" aria-label="Nhật ký tu luyện" tabindex="0">
          {#each game.log as l (l.id)}<li class="t-{l.tag || 'plain'}">{l.text}</li>{/each}
        </ol>
        {#if !follow}<button class="log-jump" type="button" onclick={jump}>↓ Tin mới</button>{/if}
      </div>
    </div>

    <!-- phải: hành động -->
    <aside class="col-right">
      <section class="panel">
        <p class="sec" style="margin-top:0">Đột phá</p>
        {#if life.status === "cleared"}
          <button class="btn seal" disabled style="--p:100%">Hoàn tất tuyến chính</button>
        {:else if life.tang < 9}
          <button class="btn seal" disabled style:--p="{prog * 100}%">
            <span>Tu luyện tầng {life.tang}</span><span class="seal-pct">{pct(prog, 0)}</span>
          </button>
          <p class="dim small" style="margin-top:8px">Tầng 1–8 tự tiến khi đủ tu vi, <b>không có nguy cơ tử vong</b>, kể cả lúc ngươi vắng mặt. Tới tầng 9 sẽ dừng chờ ngươi xác nhận đại đột phá.</p>
        {:else if life.ready_for_major}
          {#if pending && !game.prepared}
            <div class="alert-box"><span>Có một lời xác nhận đang chờ (xác suất tử vong {pct(pending.death_prob, 2)}).</span><button class="btn danger" onclick={resume}>Tiếp tục xác nhận</button></div>
          {:else}
            <button class="btn seal ready" style="--p:100%" onclick={() => game.prepare()} disabled={game.busy}>Đại đột phá</button>
            <p class="small" style="margin-top:8px; color:#ffd9cf">Có thể thất bại dẫn tới <b>tử vong thật</b>.</p>
          {/if}
        {:else}
          <button class="btn seal" disabled style:--p="{prog * 100}%">
            <span>Tích tụ tu vi đại đột phá</span><span class="seal-pct">{pct(prog, 0)}</span>
          </button>
        {/if}
      </section>

      <section class="panel" style="margin-top:12px">
        <p class="sec" style="margin-top:0">Vật phẩm của kiếp</p>
        {#if life.items.length === 0}
          <p class="dim small">Chưa có gì. Vật phẩm Thiên Mệnh mua ở Quán Đỉnh nằm ở đây và <b>mất khi chết</b>.</p>
        {:else}
          <ul class="small" style="margin:0; padding-left:1.1rem">
            {#each life.items as it (it.item_id)}<li>{it.name}{#if it.used}{" "}<span class="dim">(đã dùng)</span>{/if}</li>{/each}
          </ul>
        {/if}
        <a class="btn gold wide" style="margin-top:10px; text-decoration:none" href="/quan-dinh">
          <img class="btn-ico" src="{base}/assets/icons/orb_gold_22.png" alt="" />Quán Đỉnh · {num(s.account.tm_balance)} TM
        </a>
      </section>
    </aside>
  </div>
{/if}

<Modal open={!!game.prepared} title="Xác nhận đại đột phá" onclose={() => game.cancelPrepare()}>
  {#if game.prepared}
    <div class="stack">
      <p class="center" style="text-align:center">Xác suất <b>tử vong</b> lần này: <b class="num t-red">{pct(game.prepared.death_prob, 2)}</b></p>
      <p class="dim">{game.prepared.warning}</p>
      {#if game.prepared.lethal}
        <label class="check" style="display:flex; gap:.6rem; align-items:flex-start; color:var(--fg)"><input type="checkbox" bind:checked={understood} style="width:18px;height:18px;margin-top:.25rem" /> Ta hiểu: nếu chết, ta mất toàn bộ tài sản của kiếp này.</label>
      {/if}
      <div class="row">
        <button class="btn danger" disabled={game.busy || (game.prepared.lethal && !understood)} onclick={() => game.confirm()}>Đột phá</button>
        <button class="btn ghost" onclick={() => game.cancelPrepare()}>Để sau</button>
      </div>
    </div>
  {/if}
</Modal>

<Modal open={!!r} title={r?.outcome === "death" ? "Vẫn lạc" : r?.outcome === "cleared" ? "Viên mãn" : "Đột phá thành công"} onclose={() => game.dismissResult()}>
  <div class="stack">
    {#if r?.outcome === "success"}
      <p>Ngươi bước vào <b>{r.stage_id}</b> ở {r.world}.</p>
      {#if r.ascended}<p class="t-gold">Phi Thăng: ngươi rời đại giới cũ nhưng vẫn là một kiếp, không mất gì.</p>{/if}
    {:else if r?.outcome === "cleared"}
      <p>Ngươi đã hoàn tất tuyến chính của kiếp này.</p>
    {:else if r?.outcome === "death"}
      <p>Nguyên nhân: <b>{causeLabel(r.cause)}</b>.</p>
      <p class="dim">Tài sản của kiếp đã tan biến. Thiên Mệnh và chỉ số vĩnh viễn vẫn còn. Một kiếp mới đã bắt đầu.</p>
    {/if}
    <button class="btn" onclick={() => game.dismissResult()}>Đã rõ</button>
  </div>
</Modal>

<style>
  .t-plain { color: var(--fg); }
  .t-green { color: var(--green); } .t-gold { color: var(--gold); } .t-cyan { color: var(--cyan); } .t-red { color: var(--red); } .t-dim { color: var(--dim); }
</style>
