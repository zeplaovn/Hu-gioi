/* HƯ GIỚI · MÀN CÀI ĐẶT */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F;
  const UI = root.HU_UI;
  const { esc, num, duration, btn, card, tabs } = UI.kit;
  const store = UI.store;

  const TABS = [
    { id: 'season', label: 'Tứ thời', icon: '✿' },
    { id: 'audio', label: 'Âm thanh', icon: '♪' },
    { id: 'save', label: 'Bản lưu', icon: '⛁' },
    { id: 'guide', label: 'Hướng dẫn', icon: '?' }
  ];
  const SEASONS = [
    ['spring', 'Xuân', '❀'],
    ['summer', 'Hạ', '☀'],
    ['autumn', 'Thu', '❦'],
    ['winter', 'Đông', '❄']
  ];
  const select = (id, current, options) =>
    `<select id="${id}">${options.map(([v, label]) => `<option value="${v}" ${current === v ? 'selected' : ''}>${label}</option>`).join('')}</select>`;

  function season() {
    const st = UI.s().settings;
    return `<div class="screen-grid">
      ${card('Tứ thời · cảnh sắc bốn mùa', `
        <p>Chọn cảnh sắc cho tiên sơn. Chế độ tự động đổi mùa mỗi 15 phút tu luyện, kể cả thời gian bế quan.</p>
        <div class="settings-row"><label for="seasonSetting">Chế độ mùa</label>${select('seasonSetting', st.season, [['auto', 'Tự động · Xuân → Hạ → Thu → Đông'], ...SEASONS.map(([id, name, icon]) => [id, icon + ' ' + name])])}</div>
        <div class="season-options">${SEASONS.map(([, name, icon]) => `<span>${icon} ${name}</span>`).join('')}</div>
        <div class="settings-row"><label for="seasonEffectsSetting">Lá rơi và cảnh sắc theo mùa</label><input type="checkbox" id="seasonEffectsSetting" ${st.seasonEffects ? 'checked' : ''}></div>
        <div class="settings-row"><label for="cultivationEffectsSetting">Hào quang linh khí khi nhập định</label><input type="checkbox" id="cultivationEffectsSetting" ${st.cultivationEffects ? 'checked' : ''}></div>
        <div class="settings-row"><label for="combatEffectsSetting">Hiệu ứng chiến đấu và khung hình</label><input type="checkbox" id="combatEffectsSetting" ${st.combatEffects !== false ? 'checked' : ''}></div>
        <div class="settings-row"><label for="motionSetting">Chuyển động</label>${select('motionSetting', st.motionMode, [['auto', 'Theo cài đặt thiết bị'], ['full', 'Đầy đủ'], ['reduced', 'Giảm chuyển động']])}</div>
        <p class="info-note" id="motionStatus">${UI.isReduced() ? 'Đang giảm chuyển động: lá, linh khí và hiệu ứng khung hình ở trạng thái tĩnh.' : 'Đang bật đầy đủ: lá rơi, linh khí và hiệu ứng chiến đấu chuyển động.'}</p>`, { eyebrow: 'CẢNH SẮC' })}
      ${card('Hiệu năng', `<p>Nếu máy yếu hoặc trình duyệt chạy chậm, hãy chọn <b>Giảm chuyển động</b>. Logic tu luyện và nghề phụ vẫn chạy đủ.</p>
        <p class="info-note">Bản dựng này dùng ảnh sprite và hiệu ứng CSS, không cần WebGL. Toàn bộ tiến trình nằm trong localStorage của trình duyệt.</p>`, { eyebrow: 'THIẾT BỊ' })}
    </div>`;
  }

  function audio() {
    const st = UI.s().settings;
    const tracks = (UI.audio && UI.audio.tracks) || [];
    const volume = Number.isFinite(st.musicVolume) ? st.musicVolume : 40;
    return `<div class="screen-grid">
      ${card('Nhạc nền', `
        <p>Nhạc phát lần lượt các bản trong bộ nhạc nền của Hư Giới và tự tạm dừng khi bạn chuyển sang tab khác.</p>
        <div class="settings-row"><label for="musicSetting">Bật nhạc nền</label><input type="checkbox" id="musicSetting" ${st.music !== false ? 'checked' : ''}></div>
        <div class="settings-row"><label for="musicVolumeSetting">Âm lượng <b id="musicVolumeValue">${volume}%</b></label><input type="range" id="musicVolumeSetting" min="0" max="100" step="5" value="${volume}"></div>
        <div class="settings-row"><label for="musicTrackSetting">Bản nhạc</label>${select('musicTrackSetting', st.musicTrack || 'auto', [['auto', 'Lần lượt tất cả'], ...tracks.map(t => [t.id, t.title])])}</div>
        ${UI.kit.row('Đang phát', '<span id="musicNowPlaying">—</span>')}
        <p class="info-note">Trình duyệt chỉ cho phát nhạc sau khi bạn chạm hoặc bấm phím lần đầu trên trang.</p>`, { eyebrow: 'ÂM THANH' })}
    </div>`;
  }

  function save() {
    const s = UI.s();
    return `<div class="screen-grid">
      ${card('Bản lưu trên thiết bị', `
        <p>Tự lưu mỗi 15 giây và khi đóng trang. Bản lưu cũ được giữ ở ô dự phòng trước mỗi lần ghi.</p>
        ${UI.kit.row('Nhân vật', esc(s.name))}
        ${UI.kit.row('Cảnh giới', esc(UI.g().realmLabel()))}
        ${UI.kit.row('Lần lưu cuối', s.lastSaved ? new Date(s.lastSaved).toLocaleString('vi-VN') : '—')}
        ${UI.kit.row('Khóa lưu', '<span class="save-preview">' + esc(store.KEY) + '</span>')}
        <div class="action-group">${btn('Lưu ngay', 'save')}${btn('Xuất JSON', 'export', '', false, 'btn-outline')}${btn('Nhập JSON', 'import', '', false, 'btn-outline')}</div>
        <input type="file" id="importSaveInput" accept="application/json,.json" hidden>
        <p class="info-note">File JSON có thể chuyển sang thiết bị khác. Nhận V4/V5/V6/V7 và chuyển đổi tự động sang V7.</p>`, { eyebrow: 'LƯU TRỮ' })}
      ${card('Tạo lại nhân vật', `
        <p>Xóa nhân vật hiện tại và toàn bộ bản lưu trên trình duyệt này. Hãy xuất JSON trước nếu muốn giữ hành trình.</p>
        ${btn('Xóa tiến trình', 'reset', '', false, 'btn-danger')}
        <p class="info-note">Đạo vận, công pháp và thành tựu cũng bị xóa. Không thể hoàn tác.</p>`, { eyebrow: 'NGUY HIỂM' })}
      ${card('Dữ liệu trò chơi', `
        ${UI.kit.row('Vật phẩm trong danh mục', num(H.ITEMS.length))}
        ${UI.kit.row('Khu vực', num(H.ZONES.length))}
        ${UI.kit.row('Cảnh giới', num(F.REALMS.length))}
        ${UI.kit.row('Phiên bản lõi', 'V' + H.VERSION)}
        <p class="info-note">Dùng tab Hướng dẫn để xem phím tắt và vòng chơi cơ bản.</p>`, { eyebrow: 'THÔNG TIN' })}
    </div>`;
  }

  function guide() {
    return `<div class="screen-grid">
      ${card('Vòng chơi cơ bản', `
        <p><b>1.</b> Ở <b>Tu luyện</b>, nhân vật tự nhập định và tích tu vi theo thời gian thật. Nâng cấp tốc tu và dùng đan để tăng nhanh.</p>
        <p><b>2.</b> Vào <b>Nhân vật → Hành trang</b>, lĩnh ngộ Dẫn Khí Quyết có sẵn. Công pháp tự vận hành nếu còn ô trống; quản lý trong tab <b>Công pháp</b>.</p>
        <p><b>3.</b> Ở <b>Lịch luyện</b>, chọn khu vực, đổi loại đối thủ, dùng bốn kỹ năng hoặc bật tự chiến để farm linh thạch, linh thảo và yêu đan.</p>
        <p><b>4.</b> <b>Nghề phụ</b> chạy nền: luyện đan, rèn pháp bảo, chế phù và trồng linh điền. Kết quả vẫn được nhận khi offline.</p>
        <p><b>5.</b> Khi tu vi đầy, bấm <b>Đột phá</b>. Tiểu cảnh giới đột phá ngay, kết quả ghi vào Nhật ký thông báo; đại cảnh giới mở Độ kiếp đài.</p>
        <p><b>6.</b> <b>Thế giới → Bí cảnh</b>: hạ thủ lĩnh lấy Tinh hoa rồi vào <b>Nhân vật → Linh căn</b> để tôi luyện. <b>Kỳ ngộ</b> tự xuất hiện khi tu luyện, có sổ khám phá riêng.</p>
        <p><b>7.</b> Chọn tông môn, làm ủy thác để thăng chức và đổi bảo vật. Mở <b>Thiên mệnh</b> để xem thành tựu, nâng cấp vĩnh viễn và tab Trọng sinh.</p>
        <button class="btn btn-gold" data-act="tutorial">Xem lại hướng dẫn từng bước</button>`, { eyebrow: 'TIÊN LỘ' })}
      ${card('Phím tắt', `
        <div class="key-grid">
          <span><kbd>T</kbd> Tu luyện</span><span><kbd>L</kbd> Lịch luyện</span>
          <span><kbd>N</kbd> Nghề phụ</span><span><kbd>C</kbd> Nhân vật</span>
          <span><kbd>I</kbd> Hành trang</span><span><kbd>M</kbd> Thế giới</span>
          <span><kbd>S</kbd> Cài đặt</span><span><kbd>1</kbd>–<kbd>4</kbd> Kỹ năng</span>
          <span><kbd>Esc</kbd> Đóng hộp thoại</span>
        </div>
        <p class="info-note">Phím kỹ năng chỉ có tác dụng ở màn Lịch luyện. Khi hộp thoại mở, phím tắt toàn cục tạm khóa. Thiên kiếp mở từ nút Đột phá khi đủ duyên, không có phím tắt riêng.</p>
        <div class="action-group"><button class="btn btn-outline" data-go="character:bag">Hành trang</button><button class="btn btn-outline" data-go="world:quests">Nhiệm vụ</button></div>`, { eyebrow: 'ĐIỀU KHIỂN' })}
      ${card('Nhật ký & tiến trình xuyên kiếp', `
        <p>• Nhật ký thông báo dưới sân khấu nhận cả log tu hành và toast. Dòng mới gõ dần; cuộn lên để đọc cũ, bấm <b>↓ Tin mới</b> để về cuối.</p>
        <p>• Nút thu gọn nhật ký được ghi nhớ trên thiết bị. Chế độ giảm chuyển động hiển thị ngay, không gõ chữ.</p>
        <p>• <b>Thiên mệnh</b> giữ nâng cấp, thành tựu và bia kiếp trước qua trọng sinh; chỉ mất khi xóa toàn bộ bản lưu.</p>
        <p>• <b>Nhiệm vụ tông môn</b> chạy theo thời gian thực, kể cả khi đóng game; nhận cống hiến khi hoàn tất.</p>`, { eyebrow: 'XUYÊN KIẾP' })}
      ${card('Mẹo tu hành', `
        <p>• Bán yêu đan ở Lịch luyện hoặc Thế giới → Cửa hàng để lấy linh thạch.</p>
        <p>• Đan cấp thấp vẫn dùng được nhưng hiệu quả giảm theo chênh lệch cảnh giới.</p>
        <p>• Bảo hiểm đột phá tăng sau mỗi lần thất bại, tối đa 15 điểm.</p>
        <p>• Tông môn cho thu nhập thụ động và chúc phúc +10% tốc tu.</p>
        <p>• Trọng sinh giữ công pháp, thiên phú, nâng cấp offline, Thiên mệnh và cài đặt.</p>`, { eyebrow: 'GHI NHỚ' })}
    </div>`;
  }

  const body = { season, audio, save, guide };
  UI.register({
    id: 'settings', label: 'Cài đặt', icon: 'ICON-MENU-006', eyebrow: 'HỆ THỐNG', nav: false, tabs: TABS,
    render: tab => `<header class="screen-title"><span class="eyebrow gold">HỆ THỐNG</span><h2>Cài đặt</h2></header>${tabs(TABS, tab)}<div class="screen-body">${body[tab]()}</div>`,
    signature: () => ''
  });

  UI.action('save', () => { store.write(); UI.toast('Đã lưu tiến trình.', { type: 'success', title: 'Bản lưu' }); return UI.KEEP; });
  UI.action('export', () => { store.exportJson(); UI.toast('Đã xuất file JSON.', { type: 'success', title: 'Bản lưu' }); return UI.KEEP; });
  UI.action('import', () => { document.getElementById('importSaveInput')?.click(); return UI.KEEP; });
  UI.action('reset', () => {
    UI.modal('Xóa tiến trình', '<p>Xóa nhân vật và các bản lưu trên trình duyệt này. Hãy xuất JSON nếu muốn giữ lại.</p>', () => {
      store.clearAll(); store.fresh(); store.ready = false;
      UI.windows?.closeAll();
      document.body.classList.remove('in-game');
      document.getElementById('game').hidden = true;
      document.getElementById('welcome').hidden = false;
      document.getElementById('continueGame').hidden = true;
      document.title = 'Hư Giới · Tiên Lộ Vô Tận';
      if (root.location.hash) root.location.hash = '';
      UI.renderCreation?.();
      UI.toast('Đã xóa tiến trình trên thiết bị này.', { type: 'danger', title: 'Bản lưu' });
    }, 'Xóa và tạo lại', 'THIÊN MỆNH', { type: 'danger', symbol: '⚠', vfx: ['loi_kiep', 'ha_gioi'] });
    return UI.KEEP;
  });
})(typeof window !== 'undefined' ? window : globalThis);
