'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../engine/game.js'), C = require('../engine/protocol/commands.js');
const NOW = 1_800_000_000_000;
const PROFILE = { name:'Lý Vô Thường', gender:'nam', age:18, race:'nhan', roots:[72,61,45,44,33], rootType:'Song', talent:{tuongMao:2,phucDuyen:2,canCot:2,ngoTinh:1,vanKhi:1}, destiny:'exp' };
const make = (rng = () => 0) => new H.Game(H.createCharacter(PROFILE, NOW, rng), rng);
const run = (g,type,payload={},now=NOW) => C.execute(g,{type,payload},now);

test('mượn sách kiểm tra tông môn, cảnh giới, điểm và chỉ trừ một lượt', () => {
  let g=make();
  assert.equal(H.SECT_BOOKS.length,12);
  assert.equal(new Set(H.SECT_BOOKS.map(b=>b.id)).size,12);
  g.s.adventurePoints=100;
  assert.throws(()=>run(g,'buySect',{id:'dan_ha'}),/tông môn/);
  run(g,'joinSect',{id:H.SECTS[0].id});
  assert.throws(()=>run(g,'buySect',{id:'dan_linh'}),/Cảnh giới/);
  assert.throws(()=>run(g,'buySect',{id:'does_not_exist'}),/chưa mở/);
  const result=run(g,'buySect',{id:'dan_ha'});
  assert.equal(result.points,60);
  assert.equal(g.s.borrowedBook,'dan_ha');
  assert.throws(()=>run(g,'buySect',{id:'dan_ha'}),/đang mượn/);
  assert.equal(g.s.adventurePoints,60);
  g=new H.Game(H.normalize(g.s,NOW),()=>0);
  assert.equal(g.s.borrowedBook,'dan_ha');
  run(g,'buySect',{id:'khi_ha'});
  assert.equal(g.s.adventurePoints,20);
  assert.throws(()=>run(g,'buySect',{id:'dan_ha'}),/Không đủ điểm/);
  assert.equal(g.s.borrowedBook,'khi_ha');
});

test('chuyến lịch luyện cho điểm đúng một lần, không thưởng khi tạm dừng offline', () => {
  const g=make(()=>.8);
  run(g,'startExploration');
  g.advance(NOW+300000,true);
  assert.equal(g.s.adventurePoints,0);
  const end=g.s.exploration.active.end;
  g.advance(end,false);
  assert.equal(g.s.adventurePoints,H.EXPLORE_POINTS);
  g.advance(end+1000,false);
  assert.equal(g.s.adventurePoints,H.EXPLORE_POINTS);
});

test('ủy thác thành công thưởng điểm, thất bại không thưởng; dữ liệu cũ được giữ an toàn', () => {
  const g=make();
  delete g.s.adventurePoints; delete g.s.borrowedBook;
  run(g,'joinSect',{id:H.SECTS[0].id});
  run(g,'startSectMission',{id:'patrol'});
  const result=run(g,'claimSectMission',{},NOW+90000);
  assert.equal(g.s.adventurePoints,result.contribution);
  assert.equal(g.s.sect.contribution,result.contribution);
  const fail=make(()=>.999999);
  run(fail,'joinSect',{id:H.SECTS[0].id});
  run(fail,'startSectMission',{id:'tap1'});
  const out=run(fail,'claimSectMission',{},NOW+90000);
  assert.equal(out.success,false);
  assert.equal(fail.s.adventurePoints,0);
  const migrated=H.normalize({...fail.s,adventurePoints:-2,borrowedBook:'unknown'},NOW+90000);
  assert.equal(migrated.adventurePoints,0);
  assert.equal(migrated.borrowedBook,'');
});

test('tất cả sách đều có nội dung tương ứng công thức game hiện có', () => {
  const g=make();
  for(const b of H.SECT_BOOKS){
    const items=H.ITEMS.filter(x=>x.kind===b.kind&&x.tier>=b.minRealm&&x.tier<=b.maxRealm);
    assert.ok(items.length,b.id);
    for(const x of items){
      if(x.kind==='PILL') assert.ok(g.recipe(x.code).herbs);
      if(x.kind==='EQ'||x.kind==='TAL') assert.ok(g.forgeRecipe(x.code));
      if(x.kind==='SEED') assert.ok(H.item(x.code.slice(5)));
    }
  }
});

test('chỉ chế tạo bằng sách đang mượn; phải hoàn tất mẻ trước khi đổi sách', () => {
  const g=make(); const code=H.pill(2), before=g.s.stone, herbs={...g.s.bag};
  assert.throws(()=>run(g,'craft',{code}),/mượn sách nghề/);
  assert.equal(g.s.stone,before); assert.deepEqual(g.s.bag,herbs);
  run(g,'joinSect',{id:H.SECTS[0].id}); g.s.adventurePoints=80;
  run(g,'buySect',{id:'dan_ha'});
  run(g,'craft',{code});
  assert.equal(g.s.craftQueue.length,1);
  const end=g.s.craftQueue[0].end;
  assert.throws(()=>run(g,'buySect',{id:'khi_ha'}),/Đang luyện đan/);
  assert.equal(g.s.borrowedBook,'dan_ha');
  assert.equal(g.finishJobs(end),1);
  assert.equal(g.s.craftQueue.length,0);
  run(g,'buySect',{id:'khi_ha'},end);
  assert.throws(()=>run(g,'craft',{code},end),/mượn sách nghề/);
});

test('thư viện hiển thị các giá sách và công thức khi đã mượn', () => {
  const vm=require('node:vm'), fs=require('node:fs'), path=require('node:path');
  const g=make(); run(g,'joinSect',{id:H.SECTS[0].id}); g.s.adventurePoints=100;
  const esc=x=>String(x ?? '').replace(/[&<>]/g, '');
  const kit={esc,num:String,moneyHTML:String,pct:String,duration:String,
    row:(a,b)=>String(a)+String(b), btn:(label,action,attrs='')=>`<button data-act="${action}" ${attrs}>${label}</button>`,
    card:(title,body)=>`<section><h2>${title}</h2>${body}</section>`,empty:String,live:String,bar:()=>''};
  const ui={kit,data:{ELEMENTS:[]},s:()=>g.s,g:()=>g,view:{sectPanel:'library'},screens:{combat:{panel:()=>'<p>CHUYẾN LỊCH LUYỆN</p>'}},action(){}};
  const context={HU_GAME:H,HU_UI:ui,document:{addEventListener(){}}}; context.window=context;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../client/ui/screens/adventures.js'),'utf8'),context);
  assert.match(ui.adventure.sect('library'),/Tàng Kinh Các/);
  assert.match(ui.adventure.sect('exploration'),/CHUYẾN LỊCH LUYỆN/);
  run(g,'buySect',{id:'dan_ha'});
  const html=ui.adventure.sect('library');
  assert.match(html,/Đang đọc · Đan Đạo Chân Giải/);
  assert.match(html,/Kim Nguyên Đan/);
  assert.match(html,/Nguyên liệu:/);
  assert.match(html,/Điểm lịch luyện: <b>60<\/b>/);
});
