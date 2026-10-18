<script lang="ts">
  import type { Snippet } from "svelte";
  interface Props { open: boolean; title: string; onclose?: () => void; children: Snippet }
  let { open, title, onclose, children }: Props = $props();
  let el: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  });
</script>

<!-- Esc đóng hộp thoại (hành vi mặc định của <dialog>) và gọi onclose để đồng bộ trạng thái. -->
<dialog bind:this={el} aria-labelledby="modal-title" {onclose}>
  <h2 id="modal-title">{title}</h2>
  {@render children()}
</dialog>
