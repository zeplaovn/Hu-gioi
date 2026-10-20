import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, TRACKS, createAudioManager, normalizeSettings } from "../src/audio.js";

const store = (init) => { const m = new Map(init ? [["hugioi.settings.v1", JSON.stringify(init)]] : []); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), raw: () => JSON.parse(m.get("hugioi.settings.v1") ?? "null") }; };
function fakeAudio({ rejectPlay = false } = {}) {
  const made = [];
  const createAudio = (src) => {
    const listeners = {};
    const a = { src, volume: 1, loop: false, paused: true, play: vi.fn(async () => { if (rejectPlay) throw new Error("blocked"); a.paused = false; }), pause: vi.fn(() => { a.paused = true; }),
      addEventListener: (n, f) => { listeners[n] = f; }, fire: (n) => listeners[n]?.() };
    made.push(a); return a;
  };
  return { made, createAudio };
}
const target = () => { const l = {}; return { addEventListener: (n, f) => { l[n] = f; }, removeEventListener: (n) => { delete l[n]; }, fire: (n) => l[n]?.(), has: (n) => n in l }; };

describe("cài đặt nhạc", () => {
  it("chuẩn hoá giá trị lạ về mặc định hợp lệ", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ music: "yes", volume: 9, track: "zzz" })).toEqual({ music: true, volume: 1, track: "auto" });
    expect(normalizeSettings({ volume: -3, track: "dawn", music: false })).toEqual({ music: false, volume: 0, track: "dawn" });
  });
  it("có đúng hai bản nhạc, file nằm trong assets/audio", () => {
    expect(TRACKS.map((t) => t.file)).toEqual(["audio/the-immortals-breath.mp3", "audio/mountain-gate-at-dawn.mp3"]);
  });
  it("đọc cài đặt đã lưu và lưu khi đổi", () => {
    const storage = store({ music: true, volume: 0.2, track: "dawn" });
    const { createAudio } = fakeAudio();
    const m = createAudioManager({ storage, createAudio, target: null });
    expect(m.settings.volume).toBe(0.2);
    m.update({ volume: 0.8 });
    expect(storage.raw().volume).toBe(0.8);
  });
  it("phát bản đã chọn và lặp lại; chế độ luân phiên chuyển bản khi hết", async () => {
    const { made, createAudio } = fakeAudio();
    const m = createAudioManager({ storage: store({ music: true, volume: 0.5, track: "dawn" }), createAudio, target: null });
    m.start(); await Promise.resolve();
    expect(made[0].src).toContain("mountain-gate-at-dawn.mp3"); expect(made[0].loop).toBe(true); expect(made[0].volume).toBe(0.5);
    m.update({ track: "auto" }); expect(made[0].loop).toBe(false);
    made[0].fire("ended"); await Promise.resolve();
    expect(made[1].src).toContain("the-immortals-breath.mp3");
  });
  it("tắt nhạc thì dừng, bật lại thì phát tiếp", async () => {
    const { made, createAudio } = fakeAudio();
    const m = createAudioManager({ storage: store(), createAudio, target: null });
    m.start(); await Promise.resolve();
    m.update({ music: false }); expect(made[0].pause).toHaveBeenCalled();
    m.update({ music: true }); await Promise.resolve(); expect(made[0].play).toHaveBeenCalledTimes(2);
  });
  it("trình duyệt chặn tự phát: chờ thao tác đầu tiên rồi mới phát", async () => {
    const { made, createAudio } = fakeAudio({ rejectPlay: true });
    const t = target();
    const m = createAudioManager({ storage: store(), createAudio, target: t });
    m.start(); await new Promise((r) => setTimeout(r, 0));
    expect(m.blocked).toBe(true); expect(t.has("pointerdown")).toBe(true);
    made[0].play = vi.fn(async () => {});
    t.fire("pointerdown"); await Promise.resolve();
    expect(made[0].play).toHaveBeenCalled(); expect(t.has("pointerdown")).toBe(false);
  });
  it("storage hỏng không làm sập", () => {
    const storage = { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); } };
    const m = createAudioManager({ storage, createAudio: fakeAudio().createAudio, target: null });
    expect(() => m.update({ volume: 0.1 })).not.toThrow();
    expect(m.settings.volume).toBe(0.1);
  });
});
