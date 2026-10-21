-- Fixture writes below emulate completed clocks/server RNG; no public API accepts them.
create function pg_temp.act(u uuid,l uuid,a text,args jsonb default '{}') returns jsonb language sql as $$select game.play_action(u,l,gen_random_uuid(),a,args,(select version from game.play_lives where life_id=l))$$;
do $$
declare u uuid:=gen_random_uuid();l uuid;r jsonb;s jsonb;t uuid;closed uuid;ok boolean;old_hazard jsonb;begin
 insert into auth.users(id) values(u);l:=game.start_life(u);perform game.play_state(u);
 assert exists(select 1 from game.money_ledger where life_id=l and reason='new_life_grant' and delta=3),'new life source ledger';
 ok:=false;begin update game.money_ledger set delta=999 where life_id=l;exception when others then ok:=sqlerrm='immutable_ledger';end;assert ok,'ledger is immutable';
 execute 'set local role service_role';
 r:=game.play_action(u,l,gen_random_uuid(),'refine','{}',0);
 execute 'reset role';
 assert (select ls=0 from game.lives where life_id=l),'Edge service role can mutate atomically';
 assert not has_function_privilege('anon','game.play_action(uuid,uuid,uuid,text,jsonb,bigint)','EXECUTE'),'no anonymous mutation RPC';
 assert not has_table_privilege('authenticated','game.play_lives','SELECT'),'no direct state reads';
 assert game.play_tradeable(game.play_find('item_catalog','SEED-HERB-001')),'boolean trade true normalized';
 assert not game.play_tradeable(game.play_find('item_catalog','HERB-072')),'unique nontradeable herb';
 -- Endgame progression does not silently choose Quy Phàm.
 update game.lives set stage_idx=14,tang=9,progress_s=game.tang_seconds(14::smallint,9::smallint),last_settle_at=now() where life_id=l;
 update game.play_lives set state=jsonb_set(state,'{quests,Q-TG-04}','{"status":"CLAIMED"}') where life_id=l;
 old_hazard:=game.rule('hazard_scale');update game.rules set value='0' where key='hazard_scale';
 r:=game.breakthrough_prepare(u);t:=(r->>'intent_id')::uuid;r:=game.breakthrough_confirm(u,t);
 assert r->>'outcome'='success' and (select status='alive' from game.lives where life_id=l),'can remain alive at endgame';
 update game.rules set value=old_hazard where key='hazard_scale';
 perform pg_temp.act(u,l,'ending','{"choice":"remain"}');assert (select status='alive' from game.lives where life_id=l),'remain never ends life';
 r:=pg_temp.act(u,l,'ending_prepare');t:=(r->'data'->>'token')::uuid;
 ok:=false;begin perform pg_temp.act(u,l,'ending',jsonb_build_object('choice','return_home','token',t,'ack',false));exception when sqlstate 'GM000' then ok:=sqlerrm='confirmation_required';end;assert ok,'last confirmation required';
 perform pg_temp.act(u,l,'ending',jsonb_build_object('choice','return_home','token',t,'ack',true));
 assert (select status='dead' and death_cause='return_home' from game.lives where life_id=l),'return home closes life explicitly';
 assert exists(select 1 from game.life_history where life_id=l and cause='return_home'),'ending history retained';
