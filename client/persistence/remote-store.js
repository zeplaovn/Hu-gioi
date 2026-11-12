/* HƯ GIỚI · OnlineStore.
   Facade UI tương thích cổng lệnh cũ; không ghi bản lưu nhân vật vào localStorage. */
(function (root) {
  'use strict';
  function createStore(session, notify) {
    let ready = false, locked = false, busy = () => false;
    let syncFailedAt = 0;
    return {
      get game() { return session.game; },
      get ready() { return ready; },
      set ready(v) { ready = !!v; },
      get locked() { return locked; },
      set locked(v) { locked = !!v; },
      setBusy(fn) { busy = fn; },
      async setAccount(id, account) {
        ready = false;
        session.disconnect();
        if (!id || !account || id !== account.id) throw Error('Vui lòng đăng nhập để tiếp tục.');
        return session.connect(account);
      },
      load() { return session.ready ? session.game.s : null; },
      write() { /* Trạng thái do backend lưu sau mỗi transaction. */ },
      async dispatch(type, payload) {
        if (!ready || locked) throw Error('Chưa thể thực hiện thao tác này. Vui lòng thử lại.');
        if (busy()) throw Error('Hãy chờ nghi lễ độ kiếp hoàn tất.');
        return session.dispatch(type, payload);
      },
      preference(key, value) { return this.dispatch('setPreference', { key, value }); },
      catchUp() {
        if (!ready || locked || busy() || root.document?.hidden) return null;
        if (syncFailedAt && Date.now() - syncFailedAt < 15000) return null;
        session.synchronize().then(report => {
          syncFailedAt = 0;
          if (report) root.HU_UI?.refresh?.();
        }).catch(error => {
          syncFailedAt = Date.now();
          notify('Chưa đồng bộ được tiến trình: ' + error.message);
        });
        return null;
      },
      syncOnce() {
        if (!ready || locked || busy() || root.document?.hidden || (syncFailedAt && Date.now() - syncFailedAt < 15000)) return null;
        const p = session.syncOnce(); if (!p) return null;
        p.then(report => { syncFailedAt = 0; if (report) root.HU_UI?.refresh?.(); }).catch(error => { syncFailedAt = Date.now(); notify('Chưa đồng bộ được tiến trình: ' + error.message); });
        return p;
      },
      synchronize() { return session.synchronize(true); },
      clearAll() { /* Không thể xóa bản nhân vật máy chủ bằng thao tác trình duyệt. */ },
      fresh() { throw Error('Không thể tạo nhân vật lúc này. Vui lòng thử lại.'); },
      replace() { throw Error('Chỉ máy chủ được cập nhật dữ liệu nhân vật.'); },
      async resetAfterDeath() {
        ready = false;
        const preview = await session.resetAfterDeath();
        return preview;
      },
      exportJson() { throw Error('Không thể xuất bản lưu để nhập lại. Bạn có thể yêu cầu bản sao dữ liệu qua mục Quyền riêng tư.'); },
      async readImport() { throw Error('Hiện chưa hỗ trợ nhập bản lưu cũ vào nhân vật.'); },
      keepBeforeImport() {}
    };
  }
  root.HU_REMOTE_STORE = { createStore };
})(typeof window !== 'undefined' ? window : globalThis);
