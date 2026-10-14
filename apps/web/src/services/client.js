const SESSION_KEY='hugioi_rewrite_session_v2';
let configPromise;
const config=()=>configPromise ||= fetch('/api/config',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('config');return r.json()});
const readSession=()=>{try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}};
const writeSession=s=>{if(s)localStorage.setItem(SESSION_KEY,JSON.stringify(s));else localStorage.removeItem(SESSION_KEY)};

async function supabase(path, options={}) {
  const c=await config(); const res=await fetch(c.supabaseUrl+path,{...options,headers:{apikey:c.supabaseAnonKey,'Content-Type':'application/json',...(options.headers||{})}});
  const text=await res.text(); let data=null; try{data=text?JSON.parse(text):null}catch{data={message:text}}
  if(!res.ok) throw Object.assign(new Error(data?.msg||data?.message||'Supabase error'),{status:res.status,data}); return data;
}
function normalizeSession(d){return {access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Number(d.expires_at||Math.floor(Date.now()/1000)+Number(d.expires_in||3600)),user:d.user};}
export function hasSession(){return !!readSession()?.refresh_token}
export function currentUser(){return readSession()?.user||null}
export async function token(){let s=readSession();if(!s)throw new Error('signed_out');if(s.expires_at-30>Date.now()/1000)return s.access_token;const d=await supabase('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:s.refresh_token})});s=normalizeSession(d);writeSession(s);return s.access_token;}
export async function signIn(email,password){const d=await supabase('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});writeSession(normalizeSession(d));return d.user;}
export async function signUp(email,password){const d=await supabase('/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password})});if(d.access_token)writeSession(normalizeSession(d));return d;}
export async function signOut(){const s=readSession();try{if(s?.access_token)await supabase('/auth/v1/logout',{method:'POST',headers:{Authorization:`Bearer ${s.access_token}`}})}finally{writeSession(null)}}
async function api(path,options={}){const t=await token();const res=await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`,...(options.headers||{})}});const text=await res.text();let data=null;try{data=text?JSON.parse(text):null}catch{data={message:text}}if(!res.ok)throw Object.assign(new Error(data?.error||'API error'),{status:res.status,data});return data;}
export const loadSave=()=>api('/save');
export const saveGame=(save,meta,rev=0,force=false)=>api('/save',{method:'POST',body:JSON.stringify({save,meta,rev,force})});
export const leaderboard=()=>api('/leaderboard');
export const chatList=(after=0)=>api(`/chat?after=${Number(after)||0}`);
export const chatSend=body=>api('/chat',{method:'POST',body:JSON.stringify({body})});
export const deleteAccount=()=>api('/account',{method:'DELETE'});
