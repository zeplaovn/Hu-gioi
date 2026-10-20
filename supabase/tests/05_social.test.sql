begin;
create function pg_temp.social_error(p_sql text,p_code text) returns void language plpgsql as $$
begin
 execute p_sql;
 raise exception 'expected error %, succeeded',p_code;
exception when sqlstate 'GM000' then
 assert sqlerrm=p_code,format('expected %s, got %s',p_code,sqlerrm);
end $$;
do $$
declare
 u uuid:='c0000000-0000-0000-0000-000000000001'; other_u uuid:='c0000000-0000-0000-0000-000000000002';
 life uuid; next_life uuid; offer jsonb; again jsonb; result jsonb; st jsonb; v_scene text; scenes text[]:='{}';
 npc text:='HG_TVT_01'; today date:=(now() at time zone 'UTC')::date; i int; tm int;
begin
 insert into auth.users(id) values(u),(other_u);
 life:=game.start_life(u); perform game.start_life(other_u);
 tm:=(select tm_balance from game.accounts where account_id=u);
 assert jsonb_array_length(game.social_state(u)->'npcs')=19;
 assert jsonb_array_length(game.social_state(u)->'gifts')=36;
 perform pg_temp.social_error(format('select game.social_action(%L,%L,''daily'',%L)',other_u,life,npc),'life_ended');
 perform pg_temp.social_error(format('select game.social_action(%L,%L,''daily'',''invalid'')',u,life),'npc_not_found');
 offer:=game.social_action(u,life,'daily',npc);
 again:=game.social_action(u,life,'daily',npc);
 assert offer=again,'reopening daily must not redraw';
 assert not ((offer->'scene'->'choices'->0) ? 'npc_reply'),'future replies stay on server';
 perform pg_temp.social_error(format('select game.social_action(%L,%L,''choose'','''',%L,''forged'')',u,life,offer->>'offer_id'),'invalid_choice');
 result:=game.social_action(u,life,'choose','',offer->>'offer_id',offer->'scene'->'choices'->0->>'choice_id');
 assert result->>'affection'='5';
 again:=game.social_action(u,life,'choose','',offer->>'offer_id',offer->'scene'->'choices'->1->>'choice_id');
 assert result=again,'double click and retry cannot reward twice';
 perform pg_temp.social_error(format('select game.social_action(%L,%L,''daily'',%L)',u,life,npc),'daily_limit');
 -- Simulate four server resets in stored rows; the public API never accepts client timestamps.
 scenes:=array_append(scenes,offer->'scene'->>'scene_id');
 for i in 2..4 loop
  update game.social_lives set state=jsonb_set(state,array['npcs',npc,'daily_day'],to_jsonb((today-1)::text)) where life_id=life;
  offer:=game.social_action(u,life,'daily',npc);
  v_scene:=offer->'scene'->>'scene_id';assert not(v_scene=any(scenes)),'no repeat before cycle exhausted';
  scenes:=array_append(scenes,v_scene);
  perform game.social_action(u,life,'choose','',offer->>'offer_id',offer->'scene'->'choices'->0->>'choice_id');
 end loop;
 -- Story chain cannot jump or bypass affection; choice flag is not an ending reward.
 offer:=game.social_action(u,life,'story',npc);
 assert offer->'scene'->>'scene_id'='HG_TVT_01_S01';
 perform game.social_action(u,life,'choose','',offer->>'offer_id',offer->'scene'->'choices'->0->>'choice_id');
 offer:=game.social_action(u,life,'story',npc);
 assert offer->'scene'->>'scene_id'='HG_TVT_01_S02';
 perform game.social_action(u,life,'choose','',offer->>'offer_id',offer->'scene'->'choices'->0->>'choice_id');
 perform pg_temp.social_error(format('select game.social_action(%L,%L,''story'',%L)',u,life,npc),'relationship_required');
 -- Insufficient stock, cancel, favorite and disliked gifts; inventory decrement is atomic.
 perform pg_temp.social_error(format('select game.social_action(%L,%L,''gift_prepare'',%L,''GFT-HG-001'')',u,life,npc),'insufficient_gift');
 update game.social_lives set state=jsonb_set(state,'{gifts}','{"GFT-HG-001":3,"GFT-HG-032":2}') where life_id=life;
 offer:=game.social_action(u,life,'gift_prepare',npc,'GFT-HG-001');
 perform game.social_action(u,life,'gift_cancel',npc,offer->>'offer_id');
 assert (select state->'gifts'->>'GFT-HG-001' from game.social_lives where life_id=life)='3';
 perform pg_temp.social_error(format('select game.social_action(%L,%L,''gift_confirm'','''',%L)',u,life,offer->>'offer_id'),'offer_not_found');
 offer:=game.social_action(u,life,'gift_prepare',npc,'GFT-HG-001');
 result:=game.social_action(u,life,'gift_confirm','',offer->>'offer_id');
 assert result->>'affection_delta'='6';
 assert game.social_action(u,life,'gift_confirm','',offer->>'offer_id')=result;
 assert (select state->'gifts'->>'GFT-HG-001' from game.social_lives where life_id=life)='2';
 update game.social_lives set state=jsonb_set(state,array['npcs',npc,'gift_day'],to_jsonb((today-1)::text)) where life_id=life;
 perform pg_temp.social_error(format('select game.social_action(%L,%L,''gift_prepare'',%L,''GFT-HG-001'')',u,life,npc),'gift_cooldown');
 offer:=game.social_action(u,life,'gift_prepare',npc,'GFT-HG-032');
 result:=game.social_action(u,life,'gift_confirm','',offer->>'offer_id');
 assert result->>'affection_delta'='-4' and result->>'trust_delta'='-2';
 -- Pending offers still check presence; unavailable NPC cannot receive gifts.
 update game.social_lives set state=jsonb_set(state,array['npcs',npc,'gift_day'],to_jsonb((today-1)::text)) where life_id=life;
 update game.social_lives set state=jsonb_set(state,array['npcs',npc,'gift_days','GFT-HG-001'],to_jsonb((today-3)::text)) where life_id=life;
 offer:=game.social_action(u,life,'gift_prepare',npc,'GFT-HG-001');
 insert into game.npc_presence values(life,npc,false,'left map');
 perform pg_temp.social_error(format('select game.social_action(%L,%L,''gift_confirm'','''',%L)',u,life,offer->>'offer_id'),'npc_unavailable');
 assert (select state->'gifts'->>'GFT-HG-001' from game.social_lives where life_id=life)='2';
 update game.npc_presence set available=true where life_id=life;
 update game.social_lives set state=jsonb_set(state,array['offers',offer->>'offer_id','day'],to_jsonb((today-1)::text)) where life_id=life;
 perform pg_temp.social_error(format('select game.social_action(%L,%L,''gift_confirm'','''',%L)',u,life,offer->>'offer_id'),'offer_expired');
 -- Empty eligible pool never spends daily roll/pity.
 update game.social_accounts set roll_day=null,misses=4 where account_id=u;
 st:='{"npcs":{},"gifts":{},"offers":{},"completed":{},"flags":{}}';
 assert game.social_roll(u,life,st)=st;
 assert (select roll_day from game.social_accounts where account_id=u) is null;
 -- Fifth eligible day guarantees event; once per account/day, cooldown and once per life.
 st:=jsonb_set(st,array['npcs',npc],'{"affection":100,"trust":100}');
 st:=game.social_roll(u,life,st);
 assert (select count(*) from jsonb_each(st->'offers'))=1;
 assert game.social_roll(u,life,st)=st;
 assert (select misses from game.social_accounts where account_id=u)=0;
 select value into offer from jsonb_each(st->'offers') limit 1;
 assert offer->>'npc_id'=npc;
 st:=jsonb_set(st,array['completed',offer->>'scene_id'],'true');
 st:=jsonb_set(st,array['completed','HG_TVT_01_E01'],'true');
 st:=jsonb_set(st,array['completed','HG_TVT_01_E02'],'true');
 update game.social_accounts set roll_day=null,misses=4 where account_id=u;
 assert game.social_roll(u,life,st)=st;
 assert (select roll_day from game.social_accounts where account_id=u) is null;
 -- Social does not create any TM; ascension keeps state but prevents direct HG meetings.
 assert (select tm_balance from game.accounts where account_id=u)=tm;
 update game.lives set stage_idx=5 where life_id=life;
 assert not game.social_available(life,npc);
 assert exists(select 1 from game.social_lives where life_id=life);
 -- Real death clears inventory/relationships, keeps account lore, rejects old-life actions.
 next_life:=game.end_life(life,'test');
 assert not exists(select 1 from game.social_lives where life_id=life);
 assert not exists(select 1 from game.npc_presence where life_id=life);
 assert (select lore from game.social_accounts where account_id=u)<>'{}';
 assert (game.social_state(u)->'npcs'->0->>'affection')='0';
 perform pg_temp.social_error(format('select game.social_action(%L,%L,''daily'',%L)',u,life,npc),'life_ended');
 assert not has_function_privilege('authenticated','game.social_action(uuid,uuid,text,text,text,text)','EXECUTE');
 assert not has_table_privilege('authenticated','game.social_lives','SELECT');
end $$;
rollback;
