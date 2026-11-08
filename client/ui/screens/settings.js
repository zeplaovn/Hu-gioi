/* HƯ GIỚI · MÀN CÀI ĐẶT */
(function (root) {
  'use strict';
  const UI = root.HU_UI;
  const { card, tabs } = UI.kit;

  const TABS = [
    { id: 'season', label: 'Tứ thời', icon: '✿' },
    { id: 'audio', label: 'Âm thanh', icon: '♪' },
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
        <p>Chọn cảnh sắc cho tiên sơn. Mỗi mùa kéo dài 15 phút tu luyện: 7 phút 30 giây ban ngày, rồi 7 phút 30 giây ban đêm, kể cả tiến trình bế quan. Hạ Giới và Linh Giới đổi cảnh theo tứ thời; Tiên Giới giữ tiên cảnh trường tồn.</p>
        <div class="settings-row"><label for="seasonSetting">Chế độ mùa</label>${select('seasonSetting', st.season, [['auto', 'Tự động · Xuân → Hạ → Thu → Đông'], ...SEASONS.map(([id, name, icon]) => [id, icon + ' ' + name])])}</div>
        <div class="season-options">${SEASONS.map(([, name, icon]) => `<span>${icon} ${name}</span>`).join('')}</div>
        <div class="settings-row"><label for="seasonEffectsSetting">Lá rơi và cảnh sắc theo mùa</label><input type="checkbox" id="seasonEffectsSetting" ${st.seasonEffects ? 'checked' : ''}></div>
        <div class="settings-row"><label for="cultivationEffectsSetting">Hào quang linh khí khi nhập định</label><input type="checkbox" id="cultivationEffectsSetting" ${st.cultivationEffects ? 'checked' : ''}></div>
        <div class="settings-row"><label for="combatEffectsSetting">Hiệu ứng chiến đấu và khung hình</label><input type="checkbox" id="combatEffectsSetting" ${st.combatEffects !== false ? 'checked' : ''}></div>
        <div class="settings-row"><label for="motionSetting">Chuyển động</label>${select('motionSetting', st.motionMode, [['auto', 'Theo cài đặt thiết bị'], ['full', 'Đầy đủ'], ['reduced', 'Giảm chuyển động']])}</div>
        <p class="info-note" id="motionStatus">${UI.isReduced() ? 'Đang giảm chuyển động: lá, linh khí và hiệu ứng khung hình ở trạng thái tĩnh.' : 'Đang bật đầy đủ: lá rơi, linh khí và hiệu ứng chiến đấu chuyển động.'}</p>`, { eyebrow: 'CẢNH SẮC' })}
      ${card('Chuyển động và hiển thị', `<p>Nếu thiết bị hoạt động chậm, hãy chọn <b>Giảm chuyển động</b>. Việc tu luyện và hoạt động nghề phụ vẫn tiếp tục bình thường.</p>
        <p class="info-note">Hành trình của bạn được ghi nhớ trên thiết bị và tự tiếp nối khi trở lại.</p>`, { eyebrow: 'THIẾT BỊ' })}
    </div>`;
  }

  function audio() {
    const st = UI.s().settings;
    const tracks = (UI.audio && UI.audio.tracks) || [];
    const volume = Number.isFinite(st.musicVolume) ? st.musicVolume : 40;
    return `<div class="screen-grid">
      ${card('Nhạc nền', `
        <p>Nhạc phát lần lượt các bản trong bộ nhạc nền của Hư Giới và tự tạm dừng khi bạn chuyển sang mục khác.</p>
        <div class="settings-row"><label for="musicSetting">Bật nhạc nền</label><input type="checkbox" id="musicSetting" ${st.music !== false ? 'checked' : ''}></div>
        <div class="settings-row"><label for="musicVolumeSetting">Âm lượng <b id="musicVolumeValue">${volume}%</b></label><input type="range" id="musicVolumeSetting" min="0" max="100" step="5" value="${volume}"></div>
        <div class="settings-row"><label for="musicTrackSetting">Bản nhạc</label>${select('musicTrackSetting', st.musicTrack || 'auto', [['auto', 'Lần lượt tất cả'], ...tracks.map(t => [t.id, t.title])])}</div>
        ${UI.kit.row('Đang phát', '<span id="musicNowPlaying">—</span>')}
        <p class="info-note">Trình duyệt chỉ cho phát nhạc sau khi bạn chạm hoặc bấm phím lần đầu trên trang.</p>`, { eyebrow: 'ÂM THANH' })}
    </div>`;
  }

  function guide() {
    return `<div class="screen-grid">
      ${card('Vòng chơi cơ bản', `
        <p><b>1.</b> Ở <b>Tu luyện</b>, nhân vật tự nhập định và tích tu vi theo thời gian thật. Cải thiện khả năng hấp thụ linh khí và dùng đan để tăng nhanh.</p>
        <p><b>2.</b> Vào <b>Nhân vật → Hành trang</b>, lĩnh ngộ Dẫn Khí Quyết có sẵn. Công pháp tự vận hành nếu còn ô trống; quản lý trong mục <b>Công pháp</b>.</p>
        <p><b>3.</b> Ở <b>Lịch luyện</b>, chọn khu vực, đổi loại đối thủ, dùng bốn kỹ năng hoặc bật tự chiến để thu thập linh thạch, linh thảo và yêu đan.</p>
        <p><b>4.</b> <b>Nghề phụ</b> chạy nền: luyện đan, rèn pháp bảo, chế phù và trồng linh điền. Kết quả vẫn được nhận khi rời game.</p>
        <p><b>5.</b> Khi tu vi đầy, bấm <b>Đột phá</b>. Tiểu cảnh giới đột phá ngay, kết quả ghi vào Nhật ký tu tiên; đại cảnh giới mở Độ kiếp đài.</p>
        <p><b>6.</b> <b>Thế giới → Bí cảnh</b>: hạ thủ lĩnh lấy Tinh hoa rồi vào <b>Nhân vật → Linh căn</b> để tôi luyện. <b>Kỳ ngộ</b> tự xuất hiện khi tu luyện, có sổ khám phá riêng.</p>
        <p><b>7.</b> Chọn tông môn, làm ủy thác để thăng chức và đổi bảo vật. Mở <b>Thiên mệnh</b> để xem thành tựu, nâng cấp vĩnh viễn và mục Trọng sinh.</p>
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
        <p>• Nhật ký tu tiên dưới sân khấu nhận cả ghi chép tu hành và thông báo. Dòng mới gõ dần; cuộn lên để đọc cũ, bấm <b>↓ Tin mới</b> để về cuối.</p>
        <p>• Nút thu gọn nhật ký được ghi nhớ trên thiết bị. Chế độ giảm chuyển động hiển thị ngay, không gõ chữ.</p>
        <p>• <b>Thiên mệnh</b> giữ nâng cấp, thành tựu và bia kiếp trước qua trọng sinh; chỉ mất khi khởi nguyên lại hành trình.</p>
        <p>• <b>Nhiệm vụ tông môn</b> chạy theo thời gian thực, kể cả khi đóng game; nhận cống hiến khi hoàn tất.</p>`, { eyebrow: 'XUYÊN KIẾP' })}
      ${card('Mẹo tu hành', `
        <p>• Bán yêu đan ở Lịch luyện hoặc Thế giới → Cửa hàng để lấy linh thạch.</p>
        <p>• Đan cấp thấp vẫn dùng được nhưng hiệu quả giảm theo chênh lệch cảnh giới.</p>
        <p>• Bảo hiểm đột phá tăng sau mỗi lần thất bại, tối đa 15 điểm.</p>
        <p>• Tông môn cho thu nhập thụ động và chúc phúc +10% tốc độ hấp thụ linh khí.</p>
        <p>• Trọng sinh giữ công pháp, thiên phú, nâng cấp tu luyện khi vắng mặt, Thiên mệnh và cài đặt.</p>`, { eyebrow: 'GHI NHỚ' })}
    </div>`;
  }

  const body = { season, audio, guide };
  UI.register({
    id: 'settings', label: 'Cài đặt', icon: 'ICON-MENU-006', eyebrow: 'THIẾT LẬP', nav: false, tabs: TABS,
    render: tab => `<header class="screen-title"><span class="eyebrow gold">THIẾT LẬP</span><h2>Cài đặt</h2></header>${tabs(TABS, tab)}<div class="screen-body">${body[tab]()}</div>`,
    signature: () => ''
  });

})(typeof window !== 'undefined' ? window : globalThis);
