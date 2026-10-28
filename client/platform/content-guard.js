/* Hạn chế sao chép qua giao diện; quyền điều khiển trình duyệt vẫn thuộc người dùng. */
(function () {
  'use strict';
  document.documentElement.classList.add('content-protected');

  const editable = target => {
    const el = target instanceof Element ? target : target?.parentElement;
    return !!el && (el.matches('input, textarea') || el.isContentEditable);
  };
  const stop = event => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  // Form nhập đạo hiệu, tìm vật phẩm và dữ liệu do người chơi nhập vẫn dùng clipboard.
  for (const type of ['contextmenu', 'selectstart', 'copy', 'cut', 'dragstart']) {
    document.addEventListener(type, event => {
      if (!editable(event.target)) stop(event);
    }, true);
  }

  document.addEventListener('keydown', event => {
    if (event.isComposing) return;
    const key = event.key.toLowerCase(), command = event.ctrlKey || event.metaKey;
    const inspector = key === 'f12' ||
      (event.ctrlKey && event.shiftKey && ['i', 'j', 'c', 'k'].includes(key)) ||
      (event.metaKey && event.altKey && ['i', 'j', 'c', 'k', 'u'].includes(key));
    const pageAction = command && ['u', 's', 'p'].includes(key);
    const copyAction = !editable(event.target) &&
      ((command && ['a', 'c', 'x'].includes(key)) || (event.ctrlKey && key === 'insert') || (event.shiftKey && key === 'delete'));
    if (inspector || pageAction || copyAction) stop(event);
  }, true);
})();
