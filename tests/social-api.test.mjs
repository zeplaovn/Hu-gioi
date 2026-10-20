import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../supabase/functions/api/handler.ts';
import { createApi } from '../apps/web/src/api.js';
const uid='d0000000-0000-0000-0000-000000000001';
const life='d0000000-0000-0000-0000-000000000002';
const npc='HG_TVT_01';
function setup(){
 const calls=[];
 const deps={allowedOrigins:['https://game.test'],getUserId:async token=>token==='ok'?uid:null,
 rpc:async(fn,args)=>{calls.push({fn,args});return {data:fn==='hit_rate_limit'?true:{ok:true},error:null};}};
 return {calls,deps};
}
test('social requires authentication and binds RPC identity to verified account',async()=>{
 const {calls,deps}=setup();
 const denied=await handle(new Request('https://x/api/social'),deps);assert.equal(denied.status,401);assert.equal(calls.length,0);
 const client=createApi({baseUrl:'https://x/api',getToken:async()=> 'ok',fetchImpl:(url,init)=>handle(new Request(url,init),deps)});
 await client.social();assert.deepEqual(calls.at(-1),{fn:'social_state',args:{p_account:uid}});
 await client.socialAction({kind:'daily',life_id:life,npc_id:npc,account_id:'forged',p_now:'2099-01-01',affection:100});
 assert.deepEqual(calls.at(-1),{fn:'social_action',args:{p_account:uid,p_life:life,p_kind:'daily',p_npc:npc,p_id:'',p_choice:''}});
});
test('malformed IDs, action names, object inputs and missing life never reach social mutation',async()=>{
 for(const body of [{kind:'daily'},{kind:'cheat',life_id:life},{kind:'choose',life_id:life,id:{}},{kind:'daily',life_id:life,npc_id:'x'.repeat(81)}]){
  const {calls,deps}=setup();
  const res=await handle(new Request('https://x/api/social/action',{method:'POST',headers:{authorization:'Bearer ok'},body:JSON.stringify(body)}),deps);
  assert.equal(res.status,400);assert(!calls.some(c=>c.fn==='social_action'));
 }
});
test('choice and gift confirmation cannot pass arbitrary points or inventory',async()=>{
 const {calls,deps}=setup();
 const res=await handle(new Request('https://x/api/social/action',{method:'POST',headers:{authorization:'Bearer ok'},body:JSON.stringify({kind:'gift_confirm',life_id:life,id:uid,gifts:{'GFT-HG-001':99},trust:100})}),deps);
 assert.equal(res.status,200);assert.deepEqual(Object.keys(calls.at(-1).args).sort(),['p_account','p_choice','p_id','p_kind','p_life','p_npc']);
});
