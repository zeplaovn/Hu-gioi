import '/src/styles/app.css';
import '/src/styles/classic.css';
import { createPlayView } from '/src/views/play.js';
import { createLoginView } from '/src/views/login.js';
import { STAGES, STAT_KEYS } from '@hu-gioi/game-core';
import { h } from '/src/ui/dom.js';
const stats=Object.fromEntries(STAT_KEYS.map((key,i)=>[key,{level:i+5,cap:20,next_cost:999}]));
const state={now:'2026-10-20T00:00:00Z',account:{life_count:0,tm_balance:19,stats},history:[],pending_intent:null,
 life:{life_id:'fixture-life',life_no:1,status:'alive',stage:{...STAGES[1],idx:1},tang:8,progress_s:910,need_s:1000,
 born_at:'2026-10-01T00:00:00Z',lifespan:{cap_years:253,used_years:44,exhausted:false},wallet:{ls:87,lt:0,tn:0},
 speed_mult:1.6,risk_mult:1,tm_earned_life:12,items:[],ready_for_major:false}};
const game={state,log:[{id:1,text:'Ngươi trở lại Thiên Vân Đại Lục.',tag:'gold'},{id:2,text:'Đang nhập định. Tu vi tiếp tục tích lũy.',tag:'green'}],pulse:0,busy:false,error:null,
 startLife(){game.state={...state,life:{...state.life}};window.demo('alive');},refresh(){},prepare(){},cancelPrepare(){},cancelLifespan(){},dismissResult(){}};
let view;
window.demo=(mode)=>{
 view?.destroy();document.body.replaceChildren();
 const page=h('main',{class:'page'});
 if(mode==='login') view=createLoginView({auth:{signIn:async()=>null,signUp:async()=>null}});
 else {
  game.state={...state,life:mode==='none'?null:state.life};
  document.body.append(h('header',{class:'topbar'},h('a',{class:'game-title',href:'#'},'Thiên Vân Đại Lục'),h('span',{class:'spacer'}),h('span',{class:'sync-status t-green'},'● Đã đồng bộ'),h('span',{class:'t-cyan'},'Linh thạch: 87'),h('span',{class:'chip gold'},'Thiên Mệnh 19')));
  view=createPlayView({game});
 }
 page.append(view.el);document.body.append(page);view.render();
};
window.demo('alive');
