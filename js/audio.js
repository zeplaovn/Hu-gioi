/* HƯ GIỚI · NHẠC NỀN
   Phát lần lượt các bản nhạc trong media/audio. Trình duyệt chặn tự phát âm thanh,
   nên nhạc chỉ bắt đầu sau cú chạm/phím đầu tiên của người chơi. */
(function (root) {
  'use strict';
  const UI = root.HU_UI;
  if (!UI) return;

  const TRACKS = [
    { id: 'hu_gioi', title: 'Hư Giới', src: 'media/audio/hu_gioi.mp3' },
    { id: 'ngoc_hoa_tram', title: 'Ngọc Hoa Trâm', src: 'media/audio/ngoc_hoa_tram.mp3' },
    { id: 'thien_thu', title: 'Thiên Thu', src: 'media/audio/thien_thu.mp3' }
  ];
  const DEFAULTS = { music: true, musicVolume: 40, musicTrack: 'auto' };
  const FADE_MS = 600;

  let el = null, index = 0, unlocked = false, fadeTimer = 0, hiddenPause = false;

  const settings = () => {
    let st = null;
    try { st = UI.s && UI.s().settings; } catch (e) { st = null; }
    return Object.assign({}, DEFAULTS, st || {});
  };
  const target = st => Math.max(0, Math.min(1, (Number(st.musicVolume) || 0) / 100));

  function ensure() {
    if (el) return el;
    el = new Audio();
    el.preload = 'none';
    el.loop = false;
    el.volume = 0;
    el.addEventListener('ended', () => next());
    el.addEventListener('error', () => {
      // Một file hỏng không được làm im lặng cả playlist: bỏ qua bài đó.
      if (TRACKS.length > 1) next();
    });
    return el;
  }

  function fadeTo(volume, done) {
    clearInterval(fadeTimer);
    const a = ensure(), from = a.volume, steps = 12;
    let i = 0;
    fadeTimer = setInterval(() => {
      i++;
      a.volume = Math.max(0, Math.min(1, from + (volume - from) * (i / steps)));
      if (i >= steps) { clearInterval(fadeTimer); if (done) done(); }
    }, FADE_MS / steps);
  }

  function load(i) {
    const a = ensure();
    index = (i + TRACKS.length) % TRACKS.length;
    a.src = TRACKS[index].src;
  }

  function play() {
    const st = settings();
    if (!unlocked || !st.music) return;
    const a = ensure();
    if (!a.src) {
      const fixed = TRACKS.findIndex(t => t.id === st.musicTrack);
      load(fixed >= 0 ? fixed : Math.floor(Math.random() * TRACKS.length));
    }
    const p = a.play();
    if (p && p.catch) p.catch(() => { /* chưa được phép phát; đợi lần chạm sau */ });
    fadeTo(target(st));
  }

  function pause() {
    if (!el || el.paused) return;
    fadeTo(0, () => el.pause());
  }

  function next() {
    const st = settings();
    const fixed = TRACKS.findIndex(t => t.id === st.musicTrack);
    // Chọn bài cố định thì lặp lại bài đó; ngược lại phát tuần tự.
    load(fixed >= 0 ? fixed : index + 1);
    if (unlocked && st.music) { const p = el.play(); if (p && p.catch) p.catch(() => {}); }
    updateLabel();
  }

  function updateLabel() {
    const n = document.getElementById('musicNowPlaying');
    if (n) n.textContent = el && el.src && !el.paused ? '♪ ' + TRACKS[index].title : 'Đang tắt';
  }

  /** Đồng bộ trình phát với cài đặt hiện tại. */
  function sync() {
    const st = settings();
    if (!unlocked) return;
    if (!st.music) { pause(); updateLabel(); return; }
    const fixed = TRACKS.findIndex(t => t.id === st.musicTrack);
    if (fixed >= 0 && el && el.src && index !== fixed) load(fixed);
    if (!el || el.paused) play(); else el.volume = target(st);
    updateLabel();
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    ['pointerdown', 'keydown', 'touchend'].forEach(t => document.removeEventListener(t, unlock, true));
    play();
    updateLabel();
  }
  ['pointerdown', 'keydown', 'touchend'].forEach(t => document.addEventListener(t, unlock, true));

  // Tạm dừng khi chuyển tab để không phát nhạc nền trong khi người chơi không xem game.
  document.addEventListener('visibilitychange', () => {
    if (!el) return;
    if (document.hidden) { if (!el.paused) { hiddenPause = true; el.pause(); } }
    else if (hiddenPause) { hiddenPause = false; if (settings().music) { const p = el.play(); if (p && p.catch) p.catch(() => {}); } }
  });

  // Cài đặt lưu cùng bản lưu; ghi lại và đồng bộ khi người chơi thay đổi.
  const commit = fn => {
    if (!UI.store || !UI.store.ready || UI.store.locked) return;
    fn(UI.s().settings);
    sync();
    UI.store.write();
  };
  document.addEventListener('input', e => {
    if (e.target.id !== 'musicVolumeSetting') return;
    const v = Number(e.target.value);
    const out = document.getElementById('musicVolumeValue');
    if (out) out.textContent = v + '%';
    if (el && !el.paused) el.volume = Math.max(0, Math.min(1, v / 100));
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'musicSetting') commit(st => { st.music = t.checked; });
    else if (t.id === 'musicVolumeSetting') commit(st => { st.musicVolume = Math.max(0, Math.min(100, Math.round(Number(t.value)))); });
    else if (t.id === 'musicTrackSetting') commit(st => { st.musicTrack = t.value; });
  });

  // applySettings chạy khi vào game và sau mỗi lần đổi cài đặt: bám theo để luôn đồng bộ.
  const baseApply = UI.applySettings;
  if (typeof baseApply === 'function') {
    UI.applySettings = function () { const r = baseApply.apply(this, arguments); sync(); return r; };
  }

  UI.audio = { tracks: TRACKS, defaults: DEFAULTS, play, pause, next, sync };
})(typeof window !== 'undefined' ? window : globalThis);
