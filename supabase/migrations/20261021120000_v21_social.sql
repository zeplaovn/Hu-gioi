-- Preserve original19-NPC saves for audit; only mapped active relationships are displayed.
create table game.social_v11_archive as select * from game.social_lives;
alter table game.social_v11_archive enable row level security;
alter table game.social_v11_archive force row level security;
revoke all on game.social_v11_archive from public,anon,authenticated;
grant select on game.social_v11_archive to service_role;
update game.social_lives set state=jsonb_set(state,array['npcs','NPC-01'],state->'npcs'->'HG_TL_01') where state->'npcs' ? 'HG_TL_01';
update game.social_lives set state=jsonb_set(state,array['npcs','NPC-02'],state->'npcs'->'HG_TVT_02') where state->'npcs' ? 'HG_TVT_02';
update game.social_lives set state=jsonb_set(state,array['npcs','NPC-03'],state->'npcs'->'HG_HSM_02') where state->'npcs' ? 'HG_HSM_02';
update game.social_lives set state=jsonb_set(state,array['npcs','NPC-04'],state->'npcs'->'HG_VDC_04') where state->'npcs' ? 'HG_VDC_04';
update game.social_lives set state=jsonb_set(state,array['npcs','NPC-05'],state->'npcs'->'HG_VDC_03') where state->'npcs' ? 'HG_VDC_03';
update game.social_lives set state=jsonb_set(state,'{offers}','{}');
create or replace function game.social_available(p_life uuid,p_npc text) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from game.lives l join game.stages s on s.idx=l.stage_idx,
 jsonb_array_elements(game.rule('social_content')->'npcs') n where l.life_id=p_life and l.status='alive' and n->>'id'=p_npc and n->'social_content_worlds' ? s.world)
 and coalesce((select available from game.npc_presence where life_id=p_life and npc_id=p_npc),true)
$$;

-- Return only the offered scene and visible choices, never future text or outcome flags.
create or replace function game.social_scene(p_scene text) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('scene_id',s->>'scene_id','title',s->>'title','npc_text',s->>'npc_text',
  'choices',(select jsonb_agg(jsonb_build_object('choice_id',c->>'choice_id','player_text',c->>'player_text'))
   from jsonb_array_elements(s->'choices') c))
 from jsonb_array_elements(game.rule('social_content')->'scenes') s where s->>'scene_id'=p_scene
$$;

