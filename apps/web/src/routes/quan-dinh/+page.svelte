<script lang="ts">
  import { RULES, STAT_KEYS, STAT_LABEL, TM_CATALOG, type StatKey } from "@hu-gioi/game-core";
  import { game } from "$lib/game.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { num } from "$lib/format";

  const s = $derived(game.state);
  const life = $derived(s?.life?.status === "alive" ? s.life : null);
  const items = TM_CATALOG.filter(c => c.kind === "item");
  let confirmId = $state<string | null>(null);
  const confirmItem = $derived(items.find(i => i.id === confirmId) ?? null);

  function effect(k: StatKey): string {
    const e = RULES.stat_effects[k], out: string[] = [];
    if (e.speed) out.push(`+${(e.speed * 100).toFixed(1).replace(".", ",")}% tốc độ tu luyện mỗi cấp`);
    if (e.risk) out.push(`−${(e.risk * 100).toFixed(1).replace(".", ",")}% nguy cơ tử vong mỗi cấp`);
    return out.join(" · ") || "Chưa có hiệu ứng trong bản này";
  }
  const owned = (id: string) => life?.items.filter(i => i.catalog_id === id).length ?? 0;

  async function buy() {
    if (!confirmId) return;
    await game.buyItem(confirmId);
    confirmId = null;
  }
</script>

<svelte:head><title>Quán Đỉnh · Thiên Vân Đại Lục</title></svelte:head>

{#if game.error}<p class="notice error" role="alert">{game.error}</p>{/if}

{#if s}
  <div class="stack">
    <section>
      <h1>Quán Đỉnh Thiên Mệnh</h1>
      <p class="dim">Dùng Điểm Thiên Mệnh để nâng chỉ số <b>vĩnh viễn</b>: giữ nguyên qua mọi kiếp. Ngươi còn <b class="num gold-text">{num(s.account.tm_balance)}</b> điểm.</p>
      <div class="grid">
        {#each STAT_KEYS as k (k)}
          {@const st = s.account.stats[k]}
          <div class="card row between">
            <div>
              <h3>{STAT_LABEL[k]} <span class="chip num">{st.level} / {st.cap}</span></h3>
              <p class="dim small">{effect(k)}</p>
            </div>
            <button class="btn gold" disabled={game.busy || st.next_cost === null || st.next_cost > s.account.tm_balance} onclick={() => game.upgradeStat(k)}>
              {st.next_cost === null ? "Đã tối đa" : `Nâng · ${num(st.next_cost)}`}
            </button>
          </div>
        {/each}
      </div>
    </section>

    <section>
      <h2>Thiên Mệnh Các</h2>
      <p class="notice">Vật phẩm ở đây thuộc về <b>kiếp hiện tại</b>. Chết trước khi dùng thì <b>mất và không hoàn Thiên Mệnh</b>. Bản này mới có phần mua và giữ vật phẩm; hiệu ứng sử dụng sẽ được thêm cùng các hệ thống tương ứng.</p>
      <div class="grid two">
        {#each items as it (it.id)}
          <div class="card">
            <div class="row between"><h3>{it.name}</h3><span class="chip gold num">{it.cost} TM</span></div>
            <p class="dim small">{it.effect}</p>
            <div class="row between">
              <span class="small dim num">Đã có {owned(it.id)} / {it.per_life_limit} trong kiếp</span>
              <button class="btn ghost" disabled={game.busy || !life || owned(it.id) >= (it.per_life_limit ?? 0) || s.account.tm_balance < (it.cost ?? 0)} onclick={() => (confirmId = it.id)}>Mua</button>
            </div>
          </div>
        {/each}
      </div>
    </section>
  </div>
{:else}
  <p class="dim">Đang tải…</p>
{/if}

<Modal open={!!confirmItem} title="Mua vật phẩm Thiên Mệnh" onclose={() => (confirmId = null)}>
  {#if confirmItem}
    <div class="stack">
      <p>Mua <b>{confirmItem.name}</b> với <b class="num">{confirmItem.cost}</b> Thiên Mệnh?</p>
      <p class="notice error">Nếu chết trước khi dùng, vật phẩm mất và Thiên Mệnh không được hoàn lại.</p>
      <div class="row">
        <button class="btn gold" disabled={game.busy} onclick={buy}>Xác nhận mua</button>
        <button class="btn ghost" onclick={() => (confirmId = null)}>Hủy</button>
      </div>
    </div>
  {/if}
</Modal>

<style>
  .gold-text { color: var(--gold); }
  h3 { margin: 0 0 0.2rem; }
  p.small { margin: 0 0 0.6rem; }
</style>
