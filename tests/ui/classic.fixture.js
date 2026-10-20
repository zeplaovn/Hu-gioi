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
const api={social:async()=>social,socialAction:async()=>({})};
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
