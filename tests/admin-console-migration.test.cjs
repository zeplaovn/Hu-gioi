/* Admin console SQL contract: do not inadvertently open private Hư Giới data to browser. */
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261111110000_hugioi_admin_console.sql'),'utf8');
test('Admin RPCs are explicit, protected, and never return full player state',()=>{
  for(const name of ['hu_admin_role','hu_admin_me','hu_admin_overview','hu_admin_players','hu_admin_ranking','hu_admin_chat','hu_admin_audit','hu_admin_delete_chat']){
    assert.match(sql,new RegExp('CREATE OR REPLACE FUNCTION public\\.'+name+'\\('));
    assert.match(sql,new RegExp('REVOKE ALL ON FUNCTION public\\.'+name+'\\('));
    assert.match(sql,new RegExp('GRANT EXECUTE ON FUNCTION public\\.'+name+'\\('));
  }
  assert.match(sql,/WHERE a\.user_id = auth\.uid\(\) AND a\.enabled = true/);
  assert.match(sql,/PERFORM public\.hu_admin_role\(\)/);
  assert.match(sql,/v_role NOT IN \('moderator','admin','owner'\)/);
  assert.match(sql,/ALTER TABLE game\.admin_users ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/ALTER TABLE game\.admin_audit_log ENABLE ROW LEVEL SECURITY/);
  assert.doesNotMatch(sql,/GRANT (?:SELECT|ALL) ON (?:game\.|ALL TABLES)/i);
  assert.doesNotMatch(sql,/raw_user_meta_data|service_role|rng_seed|refresh_token/);
});
test('Sect channel not exposed, public-chat delete logged with reason',()=>{
  assert.match(sql,/p_channel NOT IN \('world','dao_huu','dao_lu'\)/);
  assert.match(sql,/channel_key IN \('world','dao_huu','dao_lu'\)/);
  assert.match(sql,/INSERT INTO game\.admin_audit_log/);
  assert.match(sql,/length\(v_reason\) NOT BETWEEN 8 AND 256/);
});
