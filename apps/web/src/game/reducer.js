import { emptyState, createCharacter, normalizeSave } from './state.js';
import { cultivationReducer } from './reducers/cultivation.js';
import { worldReducer } from './reducers/world.js';
import { farmReducer } from './reducers/farm.js';
import { craftingReducer } from './reducers/crafting.js';
import { sectReducer } from './reducers/sect.js';
import { economyReducer } from './reducers/economy.js';
import { awardEndLife, metaReducer } from './reducers/meta.js';
import { unlockAchievements, log } from './mutations.js';
import { applyElapsed } from './time.js';
import { maxHp, power } from './rules.js';
const handlers=[cultivationReducer,worldReducer,farmReducer,craftingReducer,sectReducer,economyReducer];
function alive(s){return s.created&&s.profile&&!s.runtime.end&&s.profile.hp>0&&s.profile.ageMonths<s.profile.lifespanMonths;}
function finalize(s){if(s.profile){s.profile.maxHp=maxHp(s);s.profile.hp=Math.min(s.profile.maxHp,Math.max(0,s.profile.hp));s.profile.power=power(s);if(s.profile.hp<=0&&!s.runtime.end)s.runtime.end='death';if(s.profile.ageMonths>=s.profile.lifespanMonths&&!s.runtime.end)s.runtime.end='death';if(s.runtime.end)awardEndLife(s);}unlockAchievements(s);return s;}
export function gameReducer(state,action){
  if(action.type==='RESET'){const next=emptyState();next.meta=structuredClone(state.meta);return next;}
  if(action.type==='HYDRATE')return normalizeSave(action.payload);
  if(action.type==='CREATE')return createCharacter({...action.payload,meta:state.meta});
  if(!state.created||!state.profile)return state;
  if(action.type==='TICK'){const now=Number(action.now||Date.now()),progressDue=state.runtime.idleOn!==false&&!state.runtime.end&&now-Number(state.runtime.lastProgressAt||now)>=10000,missionDue=!!state.sect.activeMission&&state.sect.activeMission.end<=now,secretDue=!!state.secret.active&&state.secret.active.end<=now;if(!progressDue&&!missionDue&&!secretDue)return state;let s=structuredClone(state);if(progressDue)applyElapsed(s,now,typeof action.rng==='function'?action.rng:Math.random);if(missionDue)sectReducer(s,{type:'RESOLVE_MISSION',force:true,now,rng:action.rng});if(secretDue)worldReducer(s,{type:'RESOLVE_SECRET',force:true,now,rng:action.rng});return finalize(s);}
  let s=structuredClone(state);
  if(action.type==='REINCARNATE'||action.type==='META_UPGRADE'){const r=metaReducer(s,action);if(r)return finalize(r);}
  if(!alive(s)){log(s,s.runtime.end==='win'?'Đã phi thăng. Hãy chuyển thế để bắt đầu kiếp mới.':'Kiếp này đã kết thúc. Hãy chuyển thế.','red');return s;}
  let handled=false;for(const fn of handlers){if(fn(s,action)){handled=true;break;}}
  if(!handled)return state;s.runtime.lastSeenAt=Number(action.now||Date.now());return finalize(s);
}
