'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../engine/game.js'), C = require('../engine/protocol/commands.js');
const NOW = 1800000000000;
const profile = { name:'Lý Vô Thường', gender:'nam', age:18, race:'nhan', roots:[72,61,45,44,33], rootType:'Song', talent:{tuongMao:2,phucDuyen:2,canCot:2,ngoTinh:1,vanKhi:1}, destiny:'exp' };
const make = () => new H.Game(H.createCharacter(profile, NOW, () => 0), () => 0);

test('bia phân danh phận theo linh căn, lưu khi gia nhập và không tự thăng khi đổi linh căn', () => {
  for (const [root, expected] of Object.entries({'Ngụy':'tap_dich','Tứ hành':'tap_dich','Tam hành':'ngoai_mon','Song':'noi_mon','Thiên':'than_truyen','Dị':'than_truyen','Hỗn Độn':'than_truyen'})) {
    const g = make(); g.s.rootType = root;
    assert.equal(H.sectDiscipleForRoot(root).id, expected, root);
    const result = C.execute(g, {type:'joinSect',payload:{id:H.SECTS[0].id}}, NOW);
    assert.equal(result.disciple.id, expected, root);
    assert.equal(g.s.sect.discipleClass, expected, root);
    g.s.rootType = 'Hỗn Độn';
    assert.equal(g.sectDisciple().id, expected, root);
    assert.equal(H.normalize(g.s, NOW).sect.discipleClass, expected, root);
  }
  assert.equal(H.sectDiscipleForRoot('không hợp lệ'), null);
});

test('nhân vật cũ được xác định danh phận mà vẫn giữ cống hiến', () => {
  const g=make(); C.execute(g,{type:'joinSect',payload:{id:H.SECTS[0].id}},NOW);
  delete g.s.sect.discipleClass; g.s.rootType='Tam hành'; g.s.sect.contribution=123; g.s.sect.earned=456;
  assert.equal(g.sectDisciple().id,'ngoai_mon');
  const s=H.normalize(g.s,NOW);
  assert.equal(s.sect.discipleClass,'ngoai_mon');
  assert.equal(s.sect.contribution,123); assert.equal(s.sect.earned,456);
});

test('giao diện yêu cầu đo trước khi chọn tông môn', () => {
  const vm=require('node:vm'), fs=require('node:fs'), path=require('node:path');
  const g=make(), actions={};
  const kit={esc:String,num:String,moneyHTML:String,pct:String,duration:String,row:(a,b)=>String(a)+String(b),
    btn:(label,action,attrs='',disabled=false)=>`<button data-act="${action}" ${attrs} ${disabled?'disabled':''}>${label}</button>`,
    card:(title,body)=>`<section><h2>${title}</h2>${body}</section>`,empty:String,live:String,bar:()=>''};
  const ui={kit,session:{playerId:'player-1'},data:{ELEMENTS:[]},s:()=>g.s,g:()=>g,view:{},screens:{combat:{panel:()=>''}},action:(name,fn)=>actions[name]=fn,toast(){}};
  const context={HU_GAME:H,HU_UI:ui,document:{addEventListener(){}}}; context.window=context;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../client/ui/screens/adventures.js'),'utf8'),context);
  let html=ui.adventure.sect('missions');
  assert.match(html,/Chạm bia đo linh căn/);
  assert.equal((html.match(/data-act="joinSect"[^>]*disabled/g)||[]).length, H.SECTS.length);
  actions.sectMeasure(); html=ui.adventure.sect('missions');
  assert.match(html,/Đệ tử nội môn/);
  assert.equal((html.match(/data-act="joinSect"[^>]*disabled/g)||[]).length,0);
  ui.session.playerId='player-2'; assert.equal(ui.sectMeasured(),false);
});