end$$;
-- Timed consumables use server clocks and immutable combat bases; combat enforces the same quotas.
do $$
declare u uuid:=gen_random_uuid();l uuid;s jsonb;r jsonb;b jsonb;id text;req uuid;ver bigint;ok boolean;hp numeric;shield numeric;begin
 insert into auth.users(id) values(u);l:=game.start_life(u);perform game.play_state(u);
 update game.lives set stage_idx=2,last_settle_at=now() where life_id=l;
 select state into s from game.play_lives where life_id=l;s:=game.play_give(s,'PILL-017',3);s:=game.play_give(s,'PILL-006',2);s:=game.play_give(s,'TAL-002',1);update game.play_lives set state=s where life_id=l;
 select key into id from jsonb_each(s->'inventory') where value->>'item_id'='PILL-017';
 req:=gen_random_uuid();select version into ver from game.play_lives where life_id=l;
 r:=game.play_action(u,l,req,'item_use',jsonb_build_object('id',id),ver);
 assert r=game.play_action(u,l,req,'item_use',jsonb_build_object('id',id),ver),'buff retry does not consume twice';
 perform pg_temp.act(u,l,'item_use',jsonb_build_object('id',id));
 assert (select (state->'inventory'->id->>'quantity')::int=1 from game.play_lives where life_id=l),'one item per accepted use';
 assert (select count(*)=1 from game.play_lives cross join lateral jsonb_each(state->'buffs') where life_id=l),'refresh does not stack another buff';
 r:=pg_temp.act(u,l,'battle_prepare','{"id":"MON-001"}');perform pg_temp.act(u,l,'battle_start',jsonb_build_object('id','MON-001','token',r->'data'->>'token'));
 select state->'battle' into b from game.play_lives where life_id=l;
 assert (b->'player'->>'maxhp')::numeric=(b->'player_base'->>'maxhp')::numeric*1.08,'HP buff applies once at battle start';
 assert (game.play_phase(b)->'player'->>'maxhp')::numeric=(b->'player'->>'maxhp')::numeric,'phase refresh never compounds';
 b:=jsonb_set(b,ARRAY['buffs','PILL-017:stat_percent:HP','expires_at'],'0');b:=game.play_phase(b);
 assert b->'player'->>'maxhp'=b->'player_base'->>'maxhp','expired buff removed in existing battle';
 assert (b->'player'->>'hp')::numeric<=(b->'player'->>'maxhp')::numeric,'expiry clamps HP';
 update game.play_lives set state=jsonb_set(state,'{battle}',b) where life_id=l;
 select key into id from jsonb_each(s->'inventory') where value->>'item_id'='PILL-006';
 insert into game.play_quotas values(u,'consume:PILL-006',game.play_day(),5);
 ok:=false;begin perform pg_temp.act(u,l,'battle_turn',jsonb_build_object('move','item','instance_id',id));exception when sqlstate 'GM000' then ok:=sqlerrm='daily_limit';end;assert ok,'combat cannot bypass5/day healing limit';
 assert (select (state->'inventory'->id->>'quantity')::int=2 and (state->'battle'->>'turn')::int=1 from game.play_lives where life_id=l),'failed combat use rolls back inventory and turn';
 update game.play_quotas set used=4 where account_id=u and group_code='consume:PILL-006';
 update game.lives set stage_idx=1 where life_id=l;
 ok:=false;begin perform pg_temp.act(u,l,'battle_turn',jsonb_build_object('move','item','instance_id',id));exception when sqlstate 'GM000' then ok:=sqlerrm='item_unavailable';end;assert ok,'combat checks minimum major realm';
 update game.lives set stage_idx=2 where life_id=l;
 perform pg_temp.act(u,l,'battle_turn',jsonb_build_object('move','item','instance_id',id));
 assert (select used=5 from game.play_quotas where account_id=u and group_code='consume:PILL-006'),'successful healing consumes account daily quota';
 -- A damage talisman must pass the target shield, even when it is a guaranteed miss.
 select key into id from jsonb_each(s->'inventory') where value->>'item_id'='TAL-002';
 update game.play_lives set state=jsonb_set(jsonb_set(state,'{battle,enemy,shield}','99999999'),'{battle,enemy,hp}',state->'battle'->'enemy'->'maxhp') where life_id=l;
 select (state->'battle'->'enemy'->>'hp')::numeric into hp from game.play_lives where life_id=l;
 perform pg_temp.act(u,l,'battle_turn',jsonb_build_object('move','item','instance_id',id));
 assert (select (state->'battle'->'enemy'->>'hp')::numeric=hp from game.play_lives where life_id=l),'damage talisman never bypasses shield';
 assert not game.play_consumable_mode(game.play_find('item_effects','PILL-004'),'outside'),'unimplemented lifespan effect stays closed';
 assert game.play_consumable_mode(game.play_find('item_effects','PILL-057'),'outside'),'multi-stat timed pill supported atomically';
 perform game.end_life(l,'test');
 assert (select not(state ? 'buffs') from game.play_lives where life_id=l),'timed buffs lost on death';
end$$;
