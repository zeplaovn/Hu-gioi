const SESSION_KEY='hugioi_session_v3';
const PRESENCE_KEY='hugioi_presence_session_v3';
let configPromise;
export const getConfig=()=>configPromise??=fetch('/api/config',{cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error('Không tải được cấu hình máy chủ.');return r.json();});
function readSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
function writeSession(s){try{s?localStorage.setItem(SESSION_KEY,JSON.stringify(s)):localStorage.removeItem(SESSION_KEY)}catch{}}
function normalizeSession(d){if(!d?.access_token||!d?.refresh_token)throw new Error('Phiên đăng nhập không hợp lệ.');return{access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Number(d.expires_at||Math.floor(Date.now()/1000)+Number(d.expires_in||3600)),user:d.user||null}}
async function direct(path,options={}){const c=await getConfig();if(!c.supabaseUrl||!c.supabaseAnonKey)throw new Error('Supabase chưa được cấu hình.');const r=await fetch(c.supabaseUrl+path,{...options,cache:'no-store',headers:{apikey:c.supabaseAnonKey,'Content-Type':'application/json',...(options.headers||{})}});const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data={message:text}}if(!r.ok){const e=new Error(data?.msg||data?.message||data?.error_description||'Supabase error');e.status=r.status;e.data=data;throw e}return data}
export function hasSession(){return!!readSession()?.refresh_token}
export function currentUser(){return readSession()?.user||null}
export async function token(){let s=readSession();if(!s)throw new Error('signed_out');if(s.access_token&&s.expires_at-30>Date.now()/1000)return s.access_token;const d=await direct('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:s.refresh_token})});s=normalizeSession(d);writeSession(s);return s.access_token}
export async function signIn(email,password,captchaToken=''){const body={email,password,...(captchaToken?{gotrue_meta_security:{captcha_token:captchaToken}}:{})};const d=await direct('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify(body)});writeSession(normalizeSession(d));return d.user}
export async function signUp(email,password,captchaToken=''){const body={email,password,...(captchaToken?{gotrue_meta_security:{captcha_token:captchaToken}}:{})};const d=await direct('/auth/v1/signup',{method:'POST',body:JSON.stringify(body)});if(d.access_token)writeSession(normalizeSession(d));return d}
export async function recover(email){return direct('/auth/v1/recover',{method:'POST',body:JSON.stringify({email})})}
export async function signOut(){const s=readSession();try{if(s?.access_token)await direct('/auth/v1/logout',{method:'POST',headers:{Authorization:`Bearer ${s.access_token}`}})}catch{}finally{writeSession(null)}}
async function api(path,options={},auth=true){const headers={'Content-Type':'application/json',...(options.headers||{})};if(auth)headers.Authorization=`Bearer ${await token()}`;const r=await fetch('/api'+path,{...options,cache:'no-store',headers});const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data={message:text}}if(!r.ok){const e=new Error(data?.error||data?.message||'API error');e.status=r.status;e.data=data;throw e}return data}
export const me=()=>api('/me');
export const loadSave=()=>api('/save');
export const saveGame=(save,meta,rev=0,force=false)=>api('/save',{method:'POST',body:JSON.stringify({save,meta,rev,force})});
export const leaderboard=(days=0)=>api(`/leaderboard?days=${Math.max(0,Number(days)||0)}`);
export const chatList=(after=0)=>api(`/chat?after=${Math.max(0,Number(after)||0)}`);
export const chatSend=body=>api('/chat',{method:'POST',body:JSON.stringify({body})});
export const serverStatus=()=>api('/server-status',{},false);
export const gameClock=()=>api('/game-clock',{},false);
export const deleteAccount=()=>api('/account',{method:'DELETE'});
export async function heartbeat(realmLevel=null){let id;try{id=localStorage.getItem(PRESENCE_KEY);if(!id){id=crypto.randomUUID();localStorage.setItem(PRESENCE_KEY,id)}}catch{id=crypto.randomUUID()}return api('/heartbeat',{method:'POST',body:JSON.stringify({sessionId:id,clientVersion:'react-v3',realmLevel})});}
