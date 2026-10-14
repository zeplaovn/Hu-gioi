import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

export async function buildApp({logger=true}={}){
  const app=Fastify({logger,bodyLimit:1024*1024,trustProxy:true});
  await app.register(helmet,{contentSecurityPolicy:false});
  const origins=(process.env.WEB_ORIGINS||'http://localhost:5173').split(',').map(x=>x.trim()).filter(Boolean);
  await app.register(cors,{origin:(origin,cb)=>{if(!origin||origins.includes(origin))cb(null,true);else cb(new Error('origin_not_allowed'),false)}});
  const base=(process.env.SUPABASE_URL||'').replace(/\/+$/,'');const key=process.env.SUPABASE_ANON_KEY||'';
  if(key.startsWith('sb_secret_'))throw new Error('SUPABASE_ANON_KEY must be an anon/publishable key');
  const configured=()=>!!base&&key.length>=20;
  function bearer(req){const h=req.headers.authorization||'';return /^Bearer [^ ]+$/.test(h)?h:null}
  async function sb(path,{method='GET',body,token,timeout=10000}={}){if(!configured()){const e=new Error('supabase_unconfigured');e.statusCode=503;throw e}let r;try{r=await fetch(base+path,{method,cache:'no-store',headers:{apikey:key,'Content-Type':'application/json',...(token?{Authorization:token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(timeout)})}catch(err){const e=new Error('supabase_unavailable');e.statusCode=502;e.cause=err;throw e}const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data={message:text}}if(!r.ok){const e=new Error(data?.message||data?.msg||data?.error_description||'supabase_error');e.statusCode=r.status;e.data=data;throw e}return data}
  async function rpc(name,body={},token=null){return sb(`/rest/v1/rpc/${name}`,{method:'POST',body,token})}
  async function requireUser(req,reply){const token=bearer(req);if(!token){reply.code(401).send({error:'unauthorized'});return null}try{const user=await sb('/auth/v1/user',{token});return{token,user}}catch(e){reply.code(e.statusCode===401?401:502).send({error:'auth_failed'});return null}}
  app.setErrorHandler((e,req,reply)=>{req.log?.error?.(e);if(reply.sent)return;reply.code(e.statusCode||500).send({error:e.message||'server_error',detail:e.data||null})});
  app.get('/api/health',async()=>({ok:true,service:'hugioi-api',version:3,supabase:configured()}));
  app.get('/api/config',async()=>({supabaseUrl:base,supabaseAnonKey:key,hcaptchaSitekey:process.env.HCAPTCHA_SITEKEY||''}));
  app.get('/api/server-status',async()=>{try{return await rpc('server_status')}catch(e){if(e.statusCode===503)return{maintenance:false,banner:null,server_ms:Date.now(),unconfigured:true};throw e}});
  app.get('/api/game-clock',async(req,reply)=>{const a=await requireUser(req,reply);if(!a)return;const value=await rpc('game_clock',{},a.token);return{server_ms:Number(value)||Date.now()}});
  app.get('/api/me',async(req,reply)=>{const a=await requireUser(req,reply);if(!a)return;return{id:a.user.id,email:a.user.email||null}});
  app.post('/api/heartbeat',async(req,reply)=>{const a=await requireUser(req,reply);if(!a)return;const id=String(req.body?.sessionId||'');if(!/^[0-9a-f-]{36}$/i.test(id))return reply.code(400).send({error:'invalid_session_id'});await rpc('heartbeat_presence',{p_session_id:id,p_client_version:String(req.body?.clientVersion||'react-v3').slice(0,40),p_realm_level:req.body?.realmLevel==null?null:Math.max(1,Math.min(81,Math.trunc(Number(req.body.realmLevel))))},a.token);return{ok:true}});
  app.get('/api/save',async(req,reply)=>{const a=await requireUser(req,reply);if(!a)return;const rows=await sb('/rest/v1/player_saves?select=save,meta,rev,updated_at&limit=1',{token:a.token});return Array.isArray(rows)&&rows[0]?rows[0]:null});
  app.post('/api/save',async(req,reply)=>{const a=await requireUser(req,reply);if(!a)return;const b=req.body||{};if(b.save&&JSON.stringify(b.save).length>250000)return reply.code(413).send({error:'save_too_large'});return rpc('save_game',{p_save:b.save??null,p_meta:b.meta??{},p_rev:Math.max(0,Math.trunc(Number(b.rev)||0)),p_force:!!b.force},a.token)});
  app.get('/api/leaderboard',async(req,reply)=>{const a=await requireUser(req,reply);if(!a)return;const days=Math.max(0,Math.min(365,Math.trunc(Number(req.query?.days)||0)));const since=days?`&updated_at=gte.${encodeURIComponent(new Date(Date.now()-days*86400000).toISOString())}`:'';const cols='select=user_id,name,level,months';const top=await sb(`/rest/v1/leaderboard?${cols}${since}&order=level.desc,months.asc,updated_at.asc&limit=50`,{token:a.token});const uid=a.user.id,arr=Array.isArray(top)?top:[];const i=arr.findIndex(x=>x.user_id===uid);return{top:arr,rank:i>=0?i+1:null,mine:i>=0?arr[i]:null,uid}});
  app.get('/api/chat',async(req,reply)=>{const a=await requireUser(req,reply);if(!a)return;const after=Math.max(0,Math.trunc(Number(req.query?.after)||0));const path=cols=>after?`/rest/v1/chat_messages?select=${cols}&id=gt.${after}&order=id.asc&limit=100`:`/rest/v1/chat_messages?select=${cols}&order=id.desc&limit=50`;let rows;try{rows=await sb(path('id,user_id,name,body,created_at,is_admin'),{token:a.token})}catch(e){if(e.statusCode!==400)throw e;rows=await sb(path('id,user_id,name,body,created_at'),{token:a.token})}if(!after&&Array.isArray(rows))rows.reverse();return Array.isArray(rows)?rows:[]});
  app.post('/api/chat',async(req,reply)=>{const a=await requireUser(req,reply);if(!a)return;const body=String(req.body?.body||'').trim();if(!body||body.length>200)return reply.code(400).send({error:'invalid_message'});return rpc('send_chat',{p_body:body},a.token)});
  app.delete('/api/account',async(req,reply)=>{const a=await requireUser(req,reply);if(!a)return;await rpc('delete_account',{},a.token);return{ok:true}});
  return app;
}
