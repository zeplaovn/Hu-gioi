/* Nhạc nền + cài đặt người chơi. Cài đặt chỉ nằm ở trình duyệt (localStorage), không ảnh hưởng gì tới luật game.
   Trình duyệt chặn tự phát âm thanh trước khi người dùng chạm vào trang, nên nhạc bắt đầu ở thao tác đầu tiên. */
import { assetBase } from "./config.js";

export const TRACKS = [
  { id: "immortal", title: "Hơi Thở Tiên Nhân", file: "audio/the-immortals-breath.mp3" },
  { id: "dawn", title: "Sơn Môn Lúc Bình Minh", file: "audio/mountain-gate-at-dawn.mp3" },
];
export const DEFAULT_SETTINGS = { music: true, volume: 0.5, track: "auto" };   // track: "auto" = luân phiên hai bản
const KEY = "hugioi.settings.v1";

export function normalizeSettings(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const v = Number(o.volume);
  return {
    music: typeof o.music === "boolean" ? o.music : DEFAULT_SETTINGS.music,
    volume: Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : DEFAULT_SETTINGS.volume,
    track: o.track === "auto" || TRACKS.some((t) => t.id === o.track) ? o.track : DEFAULT_SETTINGS.track,
  };
}

/** @param {{ storage?: Storage | null, createAudio?: (src: string) => HTMLAudioElement, target?: EventTarget | null }} [o] */
export function createAudioManager({ storage = safeStorage(), createAudio = (src) => new Audio(src), target = typeof window === "undefined" ? null : window } = {}) {
  let settings = DEFAULT_SETTINGS, current = 0, el = null, armed = false, blocked = false;
  const listeners = new Set();
  try { settings = normalizeSettings(JSON.parse(storage?.getItem(KEY) ?? "null")); } catch { settings = { ...DEFAULT_SETTINGS }; }
  const trackIndex = () => { const i = TRACKS.findIndex((t) => t.id === settings.track); return i >= 0 ? i : current; };
  const emit = () => { for (const fn of [...listeners]) fn(api); };
  const save = () => { try { storage?.setItem(KEY, JSON.stringify(settings)); } catch { /* bị chặn: bỏ qua */ } };

  function load(i) {
    current = i;
    el?.pause();
    el = createAudio(`${assetBase()}/${TRACKS[i].file}`);
    el.preload = "auto";
    el.loop = settings.track !== "auto";
    el.volume = settings.volume;
    el.addEventListener("ended", () => { if (settings.track === "auto") { load((current + 1) % TRACKS.length); void play(); } });
  }
  async function play() {
    if (!settings.music) return;
    if (!el) load(trackIndex());
    try { await el.play(); blocked = false; } catch { blocked = true; }
    emit();
  }
  function arm() {
    if (armed || !target) return;
    armed = true;
    const go = () => { target.removeEventListener("pointerdown", go); target.removeEventListener("keydown", go); void play(); };
    target.addEventListener("pointerdown", go); target.addEventListener("keydown", go);
  }
  const api = {
    get settings() { return settings; },
    get track() { return TRACKS[current]; },
    get blocked() { return blocked; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    /** Bắt đầu nhạc nền (ngay nếu trình duyệt cho phép, nếu không thì ở thao tác đầu tiên). */
    start() { if (settings.music) { void play().then(() => { if (blocked) arm(); }); } else arm(); },
    update(patch) {
      const prev = settings;
      settings = normalizeSettings({ ...settings, ...patch });
      save();
      if (!settings.music) { el?.pause(); }
      else if (!prev.music) void play();
      if (el) { el.volume = settings.volume; el.loop = settings.track !== "auto"; }
      if (settings.track !== prev.track && settings.track !== "auto" && settings.music) { load(trackIndex()); void play(); }
      emit();
    },
    destroy() { el?.pause(); el = null; listeners.clear(); },
  };
  return api;
}

function safeStorage() { try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; } }
