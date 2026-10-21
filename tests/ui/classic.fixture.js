import '/src/styles/app.css';
import '/src/styles/classic.css';
import { createPlayView } from '/src/views/play.js';
import { createLoginView } from '/src/views/login.js';
import { STAGES, STAT_KEYS } from '@hu-gioi/game-core';
import { h } from '/src/ui/dom.js';
import { createAudioManager } from '/src/audio.js';
import { createSettingsDialog } from '/src/ui/settings.js';
const stats=Object.fromEntries(STAT_KEYS.map((key,i)=>[key,{level:i+5,cap:20,next_cost:999}]));
const state={now:'2026-10-20T00:00:00Z',account:{life_count:0,tm_balance:19,stats},history:[],pending_intent:null,
 life:{life_id:'fixture-life',life_no:1,status:'alive',stage:{...STAGES[1],idx:1},tang:8,progress_s:910,need_s:1000,
 born_at:'2026-10-01T00:00:00Z',lifespan:{cap_years:253,used_years:44,exhausted:false},wallet:{ls:87,lt:0,tn:0},
 speed_mult:1.6,risk_mult:1,tm_earned_life:12,items:[],ready_for_major:false}};
const npcs=[['HG_TVT_01','Lục Thanh Huyền','Thanh Vân Tông'],['HG_HSM_01','Huyết Vô Nhai','Huyết Sát Môn'],['HG_VDC_01','Dược Vô Trần','Vạn Dược Cốc'],['HG_TL_01','Trần Minh','Trung lập']].map(([id,name,faction])=>({id,name,faction,affection:0,trust:0,available:true,daily_done:false,gift_done:false}));
const scene={scene_id:'E1',title:'Chuông báo thú triều',npc_text:'[Sự kiện] Chuông báo vang giữa bữa ăn.',choices:[{choice_id:'E1_A',player_text:'Ta tổ chức hàng cứu trợ.'}]};
const social={life_id:'fixture-life',npcs,gifts:[],offers:[{offer_id:'o1',kind:'event',npc_id:'HG_TVT_01',scene}]};
const roll={race:'Ma',linh_can:{id:'ROOT-003',name:'Tam Linh Căn',elements:['Kim','Mộc','Thủy']}};
const plots=Array.from({length:16},(_,idx)=>({idx,unlocked:idx<2,crop:idx===0?'HERB-001':null,crop_name:idx===0?'Thanh Linh Thảo':null,state:idx===0?'growing':'empty',
 ready_at:idx===0?new Date(Date.now()+5400e3).toISOString():null,waters:idx===0?1:0,fertilized:false,pest:idx===0,can_water_at:null,unlock:idx<2?null:{idx,stage:1,cur:idx<8?'ls':'tn',cost:100}}));
const crafts={life_id:'fixture-life',now:new Date().toISOString(),stage_idx:1,wallet:{ls:87,tn:0},
 crafts:{linh_dien:{exp:12,level:1,next_exp:30},ve_phu:{exp:8,level:1,next_exp:30,used_today:1,limit:6,fail_pct:5},luyen_dan:{locked:true},luyen_khi:{locked:true}},
 plots,farm:{water_max:3,fertilize_cost_ls:5,base_yield:2},seeds:[{id:'HERB-001',name:'Thanh Linh Thảo',grow_hours:2,min_level:1,ok:true},{id:'HERB-004',name:'Xích Dương Hoa',grow_hours:4,min_level:3,ok:false}],
 goods:[{item_id:'HERB-001',tier:1,qty:2,name:'Thanh Linh Thảo',tier_name:'Thượng phẩm',price:15}],shop_buy:[{id:'MAT-003',name:'Giấy Phù',price:4}],paper:3};
const api={social:async()=>social,socialAction:async()=>({}),crafts:async()=>crafts,craftsAction:async(b)=>{window.craftCalls=[...(window.craftCalls??[]),b];return crafts;}};
const game={api,state,log:[{id:1,text:'Ngươi trở lại Thiên Vân Đại Lục.',tag:'gold'},{id:2,text:'Đang nhập định. Tu vi tiếp tục tích lũy.',tag:'green'}],pulse:0,busy:false,error:null,
 startLife(p){window.started=p;game.state={...state,life:{...state.life,profile:{...p,race:roll.race,linh_can:roll.linh_can}}};window.demo('alive',true);return Promise.resolve(true);},rollCharacter(f){window.rolls=[...(window.rolls??[]),f];return Promise.resolve(roll);},refresh(){},prepare(){},cancelPrepare(){},cancelLifespan(){},dismissResult(){}};
let view;
const audio=createAudioManager({storage:null,target:null,createAudio:()=>({play:async()=>{},pause(){},addEventListener(){}})});
const settingsDlg=createSettingsDialog({audio});
document.body.append(settingsDlg.el);
window.demo=(mode,keep)=>{
 view?.destroy();document.body.replaceChildren(settingsDlg.el);
 const page=h('main',{class:'page'});
 if(mode==='login') view=createLoginView({auth:{signIn:async()=>null,signUp:async()=>null}});
 else {
  if(!keep) game.state={...state,life:mode==='none'?null:state.life,pending_roll:mode==='none'?roll:undefined};
  document.body.append(h('header',{class:'topbar'},h('a',{class:'game-title',href:'#'},'Thiên Vân Đại Lục'),h('span',{class:'spacer'}),h('span',{class:'sync-status t-green'},'● Đã đồng bộ'),h('span',{class:'t-cyan'},'Linh thạch: 87'),h('span',{class:'chip gold'},'Thiên Mệnh 19')));
  view=createPlayView({game,onSettings:()=>settingsDlg.open()});
 }
 page.append(view.el);document.body.append(page);view.render();
};
window.demo('alive');
