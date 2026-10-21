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
