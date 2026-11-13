/* Bộ não của Linh Hồ ("Bổn hệ thống"): thuần luật, không gọi mạng, không AI.
   - Nhận biết tình huống thật của đạo thân (sinh lực, thọ nguyên, đột phá, linh điền, lò chế tạo, tông môn, nhiệm vụ),
     xếp theo độ gấp; càng bỏ mặc càng nhắc gắt, tình huống hết thì quên.
   - Nhớ đã nói gì để không lặp, nhớ chủ đề đang trò chuyện ("còn gì nữa", hỏi lặp bị trêu).
   - Hiểu ý người chơi qua nhiều cách hỏi, gõ không dấu cũng được, và trả lời bằng số liệu thật.
   Module không chạm DOM: nhận "facts" do companion.js dựng từ trạng thái, nên kiểm thử được độc lập. */
(function (root) {
  'use strict';
  const COOL = 60000, RECENT = 6;
  const fold = text => String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
  const pct = x => Math.max(0, Math.min(100, Math.round((Number(x) || 0) * 100)));
  const years = n => Math.max(0, Math.ceil(n));

  /* ---------- Kho lời thoại ---------- */
  const chatLines = [
    'Ngươi nên biết ơn ta đấy, hahaha... Có bổn hệ thống bên cạnh, tiên lộ của ngươi đỡ lạc đường hơn nhiều!',
    'Hừ, đừng tưởng bổn hệ thống rảnh rỗi. Ta chỉ tiện thể ngồi đây xem ngươi tu luyện thôi!',
    'Ngươi biết không? Đuôi của bổn hệ thống mềm nhất tiên giới. Cấm sờ nha!',
    'Hôm nay linh khí không tệ, ta tâm tình tốt, tạm thời không mắng ngươi.',
    'Ngươi mà đột phá thành công thì cũng có công của ta một nửa đấy nhé, hahaha...',
    'Đừng có nhìn ta chằm chằm như thế. Làm việc của ngươi đi!',
    'Nghe nói có kẻ tu mãi không lên cấp. Ồ, nói ngươi à? Đùa thôi, đùa thôi!',
    'Bổn hệ thống vừa đếm mây trên tiên sơn, đếm tới đám thứ chín thì quên mất. Đừng nói với ai nhé.',
    'Ngươi cứ thong thả. Nhưng thong thả quá thì ta buồn ngủ đấy!',
    'Hôm nay ngươi trông… tạm được. Đừng để ta phải rút lại lời khen này!',
    'Ai cho phép ngươi tu luyện mà không chào bổn hệ thống một tiếng? Thôi, lần này tha cho.',
    'Có bạn đồng hành xinh đẹp như ta, ngươi đúng là có phúc tám đời!'
  ];
  /* Lời phiếm có điều kiện: chỉ nói khi đúng tình huống nên nghe như "biết chuyện". */
  const contextChat = [
    { when: f => f.maxHp > 0 && f.hpPct >= 0.95, text: 'Sinh lực đầy ắp thế kia, sao không đi lịch luyện? Giữ làm cảnh à?' },
    { when: f => !f.completed && f.need > 0 && f.qiPct >= 0.5 && f.qiPct < 1, text: 'Tu vi qua nửa rồi ({qi}%). Cố thêm chút nữa, bổn hệ thống đã ngửi thấy mùi đột phá!' },
    { when: f => !f.completed && f.need > 0 && f.qiPct < 0.15, text: 'Tu vi mới {qi}% thôi. Kiên nhẫn đi, nhà nào cũng bắt đầu từ chỗ này.' },
    { when: f => f.realm === 0, text: 'Mới ở {realmName} thôi, đừng vội. Nhưng cũng đừng chậm như rùa nhé!' },
    { when: f => f.realm >= 2, text: 'Đã tới {realmName} rồi à? Cũng có chút bản lĩnh. Chút xíu thôi nhé, hahaha...' },
    { when: f => f.sectJoined, text: 'Có tông môn chống lưng mà vẫn lười thì đúng là hết thuốc chữa!' },
    { when: f => f.lifeLeft !== Infinity && f.lifeLeft > 0 && f.maxLife > 0 && f.lifeLeft / f.maxLife < 0.5, text: 'Thọ nguyên đã qua nửa đời. Thời gian không chờ ai, kể cả ngươi!' }
  ];
  const urgeLines = [
    'Ngươi chưa nhận nhiệm vụ nào à? Mở “Nhiệm vụ” cho bổn hệ thống xem nào, đồ lười!',
    'Rảnh thế mà không nhận nhiệm vụ? Bổn hệ thống đã chuẩn bị sẵn thử thách rồi đấy!',
    'Không nhiệm vụ thì không tiến bộ. Đạo lý đơn giản vậy mà cũng phải để ta nhắc sao?'
  ];
  const nagLines = [
    'Nhiệm vụ “{name}” vẫn còn dang dở đấy. Còn thiếu {left} {unit}, làm đi chứ ngươi!',
    'Bổn hệ thống đã nhắc ngươi bao nhiêu lần rồi, “{name}” làm xong chưa? Còn thiếu {left} {unit} đấy!',
    'Lần thứ {times} rồi nhé! “{name}” vẫn chưa xong. Ngươi định để bổn hệ thống nói đến khô miệng sao?',
    'Ngươi… ngươi cố tình chọc giận bổn hệ thống phải không? “{name}” còn thiếu {left} {unit}!'
  ];
  const hintLines = [
    'Gợi ý: Linh điền cần ngươi ghé thăm đều đặn. Dược thảo không tự bay vào túi đâu!',
    'Gợi ý: Nghề phụ cũng là một con đường. Đừng chỉ biết đánh yêu thú!',
    'Gợi ý: Có Truyền âm thì dùng đi, ngươi định tu tiên một mình mãi sao?',
    'Gợi ý: Tông môn có nhiều thứ hay ho. Ghé xem, đừng ở lì một chỗ!',
    'Gợi ý: Sinh lực thấp thì nghỉ ngơi, đừng liều mạng. Ta không muốn đổi ký chủ đâu!',
    'Gợi ý: Tu vi đầy thì nhớ xem điều kiện đột phá, đừng để bổn hệ thống nhắc hoài.'
  ];
  const jokes = [
    'Có kẻ tu tiên ba trăm năm, ngày nào cũng hỏi “bao giờ đột phá”. Sau này hắn đột phá thật, nhưng là… đột phá vào bếp. Hahaha!',
    'Hai đạo sĩ cãi nhau xem ai tu nhanh hơn. Rùa đi ngang qua nói: “Hai ngươi nói nhỏ thôi, ta đang bế quan”.',
    'Vì sao linh thạch luôn thiếu? Vì ngươi chỉ nghĩ cách tiêu, còn bổn hệ thống mới là người nghĩ cách kiếm. À không, ta cũng không có tiền.',
    'Ta từng thấy một vị tiên nhân độ kiếp, sét đánh trúng hắn. Hắn khóc: “Mới giặt xong mà!”. Thế là đạo tâm vỡ luôn.'
  ];
  const sadLines = [
    'Hừ, mới thế đã than. Nghỉ chút cũng được, nhưng đừng để bổn hệ thống thấy ngươi bỏ bê tu luyện! ...Thật ra, ta ở đây mà.',
    'Tiên lộ dài lắm, mệt thì ngồi nghỉ. Nhớ uống ngụm trà, rồi quay lại với ta!'
  ];

  /* ---------- Quét tình huống ---------- */
  /* Mỗi tình huống: id ổn định, kind (warn/hint/nag), p = độ gấp, lines[] = từ nhẹ đến gắt, brief = tóm tắt một vế câu. */
  function scan(f) {
    const out = [], v = { hp: pct(f.hpPct), qi: pct(f.qiPct), realmName: f.realmName, stage: f.stage };
    if (f.maxHp > 0 && f.hpPct < 0.3) out.push({ id: 'hp', kind: 'warn', p: 100, vars: v, brief: 'hồi sinh lực (chỉ còn ' + v.hp + '%)', lines: [
      'Cảnh báo: Sinh lực của ngươi sắp cạn rồi, còn định lao đầu vào đánh à? Nghỉ ngơi đi, đừng để bổn hệ thống phải lo!',
      'Cảnh báo lần hai! Sinh lực mới còn {hp}%! Ngươi muốn chết thật sao, hả?',
      'Ngươi điếc à?! {hp}% sinh lực mà còn xông pha! Bổn hệ thống không muốn chọn ký chủ mới đâu!'] });
    if (!f.completed && f.lifeLeft !== Infinity && f.maxLife > 0 && f.lifeLeft <= Math.max(3, f.maxLife * 0.1))
      out.push({ id: 'life', kind: 'warn', p: 90, vars: { n: years(f.lifeLeft) }, brief: 'cứu thọ nguyên (còn khoảng ' + years(f.lifeLeft) + ' năm)', lines: [
        'Cảnh báo: Thọ nguyên chỉ còn khoảng {n} năm! Đột phá hoặc tìm Thọ Nguyên Đan đi, kẻo hóa thành nắm đất!',
        'Thọ nguyên còn {n} năm thôi đấy! Ngươi định đợi tới lúc ta khóc à?'] });
    if (!f.completed && f.need > 0 && f.qi >= f.need) out.push({ id: 'break', kind: 'hint', p: 80, vars: v, brief: 'đột phá (tu vi đã đầy)', lines: [
      'Đinh! Tu vi đã đầy mà ngươi còn đứng đó? Mau xem điều kiện đột phá đi!',
      'Tu vi đầy lâu rồi đấy! Bổn hệ thống đã bảo đột phá, sao còn lề mề?',
      'Ngươi để linh khí đầy tràn như vậy là phí của trời! Đột phá ngay!'] });
    if (f.gardenReady > 0) out.push({ id: 'garden', kind: 'hint', p: 60, vars: { n: f.gardenReady }, brief: 'thu hoạch ' + f.gardenReady + ' cây ở Linh điền', lines: [
      'Nhắc nhở: Linh dược chín rồi mà ngươi chưa thu hoạch? Ghé Linh điền ngay, kẻo phí công bổn hệ thống nhắc!',
      'Linh dược chín quá sẽ héo đấy! Ghé Linh điền ngay, ta nhắc lần nữa rồi nhé!'] });
    if (f.craftReady > 0) out.push({ id: 'craft', kind: 'hint', p: 55, vars: { n: f.craftReady }, brief: 'nhận ' + f.craftReady + ' món ở lò chế tạo', lines: [
      'Nhắc nhở: Lò chế tạo xong từ lâu rồi! Ngươi định để nó nguội đến bao giờ?',
      'Lò chế tạo vẫn đang chờ ngươi nhận đồ đấy! Đồ nguội thì ta cũng hết cách!'] });
    if (f.mission) out.push({ id: 'mission', kind: 'nag', p: 50, vars: { name: f.mission.name, left: f.mission.left, unit: f.mission.unit },
      brief: 'làm nốt nhiệm vụ “' + f.mission.name + '” (còn thiếu ' + f.mission.left + ' ' + f.mission.unit + ')', lines: nagLines });
    else if (!f.hasMission || f.missionDone) out.push({ id: 'nomission', kind: 'nag', p: 20, vars: {}, brief: 'nhận một nhiệm vụ cho có việc làm', lines: urgeLines });
    if (!f.sectJoined && f.realm >= 1) out.push({ id: 'sect', kind: 'hint', p: 30, vars: v, brief: 'tìm một tông môn để nương tựa', lines: [
      'Gợi ý: Đã tới {realmName} mà còn chưa vào tông môn? Lẻ loi một mình thì tu tiên kiểu gì!'] });
    return out.sort((a, b) => b.p - a.p);
  }

  function create(options = {}) {
    const random = options.random || (() => Math.random());
    let mem = Object.create(null), recent = [], seen = { key: null, half: '' };
    let talk = { last: '', repeats: 0, at: 0, idx: 0 };

    const pick = list => {
      const pool = list.filter(x => !recent.includes(x)), choices = pool.length ? pool : list;
      const chosen = choices[Math.floor(random() * choices.length)];
      recent.push(chosen); if (recent.length > RECENT) recent.shift();
      return chosen;
    };
    /* Quên mọi tình huống đã hết: lần sau xuất hiện lại sẽ nhắc nhẹ từ đầu. */
    const sync = list => { const ids = new Set(list.map(x => x.id)); for (const id of Object.keys(mem)) if (!ids.has(id)) delete mem[id]; };
    const say = (sit, count) => fill(sit.lines[Math.min(count, sit.lines.length - 1)], { ...sit.vars, times: count + 1 });
    const speak = sit => {
      const m = mem[sit.id] || (mem[sit.id] = { count: 0, at: -Infinity });
      const text = say(sit, m.count);
      m.count++; m.at = Date.now();
      return { id: sit.id, kind: sit.kind, text };
    };

    /* Việc gấp (cảnh báo/nhắc việc): có hồi chiêu theo từng việc, mỗi lần nhắc lại gắt hơn. */
    function urgent(f) {
      const list = scan(f); sync(list);
      const top = list.find(x => x.p >= 55 && Date.now() - (mem[x.id]?.at ?? -Infinity) >= COOL);
      return top ? speak(top) : null;
    }
    /* Lời tự lên tiếng: giục nhiệm vụ, phiếm theo bối cảnh, gợi ý mềm. */
    function chatter(f) {
      const list = scan(f); sync(list);
      const mission = list.find(x => x.id === 'mission'), roll = random();
      if (mission ? roll < 0.5 : roll < 0.35) return mission ? speak(mission) : { id: 'nomission', kind: 'nag', text: pick(urgeLines) };
      if (roll < 0.85) {
        const ctx = contextChat.filter(x => x.when(f)).map(x => x.text);
        const vars = { qi: pct(f.qiPct), realmName: f.realmName };
        return { id: 'chat', kind: 'chat', text: fill(ctx.length && random() < 0.4 ? pick(ctx) : pick(chatLines), vars) };
      }
      const soft = list.find(x => x.id === 'sect');
      return { id: 'hint', kind: 'hint', text: soft && random() < 0.5 ? say(soft, 0) : pick(hintLines) };
    }
    /* Sự kiện một lần: đột phá thành công, nhiệm vụ đi được nửa đường. */
    function observe(f) {
      const key = f.realm * 1000 + f.stage, prev = seen.key; seen.key = key;
      if (prev !== null && key > prev) {
        const realmUp = Math.floor(key / 1000) > Math.floor(prev / 1000);
        return { kind: 'praise', always: true, text: realmUp
          ? 'Đinh! Chúc mừng, ngươi đã bước vào ' + f.realmName + '! Hừ, nhớ ơn bổn hệ thống đã thúc giục suốt nhé, hahaha...'
          : 'Đột phá thành công! ' + f.realmName + ' tầng ' + f.stage + ' rồi đấy. Đừng tự mãn, đường còn dài!' };
      }
      const m = f.mission;
      if (m && m.count >= 4 && m.progress * 2 >= m.count && m.progress < m.count && seen.half !== m.name) {
        seen.half = m.name;
        return { kind: 'praise', always: false, text: 'Được một nửa nhiệm vụ “' + m.name + '” rồi đấy. Đừng dừng lại, bổn hệ thống đang nhìn!' };
      }
      return null;
    }
    function welcome(f, awayMs) {
      if (!(awayMs >= 5 * 60000)) return null;
      const minutes = Math.round(awayMs / 60000);
      const away = minutes >= 90 ? Math.round(minutes / 60) + ' giờ' : minutes + ' phút';
      const top = scan(f).find(x => x.p >= 30);
      return { kind: 'hint', text: 'Ngươi còn biết đường quay lại à? Vắng ròng rã ' + away + ', bổn hệ thống đếm từng giây đấy!' + (top ? ' Việc cần làm: ' + top.brief + '.' : '') };
    }

    const suggestions = f => scan(f).map(x => x.brief);
    function status(f) {
      let text = 'Báo cáo: ' + (f.name ? f.name + ', ' : '') + f.realmName + ' tầng ' + f.stage + '. Tu vi ' + pct(f.qiPct) + '%, sinh lực ' + pct(f.hpPct) + '%.';
      if (!f.completed && f.lifeLeft !== Infinity) text += ' Thọ nguyên còn khoảng ' + years(f.lifeLeft) + ' năm.';
      const todo = suggestions(f).slice(0, 2);
      return text + (todo.length ? ' Việc cần làm: ' + todo.join('; ') + '.' : ' Chưa có việc gấp, cứ tiếp tục tu luyện!');
    }
    function suggest(f, step) {
      const list = suggestions(f);
      if (!list.length) return 'Hiện chẳng có việc gấp nào. Ngươi cứ tiếp tục tu luyện, đừng để bổn hệ thống buồn ngủ!';
      const start = step ? talk.idx : 0, part = list.slice(start, start + 2);
      if (!part.length) { talk.idx = 0; return 'Hết việc để nhắc rồi! Giờ thì đi làm đi, đừng hỏi nữa!'; }
      talk.idx = start + part.length;
      return (start ? 'Còn nữa: ' : 'Việc đáng làm nhất lúc này: ') + part.join('. Kế đó: ') + '.';
    }

    /* ---------- Hiểu ý người chơi (đã bỏ dấu) ---------- */
    const INTENTS = [
      ['more', /^\s*(nua|tiep|tiep di|nua di|con gi nua|con gi khac|con nua khong|roi sao)\b/],
      ['cancel', /\b(huy|bo|thoi)\b.*\bnhiem vu\b/],
      ['mission_progress', /\bnhiem vu\b.*\b(toi dau|tien do|con thieu|xong chua|the nao)\b|\b(toi dau|tien do)\b.*\bnhiem vu\b/],
      ['mission', /\b(nhiem vu|thu thach|quest)\b/],
      ['insult', /\b(ngu|ngoc|vo dung|cut|im di|im mom|ghet|ngu ngoc)\b/],
      ['bye', /\b(tam biet|bye|di ngu|ngu day|off|thoat|hen gap lai)\b/],
      ['thanks', /\b(cam on|thanks|thank|tks)\b/],
      ['who', /\b(la ai|ten gi|la gi vay)\b/],
      ['help', /\b(giup|lam duoc gi|biet lam gi|huong dan|help|co gi hay|chuc nang)\b/],
      ['status', /\b(tinh hinh|trang thai|ra sao|the nao roi|bao cao|chi so|status)\b/],
      ['breakthrough', /\b(dot pha|len cap|len canh|tang tiep|bao gio len|bao lau nua)\b/],
      ['life', /\b(tho nguyen|bao nhieu tuoi|con song|sap chet|tuoi tho)\b/],
      ['hp', /\b(mau|sinh luc|hp|hoi phuc|bi thuong|yeu qua|dan duoc)\b/],
      ['garden', /\b(linh dien|trong cay|thao duoc|thu hoach|duoc lieu|hai thuoc|linh thao)\b/],
      ['craft', /\b(che tao|lo luyen|luyen khi|luyen dan|craft)\b/],
      ['sect', /\b(tong mon|mon phai|bang phai|gia nhap)\b/],
      ['suggest', /\b(goi y|nhac|canh bao|lam gi|nen lam|tiep theo|khuyen|viec gi|viec can|lam sao)\b/],
      ['sad', /\b(chan|met|buon|nan|stress|kho qua|muon bo|chan qua)\b/],
      ['joke', /\b(ke chuyen|chuyen cuoi|joke|dua|cuoi di|hai huoc)\b/],
      ['greet', /^\s*(xin chao|chao|hello|hi|alo|hey|chao ban)\b/],
      ['praise', /\b(gioi|xinh|de thuong|dang yeu|thong minh|tuyet|hay qua)\b/]
    ];
    const understand = text => { const t = fold(text); const hit = INTENTS.find(([, re]) => re.test(t)); return hit ? hit[0] : 'unknown'; };

    function answer(intent, f, prev) {
      switch (intent) {
        case 'mission': return { action: 'mission' };
        case 'cancel': return { action: 'cancel' };
        case 'mission_progress': return { text: f.mission
          ? 'Nhiệm vụ “' + f.mission.name + '”: ' + f.mission.progress + '/' + f.mission.count + ', còn thiếu ' + f.mission.left + ' ' + f.mission.unit + '. Làm tiếp đi!'
          : f.missionDone ? 'Nhiệm vụ vừa rồi ngươi làm xong rồi, hừ, cũng không tệ. Muốn nhận cái mới thì nói “nhiệm vụ”!' : 'Ngươi có nhiệm vụ nào đâu mà hỏi? Nói “nhiệm vụ” để ta giao việc!' };
        case 'status': return { text: status(f) };
        case 'suggest': return { text: suggest(f, false) };
        case 'more': return { text: prev === 'suggest' || prev === 'more' ? suggest(f, true) : 'Còn gì nữa à? Hỏi “gợi ý” hoặc “tình hình” đi, đừng ậm ờ!' };
        case 'greet': { const top = suggestions(f)[0]; return { text: 'Hừ, bổn hệ thống có mặt. ' + (top ? 'Việc gấp nhất lúc này: ' + top + '.' : 'Hôm nay ngươi lại muốn làm gì đây?') }; }
        case 'thanks': return { text: pick(['Biết ơn là tốt. Ngươi nên biết ơn ta đấy, hahaha...', 'Khách khí gì chứ! ...Mà thôi, cứ cảm ơn thêm vài lần nữa cũng được.']) };
        case 'praise': return { text: pick(['Hừ... biết nhìn người đấy. Bổn hệ thống thông minh hơn ngươi tưởng nhiều!', 'Ngươi nói đúng, nhưng nói thêm vài lần nữa ta cũng không phiền đâu, hahaha...']) };
        case 'who': return { text: 'Bổn hệ thống chính là Linh Hồ, người dẫn đường kiêm giám sát của ngươi. Nhớ cho kỹ!' };
        case 'help': return { text: 'Ta biết xem tình hình của ngươi, nhắc việc, cảnh báo nguy hiểm, giao nhiệm vụ, kể chuyện cười. Cứ hỏi “tình hình”, “gợi ý”, “nhiệm vụ”, “đột phá bao giờ”, hay “sinh lực” xem!' };
        case 'insult': return { text: pick(['Ngươi dám mắng bổn hệ thống? Hừ! Lần này ta rộng lượng bỏ qua, lần sau trừ hết linh thạch của ngươi!', 'Nói nhiều. Có giỏi thì tự tu luyện đi, đừng để ta cứu!']) };
        case 'bye': return { text: 'Đi thì đi, nhớ quay lại sớm. Ta không có nhớ ngươi đâu nhé!' };
        case 'sad': return { text: pick(sadLines) };
        case 'joke': return { text: pick(jokes) };
        case 'breakthrough':
          if (f.completed) return { text: 'Ngươi đã viên mãn rồi, còn đột phá gì nữa? Tham lam vừa thôi!' };
          if (f.need > 0 && f.qi >= f.need) return { text: 'Tu vi đã đầy! Còn chờ gì nữa, mở điều kiện đột phá đi!' };
          return { text: 'Tu vi mới ' + pct(f.qiPct) + '%, còn khoảng ' + (100 - pct(f.qiPct)) + '% nữa mới đột phá. Kiên nhẫn đi!' };
        case 'hp':
          return { text: f.hpPct < 0.3 ? 'Sinh lực mới ' + pct(f.hpPct) + '%, nguy hiểm! Mau nghỉ ngơi hoặc dùng đan dược hồi phục, đừng liều!'
            : f.hpPct < 0.7 ? 'Sinh lực ' + pct(f.hpPct) + '%, tạm ổn nhưng đừng chủ quan.' : 'Sinh lực ' + pct(f.hpPct) + '%, khỏe như trâu. Cứ yên tâm lịch luyện!' };
        case 'life':
          return { text: f.completed || f.lifeLeft === Infinity ? 'Ngươi đã vượt khỏi vòng sinh tử, còn lo thọ nguyên làm gì?'
            : 'Thọ nguyên còn khoảng ' + years(f.lifeLeft) + ' năm (đã ' + Math.floor(f.age) + '/' + Math.floor(f.maxLife) + '). ' + (f.lifeLeft <= Math.max(3, f.maxLife * 0.1) ? 'Sắp cạn rồi, lo mà đột phá!' : 'Còn kịp, nhưng đừng ngồi không.') };
        case 'garden': return { text: f.gardenReady > 0 ? 'Có ' + f.gardenReady + ' cây linh dược đã chín! Ra Linh điền thu hoạch ngay!' : 'Linh điền chưa có gì chín. Cứ trồng rồi chờ, đừng sốt ruột.' };
        case 'craft': return { text: f.craftReady > 0 ? 'Lò chế tạo xong ' + f.craftReady + ' món rồi! Mau ra nhận!' : 'Lò chế tạo chưa xong món nào. Kiên nhẫn một chút!' };
        case 'sect': return { text: f.sectJoined ? 'Ngươi đã có tông môn rồi. Chăm làm nhiệm vụ tông môn, đừng ăn không!' : 'Ngươi chưa có tông môn. Có chỗ dựa thì tu luyện đỡ cô đơn, mở mục Tông môn xem đi!' };
        default: { const top = suggestions(f)[0]; return { text: pick([
          'Câu đó bổn hệ thống nghe không hiểu. ' + (top ? 'Nhưng ta biết ngươi nên ' + top + '.' : 'Hỏi “gợi ý” hoặc “tình hình” thử xem.'),
          'Ngươi nói gì mà lằng nhằng thế? Hỏi rõ vào: “tình hình”, “gợi ý”, “nhiệm vụ”...']) }; }
      }
    }
    /* Trả lời tin nhắn: nhớ chủ đề trước đó, hỏi lặp quá nhiều bị trêu. */
    function reply(text, f) {
      const now = Date.now(); let intent = understand(text);
      const sameTopic = intent === talk.last && now - talk.at < 30000;
      talk.repeats = sameTopic ? talk.repeats + 1 : 0;
      const prev = talk.last; talk.last = intent; talk.at = now;
      if (intent !== 'more' && intent !== 'suggest') talk.idx = 0;
      if (talk.repeats >= 2 && !['mission', 'cancel', 'more', 'suggest', 'unknown'].includes(intent))
        return { text: 'Ngươi vừa hỏi xong mà! Bổn hệ thống không phải con vẹt. Nhưng được rồi: ' + (answer(intent, f, prev).text || '') };
      return answer(intent, f, prev);
    }
    function reset() { mem = Object.create(null); recent = []; seen = { key: null, half: '' }; talk = { last: '', repeats: 0, at: 0, idx: 0 }; }
    function resetMission() { delete mem.mission; delete mem.nomission; seen.half = ''; }
    return { urgent, chatter, observe, welcome, reply, understand, status, suggestions, scan, reset, resetMission };
  }

  root.HU_COMPANION_BRAIN = { create, fold, scan, nagLines };
})(typeof window !== 'undefined' ? window : globalThis);
