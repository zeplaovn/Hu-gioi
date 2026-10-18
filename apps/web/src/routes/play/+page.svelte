<script lang="ts">
  import { game } from "$lib/game.svelte";
  import ProgressBar from "$lib/components/ProgressBar.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { causeLabel, num, pct } from "$lib/format";

  const s = $derived(game.state);
  const life = $derived(s?.life ?? null);
  const pending = $derived(s?.pending_intent ?? null);
  let understood = $state(false);

  $effect(() => { if (!game.prepared) understood = false; });

  function resume() {
    if (!life || !pending) return;
    game.prepared = {
      intent_id: pending.intent_id, stage_idx: life.stage.idx, death_prob: pending.death_prob, success_prob: 1 - pending.death_prob,
      lethal: pending.death_prob > 0, expires_at: pending.expires_at, warning: "Chết thật = mất toàn bộ tài sản của kiếp (giữ Thiên Mệnh).",
    };
  }
  const r = $derived(game.result);
</script>

<svelte:head><title>Tu luyện · Thiên Vân Đại Lục</title></svelte:head>

{#if game.error}<p class="notice error" role="alert">{game.error}</p>{/if}

{#if game.loading && !s}
  <p class="dim">Đang đọc thiên cơ…</p>
{:else if s && !life}
  <section class="card gold stack">
    <h1>Bắt đầu một kiếp</h1>
    <p class="dim">Ngươi sẽ thức tỉnh ở Hạ Giới với tay trắng. Kiếp này chỉ kết thúc khi tọa hóa, đại đột phá thất bại hoặc chết trong nội dung sinh tử.</p>
    <button class="btn" onclick={() => game.startLife()} disabled={game.busy}>Nhập thế</button>
  </section>
{:else if s && life}
  <div class="stack">
    <section class="card gold">
      <div class="row between">
        <div>
          <p class="dim small eyebrow">Kiếp thứ {life.life_no} · {life.stage.world}</p>
          <h1>{life.stage.name}</h1>
        </div>
        <span class="chip jade num">Tầng {life.tang} / 9</span>
      </div>

      {#if life.status === "cleared"}
        <p class="notice" role="status">Ngươi đã hoàn tất tuyến chính và đứng tại Đài Quy Hương. Kiếp này kết thúc trong vinh quang; Thiên Mệnh đã được ghi vào Bia.</p>
      {:else}
        <div class="stack">
          <ProgressBar label="Tu vi tầng {life.tang}" value={life.progress_s / life.need_s} text={pct(life.progress_s / life.need_s, 0)} />
          <ProgressBar label="Thọ nguyên" tone="gold" value={life.lifespan.used_years / life.lifespan.cap_years}
            text="{num(Math.round(life.lifespan.used_years))} / {num(life.lifespan.cap_years)} năm" />
        </div>
      {/if}
    </section>

    {#if life.status === "alive"}
      <section class="card {life.tang === 9 ? 'danger' : ''}">
        <h2>Đột phá</h2>
        {#if life.tang < 9}
          <p class="dim">Tầng 1–8 tự động tiến khi đủ tu vi và <b>không có nguy cơ tử vong</b>, kể cả lúc ngươi vắng mặt. Tới tầng 9 sẽ dừng lại chờ ngươi xác nhận đại đột phá.</p>
        {:else if life.ready_for_major}
          {#if pending && !game.prepared}
            <p>Có một lời xác nhận đang chờ (xác suất tử vong {pct(pending.death_prob, 2)}).</p>
            <button class="btn danger" onclick={resume}>Tiếp tục xác nhận</button>
          {:else}
            <p>Tu vi đã viên mãn. Đại đột phá có thể thất bại dẫn tới <b>tử vong thật</b>.</p>
            <button class="btn danger" onclick={() => game.prepare()} disabled={game.busy}>Đại đột phá</button>
          {/if}
        {:else}
          <p class="dim">Đang tích tụ tu vi cho đại đột phá. Khi đầy, nút đột phá sẽ mở.</p>
        {/if}
      </section>
    {/if}

    <div class="grid two">
      <section class="card">
        <h2>Thân thể</h2>
        <dl>
          <dt>Tốc độ tu luyện</dt><dd class="num">×{life.speed_mult.toFixed(3).replace(".", ",")}</dd>
          <dt>Hệ số rủi ro</dt><dd class="num">×{life.risk_mult.toFixed(3).replace(".", ",")}</dd>
          <dt>Thiên Mệnh nhận trong kiếp</dt><dd class="num">{num(life.tm_earned_life)}</dd>
          <dt>Tài sản (LS / LT / TN)</dt><dd class="num">{num(life.wallet.ls)} / {num(life.wallet.lt)} / {num(life.wallet.tn)}</dd>
        </dl>
      </section>
      <section class="card">
        <h2>Vật phẩm của kiếp</h2>
        {#if life.items.length === 0}
          <p class="dim">Chưa có gì. Vật phẩm Thiên Mệnh mua ở Quán Đỉnh sẽ nằm ở đây và <b>mất khi chết</b>.</p>
        {:else}
          <ul>{#each life.items as it (it.item_id)}<li>{it.name}{#if it.used} <span class="dim">(đã dùng)</span>{/if}</li>{/each}</ul>
        {/if}
      </section>
    </div>
  </div>
{/if}

<Modal open={!!game.prepared} title="Xác nhận đại đột phá" onclose={() => game.cancelPrepare()}>
  {#if game.prepared}
    <div class="stack">
      <p>Xác suất <b>tử vong</b> lần này: <b class="num danger-text">{pct(game.prepared.death_prob, 2)}</b></p>
      <p class="dim">{game.prepared.warning}</p>
      {#if game.prepared.lethal}
        <label class="check"><input type="checkbox" bind:checked={understood} /> Ta hiểu: nếu chết, ta mất toàn bộ tài sản của kiếp này.</label>
      {/if}
      <div class="row">
        <button class="btn danger" disabled={game.busy || (game.prepared.lethal && !understood)} onclick={() => game.confirm()}>Đột phá</button>
        <button class="btn ghost" onclick={() => game.cancelPrepare()}>Để sau</button>
      </div>
    </div>
  {/if}
</Modal>

<Modal open={!!r} title={r?.outcome === "death" ? "Vẫn lạc" : r?.outcome === "cleared" ? "Viên mãn" : "Đột phá thành công"} onclose={() => game.dismissResult()}>
  {#if r?.outcome === "success"}
    <p>Ngươi bước vào <b>{r.stage_id}</b> ở {r.world}.</p>
    {#if r.ascended}<p class="gold-text">Phi Thăng: ngươi rời đại giới cũ nhưng vẫn là một kiếp, không mất gì.</p>{/if}
  {:else if r?.outcome === "cleared"}
    <p>Ngươi đã hoàn tất tuyến chính của kiếp này.</p>
  {:else if r?.outcome === "death"}
    <p>Nguyên nhân: <b>{causeLabel(r.cause)}</b>.</p>
    <p class="dim">Tài sản của kiếp đã tan biến. Thiên Mệnh và chỉ số vĩnh viễn vẫn còn. Một kiếp mới đã bắt đầu.</p>
  {/if}
  <button class="btn" onclick={() => game.dismissResult()}>Đã rõ</button>
</Modal>

<style>
  .eyebrow { margin: 0; }
  dl { display: grid; grid-template-columns: 1fr auto; gap: 0.4rem 1rem; margin: 0; }
  dt { color: var(--paper-dim); }
  dd { margin: 0; text-align: right; }
  ul { margin: 0; padding-left: 1.2rem; }
  .check { display: flex; gap: 0.6rem; align-items: flex-start; color: var(--paper); font-size: 0.95rem; }
  .check input { margin-top: 0.3rem; width: 18px; height: 18px; }
  .danger-text { color: var(--cinnabar); }
  .gold-text { color: var(--gold); }
</style>
