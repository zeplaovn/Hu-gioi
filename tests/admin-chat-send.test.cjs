'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const dir=path.join(__dirname,'../supabase/migrations');
const baseline=fs.readdirSync(dir).find(x=>x.endsWith('_unified_baseline.sql'));
const migration=fs.readdirSync(dir).find(x=>x.endsWith('_admin_chat_send.sql'));
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222', C='33333333-3333-4333-8333-333333333333';
const R='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', R2='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

test('Admin gửi tin công khai, chống gửi lặp và chặn truy cập sai quyền',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid primary key);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 INSERT INTO auth.users VALUES ('${A}'),('${B}'),('${C}');`);
 await db.exec(fs.readFileSync(path.join(dir,baseline),'utf8'));
 await db.exec(fs.readFileSync(path.join(dir,migration),'utf8'));
 await db.exec(`INSERT INTO game.admin_users(user_id,role,enabled) VALUES ('${A}','admin',true),('${B}','viewer',true);`);
 const grants=await db.query(`SELECT has_function_privilege('anon','public.hu_admin_send_chat(text,text,uuid)','execute') anon, has_function_privilege('authenticated','public.hu_admin_send_chat(text,text,uuid)','execute') authenticated`);
 assert.deepEqual(grants.rows,[{anon:false,authenticated:true}]);
 const call=(owner,chan,text,id)=>db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[owner]).then(()=>db.query('SELECT public.hu_admin_send_chat($1,$2,$3) AS data',[chan,text,id]));
 let result=await call(A,'world','Xin chào đạo hữu',R);assert.equal(result.rows[0].data.replayed,false);
 result=await call(A,'world','Xin chào đạo hữu',R);assert.equal(result.rows[0].data.replayed,true);
 await assert.rejects(()=>call(A,'world','Tin khác',R),/Request id already used/);
 await assert.rejects(()=>call(A,'world','Tin khác',R2),/Chat cooldown/);
 await assert.rejects(()=>call(A,'sect','Tin hợp lệ',R2),/Invalid chat channel/);
 await assert.rejects(()=>call(A,'world','Tin !',R2),/Invalid message/);
 await assert.rejects(()=>call(B,'world','Tin hợp lệ',R2),/Admin role required/);
 await assert.rejects(()=>call(C,'world','Tin hợp lệ',R2),/Not authorized/);
 let rows=(await db.query('SELECT sender_name,body,channel_key FROM game.world_chat_messages')).rows;
 assert.deepEqual(rows,[{sender_name:'Hư Giới Chi Chủ',body:'Xin chào đạo hữu',channel_key:'world'}]);
 assert.equal((await db.query("SELECT count(*)::int n FROM game.admin_audit_log WHERE action='send_public_chat'")).rows[0].n,1);
 } finally {await db.close()}
});
