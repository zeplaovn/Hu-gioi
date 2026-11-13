/* Hư Giới — quy ước MÀU + HIỆU ỨNG cho mọi nhãn/tên trong giao diện.
 *
 * ĐÂY LÀ NGUỒN DUY NHẤT cho màu nhãn. Khi thêm độ hiếm, linh căn, chỉ số,
 * cảnh giới chat, danh phận NPC/tông môn… hãy thêm vào DOMAINS bên dưới, không
 * rải mã màu mới trong từng màn hình.
 *
 * Cách dùng (render chuỗi):
 *   HU_LABELS.span('Thiên', 'root', 'Thiên linh căn', { variant: 'badge' })
 *   HU_LABELS.span('Hàn Thiên Sơn', 'role', 'Trưởng lão', { variant: 'name' })
 *   HU_LABELS.span('Đạo Tổ', 'realm', 13, { variant: 'name' })
 *
 * Cách dùng (DOM đã có):
 *   node.dataset.huLabel = 'stat:hp';
 *   node.dataset.huVariant = 'badge';
 *   HU_LABELS.decorate(node.parentElement);
 *
 * Quy ước:
 *   - `hu-label` là lớp gốc; `variant` quyết định cách hiển thị:
 *       text  : chỉ tô màu, dùng trong câu.
 *       name  : tên người/NPC, đậm hơn.
 *       badge : nhãn dạng viên thuốc, có viền/nền nhẹ.
 *   - Màu chữ phải đạt tương phản ≥ 4.5:1 trên nền --bg (#0a1410).
 *   - Chỉ nhãn quan trọng (Thiên/Địa, cảnh giới cao, lão tổ, tông chủ…) mới
 *     dùng glow/chuyển động. Nhãn thường chỉ tô màu để tránh nhiễu.
 *   - Mọi animation tự tắt khi `prefers-reduced-motion: reduce`.
 *   - Không dùng màu làm tín hiệu duy nhất: luôn kèm chữ hoặc biểu tượng.
 */
