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
        if (!id || !account || id !== account.id) throw Error('Chơi online yêu cầu tài khoản hợp lệ.');
        return session.connect(account);
      },
      load() { return session.ready ? session.game.s : null; },
      write() { /* Trạng thái do backend lưu sau mỗi transaction. */ },
      async dispatch(type, payload) {
        if (!ready || locked) throw Error('Chưa thể thực hiện lệnh online.');
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
          notify('Đồng bộ online thất bại: ' + error.message);
        });
        return null;
      },
      synchronize() { return session.synchronize(true); },
      clearAll() { /* Không thể xóa bản nhân vật máy chủ bằng thao tác trình duyệt. */ },
      fresh() { throw Error('Không thể tạo trạng thái nhân vật trên trình duyệt.'); },
      replace() { throw Error('Chỉ máy chủ được cập nhật dữ liệu nhân vật.'); },
      async resetAfterDeath() {
        ready = false;
        const preview = await session.resetAfterDeath();
        return preview;
      },
      exportJson() { throw Error('Không thể xuất bản lưu online và dùng lại làm trạng thái tin cậy.'); },
      async readImport() { throw Error('Nhập bản lưu offline vào nhân vật online chưa được hỗ trợ.'); },
      keepBeforeImport() {}
    };
  }
  root.HU_REMOTE_STORE = { createStore };
})(typeof window !== 'undefined' ? window : globalThis);
