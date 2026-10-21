-- Fixture writes below emulate completed clocks/server RNG; no public API accepts them.
create function pg_temp.act(u uuid,l uuid,a text,args jsonb default '{}') returns jsonb language sql as $$select game.play_action(u,l,gen_random_uuid(),a,args,(select version from game.play_lives where life_id=l))$$;
do $$
declare u uuid:=gen_random_uuid();l uuid;s jsonb;r jsonb;id text;mat1 text;mat2 text;seed text;req uuid;before numeric;ok boolean;job jsonb;begin
 insert into auth.users(id) values(u);l:=game.start_life(u);perform game.play_state(u);update game.lives set tang=2,ls=10000 where life_id=l;
 perform pg_temp.act(u,l,'quest_accept','{"id":"Q-HG-01"}');
 perform pg_temp.act(u,l,'interact_start','{"id":"Q-HG-01:learn"}');update game.play_lives set state=jsonb_set(state,'{task,ready_at}','0') where life_id=l;perform pg_temp.act(u,l,'task_claim');
 perform pg_temp.act(u,l,'interact_start','{"id":"Q-HG-01:seal"}');update game.play_lives set state=jsonb_set(state,'{task,ready_at}','0') where life_id=l;perform pg_temp.act(u,l,'task_claim');perform pg_temp.act(u,l,'quest_claim','{"id":"Q-HG-01"}');
 perform pg_temp.act(u,l,'quest_accept','{"id":"Q-HG-02"}');perform pg_temp.act(u,l,'sect_join','{"id":"TV"}');perform pg_temp.act(u,l,'interact_start','{"id":"Q-HG-02:trial"}');update game.play_lives set state=jsonb_set(state,'{task,ready_at}','0') where life_id=l;perform pg_temp.act(u,l,'task_claim');perform pg_temp.act(u,l,'quest_claim','{"id":"Q-HG-02"}');
 assert (select knowledge ? 'REC-PILL-001' from game.play_accounts where account_id=u),'starter recipe learned';
 select state into s from game.play_lives where life_id=l;select key into seed from jsonb_each(s->'inventory') i where value->>'item_id'='SEED-HERB-001';
 perform pg_temp.act(u,l,'sow',jsonb_build_object('id',seed,'slot','1'));perform pg_temp.act(u,l,'water','{"slot":"1"}');
 ok:=false;begin perform pg_temp.act(u,l,'water','{"slot":"1"}');exception when sqlstate 'GM000' then ok:=sqlerrm='already_done';end;assert ok,'care once per crop';
 update game.play_lives set state=jsonb_set(state,'{plots,1,ready_at}','0') where life_id=l;perform pg_temp.act(u,l,'harvest','{"slot":"1"}');
 assert (select (state->'xp'->>'garden')::int=10 from game.play_lives where life_id=l),'harvest EXP exactly once';
 select state into s from game.play_lives where life_id=l;s:=game.play_give(s,'HERB-001',10);s:=game.play_give(s,'HERB-002',10);update game.play_lives set state=s where life_id=l;
 select key into mat1 from jsonb_each(s->'inventory') i where value->>'item_id'='HERB-001' and (value->>'quantity')::int=10 limit 1;select key into mat2 from jsonb_each(s->'inventory') i where value->>'item_id'='HERB-002' limit 1;
 select ls into before from game.lives where life_id=l;
 ok:=false;begin perform pg_temp.act(u,l,'craft_start',jsonb_build_object('id','REC-PILL-001','materials',jsonb_build_array(jsonb_build_object('instance_id',mat1,'quantity',2))));exception when sqlstate 'GM000' then ok:=sqlerrm='invalid_recipe';end;assert ok,'invalid multiset rejected';assert (select ls=before from game.lives where life_id=l),'bad craft fee rollback';
 perform pg_temp.act(u,l,'craft_start',jsonb_build_object('id','REC-PILL-001','materials',jsonb_build_array(jsonb_build_object('instance_id',mat1,'quantity',1),jsonb_build_object('instance_id',mat2,'quantity',1))));
 r:=game.play_state(u);assert not(r->'state'->'jobs'->'alchemy' ? 'success'),'RNG private';
 update game.play_lives set state=jsonb_set(jsonb_set(state,'{jobs,alchemy,ready_at}','0'),'{jobs,alchemy,success}','false') where life_id=l;perform pg_temp.act(u,l,'craft_claim','{"id":"alchemy"}');
 assert (select (state->'xp'->>'alchemy')::int=8 and not(state->'jobs' ? 'alchemy') from game.play_lives where life_id=l),'failure consumes job and earns8EXP';
 -- Safe combat round is server-authoritative and receipt retry never advances twice.
 r:=pg_temp.act(u,l,'battle_prepare','{"id":"MON-001"}');perform pg_temp.act(u,l,'battle_start',jsonb_build_object('id','MON-001','token',r->'data'->>'token'));
 req:=gen_random_uuid();select version into before from game.play_lives where life_id=l;r:=game.play_action(u,l,req,'battle_turn','{"move":"attack"}',before::bigint);assert r=game.play_action(u,l,req,'battle_turn','{"move":"attack"}',before::bigint),'battle retry';
 assert (select (state->'battle'->>'turn')::int=2 from game.play_lives where life_id=l),'one turn only';
end$$;
-- Auction escrow, exact settlement and seller death refund.
do $$
declare u uuid:=gen_random_uuid();v uuid:=gen_random_uuid();l uuid;b uuid;s jsonb;i text;a text;r jsonb;bal numeric;begin
 insert into auth.users(id) values(u),(v);l:=game.start_life(u);b:=game.start_life(v);perform game.play_state(u);perform game.play_state(v);
 update game.accounts set created_at=now()-interval '4 days' where account_id in(u,v);update game.lives set ls=10000 where life_id in(l,b);
 select state into s from game.play_lives where life_id=l;s:=game.play_give(s,'HERB-001',1);update game.play_lives set state=s where life_id=l;select key into i from jsonb_each(s->'inventory') x limit 1;
 r:=pg_temp.act(u,l,'auction_list',jsonb_build_object('id',i,'currency','LT_HP','price','10','buyout','20','hours','6'));a:=r->'data'->>'auction_id';
 perform pg_temp.act(v,b,'auction_bid',jsonb_build_object('id',a,'amount','10'));assert (select ls=9990 from game.lives where life_id=b),'full escrow debit';
 perform game.end_life(l,'test');assert (select ls=10000 from game.lives where life_id=b),'seller death refunds bidder';assert (select state='LOST' from game.server_auctions where id=a::uuid),'seller death destroys listing';
end$$;
