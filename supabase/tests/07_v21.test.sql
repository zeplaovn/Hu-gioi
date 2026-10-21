do $$
declare u uuid:=gen_random_uuid();v uuid;r jsonb;r2 jsonb;s jsonb;req uuid:=gen_random_uuid();n numeric;ok boolean;before numeric;
begin
 insert into auth.users(id) values(u);v:=game.start_life(u);s:=game.play_state(u);
 assert (select stage_idx=1 and ls=3 from game.lives where life_id=v),'HG01 starts with3 LT_HP';
 assert jsonb_array_length(game.play_data('item_catalog'))=372 and jsonb_array_length(game.play_data('crafting_recipes'))=135,'canonical counts';
 assert jsonb_array_length(game.rule('social_content')->'npcs')=9,'9 active NPCs';
 assert not game.social_available(v,'NPC-06'),'Linh NPC unavailable in Ha';
 assert game.social_available(v,'NPC-01'),'Ha NPC present';
 update game.lives set stage_idx=6,ls=10000 where life_id=v;
 r:=game.play_action(u,v,req,'exchange','{"from":"LT_HP","to":"LT_TP","amount":"1000"}',0);
 r2:=game.play_action(u,v,req,'exchange','{"from":"LT_HP","to":"LT_TP","amount":"1000"}',0);assert r=r2,'idempotent receipt';
 assert (select ls=9000 and lt=1 from game.lives where life_id=v),'exact exchange';
 ok:=false;begin perform game.play_action(u,v,req,'exchange','{"from":"LT_HP","to":"LT_TP","amount":"2000"}',0);exception when sqlstate 'GM000' then ok:=sqlerrm='idempotency_conflict';end;assert ok,'conflicting retry';
 ok:=false;begin perform game.play_action(u,v,gen_random_uuid(),'exchange','{"from":"LT_TP","to":"TN","amount":"1"}',1);exception when sqlstate 'GM000' then ok:=sqlerrm='realm_locked';end;assert ok,'world lock';
 update game.lives set stage_idx=1,tang=1,progress_s=0,last_settle_at=now() where life_id=v;
 r:=game.play_action(u,v,gen_random_uuid(),'refine','{}',1);assert (select ls=8997 from game.lives where life_id=v),'tier1 refine3';
 update game.lives set tang=2,progress_s=0,last_settle_at=now() where life_id=v;
 r:=game.play_action(u,v,gen_random_uuid(),'refine','{}',2);assert (select ls=8991 from game.lives where life_id=v),'tier2 refine6';
 s:=game.play_state(u);assert (select count(*) from jsonb_object_keys(s->'state'->'plots'))=2,'2 initial plots';
 r:=game.play_action(u,v,gen_random_uuid(),'quest_accept','{"id":"Q-HG-01"}',3);
 ok:=false;begin perform game.play_action(u,v,gen_random_uuid(),'quest_claim','{"id":"Q-HG-01"}',4);exception when sqlstate 'GM000' then ok:=sqlerrm='objective_incomplete';end;assert ok,'cannot forge quest completion';
 r:=game.play_action(u,v,gen_random_uuid(),'interact_start','{"id":"Q-HG-01:learn"}',4);
 ok:=false;begin perform game.play_action(u,v,gen_random_uuid(),'task_claim','{}',5);exception when sqlstate 'GM000' then ok:=sqlerrm='not_ready';end;assert ok,'server clock';
 update game.play_lives set state=jsonb_set(state,'{task,ready_at}','0') where life_id=v;
 r:=game.play_action(u,v,gen_random_uuid(),'task_claim','{}',5);
 assert jsonb_array_length((select state->'events' from game.play_lives where life_id=v))=1,'trusted interaction emitted once';
 -- Private RNG cannot be observed via GET.
 update game.play_lives set state=jsonb_set(state,'{jobs,alchemy}','{"success":true,"quality":"supreme","ready_at":9999999999}') where life_id=v;
 s:=game.play_state(u);assert not(s->'state'->'jobs'->'alchemy' ? 'success') and not(s->'state'->'jobs'->'alchemy' ? 'quality'),'craft RNG hidden';
 perform game.play_quota(u,'talisman_attempt',5);perform game.end_life(v,'test');
 assert (select state->'inventory'='{}'::jsonb and state->'jobs'='{}'::jsonb from game.play_lives where life_id=v),'death loses jobs/items';
 assert (select used=1 from game.play_quotas where account_id=u and group_code='talisman_attempt'),'death preserves account quotas';
 assert (select stage_idx=1 and ls=3 from game.lives where account_id=u and status='alive'),'rebirth begins HG01 with3';
end$$;
