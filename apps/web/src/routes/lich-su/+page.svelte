<script lang="ts">
  import { STAGES } from "@hu-gioi/game-core";
  import { game } from "$lib/game.svelte";
  import { causeLabel, dateTime, num } from "$lib/format";
  const s = $derived(game.state);
  const where = (idx: number, tang: number) => `${STAGES[idx]?.name ?? "?"} · tầng ${tang}`;
</script>

<svelte:head><title>Bia Thiên Mệnh · Thiên Vân Đại Lục</title></svelte:head>

<h1>Bia Thiên Mệnh</h1>
<p class="dim">Lịch sử các kiếp của ngươi. Tài sản đã mất, nhưng dấu vết còn mãi.</p>

{#if !s}
  <p class="dim">Đang tải…</p>
{:else if s.history.length === 0}
  <p class="notice">Chưa có kiếp nào kết thúc.</p>
{:else}
  <div class="card table-wrap">
    <table>
      <thead><tr><th>Kiếp</th><th>Kết cục</th><th>Dừng ở</th><th>Số ngày tu</th><th>TM nhận</th><th>Kết thúc</th></tr></thead>
      <tbody>
        {#each s.history as h (h.life_no)}
          <tr>
            <td class="num">#{h.life_no}</td><td>{causeLabel(h.cause)}</td><td>{where(h.stage_idx, h.tang)}</td>
            <td class="num">{num(h.credited_days)}</td><td class="num">{h.tm_earned}</td><td class="dim">{dateTime(h.ended_at)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="dim small">Hiển thị tối đa 10 kiếp gần nhất.</p>
{/if}
