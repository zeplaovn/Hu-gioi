/* localStorage, dự phòng và xuất/nhập JSON chỉ dành cho phiên offline. */
(function(root){
  'use strict';
  const H = root.HU_GAME;
  const KEY = 'huGioiWorkspaceV1', BACKUP = KEY + 'Backup';
  const LEGACY = ['tienVanCompleteV6', 'tienVanCompleteV6Backup'];
  const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
  function assertSafeJson(value, depth = 0, budget = { n: 0 }) {
    if (depth > 24) throw Error('Bản lưu lồng quá sâu.');
    if (!value || typeof value !== 'object') return;
    if (++budget.n > 50000) throw Error('Bản lưu có quá nhiều mục.');
    if (Array.isArray(value)) {
      for (const item of value) assertSafeJson(item, depth + 1, budget);
      return;
    }
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(key)) throw Error('Bản lưu chứa khóa không an toàn.');
      assertSafeJson(value[key], depth + 1, budget);
    }
  }
  function createStore(session, notify) {
    let ready = false, locked = false, busy = () => false;
    const store = {
      KEY, BACKUP, LEGACY,
      get game() { return session.game; },
      get ready() { return ready; },
      get locked() { return locked; },
      set ready(v) { ready = !!v; },
      set locked(v) { locked = !!v; },
      setBusy(fn) { busy = fn; },
      replace(state) { return session.replace(state); },
      fresh() { return session.replace(H.create(session.clock())); },
      write() {
        const s = session.game.s;
        if (!s.created || locked) return;
        try {
          const old = localStorage.getItem(KEY);
          if (old) {
            try { assertSafeJson(JSON.parse(old)); if (H.normalize(JSON.parse(old))) localStorage.setItem(BACKUP, old); } catch { /* bản cũ hỏng */ }
          }
          s.lastSaved = session.clock();
          localStorage.setItem(KEY, JSON.stringify(s));
        } catch { notify('Không thể tự lưu. Hãy xuất JSON trong Cài đặt.'); }
      },
      load() {
        for (const key of [KEY, BACKUP, ...LEGACY]) {
          try {
            const raw = JSON.parse(localStorage.getItem(key) || 'null');
            assertSafeJson(raw);
            const state = H.normalize(raw,session.clock());
            if (state) {
              if (key !== KEY) state.logs.unshift('Đã phục hồi bản lưu ' + (key === BACKUP ? 'dự phòng' : 'từ Tiên Vân 8.0') + '.');
              return state;
            }
          } catch { /* thử khóa kế tiếp */ }
        }
        return null;
      },
      clearAll() {
        [KEY, BACKUP, KEY + 'BeforeImport', ...LEGACY].forEach(k => { try { localStorage.removeItem(k); } catch { /* bỏ qua */ } });
      },
      catchUp(now = session.clock(), offline = false) {
        if (!session.game.s.created || locked || busy()) return null;
        return session.advance(now,offline);
      },
      dispatch(type,payload) {
        if (locked) throw Error('Game đang mở ở tab khác. Đóng tab kia rồi tải lại trang.');
        if (busy()) throw Error('Hãy chờ nghi lễ độ kiếp hoàn tất.');
        return session.dispatch(type,payload);
      },
      preference(key,value) {
        if (locked) return;
        const enums = { season:['auto','spring','summer','autumn','winter'], motionMode:['auto','full','reduced'], musicTrack:['auto','hu_gioi','ngoc_hoa_tram','thien_thu'] };
        const booleans = ['seasonEffects','cultivationEffects','combatEffects','music'];
        if (Object.hasOwn(enums,key) ? !enums[key].includes(value) : booleans.includes(key) ? typeof value !== 'boolean' : key === 'musicVolume' ? !Number.isInteger(value) || value < 0 || value > 100 : true) throw Error('Cài đặt không hợp lệ.');
        session.game.s.settings[key] = value;
        if (key === 'motionMode') session.game.s.settings.reducedMotion = value === 'reduced';
      },
      exportJson() {
        store.write();
        const url = URL.createObjectURL(new Blob([JSON.stringify(session.game.s, null, 2)], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url; a.download = 'hu-gioi-save.json'; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      },
      async readImport(file) {
        if (!file) return null;
        if (file.size > 5e6) throw Error('Bản lưu vượt 5 MB.');
        let raw;
        try { raw = JSON.parse(await file.text()); }
        catch { throw Error('Tệp không phải JSON hợp lệ.'); }
        assertSafeJson(raw);
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Bản lưu phải là một đối tượng JSON.');
        const value = H.normalize(raw,session.clock());
        if (!value) throw Error('Chỉ nhận bản lưu nhân vật V4, V5, V6 hoặc V7 hợp lệ.');
        return value;
      },
      keepBeforeImport() { try { localStorage.setItem(KEY + 'BeforeImport', JSON.stringify(session.game.s)); } catch { /* bỏ qua */ } }
    };
    return store;
  }
  root.HU_LOCAL_STORE = { createStore };
})(typeof window !== 'undefined' ? window : globalThis);