create or replace function game.social_state(p_account uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare l game.lives%rowtype; st jsonb; content jsonb:=game.rule('social_content'); result jsonb; today text:=to_char(now() at time zone 'Asia/Ho_Chi_Minh','YYYY-MM-DD');
begin
 select * into l from game.lives where account_id=p_account and status='alive';
 if not found then raise exception 'no_alive_life' using errcode='GM000'; end if;
 select state into st from game.social_lives where life_id=l.life_id;
 st:=coalesce(st,'{"npcs":{},"gifts":{},"offers":{},"completed":{},"flags":{}}');
 select jsonb_agg(n || jsonb_build_object('available',game.social_available(l.life_id,n->>'id'),
  'affection',coalesce((st->'npcs'->(n->>'id')->>'affection')::int,0),
  'trust',coalesce((st->'npcs'->(n->>'id')->>'trust')::int,0),
  'daily_done',coalesce(st->'npcs'->(n->>'id')->>'daily_day'=today,false),
  'gift_done',coalesce(st->'npcs'->(n->>'id')->>'gift_day'=today,false))) into result
 from jsonb_array_elements(content->'npcs') n;
 return jsonb_build_object('life_id',l.life_id,'utc_day',today,'npcs',result,
  'gifts',(select jsonb_agg(g || jsonb_build_object('quantity',coalesce((st->'gifts'->>(g->>'gift_id'))::int,0))) from jsonb_array_elements(content->'gifts') g),
  'offers',coalesce((select jsonb_agg(jsonb_build_object('offer_id',o.key,'npc_id',o.value->>'npc_id','kind',o.value->>'kind',
    'scene',game.social_scene(o.value->>'scene_id'),'gift_id',o.value->>'gift_id'))
   from jsonb_each(st->'offers') o where not (o.value ? 'result') and o.value->>'day'=today
   and game.social_available(l.life_id,o.value->>'npc_id')),'[]'::jsonb));
end $$;

-- One roll per account per eligible UTC day. Do not consume pity with an empty pool.
create or replace function game.social_roll(p_account uuid,p_life uuid,p_st jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare a game.social_accounts%rowtype; pool jsonb; picked jsonb; npc text; today date:=(now() at time zone 'Asia/Ho_Chi_Minh')::date; o text;
begin
 insert into game.social_accounts(account_id) values(p_account) on conflict do nothing;
 select * into a from game.social_accounts where account_id=p_account for update;
 if a.roll_day=today then return p_st; end if;
 select jsonb_agg(s) into pool from jsonb_array_elements(game.rule('social_content')->'scenes') s
 where s->>'kind'='event' and game.social_available(p_life,s->>'npc_id')
 and coalesce((p_st->'npcs'->(s->>'npc_id')->>'affection')::int,0)>=(s->>'min_affection')::int
 and not (p_st->'completed' ? (s->>'scene_id'))
 and (p_st->'npcs'->(s->>'npc_id')->>'event_day' is null or today-(p_st->'npcs'->(s->>'npc_id')->>'event_day')::date>=3);
 if pool is null then return p_st; end if;
 if a.misses<4 and random()>=0.2 then
  update game.social_accounts set roll_day=today,misses=misses+1 where account_id=p_account;
  return p_st;
 end if;
 -- Weighted NPC draw (not weighted scenes, which would favor NPCs with two unseen events).
 select x.id into npc from (select distinct s->>'npc_id' id from jsonb_array_elements(pool) s) x
 order by -ln(greatest(random(),1e-12)) / case when (p_st->'npcs'->x.id->>'affection')::int>=80 then 2.0
  when (p_st->'npcs'->x.id->>'affection')::int>=50 then 1.5 else 1.0 end limit 1;
 select s into picked from jsonb_array_elements(pool) s where s->>'npc_id'=npc order by random() limit 1;
 o:=gen_random_uuid()::text;
 p_st:=jsonb_set(p_st,array['offers',o],jsonb_build_object('npc_id',npc,'scene_id',picked->>'scene_id','kind','event','day',today::text));
 p_st:=jsonb_set(p_st,array['npcs',npc,'event_day'],to_jsonb(today::text));
 update game.social_accounts set roll_day=today,misses=0 where account_id=p_account;
 return p_st;
end $$;

-- p_life prevents a request sent in an old life from applying to a new one.
-- The life row serializes all social mutations, including inventory consumption and reward.
create or replace function game.social_action(p_account uuid,p_life uuid,p_kind text,p_npc text default '',p_id text default '',p_choice text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 l game.lives%rowtype; st jsonb; n jsonb; s jsonb; c jsonb; offer jsonb; result jsonb; pref jsonb;
 content jsonb:=game.rule('social_content'); today text:=to_char(now() at time zone 'Asia/Ho_Chi_Minh','YYYY-MM-DD');
 oid text; npc text:=p_npc; k text; gift text; seen jsonb; scene_id text; aff int; trust int;
begin
 select * into l from game.lives where life_id=p_life and account_id=p_account for update;
 if not found or l.status<>'alive' then raise exception 'life_ended' using errcode='GM000'; end if;
 insert into game.social_lives(life_id) values(l.life_id) on conflict do nothing;
 select state into st from game.social_lives where life_id=l.life_id;
 if p_kind in ('choose','gift_confirm') then
  offer:=st->'offers'->p_id;
  if offer is null then raise exception 'offer_not_found' using errcode='GM000'; end if;
  if offer ? 'result' then return offer->'result'; end if;
  if offer->>'day'<>today then raise exception 'offer_expired' using errcode='GM000'; end if;
  npc:=offer->>'npc_id';
 end if;
 if not exists(select 1 from jsonb_array_elements(content->'npcs') x where x->>'id'=npc) then
  raise exception 'npc_not_found' using errcode='GM000';
 end if;
 if not game.social_available(l.life_id,npc) then raise exception 'npc_unavailable' using errcode='GM000'; end if;
 n:=coalesce(st->'npcs'->npc,'{"affection":0,"trust":0,"seen":[],"gift_days":{}}');
 st:=jsonb_set(st,array['npcs',npc],n);
 if p_kind in ('daily','story','gift_prepare') then
  k:=case when p_kind='gift_prepare' then 'gift' else p_kind end;
  if k='daily' and n->>'daily_day'=today or k='gift' and n->>'gift_day'=today then
   raise exception 'daily_limit' using errcode='GM000';
  end if;
  -- Reopening a dialogue never redraws it. Gift preparation can be replaced without consumption.
  select x.key,x.value into oid,offer from jsonb_each(st->'offers') x
   where x.value->>'npc_id'=npc and x.value->>'kind'=k and x.value->>'day'=today and not (x.value ? 'result') limit 1;
  if oid is not null and k<>'gift' then
   return jsonb_build_object('offer_id',oid,'kind',k,'npc_id',npc,'scene',game.social_scene(offer->>'scene_id'),'gift_id',offer->>'gift_id');
  end if;
  if k='daily' then
   seen:=n->'seen';
   if jsonb_array_length(seen)>=4 then seen:='[]'; end if;
   select x into s from jsonb_array_elements(content->'scenes') x where x->>'kind'='daily' and x->>'npc_id'=npc
    and not (seen ? (x->>'scene_id')) order by random() limit 1;
   n:=jsonb_set(n,'{seen}',seen||jsonb_build_array(s->>'scene_id'));
  elsif k='story' then
   select x into s from jsonb_array_elements(content->'scenes') x where x->>'kind'='story' and x->>'npc_id'=npc
    and not (st->'completed' ? (x->>'scene_id')) order by (x->>'scene_index')::int limit 1;
   if s is null then raise exception 'story_complete' using errcode='GM000'; end if;
   if (n->>'affection')::int < (s->>'min_affection')::int then raise exception 'relationship_required' using errcode='GM000'; end if;
   if s->>'prerequisite'<>'npc_met' and not (st->'completed' ? regexp_replace(s->>'prerequisite','_completed$','')) then
    raise exception 'story_locked' using errcode='GM000';
   end if;
  else
   if not exists(select 1 from jsonb_array_elements(content->'gifts') x where x->>'gift_id'=p_id) then raise exception 'gift_not_found' using errcode='GM000'; end if;
   if coalesce((st->'gifts'->>p_id)::int,0)<1 then raise exception 'insufficient_gift' using errcode='GM000'; end if;
   if n->'gift_days'->>p_id is not null and today::date-(n->'gift_days'->>p_id)::date<3 then raise exception 'gift_cooldown' using errcode='GM000'; end if;
   -- Invalidate the previous gift offer, so a cancelled confirmation cannot later consume a gift.
   if oid is not null then st:=st #- array['offers',oid]; end if;
  end if;
  oid:=gen_random_uuid()::text;
  offer:=jsonb_build_object('npc_id',npc,'kind',k,'day',today,'scene_id',s->>'scene_id','gift_id',case when k='gift' then p_id else null end);
  st:=jsonb_set(st,array['offers',oid],offer);
  st:=jsonb_set(st,array['npcs',npc],n);
  update game.social_lives set state=st where life_id=l.life_id;
  return jsonb_build_object('offer_id',oid,'kind',k,'npc_id',npc,'scene',game.social_scene(s->>'scene_id'),'gift_id',offer->>'gift_id');
 elsif p_kind in ('choose','gift_confirm') then
  k:=offer->>'kind';
  if p_kind='gift_confirm' then
   if k<>'gift' then raise exception 'invalid_offer' using errcode='GM000'; end if;
   if n->>'gift_day'=today then raise exception 'daily_limit' using errcode='GM000'; end if;
   gift:=offer->>'gift_id';
   if coalesce((st->'gifts'->>gift)::int,0)<1 then raise exception 'insufficient_gift' using errcode='GM000'; end if;
   if n->'gift_days'->>gift is not null and today::date-(n->'gift_days'->>gift)::date<3 then raise exception 'gift_cooldown' using errcode='GM000'; end if;
   select x into pref from jsonb_array_elements(content->'preferences') x where x->>'npc_id'=npc and x->>'gift_id'=gift;
   pref:=coalesce(pref,'{"affection_delta":1,"trust_delta":0,"npc_reply":"Cảm ơn lòng thành của ngươi.","preference":"neutral"}');
   c:=pref;
   st:=jsonb_set(st,array['gifts',gift],to_jsonb((st->'gifts'->>gift)::int-1));
   n:=jsonb_set(n,'{gift_day}',to_jsonb(today));
   n:=jsonb_set(n,array['gift_days',gift],to_jsonb(today));
  else
   if k not in ('daily','story','event') then raise exception 'invalid_offer' using errcode='GM000'; end if;
   scene_id:=offer->>'scene_id';
   select x into s from jsonb_array_elements(content->'scenes') x where x->>'scene_id'=scene_id;
   select x into c from jsonb_array_elements(s->'choices') x where x->>'choice_id'=p_choice;
   if c is null then raise exception 'invalid_choice' using errcode='GM000'; end if;
   if k='story' and (n->>'affection')::int < (s->>'min_affection')::int then
    raise exception 'relationship_required' using errcode='GM000';
   end if;
   if k='daily' then
    if n->>'daily_day'=today then raise exception 'daily_limit' using errcode='GM000'; end if;
    n:=jsonb_set(n,'{daily_day}',to_jsonb(today));
   else
    if st->'completed' ? scene_id then raise exception 'already_completed' using errcode='GM000'; end if;
    st:=jsonb_set(st,array['completed',scene_id],to_jsonb(p_choice));
   end if;
   -- Flags describe choices/candidates only. They do not grant endings, quest artifacts or ascension.
   if c->>'story_flag' is not null then st:=jsonb_set(st,array['flags',c->>'story_flag'],'true'); end if;
   -- Only seen dialogue IDs persist as account lore; no future narrative is exposed.
   insert into game.social_accounts(account_id,lore) values(p_account,jsonb_build_object(scene_id,true))
    on conflict(account_id) do update set lore=game.social_accounts.lore||excluded.lore;
  end if;
  aff:=greatest(-100,least(100,(n->>'affection')::int+(c->>'affection_delta')::int));
  trust:=greatest(-100,least(100,(n->>'trust')::int+(c->>'trust_delta')::int));
  result:=jsonb_build_object('npc_reply',c->>'npc_reply','affection',aff,'trust',trust,
   'affection_delta',aff-(n->>'affection')::int,'trust_delta',trust-(n->>'trust')::int);
  n:=n||jsonb_build_object('affection',aff,'trust',trust);
  st:=jsonb_set(st,array['npcs',npc],n);
  st:=jsonb_set(st,array['offers',p_id,'result'],result);
  st:=game.social_roll(p_account,l.life_id,st);
  update game.social_lives set state=st where life_id=l.life_id;
  return result;
 elsif p_kind='gift_cancel' then
  offer:=st->'offers'->p_id;
  if offer->>'npc_id' is distinct from npc or offer->>'kind' is distinct from 'gift' then raise exception 'invalid_offer' using errcode='GM000'; end if;
  if offer ? 'result' then raise exception 'already_completed' using errcode='GM000'; end if;
  update game.social_lives set state=st #- array['offers',p_id] where life_id=l.life_id;
  return '{"cancelled":true}';
 end if;
 raise exception 'invalid_social_action' using errcode='GM000';
end $$;

-- Physical gifts and relationship state are removed on true death, not on ascension.
create or replace function game.social_death_cleanup() returns trigger language plpgsql set search_path='' as $$
begin
 if new.status='dead' and old.status<>'dead' then
  delete from game.social_lives where life_id=new.life_id;
  delete from game.npc_presence where life_id=new.life_id;
 end if;
 return new;
end $$;
drop trigger if exists social_death_cleanup on game.lives;
create trigger social_death_cleanup after update of status on game.lives for each row execute function game.social_death_cleanup();

do $$ declare f record; begin
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='game' and p.proname like 'social_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',f.sig);
  execute format('grant execute on function %s to service_role',f.sig);
 end loop;
end $$;


alter function game.social_action(uuid,uuid,text,text,text,text) rename to social_action_v11;
create function game.social_action(p_account uuid,p_life uuid,p_kind text,p_npc text default '',p_id text default '',p_choice text default '') returns jsonb language plpgsql set search_path='' as $$
declare o jsonb;st jsonb;result jsonb;k text;n text;begin
 perform 1 from game.lives where life_id=p_life and account_id=p_account for update;
 select state into st from game.social_lives where life_id=p_life for update;
 if p_kind in('choose','gift_confirm') then
  o:=st->'offers'->p_id;if o ? 'result' then return game.social_action_v11(p_account,p_life,p_kind,p_npc,p_id,p_choice);end if;
  k:=o->>'kind';n:=o->>'npc_id';
  if k in('daily','gift') then perform game.play_quota(p_account,'social:'||k||':'||n,1);end if;
 end if;
 result:=game.social_action_v11(p_account,p_life,p_kind,p_npc,p_id,p_choice);return result;
end$$;
insert into game.play_quotas(account_id,group_code,period,used)
 select l.account_id,'social:'||g.kind||':'||n.key,game.play_day(),1 from game.social_lives s join game.lives l using(life_id),jsonb_each(s.state->'npcs') n cross join lateral (values('daily'),('gift')) g(kind)
 where n.key like 'NPC-%' and n.value->>(g.kind||'_day')>=to_char(now() at time zone 'UTC','YYYY-MM-DD') on conflict do nothing;
do $$declare p record;begin for p in select oid::regprocedure::text sig from pg_proc where pronamespace='game'::regnamespace loop execute 'revoke all on function '||p.sig||' from public,anon,authenticated';execute 'grant execute on function '||p.sig||' to service_role';end loop;end$$;
