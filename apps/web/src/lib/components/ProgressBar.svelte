<script lang="ts">
  import { clamp01 } from "$lib/format";
  interface Props { value: number; label: string; text?: string; tone?: "jade" | "gold" | "cinnabar" }
  let { value, label, text, tone = "jade" }: Props = $props();
  const v = $derived(clamp01(value));
</script>

<div class="bar">
  <div class="meta"><span>{label}</span>{#if text}<span class="num dim">{text}</span>{/if}</div>
  <div class="track" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(v * 100)}>
    <div class="fill {tone}" style:width="{v * 100}%"></div>
  </div>
</div>

<style>
  .meta { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.9rem; margin-bottom: 0.3rem; }
  .track { height: 10px; border-radius: 999px; background: var(--ink-3); border: 1px solid var(--line); overflow: hidden; }
  .fill { height: 100%; transition: width 0.6s ease; }
  .jade { background: linear-gradient(90deg, var(--jade-deep), var(--jade)); }
  .gold { background: linear-gradient(90deg, var(--gold-deep), var(--gold)); }
  .cinnabar { background: linear-gradient(90deg, var(--cinnabar-deep), var(--cinnabar)); }
</style>
