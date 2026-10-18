<script lang="ts">
  import { clamp01 } from "$lib/format";
  interface Props { value: number; label: string; text?: string; tone?: "jade" | "gold" | "cinnabar" | "cyan" }
  let { value, label, text, tone = "jade" }: Props = $props();
  const v = $derived(clamp01(value));
  const COLOR = { jade: "#2fb86a", gold: "#d9a21f", cinnabar: "#c8452e", cyan: "#3aa7d6" } as const;
  const c = $derived(COLOR[tone]);
</script>

<div>
  <div class="bar-label" style:color={c}>{label}</div>
  <div class="bar" style:border-color={c} role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(v * 100)}>
    <div class="bar-fill" style:width="{v * 100}%" style:background={c}></div>
    {#if text}<div class="bar-text num">{text}</div>{/if}
  </div>
</div>
