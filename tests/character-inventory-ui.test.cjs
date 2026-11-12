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
  let screen; const ui={kit,data:{ELEMENTS:[]},lists:{},statNames:{},statDescriptions:{},view:{},tabState:{},session:{pavilion:{}},s:()=>game.s,g:()=>game,register:x=>screen=x,action(){},refresh(){},toast(){},command:async(type,{code})=>game.equip({code},NOW)};
  const doc={addEventListener:(type,fn)=>listeners[type]=fn,querySelectorAll:()=>[],elementFromPoint:()=>null};
  const env={HU_GAME:H,HU_UI:ui,HU_ASSETS:{heroPortrait:()=>'/portrait',heroSrc:()=>'/meditation'},document:doc};env.window=env;
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../client/ui/screens/character.js'),'utf8'),env);
  return {game,ui,screen,listeners};
}
test('nhân vật có ba tab, hành trang có bốn ô và chọn vật phẩm xem chi tiết',()=>{
  const {game,ui,screen}=setup();
  assert.deepEqual(Array.from(screen.tabs,t=>t.id),['stats','roots','bag']);
  assert.equal(screen.tabs[1].label,'Kinh mạch');
  const first=Object.keys(game.s.bag).find(k=>H.item(k));assert.ok(first);
  let html=screen.render('bag');assert.equal((html.match(/data-gear-drop=/g)||[]).length,4);assert.match(html,/\/meditation/);assert.match(html,/TÚI TRỮ VẬT/);assert.match(html,/Chọn một vật phẩm/);
  ui.view.selected=first;html=screen.render('bag');assert.match(html,/Nguồn gốc/);assert.match(html,/Chưa có dữ liệu nguồn nhận/);assert.match(html,/draggable="true"/);
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
