'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const H = require('../engine/game.js');
const NOW = 1800000000000;
const profile = { name:'Lý Vô Thường', gender:'nam', age:18, race:'nhan', roots:[72,61,45,44,33], rootType:'Song', talent:{tuongMao:2,phucDuyen:2,canCot:2,ngoTinh:1,vanKhi:1}, destiny:'exp' };
function setup() {
  const game = new H.Game(H.createCharacter(profile,NOW,()=>0),()=>0), listeners={};
  const str=x=>String(x ?? ''), kit={abs:str,$:()=>null,esc:str,num:str,money:str,moneyHTML:str,pct:str,duration:str,row:(a,b)=>`<p>${a}: ${b}</p>`,btn:(a,b,c='')=>`<button data-act="${b}" ${c}>${a}</button>`,img:()=>'<img>',codeAttr:code=>`data-code="${code}"`,bar:()=>'',card:(t,b)=>`<section>${t}${b}</section>`,empty:str,tabs:()=>''};
  let screen;const actions={},modals=[]; const ui={kit,data:{ELEMENTS:[]},lists:{},statNames:{},statDescriptions:{},view:{},tabState:{},session:{pavilion:{}},s:()=>game.s,g:()=>game,register:x=>screen=x,action(n,f){actions[n]=f},modalActions:new Set(),KEEP:Symbol('keep'),modal:(...a)=>modals.push(a),refresh(){},toast(){},command:async(type,{code})=>game.equip({code},NOW)};
  const doc={addEventListener:(type,fn)=>listeners[type]=fn,querySelectorAll:()=>[],elementFromPoint:()=>null};
  const env={HU_GAME:H,HU_UI:ui,HU_ASSETS:{heroPortrait:()=>'/portrait',heroSrc:()=>'/meditation'},document:doc};env.window=env;
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../client/ui/screens/character.js'),'utf8'),env);
  return {game,ui,screen,listeners,actions,modals};
}
test('nhân vật có năm tab (công pháp, thiên phú), hành trang có bốn ô và vật phẩm mở cửa sổ nổi',()=>{
  const {game,ui,screen}=setup();
  assert.deepEqual(Array.from(screen.tabs,t=>t.id),['stats','skills','talents','roots','bag']);
  assert.equal(screen.tabs[3].label,'Kinh mạch');assert.equal(screen.tabs[1].label,'Công pháp');assert.equal(screen.tabs[2].label,'Thiên phú');
  const first=Object.keys(game.s.bag).find(k=>H.item(k));assert.ok(first);
  let html=screen.render('bag');assert.equal((html.match(/data-gear-drop=/g)||[]).length,4);assert.match(html,/\/meditation/);assert.match(html,/TÚI TRỮ VẬT/);assert.doesNotMatch(html,/inventory-detail/);assert.match(html,/data-act="gearOpen"/);assert.match(html,/data-act="manualOpen"/);
  assert.match(html,/data-popup="1"/);assert.match(html,/draggable="true"/);
});
test('kéo pháp bảo đến ô trống gọi lệnh trang bị',async()=>{
  const {game,listeners}=setup();const eq=H.ITEMS.find(x=>x.kind==='EQ'&&x.tier===0);assert.ok(eq);game.s.bag[eq.key || eq.code]=1;const key=eq.key||eq.code;
  const item={dataset:{dragItem:key}}, target={dataset:{},matches:()=>true};
  listeners.dragstart({target:{closest:()=>item},dataTransfer:{setData(){}}});
  listeners.drop({target:{closest:()=>target},preventDefault(){}});
  await new Promise(resolve=>setImmediate(resolve));assert.ok(game.s.equipment.includes(key));
});

test('bốn ô công pháp và pháp bảo đang mặc không hiện trong túi nếu không còn bản dư',()=>{
  const {game,screen}=setup(); const eq=H.ITEMS.find(x=>x.kind==='EQ'&&x.tier===0); const key=eq.key||eq.code;
  game.s.bag[key]=1;game.equip({code:key},NOW);
  let html=screen.render('bag');assert.equal((html.match(/class="manual-gear-slot/g)||[]).length,4);
  assert.doesNotMatch(html,new RegExp('data-select="'+key+'"'));
  game.s.bag[key]=2; html=screen.render('bag');assert.match(html,new RegExp('data-select="'+key+'"'));
});
test('máy chủ cho vận hành bốn công pháp và giữ đủ sau khi chuẩn hóa',()=>{
  const {game}=setup();const manuals=H.ITEMS.filter(x=>x.kind==='BT'&&x.tier===0&&!['BT-900','BT-901'].includes(x.code)).slice(0,5);
  assert.ok(manuals.length>=5);
  for(const item of manuals){const key=item.key||item.code;game.s.learned[key]=0;}
  for(const item of manuals.slice(0,4)) game.activate({code:item.key||item.code},NOW);
  assert.equal(game.s.activeManuals.length,4);
  assert.equal(H.normalize(game.s,NOW).activeManuals.length,4);
  assert.throws(()=>game.activate({code:manuals[4].key||manuals[4].code},NOW),/bốn công pháp/);
});

test('bấm ô trang bị/công pháp/vật phẩm mở cửa sổ nổi; thao tác trong cửa sổ được shell cho phép chạy',async()=>{
  const {game,ui,actions,modals}=setup();const eq=H.ITEMS.find(x=>x.kind==='EQ'&&x.tier===0);const key=eq.key||eq.code;
  game.s.bag[key]=1;
  for(const n of ['itemPop','gearOpen','manualOpen','equip','learn','activate','sell'])assert.ok(ui.modalActions.has(n),n);
  assert.equal(await actions.gearOpen({},{}),ui.KEEP);
  assert.equal(modals.at(-1)[0],'Pháp bảo');assert.match(modals.at(-1)[1],new RegExp('data-select="'+key+'"'));
  await actions.itemPop({},{select:key,from:'gearOpen'});
  assert.match(modals.at(-1)[1],/data-act="equip"/);assert.match(modals.at(-1)[1],/data-act="gearOpen"/,'có nút quay lại');
  await actions.manualOpen({},{});assert.match(modals.at(-1)[1],/Chưa lĩnh ngộ công pháp nào/);
  const manual=H.ITEMS.find(x=>x.kind==='BT'&&x.tier===0&&!['BT-900','BT-901'].includes(x.code));const mk=manual.key||manual.code;
  game.s.learned[mk]=0;await actions.manualOpen({},{});assert.match(modals.at(-1)[1],new RegExp('data-select="'+mk+'"'));
  await actions.itemPop({},{select:mk,from:'manualOpen'});assert.match(modals.at(-1)[1],/Vận hành/);assert.doesNotMatch(modals.at(-1)[1],/Lĩnh ngộ/);
});
test('tab Thiên phú liệt kê thiên phú, tab Đạo thể không còn khối công pháp',()=>{
  const {screen}=setup();
  assert.match(screen.render('talents'),/Thiên phú khởi nguyên/);assert.match(screen.render('skills'),/Bồi dưỡng theo cảnh giới/);
  const stats=screen.render('stats');assert.doesNotMatch(stats,/char-techniques/);assert.doesNotMatch(stats,/talent-list/);
});
