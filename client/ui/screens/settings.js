/* HƯ GIỚI · MÀN CÀI ĐẶT */
(function (root) {
  'use strict';
  const UI = root.HU_UI;
  const { card, tabs } = UI.kit;

  const TABS = [
    { id: 'season', label: 'Tứ thời', icon: '✿' },
    { id: 'audio', label: 'Âm thanh', icon: '♪' },
    { id: 'guide', label: 'Hướng dẫn', icon: '?' },
    { id: 'account', label: 'Nhân vật', icon: '♙' },
    { id: 'legal', label: 'Pháp lý', icon: '§' }
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
        <p class="info-note">Tiến trình và cài đặt được ghi trên máy chủ game. Khi đăng nhập từ thiết bị khác, hành trình được tải lại theo tài khoản đã xác minh.</p>`, { eyebrow: 'THIẾT BỊ' })}
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
      ${card('Con đường tu hành', `
        <p><b>1.</b> Ở <b>Tu luyện</b>, nhân vật tự nhập định và tích tu vi theo thời gian thật. Cải thiện khả năng hấp thụ linh khí và dùng đan để tăng nhanh.</p>
        <p><b>2.</b> Vào <b>Nhân vật → Hành trang</b>, lĩnh ngộ Dẫn Khí Quyết có sẵn. Công pháp tự vận hành nếu còn ô trống; quản lý trong mục <b>Công pháp</b>.</p>
        <p><b>3.</b> Mở <b>Lịch luyện</b>, chọn nơi muốn đến rồi bấm <b>Khởi hành</b>. Trong mười phút, đạo thân luân phiên đi bộ và ngồi thiền nghỉ ngơi; nhật ký ghi lại cơ duyên, thử thách gặp phải. Không thể về đài Tu luyện hay đổi địa điểm trước khi đồng hồ về 00:00. Tu luyện và nghề phụ tạm dừng, sau đó tự tiếp tục.</p>
        <p><b>4.</b> <b>Nghề phụ</b> gồm luyện đan, rèn pháp bảo, chế phù và trồng linh điền. Thời gian chế tác chỉ tiến triển khi tab game đang mở và kết nối; khi rời game, công việc sẽ tạm dừng.</p>
        <p><b>5.</b> Khi tu vi đầy, bấm <b>Đột phá</b>. Tiểu cảnh giới đột phá ngay, kết quả ghi vào Nhật ký tu tiên; đại cảnh giới mở Độ kiếp đài.</p>
        <p><b>6.</b> <b>Tông môn → Bí cảnh</b>: hạ thủ lĩnh lấy Tinh hoa rồi vào <b>Nhân vật → Linh căn</b> để tôi luyện. <b>Tông môn → Lịch luyện</b> đưa bạn đi tìm kỳ ngộ.</p>
        <p><b>7.</b> Chọn tông môn, làm ủy thác để thăng chức và đổi bảo vật. Mở <b>Nhiệm vụ</b> để theo tuyến tân thủ đến Trúc Cơ.</p>
        <p>Bảng dẫn đường sẽ chỉ vị trí cần chạm, theo dõi nhiệm vụ hiện tại và có thể thu gọn hoặc ẩn bất cứ lúc nào.</p><button class="btn btn-gold" data-act="tutorial">Mở hướng dẫn tân thủ</button>`, { eyebrow: 'TIÊN LỘ' })}
      ${card('Phím tắt', `
        <div class="key-grid">
          <span><kbd>T</kbd> Tu luyện</span><span><kbd>L</kbd> Lịch luyện</span>
          <span><kbd>N</kbd> Nghề phụ</span><span><kbd>C</kbd> Nhân vật</span>
          <span><kbd>I</kbd> Hành trang</span><span><kbd>M</kbd> Thế giới</span>
          <span><kbd>1</kbd>–<kbd>4</kbd> Kỹ năng</span>
          <span><kbd>Esc</kbd> Đóng hộp thoại</span>
        </div>
        <p class="info-note">Phím kỹ năng chỉ có tác dụng ở màn Lịch luyện. Khi hộp thoại mở, phím tắt toàn cục tạm khóa. Thiên kiếp mở từ nút Đột phá khi đủ duyên, không có phím tắt riêng.</p>
        <div class="action-group"><button class="btn btn-outline" data-go="character:bag">Hành trang</button><button class="btn btn-outline" data-go="world:quests">Nhiệm vụ</button></div>`, { eyebrow: 'ĐIỀU KHIỂN' })}
      ${card('Nhật ký & tiến trình xuyên kiếp', `
        <p>• Mở <b>Truyền âm → Nhật ký</b> để xem ghi chép tu hành và thông báo gần đây.</p>
        <p>• Khi bắt đầu lại sau tử vong, Thiên Tinh, nâng cấp, vật phẩm và thành tựu của đạo thân cũ không được kế thừa.</p>
        <p>• <b>Nhiệm vụ tông môn</b> chỉ tiếp tục tính thời gian khi bạn đang trong game và kết nối. Khi hoàn tất, hãy quay lại nhận cống hiến.</p>`, { eyebrow: 'XUYÊN KIẾP' })}
      ${card('Mẹo tu hành', `
        <p>• Bán yêu đan ở Lịch luyện hoặc Thế giới → Cửa hàng để lấy linh thạch.</p>
        <p>• Đan cấp thấp vẫn dùng được nhưng hiệu quả giảm theo chênh lệch cảnh giới.</p>
        <p>• Độ kiếp đại cảnh giới thất bại khiến đạo thân tử vong. Hãy chuẩn bị trước khi dẫn lôi.</p>
        <p>• Tông môn mang lại linh thạch định kỳ và chúc phúc +10% tốc độ hấp thụ linh khí.</p>
        <p>• Khi nhân vật <b>tọa hóa</b>, bạn có thể trở về Khởi Nguyên để tạo nhân vật mới. Tiến trình và quyền lợi kiếp cũ bị xóa; tài khoản đăng nhập được giữ.</p>`, { eyebrow: 'GHI NHỚ' })}
    </div>`;
  }

  function legal() {
    return '<div class="screen-grid">' +
      card('Dữ liệu cá nhân', '<p>Tài khoản và tiến trình được lưu để bạn tiếp tục hành trình trên các thiết bị. Tìm hiểu thông tin được sử dụng, thời gian lưu giữ và cách yêu cầu nhận bản sao hoặc xóa dữ liệu của mình.</p><p><a href="client/legal/privacy.html" target="_blank" rel="noopener noreferrer">Đọc Chính sách quyền riêng tư</a></p>', { eyebrow: 'QUYỀN RIÊNG TƯ' }) +
      card('Điều khoản sử dụng', '<p>Hư Giới là dự án phi lợi nhuận, miễn phí, không có thanh toán trực tuyến. Vật phẩm trong game không có giá trị quy đổi ra tiền.</p><p><a href="client/legal/release.html" target="_blank" rel="noopener noreferrer">Đọc Điều khoản sử dụng</a></p>', { eyebrow: 'PHÁP LÝ' }) +
      '</div>';
  }

  function account() {
    return '<div class="screen-grid">' + card('Xóa nhân vật', '<p>Xóa đạo thân hiện tại để tạo lại từ đầu. Cảnh giới, trang bị, vật phẩm, Thiên Tinh, nâng cấp và thứ hạng của nhân vật sẽ mất. Tin nhắn do nhân vật gửi cũng bị xóa.</p><p>Tài khoản đăng nhập được giữ. Giới hạn lượt tạo nhân vật vẫn được áp dụng.</p><button type="button" class="btn btn-danger" data-act="deleteCharacter">Xóa nhân vật</button>', { eyebrow: 'NHÂN VẬT' }) + '</div>';
  }
  UI.action('deleteCharacter', () => {
    const name = UI.kit.esc(UI.s().name);
    UI.modal('Xóa nhân vật?', '<p>Bạn sắp xóa vĩnh viễn <b>' + name + '</b> cùng toàn bộ tiến trình, vật phẩm, Thiên Tinh, nâng cấp, thứ hạng và tin nhắn đã gửi.</p><p>Tài khoản đăng nhập vẫn được giữ. Thao tác này không thể hoàn tác.</p>', async () => {
      UI.store.ready = false;
      try { await UI.session.deleteCharacter(); root.location.reload(); }
      catch (error) { UI.store.ready = true; throw Error('Chưa xác nhận được việc xóa. Hãy tải lại trang để kiểm tra trạng thái. ' + error.message); }
    }, 'Xóa vĩnh viễn', 'XÓA NHÂN VẬT', { type: 'danger', vfx: false });
    return UI.KEEP;
  });
  const body = { season, audio, guide, account, legal };
  UI.register({
    id: 'settings', label: 'Cài đặt', icon: 'ICON-MENU-006', eyebrow: 'THIẾT LẬP', nav: false, tabs: TABS,
    render: tab => `<header class="screen-title"><span class="eyebrow gold">THIẾT LẬP</span><h2>Cài đặt</h2></header>${tabs(TABS, tab)}<div class="screen-body">${body[tab]()}</div>`,
    signature: () => ''
  });

})(typeof window !== 'undefined' ? window : globalThis);
