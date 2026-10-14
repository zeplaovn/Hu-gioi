import { emptyState, createCharacter, normalizeSave } from './state.js';
import { cultivationReducer } from './reducers/cultivation.js';
import { worldReducer } from './reducers/world.js';
import { farmReducer } from './reducers/farm.js';
import { craftingReducer } from './reducers/crafting.js';
import { sectReducer } from './reducers/sect.js';
import { economyReducer } from './reducers/economy.js';
import { metaReducer } from './reducers/meta.js';
import { unlockAchievements, log } from './mutations.js';
import { maxHp, power } from './rules.js';
const handlers=[cultivationReducer,worldReducer,farmReducer,craftingReducer,sectReducer,economyReducer];
function alive(s){return s.created&&s.profile&&s.profile.hp>0&&s.profile.ageMonths<s.profile.lifespanMonths;}
export function gameReducer(state,action){
  if(action.type==='RESET')return emptyState();if(action.type==='HYDRATE')return normalizeSave(action.payload);if(action.type==='CREATE')return createCharacter(action.payload);
  if(!state.created||!state.profile)return state;let s=structuredClone(state);
  if(action.type==='TICK'){const now=Number(action.now||Date.now());s.runtime.lastTickAt=now;s.runtime.lastSeenAt=now;if(s.sect.activeMission?.end<=now)s=gameReducer(s,{type:'RESOLVE_MISSION',force:true,rng:action.rng});if(s.secret.active?.end<=now)s=gameReducer(s,{type:'RESOLVE_SECRET',force:true,rng:action.rng});return s;}
  if(action.type==='REINCARNATE'||action.type==='META_UPGRADE'){const r=metaReducer(s,action);if(r){unlockAchievements(r);return r;}}
  if(!alive(s)){if(s.profile.hp<=0)log(s,'Đạo thân đã trọng thương. Hãy dùng chuyển thế hoặc khôi phục dữ liệu.','red');else log(s,'Thọ nguyên đã cạn. Có thể chuyển thế nếu đủ cảnh giới.','red');return s;}
  let handled=false;for(const fn of handlers){if(fn(s,action)){handled=true;break;}}
  if(!handled)return state;s.profile.maxHp=maxHp(s);s.profile.hp=Math.min(s.profile.maxHp,Math.max(0,s.profile.hp));s.profile.power=power(s);s.runtime.lastSeenAt=Date.now();unlockAchievements(s);return s;
}