(function (root) {
  'use strict';

  const VERSION = 1;

  /* Bảng màu gốc. Có thể tái dùng cho cả CSS khác qua HU_LABELS.PALETTE. */
  const PALETTE = Object.freeze({
    ink: '#0a1410', panel: '#12201a', text: '#eef5ea', muted: '#b3c9ba',
    ivory: '#f0e9da', parchment: '#e7d5a9', ash: '#c5d4cc',
    jade: '#70d9a4', jadeSoft: '#9fe3c4', cyan: '#65ceff', cyanSoft: '#85bfff',
    gold: '#f3ca72', goldDeep: '#f2cf5b', amber: '#ffad72',
    coral: '#ff9a8a', crimson: '#f0604d', violet: '#b98cff', lilac: '#c79bff',
    rose: '#ff9fd0', ice: '#a8e4ff', lightning: '#b58aff', wind: '#f4f4f4',
    poison: '#7bdc9a', wood: '#6fd36f', earth: '#c9a24f', water: '#4aa8f2',
    fire: '#f0604d', metal: '#cfd8de', chaos: '#e8e8e8'
  });

  /* Kiểu hiệu ứng. `classes` được gắn thêm vào nhãn; `duration` là chu kỳ. */
  const FX = Object.freeze({
    dim: { classes: ['is-dim'] },
    tint: { classes: [] },
    soft: { classes: ['is-glow'] },
    glow: { classes: ['is-glow'] },
    pulse: { classes: ['is-glow', 'is-pulse'], duration: '3.4s' },
    shimmer: { classes: ['is-glow', 'is-flow'], duration: '6s' },
    aurora: { classes: ['is-glow', 'is-flow', 'is-aurora'], duration: '8s' },
    rainbow: { classes: ['is-glow', 'is-flow', 'is-rainbow'], duration: '4.5s' },
    admin: { classes: ['is-admin'] }
  });

  const VARIANTS = Object.freeze({
    text: '',
    name: 'hu-label--name',
    badge: 'hu-label--badge'
  });

  /* Mỗi mục: name = chữ hiển thị, color = màu dự phòng, fx = hiệu ứng,
     gradient = gradient chữ (tuỳ chọn), aliases = tên gọi khác để tra cứu. */
  const DOMAINS = {
    /* Bốn bậc phẩm chất vật phẩm (F.SUBPHAM). */
    quality: {
      name: 'Phẩm chất vật phẩm',
      keys: {
        ha: { name: 'Hạ', color: PALETTE.ash, fx: 'tint', aliases: ['Hạ phẩm', 'common'] },
        trung: { name: 'Trung', color: PALETTE.jade, fx: 'soft', aliases: ['Trung phẩm', 'uncommon'] },
        thuong: { name: 'Thượng', color: PALETTE.cyanSoft, fx: 'glow', aliases: ['Thượng phẩm', 'rare'] },
        cuc: { name: 'Cực', color: PALETTE.gold, fx: 'shimmer', duration: '5s', aliases: ['Cực phẩm', 'epic'] }
      }
    },
    /* Năm bậc độ hiếm của kinh mạch/cổ vật (data/meridians.js). */
    rarity: {
      name: 'Độ hiếm',
      keys: {
        pham: { name: 'Phàm', color: '#f1f1f1', fx: 'tint', aliases: ['Phàm phẩm', 'common'] },
        linh: { name: 'Linh', color: PALETTE.violet, fx: 'glow', aliases: ['Linh phẩm', 'uncommon'] },
        huyen: { name: 'Huyền', color: PALETTE.goldDeep, fx: 'shimmer', duration: '6s', aliases: ['Huyền phẩm', 'rare'] },
        dia: { name: 'Địa', color: PALETTE.crimson, fx: 'pulse', duration: '3.4s', aliases: ['Địa phẩm', 'epic'] },
        thien: {
          name: 'Thiên', color: '#ffd9a0', fx: 'shimmer', duration: '5s', glow: '#ffd9a088',
          gradient: 'linear-gradient(90deg,#ffd9a0,#fff6d0,#ffb82e,#ffd9a0)',
          aliases: ['Thiên phẩm', 'legendary']
        }
      }
    },
    /* Bốn bậc kỳ ngộ (data/adventures.js). */
    encounter: {
      name: 'Độ hiếm kỳ ngộ',
      keys: {
        thuong: { name: 'Thường', color: '#7fdcff', fx: 'tint', aliases: ['Thường gặp'] },
        hiem: { name: 'Hiếm', color: '#69dba0', fx: 'soft' },
        cucHiem: { name: 'Cực hiếm', color: '#ffad72', fx: 'pulse', duration: '3.6s', aliases: ['Cực hiếm gặp'] },
        thienCo: {
          name: 'Thiên cơ', color: '#edca62', fx: 'shimmer', duration: '5s', glow: '#edca6288',
          gradient: 'linear-gradient(90deg,#edca62,#fff6d0,#edca62)'
        }
      }
    },
    /* Tám loại linh căn (data/roots.js). */
    root: {
      name: 'Linh căn',
      keys: {
        nguy: { name: 'Ngụy', color: '#9aa7ad', fx: 'dim', aliases: ['Ngụy linh căn', 'Tạp linh căn'] },
        tuHanh: { name: 'Tứ hành', color: '#b7c9c0', fx: 'tint', aliases: ['Tứ hành linh căn'] },
        tamHanh: { name: 'Tam hành', color: PALETTE.jade, fx: 'soft', aliases: ['Tam hành linh căn'] },
        song: { name: 'Song', color: PALETTE.cyanSoft, fx: 'glow', aliases: ['Song linh căn'] },
        thien: {
          name: 'Thiên', color: '#ffd98a', fx: 'shimmer', duration: '5s', glow: '#ffd98a88',
          gradient: 'linear-gradient(90deg,#ffd98a,#fff6d0,#ffb82e,#ffd98a)',
          aliases: ['Thiên linh căn']
        },
        di: {
          name: 'Dị', color: PALETTE.lightning, fx: 'glow', glow: '#b58aff88',
          gradient: 'linear-gradient(90deg,#b58aff,#a8e4ff,#b58aff)',
          aliases: ['Dị linh căn']
        },
        honDon: {
          name: 'Hỗn Độn', color: '#fff1c9', fx: 'rainbow', duration: '4.5s', glow: '#ffcf5a99',
          gradient: 'linear-gradient(90deg,#fff,#ffe27a,#ff7ad9,#6ae6ff,#a98bff,#fff)',
          aliases: ['Hỗn Độn linh căn']
        }
      }
    },
    /* Ngũ hành và các hệ biến dị (data/meridians.js HE_COLOR). */
    element: {
      name: 'Hệ / Ngũ hành',
      keys: {
        kim: { name: 'Kim', color: PALETTE.metal, fx: 'tint', aliases: ['Metal'] },
        moc: { name: 'Mộc', color: PALETTE.wood, fx: 'tint', aliases: ['Wood'] },
        thuy: { name: 'Thủy', color: PALETTE.water, fx: 'tint', aliases: ['Water'] },
        hoa: { name: 'Hỏa', color: PALETTE.fire, fx: 'tint', aliases: ['Fire'] },
        tho: { name: 'Thổ', color: PALETTE.earth, fx: 'tint', aliases: ['Earth'] },
        bang: { name: 'Băng', color: PALETTE.ice, fx: 'soft', aliases: ['Ice'] },
        loi: { name: 'Lôi', color: PALETTE.lightning, fx: 'soft', aliases: ['Lightning'] },
        phong: { name: 'Phong', color: PALETTE.wind, fx: 'soft', aliases: ['Wind'] },
        doc: { name: 'Độc', color: '#2f9e55', fx: 'soft', aliases: ['Poison'] },
        trungHoa: { name: 'Trung hòa', color: '#9aa7ad', fx: 'tint', aliases: ['Neutral'] },
        honDon: {
          name: 'Hỗn Độn', color: PALETTE.chaos, fx: 'rainbow', duration: '4.5s', glow: '#ffcf5a99',
          gradient: 'linear-gradient(90deg,#fff,#ffe27a,#ff7ad9,#6ae6ff,#a98bff,#fff)',
          aliases: ['Chaos']
        }
      }
    },
    /* Chỉ số trong bảng nhân vật (UI.statNames). */
    stat: {
      name: 'Chỉ số',
      keys: {
        qi: { name: 'Tu vi', color: '#79e0a4', fx: 'tint', aliases: ['Tu vi tích lũy'] },
        qiRate: { name: 'Tốc độ hấp thụ linh khí', color: '#7fe0ae', fx: 'soft', aliases: ['Tốc độ tu luyện', 'Tu vi/giây'] },
        hp: { name: 'Sinh lực', color: '#ff8d7a', fx: 'tint', aliases: ['HP', 'Sinh lực tối đa'] },
        mp: { name: 'Linh lực', color: '#6fc3ff', fx: 'tint', aliases: ['MP', 'Linh lực tối đa'] },
        sta: { name: 'Thể lực', color: '#8fe3a8', fx: 'tint', aliases: ['STA', 'Stamina'] },
        atk: { name: 'Công kích', color: '#ffad72', fx: 'tint', aliases: ['ATK', 'Attack'] },
        def: { name: 'Phòng thủ', color: '#d8b46a', fx: 'tint', aliases: ['DEF', 'Defense'] },
        spd: { name: 'Thân pháp', color: '#7fe0d0', fx: 'tint', aliases: ['SPD', 'Speed'] },
        cp: { name: 'Chiến lực', color: PALETTE.lilac, fx: 'soft', aliases: ['CP', 'Combat Power'] },
        crit: { name: 'Bạo kích', color: '#ff9a5c', fx: 'tint', aliases: ['CRIT', 'Tỷ lệ bạo kích'] },
        critDamage: { name: 'Sát thương bạo kích', color: '#ff7aa8', fx: 'tint', aliases: ['CRIT DMG', 'Crit Damage'] },
        dodge: { name: 'Né tránh', color: '#9fe3c4', fx: 'tint', aliases: ['DODGE', 'Tỷ lệ né tránh'] }
      }
    },
    /* Sáu thiên phú khởi nguyên (data/character.js TALENT_INFO). */
    talent: {
      name: 'Thiên phú',
      keys: {
        tuongMao: { name: 'Tướng Mạo', color: PALETTE.rose, fx: 'soft', aliases: ['Tướng mạo'] },
        phucDuyen: { name: 'Phúc Duyên', color: PALETTE.gold, fx: 'soft', aliases: ['Phúc duyên'] },
        canCot: { name: 'Căn Cốt', color: '#ff8d7a', fx: 'soft', aliases: ['Căn cốt'] },
        ngoTinh: { name: 'Ngộ Tính', color: PALETTE.cyanSoft, fx: 'soft', aliases: ['Ngộ tính'] },
        vanKhi: { name: 'Vận Khí', color: PALETTE.lilac, fx: 'soft', aliases: ['Vận khí'] },
        coDuyen: { name: 'Cơ Duyên', color: '#7fe0ae', fx: 'soft', aliases: ['Cơ duyên'] }
      }
    },
    /* Bốn Dấu ấn Thiên Mệnh mua ở Quầy Khởi Nguyên. */
    destiny: {
      name: 'Dấu ấn Thiên Mệnh',
      keys: {
        exp: { name: 'Đạo Tâm', color: '#7fe0ae', fx: 'soft', aliases: ['Đạo tâm'] },
        stone: { name: 'Túi Càn Khôn', color: PALETTE.gold, fx: 'tint', aliases: ['Túi Càn khôn'] },
        life: { name: 'Trường Sinh', color: PALETTE.rose, fx: 'soft', aliases: ['Trường sinh'] },
        luck: {
          name: 'Thiên Vận', color: PALETTE.lilac, fx: 'shimmer', duration: '6s', glow: '#c79bff88',
          gradient: 'linear-gradient(90deg,#c79bff,#ffe08a,#c79bff)', aliases: ['Thiên vận']
        }
      }
    },
    /* Mười bốn cảnh giới chat. Gradient/animation lấy đúng bảng chat hiện hành. */
    realm: {
      name: 'Cảnh giới',
      keys: {
        0: { name: 'Luyện Khí', color: '#f4f4f2', fx: 'tint' },
        1: { name: 'Trúc Cơ', color: '#6fe08f', fx: 'soft', glow: '#3fbf6a55' },
        2: { name: 'Kết Đan', color: '#f3cb4a', fx: 'soft', glow: '#d9a82a66' },
        3: { name: 'Nguyên Anh', color: '#5fcfff', fx: 'soft', glow: '#2f9fd866' },
        4: { name: 'Hóa Thần', color: '#b68cff', fx: 'soft', glow: '#8a5ae066' },
        5: {
          name: 'Luyện Hư', color: '#9d8cff', fx: 'shimmer', duration: '6s', glow: '#8f7bff77',
          gradient: 'linear-gradient(90deg,#8f7bff,#4fb4ff,#8f7bff)'
        },
        6: {
          name: 'Hợp Thể', color: '#6af0b0', fx: 'shimmer', duration: '6s', glow: '#2fe0b677',
          gradient: 'linear-gradient(90deg,#2fe0b6,#7dff9a,#2fe0b6)'
        },
        7: {
          name: 'Đại Thừa', color: '#ff9a4a', fx: 'pulse', duration: '4s', glow: '#ff6a1f88',
          gradient: 'linear-gradient(90deg,#ff7a2f,#ffd04a,#ff3d3d,#ff7a2f)'
        },
        8: {
          name: 'Độ Kiếp', color: '#9fd0ff', fx: 'shimmer', duration: '3.2s', glow: '#6fb8ffaa',
          gradient: 'linear-gradient(90deg,#4fa8ff,#f4fbff,#4fa8ff)'
        },
        9: {
          name: 'Chân Tiên', color: '#ffc0e6', fx: 'shimmer', duration: '6s', glow: '#ff9ad566',
          gradient: 'linear-gradient(90deg,#ff8fd0,#ffe08a,#9ff0ff,#ff8fd0)'
        },
        10: {
          name: 'Kim Tiên', color: '#ffd45a', fx: 'shimmer', duration: '4s', glow: '#ffc93acc',
          gradient: 'linear-gradient(90deg,#ffd45a,#fff6d0,#ffb82e,#ffd45a)'
        },
        11: {
          name: 'Thái Ất', color: '#ffd0a0', fx: 'rainbow', duration: '5s', glow: '#ffffff55',
          gradient: 'linear-gradient(90deg,#ff5f6d,#ffc371,#7dff9a,#56c7ff,#b27dff,#ff5f6d)'
        },
        12: {
          name: 'Đại La', color: '#c9b8ff', fx: 'aurora', duration: '4s', glow: '#8f6bffbb',
          gradient: 'linear-gradient(90deg,#7a5cff,#2fe7ff,#ff5fd2,#7a5cff)'
        },
        13: {
          name: 'Đạo Tổ', color: '#fff1c9', fx: 'rainbow', duration: '2.8s', glow: '#ffcf5acc',
          gradient: 'linear-gradient(90deg,#fff,#ffe27a,#ff7ad9,#6ae6ff,#a98bff,#fff)',
          aliases: ['Đạo tổ']
        }
      }
    },
    /* Danh phận người/NPC. Dùng cho tên trong chat, hội thoại, tông môn. */
    role: {
      name: 'Danh phận',
      keys: {
        player: { name: 'Đạo hữu', color: PALETTE.ivory, fx: 'tint', aliases: ['Người chơi', 'Đạo thân', 'player'] },
        you: { name: 'Bạn', color: PALETTE.ivory, fx: 'dim', aliases: ['Bạn'] },
        admin: { name: 'Quản trị', color: '#ffffff', fx: 'admin', aliases: ['Admin', 'Hư Giới Chi Chủ'] },
        sectMaster: {
          name: 'Tông chủ', color: PALETTE.gold, fx: 'glow', glow: '#f3ca7277',
          gradient: 'linear-gradient(90deg,#f3ca72,#fff0c0,#f3ca72)',
          aliases: ['Tông Chủ', 'tong chu', 'sect master']
        },
        grandElder: {
          name: 'Thái thượng trưởng lão', color: '#e8f4ff', fx: 'shimmer', duration: '7s', glow: '#b9d8ff77',
          gradient: 'linear-gradient(90deg,#e8f4ff,#b9d8ff,#e8f4ff)',
          aliases: ['Thái Thượng Trưởng Lão', 'thai thuong truong lao']
        },
        ancestor: {
          name: 'Lão tổ', color: '#fff1c9', fx: 'aurora', duration: '8s', glow: '#ffcf5a88',
          gradient: 'linear-gradient(90deg,#fff,#ffe27a,#ff7ad9,#6ae6ff,#a98bff,#fff)',
          aliases: ['Lão Tổ', 'Tổ sư', 'lao to', 'ancestor']
        },
        elder: { name: 'Trưởng lão', color: PALETTE.jadeSoft, fx: 'glow', glow: '#9fe3c466', aliases: ['Trưởng Lão', 'truong lao'] },
        steward: { name: 'Chấp sự', color: '#7fe0d0', fx: 'tint', aliases: ['Chấp Sự', 'chap su'] },
        directDisciple: {
          name: 'Đệ tử thân truyền', color: PALETTE.lilac, fx: 'glow', glow: '#c79bff55',
          aliases: ['Thân truyền', 'than truyen', 'than_truyen']
        },
        innerDisciple: { name: 'Đệ tử nội môn', color: PALETTE.cyanSoft, fx: 'soft', aliases: ['Nội môn', 'noi mon', 'noi_mon'] },
        outerDisciple: { name: 'Đệ tử ngoại môn', color: PALETTE.jade, fx: 'tint', aliases: ['Ngoại môn', 'ngoai mon', 'ngoai_mon'] },
        menialDisciple: { name: 'Đệ tử tạp dịch', color: PALETTE.muted, fx: 'dim', aliases: ['Tạp dịch', 'tap dich', 'tap_dich'] },
        guest: { name: 'Khách', color: PALETTE.parchment, fx: 'tint', aliases: ['dao huu', 'guest'] },
        npc: { name: 'Kỳ nhân', color: '#e6c67f', fx: 'tint', aliases: ['NPC', 'Kỳ Nhân'] },
        beast: { name: 'Yêu thú', color: PALETTE.coral, fx: 'tint', aliases: ['Yêu Thú', 'yeu thu'] },
        boss: {
          name: 'Yêu vương', color: '#ffb36b', fx: 'pulse', duration: '3.6s', glow: '#ff7a5c88',
          gradient: 'linear-gradient(90deg,#ff7a5c,#ffd36b,#ff7a5c)',
          aliases: ['Boss', 'Yêu Vương', 'boss kiếp']
        }
      }
    },
    /* Ba tông môn hiện có + nhãn chung. */
    sect: {
      name: 'Tông môn',
      keys: {
        thanhvan: {
          name: 'Thanh Vân Tông', color: '#7fe0d0', fx: 'shimmer', duration: '7s', glow: '#7fe0d066',
          gradient: 'linear-gradient(90deg,#7fe0d0,#d9fff4,#7fe0d0)',
          aliases: ['Thanh Vân', 'thanh van']
        },
        huyetsat: {
          name: 'Huyết Sát Môn', color: '#ff8d7a', fx: 'pulse', duration: '4s', glow: '#ff6b5c88',
          gradient: 'linear-gradient(90deg,#ff6b5c,#ffb36b,#ff6b5c)',
          aliases: ['Huyết Sát', 'huyet sat']
        },
        vanduoc: {
          name: 'Vạn Dược Cốc', color: '#9fe3a8', fx: 'shimmer', duration: '7s', glow: '#6fd36f77',
          gradient: 'linear-gradient(90deg,#6fd36f,#f3ca72,#6fd36f)',
          aliases: ['Vạn Dược', 'van duoc']
        },
        generic: { name: 'Tông môn', color: PALETTE.gold, fx: 'tint', aliases: ['Tông Môn', 'sect'] }
      }
    }
  };

  const normalize = value => String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd').toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  const slug = value => String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').toLowerCase();

  const alpha = (hex, a = .42) => {
    const value = String(hex || '').replace('#', '');
    if (value.length === 3) return '#' + value.split('').map(c => c + c).join('') + Math.round(a * 255).toString(16).padStart(2, '0');
    if (value.length === 6) return '#' + value + Math.round(a * 255).toString(16).padStart(2, '0');
    return hex;
  };

  function domainOf(domain) {
    const d = DOMAINS[domain];
    if (!d) throw Error('Miền nhãn không hợp lệ: ' + domain);
    return d;
  }

  /* Nhận key, tên hiển thị hoặc alias; trả về key chuẩn trong DOMAINS. */
  function resolveKey(domain, value) {
    const d = domainOf(domain);
    if (Object.hasOwn(d.keys, value)) return String(value);
    const wanted = normalize(value);
    for (const [key, item] of Object.entries(d.keys)) {
      if (normalize(key) === wanted || normalize(item.name) === wanted ||
        (item.aliases || []).some(alias => normalize(alias) === wanted)) return key;
    }
    throw Error('Nhãn không hợp lệ trong ' + domain + ': ' + value);
  }

  function entry(domain, value) {
    const key = resolveKey(domain, value);
    return { domain, key, ...domainOf(domain).keys[key] };
  }

  /* Chỉ trả về lớp định danh màu, dùng khi gắn màu cho một khối có sẵn
     (ô chỉ số, ô hành trang…) mà không muốn đổi display của khối đó. */
  function keyClass(domain, value) {
    return 'hu-label--' + domain + '-' + slug(entry(domain, value).key);
  }

  /* Trả về chuỗi class hoàn chỉnh cho một nhãn. */
  function classFor(domain, value, { variant = 'text' } = {}) {
    const item = entry(domain, value);
    const fx = FX[item.fx || 'tint'] || FX.tint;
    const classes = ['hu-label', 'hu-label--' + domain + '-' + slug(item.key)];
    if (VARIANTS[variant]) classes.push(VARIANTS[variant]);
    if (item.gradient) classes.push('is-gradient');
    classes.push(...fx.classes);
    return classes.join(' ');
  }

  const esc = value => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /* Sinh HTML an toàn cho nhãn. `tag` chỉ nhận các thẻ inline.
     `className` chỉ nhận token lớp hợp lệ, dùng để giữ lớp bố cục sẵn có. */
  function span(text, domain, value, { variant = 'text', tag = 'span', title = '', className = '' } = {}) {
    const safeTag = ['span', 'b', 'strong', 'em', 'small'].includes(tag) ? tag : 'span';
    const item = entry(domain, value);
    const extra = String(className || '').split(/\s+/).filter(token => /^[A-Za-z0-9_-]+$/.test(token));
    const attrs = [
      'class="' + [classFor(domain, item.key, { variant }), ...extra].join(' ') + '"',
      'data-hu-label="' + esc(domain + ':' + item.key) + '"'
    ];
    if (title) attrs.push('title="' + esc(title) + '"');
    return '<' + safeTag + ' ' + attrs.join(' ') + '>' + esc(text) + '</' + safeTag + '>';
  }

  /* Gắn class vào một phần tử DOM đã có. */
  function apply(node, domain, value, { variant = 'text' } = {}) {
    if (!node?.classList) return node;
    const key = resolveKey(domain, value);
    node.classList.add(...classFor(domain, key, { variant }).split(' '));
    node.dataset.huLabel = domain + ':' + key;
    return node;
  }

  /* Quét các phần tử có data-hu-label="domain:key" và gắn class tương ứng. */
  function decorate(scope = root.document) {
    if (!scope?.querySelectorAll) return 0;
    let count = 0;
    scope.querySelectorAll('[data-hu-label]').forEach(node => {
      const [domain, value] = String(node.dataset.huLabel).split(':');
      if (!domain || !value) return;
      try {
        apply(node, domain, value, { variant: node.dataset.huVariant || 'text' });
        count++;
      } catch { /* nhãn lạ: để nguyên nội dung, không làm hỏng màn hình */ }
    });
    return count;
  }

  /* CSS sinh từ chính DOMAINS, nên không có bảng màu thứ hai. */
  function buildCss() {
    const out = [
      '.hu-label{display:inline;color:var(--label-color,inherit);font-weight:650;line-height:1.2;overflow-wrap:anywhere}',
      '.hu-label.hu-label{color:var(--label-color,inherit)}',
      '.hu-label--name{font-weight:800;letter-spacing:.01em}',
      '.hu-label--badge{display:inline-flex;align-items:center;gap:.35em;max-width:100%;padding:.08em .5em;border:1px solid var(--label-border,#ffffff2e);border-radius:999px;background:var(--label-bg,#ffffff0a);font-size:.92em;font-weight:750;white-space:nowrap;vertical-align:baseline}',
      '.hu-label.is-dim{opacity:.72}',
      '.hu-label.is-glow:not(.is-gradient){text-shadow:0 0 6px var(--label-glow),0 0 14px var(--label-glow)}',
      '.hu-label.is-gradient{background-image:var(--label-gradient);background-size:220% 100%;background-position:0 0;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:var(--label-color)}',
      '.hu-label.is-gradient.is-glow{text-shadow:none;filter:drop-shadow(0 0 6px var(--label-glow))}',
      '.hu-label.is-flow{animation:hu-label-flow var(--label-duration,6s) linear infinite}',
      '.hu-label.is-pulse{animation:hu-label-pulse var(--label-duration,3.4s) ease-in-out infinite}',
      '.hu-label.is-aurora{filter:drop-shadow(0 0 6px var(--label-glow)) drop-shadow(0 0 16px var(--label-glow))}',
      '.hu-label.is-rainbow{filter:drop-shadow(0 0 5px var(--label-glow)) drop-shadow(0 0 12px var(--label-glow))}',
      '.hu-label.is-admin{display:inline-flex;align-items:center;padding:1px 9px;border:1px solid #ffffffaa;border-radius:999px;background:linear-gradient(100deg,#050505 0%,#fff 18%,#050505 36%,#fff 54%,#050505 72%,#fff 90%,#050505 100%);background-size:260% 100%;box-shadow:0 0 10px #ffffff66,0 0 22px #ffffff22,inset 0 0 6px #00000099;color:#fff;font-weight:900;letter-spacing:.03em;text-shadow:0 0 2px #000,0 0 4px #000,0 0 6px #000;animation:hu-label-admin-sweep 3.6s linear infinite}',
      '@keyframes hu-label-flow{to{background-position:220% 0}}',
      '@keyframes hu-label-pulse{0%,100%{filter:drop-shadow(0 0 3px var(--label-glow))}50%{filter:drop-shadow(0 0 11px var(--label-glow))}}',
      '@keyframes hu-label-admin-sweep{to{background-position:260% 0}}',
      '@media (prefers-reduced-motion:reduce){.hu-label.is-flow,.hu-label.is-pulse,.hu-label.is-admin{animation:none!important}.hu-label.is-gradient{background-position:0 0}}'
    ];
    for (const [domain, def] of Object.entries(DOMAINS)) {
      for (const [key, item] of Object.entries(def.keys)) {
        const decls = ['--label-color:' + item.color];
        if (item.gradient) decls.push('--label-gradient:' + item.gradient);
        decls.push('--label-glow:' + (item.glow || alpha(item.color)));
        if (item.duration) decls.push('--label-duration:' + item.duration);
        if (item.bg) decls.push('--label-bg:' + item.bg);
        if (item.border) decls.push('--label-border:' + item.border);
        out.push('.hu-label--' + domain + '-' + slug(key) + '{' + decls.join(';') + '}');
      }
    }
    return out.join('\n');
  }

  let installed = false;
  function install(doc = root.document) {
    if (!doc || installed || doc.getElementById('hu-label-styles')) return false;
    const style = doc.createElement('style');
    style.id = 'hu-label-styles';
    style.textContent = buildCss();
    (doc.head || doc.documentElement).append(style);
    installed = true;
    return true;
  }

  const API = {
    VERSION, PALETTE, FX, VARIANTS, DOMAINS,
    classFor, keyClass, resolveKey, entry, span, apply, decorate, install, buildCss, slug, normalize
  };
  root.HU_LABELS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  if (root.document) {
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', () => install(), { once: true });
    } else install();
  }
})(typeof window !== 'undefined' ? window : globalThis);
