/* Bảo vệ save: chữ ký HMAC-SHA256 + kiểm tra tính hợp lý của dữ liệu nhân vật.
   LƯU Ý: game chạy hoàn toàn ở trình duyệt nên đây chỉ là rào cản chống sửa save thông thường,
   không thể ngăn người có chuyên môn (khóa nằm trong mã nguồn). Chống gian lận tuyệt đối cần máy chủ xác thực. */
"use strict";
(function () {
  const sec = TT.sec = { error: "" };
  /* Khóa ký KHÔNG còn nằm trong repo: `npm run build` thay chuỗi bên dưới bằng biến môi trường TVDL_SALT.
     Khi chạy trực tiếp từ mã nguồn (dev) thì dùng khóa tạm, save của bản dev không dùng được cho bản phát hành. */
  const SALT_BUILD = "__TVDL_SALT__";
  const SALT = SALT_BUILD.indexOf("__") === 0 ? "dev-only-key-do-not-ship" : SALT_BUILD;
  sec.devKey = SALT_BUILD.indexOf("__") === 0;
  const FLAG = "tu_tien_sec_v1";                                // đánh dấu đã chuyển sang save có chữ ký
  const BAK = "_bak", REJ = "_rejected";                        // hậu tố khóa: bản sao lưu gần nhất / bản bị từ chối
  const BAK_MS = 5 * 60 * 1000, MAX_RAW = 2 * 1024 * 1024;     // sao lưu cách nhau tối thiểu 5 phút; từ chối dữ liệu lớn bất thường

  /* ---------- SHA-256 + HMAC (đồng bộ, không cần HTTPS) ---------- */
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  const utf8 = s => new TextEncoder().encode(s);

  const sha256 = bytes => {
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const len = bytes.length, padded = new Uint8Array(((len + 9 + 63) >> 6) << 6);
    padded.set(bytes); padded[len] = 0x80;
    const dv = new DataView(padded.buffer);
    dv.setUint32(padded.length - 8, Math.floor(len / 0x20000000), false);
    dv.setUint32(padded.length - 4, (len << 3) >>> 0, false);
    const w = new Uint32Array(64);
    for (let o = 0; o < padded.length; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4, false);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), mj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + mj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    const out = new Uint8Array(32), ov = new DataView(out.buffer);
    H.forEach((v, i) => ov.setUint32(i * 4, v, false));
    return out;
  };
  const hmac = (key, msg) => {
    let k = utf8(key); if (k.length > 64) k = sha256(k);
    const ip = new Uint8Array(64 + msg.length), op = new Uint8Array(96);
    for (let i = 0; i < 64; i++) { const b = k[i] || 0; ip[i] = b ^ 0x36; op[i] = b ^ 0x5c; }
    ip.set(msg, 64); op.set(sha256(ip), 64);
    return sha256(op);
  };
  const hex = u8 => Array.from(u8, b => b.toString(16).padStart(2, "0")).join("");
  sec.sign = (scope, text) => hex(hmac(SALT, utf8(scope + "|" + text)));
  sec._sha256hex = s => hex(sha256(utf8(s)));            // phục vụ kiểm thử
  sec._hmacHex = (k, m) => hex(hmac(k, utf8(m)));

  /* ---------- đọc / ghi có chữ ký ---------- */
  const eq = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
  sec.verify = (scope, text, sig) => typeof sig === "string" && eq(sec.sign(scope, text), sig);
  const migrated = () => { try { return localStorage.getItem(FLAG) === "1"; } catch (e) { return false; } };

  /** Đọc và kiểm tra một phong bì { d, s }: trả về { obj } nếu hợp lệ, { bad: true } nếu hỏng / bị sửa, { legacy } nếu là save cũ chưa ký. */
  const open = (raw, scope) => {
    if (typeof raw !== "string" || raw.length > MAX_RAW) return { bad: true };
    let env;
    try { env = JSON.parse(raw); } catch (e) { return { bad: true }; }
    if (env && typeof env === "object" && typeof env.d === "string" && typeof env.s === "string") {
      if (!sec.verify(scope, env.d, env.s)) return { bad: true };
      try { return { obj: JSON.parse(env.d) }; } catch (e) { return { bad: true }; }
    }
    if (migrated()) return { bad: true };                  // đã bật chữ ký mà dữ liệu không có chữ ký -> bị sửa / thay thế
    return { obj: env, legacy: true };                      // save cũ (trước khi có chữ ký): chấp nhận 1 lần để di trú
  };
  const getRaw = key => { try { return localStorage.getItem(key); } catch (e) { return null; } };
  const setRaw = (key, v) => { try { localStorage.setItem(key, v); return true; } catch (e) { return false; } };

  /** Trả về { obj, legacy } nếu hợp lệ, null nếu không có, hoặc { bad: true } nếu bị sửa.
      Dữ liệu bị từ chối được giữ lại ở `<key>_rejected` (không xóa) để người chơi còn xuất / kiểm tra được. */
  sec.read = (key, scope) => {
    const raw = getRaw(key);
    if (!raw) return null;
    const r = open(raw, scope);
    if (r.bad) setRaw(key + REJ, raw.length > MAX_RAW ? raw.slice(0, 1024) : raw);
    return r;
  };

  let failAt = 0;
  const notifyFail = () => {                                // báo cho người chơi khi không ghi được (bộ nhớ đầy / chế độ riêng tư), tối đa 1 lần / 30 giây
    const now = Date.now();
    if (now - failAt < 30000) return; failAt = now;
    if (TT.ui && TT.ui.toast) TT.ui.toast("Không lưu được vào trình duyệt (bộ nhớ đầy hoặc đang ở chế độ riêng tư). Hãy xuất dữ liệu để sao lưu.", "bad", 8000);
  };

  /** Ghi có chữ ký. Giữ lại bản hợp lệ trước đó làm bản sao lưu (làm mới tối đa 5 phút / lần). Trả về true nếu ghi thành công. */
  sec.write = (key, scope, obj) => {
    const d = JSON.stringify(obj), now = Date.now();
    const prev = getRaw(key);
    if (prev && open(prev, scope).obj) {
      const bak = getRaw(key + BAK);
      let bt = 0; try { bt = bak ? +JSON.parse(bak).t || 0 : 0; } catch (e) { /* bỏ qua */ }
      if (!bak || now - bt > BAK_MS) setRaw(key + BAK, prev);
    }
    const ok = setRaw(key, JSON.stringify({ d, s: sec.sign(scope, d), t: now })) && setRaw(FLAG, "1");
    if (!ok) notifyFail();
    return ok;
  };
  /** Có bản sao lưu hợp lệ không? Trả về thời điểm ghi (ms) hoặc 0. */
  sec.backupTime = (key, scope) => { const raw = getRaw(key + BAK); if (!raw || !open(raw, scope).obj) return 0; try { return +JSON.parse(raw).t || 1; } catch (e) { return 1; } };
  /** Khôi phục bản sao lưu thành save hiện tại. Trả về true nếu thành công. */
  sec.restore = (key, scope) => { const raw = getRaw(key + BAK); return !!raw && !!open(raw, scope).obj && setRaw(key, raw); };

  /* ---------- kiểm tra tính hợp lý của nhân vật ---------- */
  const isObj = v => v && typeof v === "object" && !Array.isArray(v);
  const int = (v, lo, hi, d = lo) => { const n = Math.trunc(+v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  const flt = (v, lo, hi, d = lo) => { const n = +v; return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  const fail = m => { sec.error = m; return null; };
  /* Mốc thời gian trong save (idle.ts, linh điền, bí cảnh, nhiệm vụ tông môn) được ghi bằng đồng hồ máy chủ (TT.now, xem ha_gioi_fix.js),
     nên phải giới hạn bằng cùng đồng hồ đó. So với đồng hồ thiết bị sẽ cắt lệch mốc khi máy khách chạy chậm hơn máy chủ
     (cộng thừa thời gian tu luyện / làm cây chín sớm, rồi bị máy chủ từ chối lúc lưu). Chưa đồng bộ được thì dùng đồng hồ thiết bị. */
  const clk = () => Math.floor(typeof TT.now === "function" ? TT.now() : Date.now());

  /** Trả về nhân vật đã làm sạch, hoặc null (kèm sec.error) nếu dữ liệu không thể hợp lệ. */
  sec.cleanPlayer = d => {
    if (!isObj(d)) return fail("Dữ liệu nhân vật không hợp lệ.");
    if (d.gender !== "Nam" && d.gender !== "Nữ") return fail("Giới tính không hợp lệ.");
    if (!Object.prototype.hasOwnProperty.call(TT.RACES, d.race)) return fail("Chủng tộc không hợp lệ.");
    const realm = int(d.realm, 0, TT.REALMS.length - 1), tang = int(d.tang, 1, 9);
    const months = int(d.months, 0, 1e6), level = realm * 9 + tang;
    const age = int(d.age, 1, 20000), lifespan = int(d.lifespan, 1, 20000);
    if (months < level - 1) return fail("Cảnh giới cao hơn thời gian tu luyện cho phép.");
    const age0 = age - Math.floor(months / 12);
    if (age0 < 14 || age0 > 30) return fail("Tuổi và thời gian tu luyện không khớp.");
    if (age >= lifespan) return fail("Nhân vật đã hết thọ nguyên.");
    if (!isObj(d.stats)) return fail("Chỉ số không hợp lệ.");
    const stats = {};
    for (const s of TT.STATS) stats[s] = int(d.stats[s], 1, 40, 1);
    const need = TT.needExp(level);
    const stone = int(d.stone, 0, 500 + months * 500);
    const exp = int(d.exp, 0, Math.max(100, need * 20));

    const skills = [...new Set(Array.isArray(d.skills) ? d.skills.filter(s => typeof s === "string" && Object.prototype.hasOwnProperty.call(TT.SKILLS, s)) : [])];
    const sect = typeof d.sect === "string" && Object.prototype.hasOwnProperty.call(TT.SECTS, d.sect) ? d.sect : null;

    let sectx = null;                                          // tông môn nâng cao (bản idle): chỉ giữ khi đang có tông môn
    if (sect) {
      const x = isObj(d.sectx) ? d.sectx : {}, base = TT.newSectx(sect);
      base.earned = int(x.earned, 0, 1e6, 0); base.contrib = int(x.contrib, 0, base.earned, 0);
      if (isObj(x.done)) for (const id of TT.MISSION_IDS) { const n = int(x.done[id], 0, 99999, 0); if (n) base.done[id] = n; }
      base.auto = x.auto === true; base.last = TT.MISSION_IDS.includes(x.last) ? x.last : "";
      if (isObj(x.active)) {
        const def = TT.missionById(x.active.id), nowM = clk();
        if (def && (!def.sect || def.sect === sect) && def.tier <= TT.sectRank({ sectx: base }).tier) {
          const start = int(x.active.start, 0, nowM, nowM);
          base.active = { id: def.id, start, end: int(x.active.end, start, start + def.dur * 1000, start + def.dur * 1000), bonus: x.active.bonus === true };
        }
      }
      sectx = base;
    }

    const known = new Set([...Object.keys(TT.ITEMS), ...Object.keys(TT.MATS), ...TT.USABLE, "Linh Thảo"]);
    const inv = {};
    if (isObj(d.inv)) for (const [k, v] of Object.entries(d.inv)) {
      const [name, q, extra] = k.split("|");
      if (extra !== undefined || !known.has(name)) continue;
      if (q !== undefined && !(/^[1-4]$/.test(q))) continue;
      const n = int(v, 0, 9999, 0);
      if (n > 0) inv[k] = n;
    }
    const gear = {};
    if (isObj(d.gear)) for (const [n, q] of Object.entries(d.gear)) if (Object.prototype.hasOwnProperty.call(TT.GEAR, n)) gear[n] = int(q, 1, 4, 1);
    const nowP = clk();
    const plots = Array.isArray(d.plots) && d.plots.length === 4 && d.plots.every(x => x === null || isObj(x))
      ? d.plots.map(x => x && {                                 // linh điền chạy theo thời gian thật: ts là mốc "tháng linh điền" đã xử lý gần nhất (save cũ chưa có thì lấy hiện tại)
        age: int(x.age, 0, 30, 0), water: flt(x.water, 0, 1, 1), soil: flt(x.soil, 0, 1, 0.6), pest: x.pest === true,
        good: flt(x.good, 0, 60, 0), dry: int(x.dry, 0, 3, 0), wilt: x.wilt === true, ts: int(x.ts, 1, nowP, nowP) })
      : [null, null, null, null];
    const track = {};
    for (const [k, v] of Object.entries(TT.newTrack())) track[k] = int(isObj(d.track) ? d.track[k] : v, 0, 1e7, 0);

    /* ---- bản idle: đạo hiệu, linh căn, tôi luyện, nhập định, bí cảnh, kỳ ngộ (save cũ không có thì lấy mặc định) ---- */
    const now = clk();
    const name = TT.cleanName(d.name);
    const root = TT.cleanRoot(d.root);
    const temper = {}, ess = {};
    for (const el of Object.keys(TT.ELEMENTS)) {
      const t = int(isObj(d.temper) ? d.temper[el] : 0, 0, TT.TEMPER_MAX, 0), e = int(isObj(d.ess) ? d.ess[el] : 0, 0, 9999, 0);
      if (t) temper[el] = t;
      if (e) ess[el] = e;
    }
    const iIn = isObj(d.idle) ? d.idle : {};
    const idle = {
      ts: int(iIn.ts, 1, now, now), on: iIn.on !== false, carry: flt(iIn.carry, 0, 1, 0),
      mt: int(iIn.mt, 0, TT.IDLE.MONTH_TICKS - 1, 0), cd: int(iIn.cd, 0, 12, 3),
    };
    const sIn = isObj(d.secret) ? d.secret : {};
    const secret = { best: {}, cleared: {}, active: null };
    for (const def of TT.SECRETS) {
      const b = int(isObj(sIn.best) ? sIn.best[def.id] : 0, 0, def.floors, 0);
      if (b) secret.best[def.id] = b;
      if (isObj(sIn.cleared) && sIn.cleared[def.id] === true) secret.cleared[def.id] = true;
    }
    if (isObj(sIn.active)) {
      const def = TT.secretById(sIn.active.id);
      if (def && realm >= def.realm) {                         // đang thám hiểm: thời gian không được dài hơn quy định
        const start = int(sIn.active.start, 0, now, now);
        secret.active = { id: def.id, start, end: int(sIn.active.end, start, start + def.dur * 1000, start + def.dur * 1000) };
      }
    }
    const enc = {};
    for (const id of TT.ENC_IDS) { const n = int(isObj(d.enc) ? d.enc[id] : 0, 0, 99999, 0); if (n) enc[id] = n; }

    const shop = { ts: int(isObj(d.shop) ? d.shop.ts : 0, 0, nowP, 0), n: {} };
    if (isObj(d.shop) && isObj(d.shop.n)) for (const [k, v] of Object.entries(d.shop.n)) if (Object.prototype.hasOwnProperty.call(TT.ITEMS, k)) shop.n[k] = int(v, 0, 99, 0);
    /* Vị trí bản đồ và chiến lợi phẩm theo địa điểm (src/game/maps). Giá trị id chỉ được là chữ thường / số / gạch dưới;
       registry sẽ tự đưa về khu vực hợp lệ nếu id không còn tồn tại hoặc chưa đủ cảnh giới. */
    const mapId = v => (typeof v === "string" && /^[a-z0-9_]{1,40}$/.test(v) ? v : null);
    const mapLoot = {};
    if (isObj(d.mapLoot)) for (const [k, v] of Object.entries(d.mapLoot).slice(0, 200)) if (typeof k === "string" && k.length <= 60 && !/[\u0000-\u001f<>]/.test(k)) { const n = int(v, 0, 99999, 0); if (n) mapLoot[k] = n; }
    const out = {
      world: mapId(d.world), region: mapId(d.region), site: mapId(d.site), mapLoot,
      gender: d.gender, race: d.race, age, lifespan, stats, realm, tang, exp, stone, months, skills, sect, sectx,
      pill: flt(d.pill, 0, 0.5, 0), guard: flt(d.guard, 0, 3, 0), fbuff: int(d.fbuff, 0, 500, 0), suppress: !!d.suppress,
      inv, gear, plots, track, hp: 1, shop,
      name, root, temper, ess, idle, secret, enc,
    };
    const p = TT.Player.fromDict(out);                      // dùng công thức thật để giới hạn khí huyết
    p.hp = int(d.hp, 1, p.max_hp(), p.max_hp());
    return p;
  };

  /* ---------- thay hàm đọc / ghi save của player.js ---------- */
  const SAVE = "tu_tien_save_v2";
  TT.readSave = () => {
    const r = sec.read(SAVE, "save");
    if (!r) return { count: 1, player: null };
    if (r.bad) { sec.error = "Save bị chỉnh sửa hoặc hỏng chữ ký nên đã bị từ chối."; return { count: 1, player: null }; }
    const d = r.obj;
    if (!isObj(d)) return { count: 1, player: null };
    const count = int(d.count, 1, 1e6, 1);
    if (d.player == null) return { count, player: null };
    const p = sec.cleanPlayer(d.player);
    if (!p) { sec.error = "Save bị từ chối: " + sec.error; return { count, player: null }; }
    return { count, player: p };
  };
  TT.writeSave = (count, player) => {
    const ok = !sec.stale && sec.write(SAVE, "save", { count, player: player || null });   // tab khác đang giữ save thì không ghi đè
    sec.lastSave = { ok, t: Date.now() };
    return ok;
  };
  sec.SAVE = SAVE;

  /* ---------- chỉ cho phép một tab chơi: tab khác ghi save thì tab này dừng lại ---------- */
  if (typeof window !== "undefined" && window.addEventListener) window.addEventListener("storage", e => {
    if (e.key !== SAVE || sec.stale) return;
    sec.stale = true;
    const g = TT.game;
    if (g) { clearInterval(g.idleTimer); g.locked = true; }
    if (!TT.ui || !TT.ui.modal) return;
    const m = TT.ui.modal("dlg-box stale-box", null, { label: "Game đang mở ở tab khác", dismissible: false });
    m.box.append(
      h("p", { class: "center" }, "Thiên Vân Đại Lục đang được mở ở một tab hoặc cửa sổ khác. Chơi nhiều tab cùng lúc có thể làm mất tiến trình, nên tab này đã tạm dừng."),
      h("div", { class: "row center" }, TT.ui.btn("Chơi ở tab này", () => location.reload(), { cls: "gold" })),
      h("p", { class: "dim small center" }, "Tab kia sẽ tự dừng khi bạn lưu ở đây."));
  });

  /* hiển thị cảnh báo ở màn tạo nhân vật khi save bị từ chối, kèm nút khôi phục bản sao lưu gần nhất (nếu có) */
  if (TT.Game) {
    const G = TT.Game.prototype, showCreate = G.showCreate;
    G.showCreate = function () {
      showCreate.call(this);
      if (sec.error) {
        const box = document.querySelector(".create-right .col.center");
        if (box) {
          const note = h("div", { class: "alert-box", role: "alert" }, h("div", { class: "bold" }, "Không đọc được save"), h("div", { class: "small" }, sec.error));
          const bt = sec.backupTime(SAVE, "save");
          if (bt) note.append(TT.ui.btn("Khôi phục bản lưu lúc " + new Date(bt).toLocaleString("vi-VN"), () => {
            if (sec.restore(SAVE, "save")) location.reload(); else if (TT.ui.toast) TT.ui.toast("Không khôi phục được bản sao lưu.", "bad");
          }, { cls: "gold sm" }));
          box.prepend(note);
        }
        sec.error = "";
      }
    };
  }
})();
