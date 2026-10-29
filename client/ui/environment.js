/* Tứ thời là cảnh sắc client; đồng hồ lấy từ tiến trình phiên chơi. */
(function (root) {
  'use strict';
  const UI = root.HU_UI, A = root.HU_ASSETS, { $ } = UI.kit;
  const seasons = ['spring', 'summer', 'autumn', 'winter'];
  const names = { spring: 'Xuân', summer: 'Hạ', autumn: 'Thu', winter: 'Đông' };
  const verses = { spring: 'Xuân hồi đại địa · vạn vật hồi sinh', summer: 'Hạ chí quang lâm · linh khí thịnh vượng', autumn: 'Thu phong khởi · lá vàng quy căn', winter: 'Đông tuyết giáng · vạn vật tĩnh tu' };
  let owner = null, previous = null, requested = '', displayed = '', generation = 0, announcementTimer = 0;

  function describe(s) {
    const tick = Math.max(0, s.tick || 0);
    const season = seasons.includes(s.settings.season) ? s.settings.season : seasons[Math.floor(tick / 900) % 4];
    const phase = Math.floor(tick / 450) % 2 ? 'night' : 'day';
    const world = A.worldOf(s.zone);
    return { season, phase, world, src: A.zoneBg(s.zone, season, phase) };
  }

  function update(s) {
    const next = describe(s);
    if (UI.isReduced()) {
      for (const id of ['sceneTransition', 'seasonAnnouncement']) $(id).getAnimations().forEach(animation => animation.cancel());
    }
    if (owner !== s) { owner = s; previous = null; }
    const celestial = next.world === 'tien_gioi';
    $('stageWeather').textContent = celestial ? '✧ Tiên cảnh trường tồn' : `${next.phase === 'day' ? '☀' : '☾'} ${names[next.season]} · ${next.phase === 'day' ? 'Ban ngày' : 'Ban đêm'}`;
    $('scene').dataset.phase = celestial ? 'eternal' : next.phase;
    $('scene').dataset.season = next.season;
    if (previous && !celestial && (previous.season !== next.season || previous.phase !== next.phase || previous.world !== next.world)) {
      const message = previous.season !== next.season ? verses[next.season]
        : next.phase === 'night' ? 'Dạ mạc buông · trăng soi tiên sơn' : 'Bình minh đến · nắng rọi tiên lộ';
      const banner = $('seasonAnnouncement');
      clearTimeout(announcementTimer);
      banner.textContent = message;
      banner.hidden = false;
      banner.getAnimations().forEach(animation => animation.cancel());
      if (!UI.isReduced()) banner.animate([{ opacity: 0 }, { opacity: 1, offset: .18 }, { opacity: 1, offset: .8 }, { opacity: 0 }], { duration: 4200 });
      announcementTimer = setTimeout(() => { banner.hidden = true; }, 4200);
      if (previous.season !== next.season) UI.toast(message, { type: 'info', title: 'Tứ thời chuyển cảnh' });
      root.dispatchEvent(new CustomEvent('hu:scene-change', { detail: { ...next, previous: { ...previous } } }));
    }
    previous = next;
    if (requested === next.src) return;
    requested = next.src;
    const token = ++generation, image = new Image();
    image.onload = async () => {
      try { await image.decode(); } catch { /* onload đã xác nhận ảnh sẵn sàng */ }
      if (token !== generation) return;
      const backdrop = $('sceneBackdrop'), overlay = $('sceneTransition');
      overlay.getAnimations().forEach(animation => animation.cancel());
      overlay.style.backgroundImage = displayed ? `url('${displayed}')` : 'none';
      backdrop.style.backgroundImage = `url('${next.src}')`;
      if (displayed && !UI.isReduced()) overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1800, easing: 'ease-in-out' });
      displayed = next.src;
    };
    image.onerror = () => { if (token === generation) requested = ''; };
    image.src = next.src;
  }
  UI.environment = { describe, update };
})(typeof window !== 'undefined' ? window : globalThis);
