begin;
-- v2.1 playable systems. All mutations run inside one RPC transaction.
create table game.play_lives(life_id uuid primary key references game.lives on delete cascade,state jsonb not null default '{"inventory":{},"plots":{"1":{},"2":{}},"xp":{},"jobs":{},"quests":{},"events":[],"equipment":{},"flags":{},"sect":"","contribution":0,"node":"HG.SECT"}',version bigint not null default 0);
create table game.play_accounts(account_id uuid primary key references game.accounts on delete cascade,knowledge jsonb not null default '{}');
create table game.play_receipts(account_id uuid references game.accounts on delete cascade,request_id uuid not null,payload jsonb not null,result jsonb not null,primary key(account_id,request_id));
create table game.play_quotas(account_id uuid references game.accounts on delete cascade,group_code text,period text,used int not null check(used>=0),primary key(account_id,group_code,period));
create table game.money_ledger(id bigint generated always as identity primary key,life_id uuid,request_id uuid,currency text check(currency in('LT_HP','LT_TP','TN')),delta numeric(78,0) not null,balance_after numeric(78,0) not null check(balance_after>=0),reason text not null,created_at timestamptz default now());
create table game.server_auctions(id uuid primary key default gen_random_uuid(),seller uuid not null references game.lives,item jsonb not null,currency text not null,opening numeric(78,0) not null check(opening>0),price numeric(78,0) not null default 0,buyout numeric(78,0),bidder uuid references game.lives,ends_at timestamptz not null,original_end timestamptz not null,state text not null default 'OPEN' check(state in('OPEN','SOLD','EXPIRED','CANCELLED','LOST')),version bigint not null default 0);
do $$declare t text;begin foreach t in array array['play_lives','play_accounts','play_receipts','play_quotas','money_ledger','server_auctions'] loop execute format('alter table game.%I enable row level security',t);execute format('alter table game.%I force row level security',t);execute format('revoke all on game.%I from public,anon,authenticated',t);execute format('grant select,insert,update,delete on game.%I to service_role',t);end loop;end$$;

create function game.play_data(p_key text) returns jsonb language sql stable set search_path='' as $$ select game.rule('v21')->p_key $$;
create function game.play_find(p_key text,p_id text) returns jsonb language sql stable set search_path='' as $$ select x from jsonb_array_elements(game.play_data(p_key)) x where coalesce(x->>'id',x->>'item_id',x->>'seed_item_id')=p_id limit 1 $$;
create function game.play_day() returns text language sql stable set search_path='' as $$select to_char(now() at time zone 'Asia/Ho_Chi_Minh','YYYY-MM-DD')$$;
create function game.play_period(p_repeat text) returns text language sql stable set search_path='' as $$select case when p_repeat='weekly' then to_char(now() at time zone 'Asia/Ho_Chi_Minh','IYYY-IW') else game.play_day() end$$;
create function game.play_currency(p_world text) returns text language sql immutable set search_path='' as $$select case p_world when 'Hạ Giới' then 'LT_HP' when 'Linh Giới' then 'LT_TP' else 'TN' end$$;
create function game.play_stage(p_id text) returns int language sql stable set search_path='' as $$select idx::int from game.stages where stage_id=p_id$$;
create function game.play_tradeable(p_item jsonb) returns boolean language sql immutable set search_path='' as $$select p_item is not null and coalesce(p_item->>'trade','Có') not in('Không','false') and p_item->>'item_type'<>'social_gift'$$;
create function game.play_money(p_life uuid,p_currency text,p_delta numeric,p_request uuid,p_reason text) returns void language plpgsql set search_path='' as $$
#variable_conflict use_column
declare n numeric;begin
 if p_currency not in('LT_HP','LT_TP','TN') or p_delta<>trunc(p_delta) then raise exception 'invalid_currency' using errcode='GM000';end if;
 select case p_currency when 'LT_HP' then ls when 'LT_TP' then lt else tn end+p_delta into n from game.lives where life_id=p_life for update;
 if n<0 then raise exception 'insufficient_currency' using errcode='GM000';end if;
 if n>=power(10::numeric,78) then raise exception 'money_overflow' using errcode='GM000';end if;
 update game.lives set ls=case when p_currency='LT_HP' then n else ls end,lt=case when p_currency='LT_TP' then n else lt end,tn=case when p_currency='TN' then n else tn end where life_id=p_life;
 insert into game.money_ledger(life_id,request_id,currency,delta,balance_after,reason) values(p_life,p_request,p_currency,p_delta,n,p_reason);
end$$;
create function game.play_quota(p_account uuid,p_group text,p_limit int,p_period text default null,p_count int default 1) returns void language plpgsql set search_path='' as $$
#variable_conflict use_column
declare n int;begin
 insert into game.play_quotas values(p_account,p_group,coalesce(p_period,game.play_day()),p_count) on conflict(account_id,group_code,period) do update set used=game.play_quotas.used+excluded.used returning used into n;
 if n>p_limit then raise exception 'daily_limit' using errcode='GM000';end if;
end$$;
create function game.play_level(p_xp int) returns int language plpgsql immutable set search_path='' as $$declare n int:=1;e int:=p_xp;begin while n<20 and e>=20*n loop e:=e-20*n;n:=n+1;end loop;return n;end$$;
create function game.play_exp(p_state jsonb,p_account uuid,p_prof text,p_amount int) returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_column
declare n int;v int;begin
 select used into n from game.play_quotas where account_id=p_account and group_code='exp:'||p_prof and period=game.play_day();v:=least(p_amount,1000-coalesce(n,0));
 if v<=0 then return p_state;end if;perform game.play_quota(p_account,'exp:'||p_prof,1000,null,v);
 return jsonb_set(p_state,array['xp',p_prof],to_jsonb(least(3800,coalesce((p_state->'xp'->>p_prof)::int,0)+v)),true);
end$$;
create function game.play_give(p_state jsonb,p_item text,p_quantity int,p_bound text default '',p_quality text default 'common') returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_column
declare loc text;id text:=gen_random_uuid()::text;begin
 if coalesce(p_bound,'')='' and (not game.play_tradeable(game.play_find('item_catalog',p_item)) or game.play_find('acquisition_rules',p_item)->>'trade_policy'='bound') then p_bound:='nontradeable';end if;
 if p_quantity<1 or game.play_find('item_catalog',p_item) is null then raise exception 'invalid_item' using errcode='GM000';end if;
 select case when count(*)>=20 then 'inbox' else 'inventory' end into loc from jsonb_each(p_state->'inventory') x where x.value->>'location'='inventory' and (x.value->>'quantity')::int>0;
 return jsonb_set(p_state,array['inventory',id],jsonb_build_object('item_id',p_item,'quantity',p_quantity,'quality',p_quality,'bound',p_bound,'location',loc,'acquired_at',extract(epoch from now()),'trade_unlock_at',extract(epoch from now())),true);
end$$;
create function game.play_take(p_state jsonb,p_instance text,p_quantity int) returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_column
declare i jsonb:=p_state->'inventory'->p_instance;begin
 if p_quantity<1 or i is null or i->>'location'<>'inventory' or coalesce((i->>'quantity')::int,0)<p_quantity then raise exception 'insufficient_item' using errcode='GM000';end if;
 if (i->>'quantity')::int=p_quantity then return p_state #- array['inventory',p_instance];end if;
 return jsonb_set(p_state,array['inventory',p_instance,'quantity'],to_jsonb((i->>'quantity')::int-p_quantity));
end$$;
create function game.play_quality(p_level int,p_catalyst boolean default false,p_bonus int default 0) returns text language plpgsql volatile set search_path='' as $$
#variable_conflict use_column
declare shift int:=least(4000,greatest(0,p_level-1)*100+case when p_catalyst then 1000 else 0 end+p_bonus);r int:=floor(game.roll()*10000);begin
 if r<8000-shift then return 'common';elsif r<9500-shift*0.3 then return 'fine';elsif r<9950-shift*0.05 then return 'superior';else return 'supreme';end if;end$$;

-- Trusted events are persisted only by validated gameplay branches below, never from raw client reports.
create function game.play_event(p_state jsonb,p_type text,p_target text,p_payload jsonb default '{}') returns jsonb language plpgsql set search_path='' as $$
begin return jsonb_set(p_state,'{events}',coalesce(p_state->'events','[]')||jsonb_build_array(jsonb_build_object('type',p_type,'target',p_target,'payload',p_payload,'at',extract(epoch from now()),'id',gen_random_uuid())));end$$;
create function game.play_objective(p_node jsonb,p_events jsonb,p_since numeric) returns boolean language plpgsql stable set search_path='' as $$
#variable_conflict use_column
declare c jsonb;n int;v bool;key text:=p_node->'filters'->>'distinct_resource_key';begin
 if p_node ? 'operator' then v:=p_node->>'operator'='all';for c in select value from jsonb_array_elements(p_node->'children') loop if p_node->>'operator'='all' then v:=v and game.play_objective(c,p_events,p_since);else v:=v or game.play_objective(c,p_events,p_since);end if;end loop;return v;end if;
 select case when key is not null then count(distinct e->'payload'->>key) else count(*) end into n from jsonb_array_elements(p_events) e where e->>'type'=p_node->>'event_type' and e->>'target'=p_node->>'target_id' and (e->>'at')::numeric>=p_since;
 return n>=coalesce((p_node->>'required_count')::int,1);
end$$;

create function game.play_state(p_account uuid) returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_column
declare l game.lives%rowtype;st jsonb;ver bigint;k jsonb;w text;begin
 select * into l from game.lives where account_id=p_account and status in('alive','cleared') order by life_no desc limit 1;
 if not found then return null;end if;
 insert into game.play_lives(life_id) values(l.life_id) on conflict do nothing;
 insert into game.play_accounts(account_id) values(p_account) on conflict do nothing;
 select state,version into st,ver from game.play_lives where life_id=l.life_id;select knowledge into k from game.play_accounts where account_id=p_account;select world into w from game.stages where idx=l.stage_idx;
 -- Never disclose private craft RNG before completion.
 st:=jsonb_set(st,'{jobs}',coalesce((select jsonb_object_agg(key,value-'success'-'quality') from jsonb_each(st->'jobs')),'{}'));
 return jsonb_build_object('version',ver,'life_id',l.life_id,'state',st,'knowledge',k,'server_day',game.play_day(),'wallet',jsonb_build_object('LT_HP',l.ls::text,'LT_TP',l.lt::text,'TN',l.tn::text),
 'acquisition',game.play_data('acquisition_rules'),'encounters',game.play_data('combat')->'encounters','skills',game.play_data('combat')->'player_skills','catalog',game.play_data('item_catalog'),'prices',game.play_data('price_book'),'recipes',game.play_data('crafting_recipes'),'seeds',game.play_data('planting_recipes'),'plots',game.play_data('garden_plots'),'venues',game.play_data('venues'),'stock',game.play_data('venue_stock'),'quests',game.play_data('quests'),'interactions',game.play_data('quest_interactions'),'nodes',game.play_data('world_nodes'),'sect_shop',game.play_data('sect_shop'),
 'auctions',coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object('opening',a.opening::text,'price',a.price::text,'buyout',a.buyout::text)) from (select * from game.server_auctions where state='OPEN' order by ends_at limit 100) a),'[]'));
end$$;
create table game.trade_budgets(account_id uuid references game.accounts,day text,limit_hp numeric(78,0) not null,spent_hp numeric(78,0) not null default 0,primary key(account_id,day));
create table game.trade_holds(auction_id uuid references game.server_auctions,account_id uuid references game.accounts,day text,value_hp numeric(78,0) not null,primary key(auction_id,account_id));
create function game.play_rate(p_currency text) returns numeric language sql immutable set search_path='' as $$select case p_currency when 'LT_HP' then 1 when 'LT_TP' then 1000 when 'TN' then 1000000 else null end::numeric$$;
create function game.play_trade_hold(p_account uuid,p_life uuid,p_auction uuid,p_value numeric) returns void language plpgsql set search_path='' as $$
#variable_conflict use_column
declare cap numeric;spent numeric;held numeric;begin
 insert into game.trade_budgets(account_id,day,limit_hp) select p_account,game.play_day(),floor((l.ls+l.lt*1000+l.tn*1000000+coalesce((select sum((x.value->>'quantity')::numeric*(game.play_find('price_book',x.value->>'item_id')->>'reference_price')::numeric*game.play_rate(game.play_find('price_book',x.value->>'item_id')->>'currency')) from game.play_lives pl,jsonb_each(pl.state->'inventory') x where pl.life_id=p_life),0))*.2) from game.lives l where life_id=p_life on conflict do nothing;
 select limit_hp,spent_hp into cap,spent from game.trade_budgets where account_id=p_account and day=game.play_day() for update;
 select coalesce(sum(value_hp),0) into held from game.trade_holds where account_id=p_account and day=game.play_day() and auction_id<>p_auction;
 if spent+held+p_value>cap then raise exception 'trade_budget' using errcode='GM000';end if;
 insert into game.trade_holds values(p_auction,p_account,game.play_day(),p_value) on conflict(auction_id,account_id) do update set day=excluded.day,value_hp=excluded.value_hp;
end$$;
create function game.play_auction_settle(p_auction uuid,p_request uuid,p_buyout boolean default false) returns void language plpgsql set search_path='' as $$
#variable_conflict use_column
declare a game.server_auctions%rowtype;st jsonb;oldinv jsonb;lid uuid;aid uuid;delivery text;begin
 select * into a from game.server_auctions where id=p_auction for update;if not found or a.state<>'OPEN' then return;end if;
 if not p_buyout and now()<a.ends_at then raise exception 'not_ready' using errcode='GM000';end if;
 if not exists(select 1 from game.lives where life_id=a.seller and status='alive') then raise exception 'seller_dead' using errcode='GM000';end if;
 if a.bidder is null then lid:=a.seller;else
  if not exists(select 1 from game.lives where life_id=a.bidder and status='alive') then raise exception 'bidder_dead' using errcode='GM000';end if;lid:=a.bidder;
  perform game.play_money(a.seller,a.currency,a.price-floor(a.price*.05),p_request,'auction_sale');
  select account_id into aid from game.lives where life_id=a.bidder;
  update game.trade_budgets b set spent_hp=spent_hp+h.value_hp from game.trade_holds h where h.auction_id=a.id and h.account_id=b.account_id and h.day=b.day;
 end if;
 insert into game.play_lives(life_id) values(lid) on conflict do nothing;select state into st from game.play_lives where life_id=lid for update;
 oldinv:=st->'inventory';st:=game.play_give(st,a.item->>'item_id',(a.item->>'quantity')::int,'',a.item->>'quality');
 select x.key into delivery from jsonb_each(st->'inventory') x where not(oldinv ? x.key) limit 1;
 if a.bidder is not null then st:=jsonb_set(st,array['inventory',delivery,'trade_unlock_at'],to_jsonb(extract(epoch from now()+interval '24 hours')));end if;
 update game.play_lives set state=st,version=version+1 where life_id=lid;
 delete from game.trade_holds where auction_id=a.id;
 update game.server_auctions set state=case when a.bidder is null then 'EXPIRED' else 'SOLD' end,version=version+1 where id=a.id;
end$$;

create function game.play_actor(p_kind text,p_source jsonb) returns jsonb language sql immutable set search_path='' as $$select jsonb_build_object('kind',p_kind,'maxhp',(p_source->>'hp')::numeric,'hp',(p_source->>'hp')::numeric,'atk',(p_source->>'atk')::numeric,'defense',(p_source->>'defense')::numeric,'spirit',(p_source->>'spirit')::numeric,'spd',(p_source->>'spd')::numeric,'acc',coalesce((p_source->>'acc')::numeric,100),'eva',coalesce((p_source->>'eva')::numeric,100),'crit',coalesce((p_source->>'crit')::numeric,.05),'pen',coalesce((p_source->>'pen')::numeric,0),'res',coalesce((p_source->>'res')::numeric,0),'crit_damage',coalesce((p_source->>'crit_damage')::numeric,1.5),'element',p_source->>'element','shield',0,'statuses','{}'::jsonb,'cooldowns','{}'::jsonb)$$;
create function game.play_status(p_actor jsonb,p_status text,p_turns int,p_mechanic boolean default false) returns jsonb language plpgsql immutable set search_path='' as $$declare sid text:=p_status;old jsonb;begin
 if p_actor->>'kind'='monster' and sid in('STUN','SILENCE') then sid:='SLOW';end if;old:=p_actor->'statuses'->sid;
 return jsonb_set(p_actor,array['statuses',sid],jsonb_build_object('boss_mechanic',p_mechanic or coalesce((old->>'boss_mechanic')::boolean,false),'stacks',least(case when sid in('BLEED','POISON','BURN') then 2 else 1 end,coalesce((old->>'stacks')::int,0)+1),'turns',greatest(coalesce((old->>'turns')::int,0),p_turns)));
end$$;
create function game.play_dots(p_actor jsonb) returns jsonb language plpgsql immutable set search_path='' as $$declare e record;d numeric:=0;a jsonb:=p_actor;begin
 for e in select * from jsonb_each(a->'statuses') loop
  if e.key in('BLEED','POISON','BURN') then d:=d+(a->>'maxhp')::numeric*.015*(e.value->>'stacks')::int;end if;
 end loop;return jsonb_set(a,'{hp}',to_jsonb(greatest(0,(a->>'hp')::numeric-least(floor((a->>'maxhp')::numeric*.03),floor(d)))));
end$$;
create function game.play_status_tick(p_actor jsonb) returns jsonb language plpgsql immutable set search_path='' as $$declare e record;a jsonb:=p_actor;begin
 for e in select * from jsonb_each(a->'statuses') loop if (e.value->>'turns')::int<=1 then a:=a #- array['statuses',e.key];else a:=jsonb_set(a,array['statuses',e.key,'turns'],to_jsonb((e.value->>'turns')::int-1));end if;end loop;return a;
end$$;
create function game.play_strike(p_att jsonb,p_def jsonb,p_coefficient numeric,p_baseline numeric,p_guard boolean default false,p_reduction numeric default 0,p_element_res numeric default 0,p_hp_cap numeric default null) returns jsonb language plpgsql volatile set search_path='' as $$
#variable_conflict use_column
declare hit numeric;damage numeric;defense numeric;crit boolean;shield numeric;begin
 hit:=least(.99,greatest(.35,.90+.002*((p_att->>'acc')::numeric-case when p_att->'statuses' ? 'BLIND' then 16 else 0 end-(p_def->>'eva')::numeric)));
 if game.roll()>=hit then return jsonb_build_object('target',p_def,'damage',0,'hit',false);end if;
 defense:=(p_def->>'defense')::numeric*(1-least(.60,(p_att->>'pen')::numeric))*case when p_def->'statuses' ? 'WEAKEN' then .84 else 1 end;
 crit:=game.roll()<least(.75,(p_att->>'crit')::numeric);
 damage:=greatest(1,round((p_att->>'atk')::numeric*p_coefficient*(1-defense/(defense+greatest(1,p_baseline*1.5)))*(1-least(.65,greatest(-.25,p_element_res)))*(0.95+game.roll()*.1)*case when crit then least(2.75,(p_att->>'crit_damage')::numeric) else 1 end*(1-p_reduction)*case when p_guard then .55 else 1 end));
 if p_hp_cap is not null then damage:=least(damage,floor((p_def->>'maxhp')::numeric*p_hp_cap));end if;
 shield:=least(damage,(p_def->>'shield')::numeric);p_def:=jsonb_set(p_def,'{shield}',to_jsonb((p_def->>'shield')::numeric-shield));damage:=damage-shield;
 return jsonb_build_object('target',jsonb_set(p_def,'{hp}',to_jsonb(greatest(0,(p_def->>'hp')::numeric-damage))),'damage',damage,'hit',true,'crit',crit);
end$$;
-- Apply phases from immutable base stats. Entry effects are never stacked a second time.
create function game.play_phase(p_battle jsonb) returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_column
declare b jsonb:=p_battle;row jsonb;o jsonb;p jsonb:=b->'player';e jsonb:=b->'enemy';phase int:=coalesce((b->>'phase')::int,0);nextphase int:=phase;stat text;delta numeric;active jsonb:='[]';turn int:=(b->>'turn')::int;begin
 for row in select x from jsonb_array_elements(game.play_data('combat')->'phase_effects') x where x->>'monster_id'=b->>'monster_id' order by (x->>'phase')::int loop
  if (e->>'hp')::numeric/(e->>'maxhp')::numeric*100<=split_part(row->>'hp_pct_range','-',1)::numeric then
   nextphase:=(row->>'phase')::int;active:=row->'ops';
   if nextphase>phase then
    for o in select value from jsonb_array_elements(active) loop
     if o->>'op'='enter_shield' then e:=jsonb_set(e,'{shield}',to_jsonb((e->>'shield')::numeric+floor((e->>'maxhp')::numeric*(o->>'amount_bp')::numeric/10000)));
     elsif o->>'op'='enter_status' then p:=game.play_status(p,o->>'status',(o->>'turns')::int,true);end if;
    end loop;b:=jsonb_set(b,'{phase_start}',to_jsonb(turn));
   end if;
  end if;
 end loop;
 -- Monotonic phase: healing never re-enters an earlier phase.
 if nextphase<phase then nextphase:=phase;select x->'ops' into active from jsonb_array_elements(game.play_data('combat')->'phase_effects') x where x->>'monster_id'=b->>'monster_id' and (x->>'phase')::int=phase;end if;
 for stat in select unnest(array['atk','defense','spirit','spd','acc','eva','crit','pen','res','crit_damage']) loop e:=jsonb_set(e,array[stat],b->'enemy_base'->stat);p:=jsonb_set(p,array[stat],b->'player_base'->stat);end loop;
 for o in select value from jsonb_array_elements(active) loop
  stat:=o->>'stat';
  if o->>'op'='stat_percent' then delta:=case when stat in('crit','pen','res') then (o->>'amount_bp')::numeric/10000 else (e->>stat)::numeric*(o->>'amount_bp')::numeric/10000 end;e:=jsonb_set(e,array[stat],to_jsonb((e->>stat)::numeric+delta));
  elsif o->>'op'='stat_flat' then e:=jsonb_set(e,array[stat],to_jsonb((e->>stat)::numeric+(o->>'amount')::numeric));
  elsif o->>'op'='ramp' then delta:=least((o->>'cap_bp')::int,((turn-coalesce((b->>'phase_start')::int,turn))/(o->>'every_turns')::int)*(o->>'step_bp')::int);e:=jsonb_set(e,array[stat],to_jsonb((b->'enemy_base'->>stat)::numeric*(1+delta/10000)));
  elsif o->>'op'='attack_from_spirit' then e:=jsonb_set(e,'{atk}',e->'spirit');
  elsif o->>'op'='target_stat_percent' then p:=jsonb_set(p,array[stat],to_jsonb((p->>stat)::numeric*(1+(o->>'amount_bp')::numeric/10000)));
  elsif o->>'op'='target_crit_cap' then p:=jsonb_set(p,'{crit}',to_jsonb(least((p->>'crit')::numeric,(o->>'cap_bp')::numeric/10000)));
  elsif o->>'op'='rotate_status' and (turn-coalesce((b->>'phase_start')::int,turn))%(o->>'every_turns')::int=0 then p:=game.play_status(p,o->'statuses'->>((turn-coalesce((b->>'phase_start')::int,turn))/(o->>'every_turns')::int)%jsonb_array_length(o->'statuses'),1,true);
  elsif o->>'op'='attack_element' then e:=jsonb_set(e,'{element}',o->'element');end if;
 end loop;
 return b||jsonb_build_object('player',p,'enemy',e,'phase',nextphase,'ops',active);
end$$;

create function game.play_sources(p_state jsonb,p_account uuid,p_source text) returns jsonb language plpgsql set search_path='' as $$
declare st jsonb:=p_state;r jsonb;period text;groupid text;lid uuid;begin
 select life_id into lid from game.lives where account_id=p_account and status='alive';
 for r in select x from jsonb_array_elements(game.play_data('acquisition_rules')) x where x->>'source_id'=p_source and x->>'source_kind' in('bound_quest_or_boss','weekly_boss_guaranteed','sect_task_bound_reward') loop
  if r ? 'requires_lineage' and r->>'requires_lineage'<>st->>'sect' then continue;end if;
  period:=case when r ? 'per_account_week_cap' then game.play_period('weekly') else lid::text end;groupid:='source:'||(r->>'item_id');
  if coalesce((select used from game.play_quotas where account_id=p_account and group_code=groupid and game.play_quotas.period=play_sources.period),0)>0 then continue;end if;
  perform game.play_quota(p_account,groupid,1,period);st:=game.play_give(st,r->>'item_id',1,'unique_source');
 end loop;return st;
end$$;

create function game.play_action(p_account uuid,p_life uuid,p_request uuid,p_action text,p_args jsonb,p_version bigint) returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_column
declare
 l game.lives%rowtype;st jsonb;old game.play_receipts%rowtype;ver bigint;w text;cur text;i jsonb;r jsonb;q jsonb;c jsonb;j jsonb;k jsonb;v jsonb;out jsonb:='{}';payload jsonb;id text;prof text;period text;code text;res text;slot text;quality text;arr jsonb;inst jsonb;input jsonb;have jsonb;expected jsonb;now_s numeric:=extract(epoch from now());amount numeric;cost numeric;qty int;lv int;bp int;shift int;cut int;xp int;n int;success boolean;bind text;
begin
 -- Initial beta serializes cross-account transactions with a shared lock; no partial escrow/death commits.
 perform pg_advisory_xact_lock(210021);
 payload:=jsonb_build_object('life',p_life,'action',p_action,'args',p_args,'version',p_version);
 select * into old from game.play_receipts where account_id=p_account and request_id=p_request;
 if found then if old.payload<>payload then raise exception 'idempotency_conflict' using errcode='GM000';end if;return old.result;end if;
 select * into l from game.lives where life_id=p_life and account_id=p_account for update;
 if not found or l.status<>'alive' then raise exception 'life_ended' using errcode='GM000';end if;
 perform game.settle_life(l.life_id);
 select * into l from game.lives where life_id=p_life;
 insert into game.play_lives(life_id) values(p_life) on conflict do nothing;insert into game.play_accounts(account_id) values(p_account) on conflict do nothing;
 select state,version into st,ver from game.play_lives where life_id=p_life for update;
 if p_version<>ver then raise exception 'state_stale' using errcode='GM000';end if;
 if st ? 'battle' and p_action<>'battle_turn' then raise exception 'battle_active' using errcode='GM000';end if;
 select world into w from game.stages where idx=l.stage_idx;cur:=game.play_currency(w);
 id:=p_args->>'id';slot:=p_args->>'slot';
 if p_action not in('refine','exchange','task_claim','battle_turn','ending','ending_prepare') and id is null and p_action not in('plot_unlock','water','fertilize','remove_pests','harvest','crop_cancel') then raise exception 'invalid_request' using errcode='GM000';end if;
 if p_action='exchange' then
  if coalesce(p_args->>'amount','')!~'^[1-9][0-9]{0,77}$' then raise exception 'invalid_amount' using errcode='GM000';end if;
  amount:=(p_args->>'amount')::numeric;code:=p_args->>'from';res:=p_args->>'to';
  if code not in('LT_HP','LT_TP','TN') or res not in('LT_HP','LT_TP','TN') or code=res then raise exception 'invalid_currency' using errcode='GM000';end if;
  if ('TN' in(code,res) and l.stage_idx<10) or ('LT_TP' in(code,res) and l.stage_idx<6) then raise exception 'realm_locked' using errcode='GM000';end if;
  cost:=amount*case code when 'LT_HP' then 1 when 'LT_TP' then 1000 else 1000000 end/case res when 'LT_HP' then 1 when 'LT_TP' then 1000 else 1000000 end;
  if cost<>trunc(cost) then raise exception 'invalid_multiple' using errcode='GM000';end if;
  perform game.play_money(p_life,code,-amount,p_request,'exchange');perform game.play_money(p_life,res,cost,p_request,'exchange');
 elsif p_action='refine' then
  if l.progress_s>=game.tang_seconds(l.stage_idx,l.tang)*.99 then raise exception 'progress_cap' using errcode='GM000';end if;
  perform game.play_quota(p_account,'refine',3);cost:=3*power(2,l.tang-1);perform game.play_money(p_life,cur,-cost,p_request,'refine');
  update game.lives set progress_s=least(game.tang_seconds(stage_idx,tang)*.99,progress_s+game.tang_seconds(stage_idx,tang)*.01) where life_id=p_life;
 elsif p_action='travel' then
  r:=game.play_find('world_nodes',id);if r is null or game.play_stage(r->>'min_stage_id')>l.stage_idx then raise exception 'realm_locked' using errcode='GM000';end if;
  if st ? 'task' then raise exception 'job_busy' using errcode='GM000';end if;
  st:=jsonb_set(st,'{task}',jsonb_build_object('kind','travel','id',id,'ready_at',now_s+(r->>'travel_seconds')::int));
 elsif p_action='buy' then
  r:=game.play_find('venue_stock',id);if p_args ? 'expected_price' and p_args->>'expected_price'<>r->>'price' then raise exception 'quote_changed' using errcode='GM000';end if;v:=game.play_find('venues',r->>'venue_id');
  if r is null or game.play_stage(r->>'min_stage_id')>l.stage_idx or game.play_stage(v->>'min_stage_id')>l.stage_idx then raise exception 'realm_locked' using errcode='GM000';end if;
  qty:=coalesce((p_args->>'quantity')::int,1);if qty<1 or qty>100 then raise exception 'invalid_quantity' using errcode='GM000';end if;
  perform game.play_quota(p_account,'stock:'||id,(r->>'daily_limit')::int,null,qty);perform game.play_money(p_life,r->>'currency',-(r->>'price')::numeric*qty,p_request,'buy');
  i:=game.play_find('item_catalog',r->>'item_id');if i->>'item_type'='seed' and game.play_level(coalesce((st->'xp'->>'garden')::int,0))<(r->>'min_profession_level')::int then raise exception 'profession_locked' using errcode='GM000';end if;bind:=case when game.play_tradeable(i) then '' else 'nontradeable' end;
  if i->>'item_type'='social_gift' then
   insert into game.social_lives(life_id) values(p_life) on conflict do nothing;
   update game.social_lives set state=jsonb_set(state,array['gifts',i->>'id'],to_jsonb(coalesce((state->'gifts'->>(i->>'id'))::int,0)+qty)) where life_id=p_life;
  else st:=game.play_give(st,r->>'item_id',(r->>'quantity_per_purchase')::int*qty,bind);end if;
 elsif p_action='sell' then
  inst:=st->'inventory'->id;i:=game.play_find('item_catalog',inst->>'item_id');r:=game.play_find('price_book',inst->>'item_id');qty:=coalesce((p_args->>'quantity')::int,1);
  if coalesce(inst->>'bound','')<>'' or not game.play_tradeable(i) or coalesce((r->>'npc_buyback_cap')::numeric,0)<=0 then raise exception 'item_bound' using errcode='GM000';end if;
  st:=game.play_take(st,id,qty);perform game.play_money(p_life,r->>'currency',(r->>'npc_buyback_cap')::numeric*qty,p_request,'sell');
 elsif p_action='inbox' then
  inst:=st->'inventory'->id;if inst is null or inst->>'location'<>'inbox' then raise exception 'invalid_item' using errcode='GM000';end if;
  select count(*) into n from jsonb_each(st->'inventory') x where x.value->>'location'='inventory';if n>=20 then raise exception 'inventory_full' using errcode='GM000';end if;
  st:=jsonb_set(st,array['inventory',id,'location'],'"inventory"');
 elsif p_action='quest_accept' then
  q:=game.play_find('quests',id);period:=case when q->>'kind'='sect' then game.play_period(q->>'repeat') else p_life::text end;
  if q is null or game.play_stage(q->>'stage_id')>l.stage_idx or game.play_stage(q->>'stage_id')=l.stage_idx and (q->>'min_tier')::int>l.tang then raise exception 'realm_locked' using errcode='GM000';end if;
  if q->>'prerequisite'<>'' and st->'quests'->(q->>'prerequisite')->>'status' is distinct from 'CLAIMED' then raise exception 'prerequisite_locked' using errcode='GM000';end if;
  if q->>'kind'='sect' and q->>'sect'<>st->>'sect' then raise exception 'wrong_sect' using errcode='GM000';end if;
  if st->'quests'->id->>'period'=period then raise exception 'already_accepted' using errcode='GM000';end if;
  st:=jsonb_set(st,array['quests',id],jsonb_build_object('status','ACTIVE','accepted_at',now_s,'period',period,'world',w));
 elsif p_action='quest_supply' then
  q:=game.play_find('quests',id);j:=st->'quests'->id;
  if j->>'status' is distinct from 'ACTIVE' or q->'preparation_supply' is null then raise exception 'quest_not_active' using errcode='GM000';end if;
  perform game.play_quota(p_account,'supply:'||id,1,p_life::text);r:=q->'preparation_supply';st:=game.play_give(st,r->>'item_id',(r->>'quantity')::int,'quest_preparation');
 elsif p_action='quest_claim' then
  q:=game.play_find('quests',id);j:=st->'quests'->id;
  if j->>'status' is distinct from 'ACTIVE' then raise exception 'quest_not_active' using errcode='GM000';end if;
  if not game.play_objective(q->'objective_tree',st->'events',(j->>'accepted_at')::numeric) then raise exception 'objective_incomplete' using errcode='GM000';end if;
  if q->>'kind'='sect' then
   if j->>'period'<>game.play_period(q->>'repeat') then raise exception 'quest_expired' using errcode='GM000';end if;
   perform game.play_quota(p_account,'claim:'||(q->>'quest_group'),1,j->>'period');select x into r from jsonb_array_elements(q->'rewards_by_world') x where x->>'world'=j->>'world';
  else r:=jsonb_build_object('currency',q->>'reward_currency','amount',q->>'reward_amount','contribution',q->>'contribution','reward_item_id',q->>'reward_item_id','reward_item_quantity',q->>'reward_item_qty');end if;
  perform game.play_money(p_life,r->>'currency',(r->>'amount')::numeric,p_request,'quest_reward');
  st:=jsonb_set(st,'{contribution}',to_jsonb((st->>'contribution')::int+coalesce((r->>'contribution')::int,0)));
  if coalesce(r->>'reward_item_id','')<>'' then st:=game.play_give(st,r->>'reward_item_id',(r->>'reward_item_quantity')::int,'quest_reward');end if;
  st:=game.play_sources(st,p_account,id);st:=jsonb_set(st,array['quests',id,'status'],'"CLAIMED"');
  if id='Q-HG-02' then
   update game.play_accounts set knowledge=knowledge||'{"REC-PILL-001":true,"REC-EQ-001":true,"REC-TAL-001":true}' where account_id=p_account;
   st:=game.play_give(st,'SEED-HERB-001',2,'starter');
  end if;
 elsif p_action='sect_join' then
  if id not in('TV','HS','VD') or st->>'sect'<>'' or st->'quests'->'Q-HG-02'->>'status' is distinct from 'ACTIVE' then raise exception 'invalid_sect' using errcode='GM000';end if;
  st:=jsonb_set(st,'{sect}',to_jsonb(id));st:=game.play_event(st,'sect.joined','chosen_lineage',jsonb_build_object('sect',id));
 elsif p_action='sect_buy' then
  r:=game.play_find('sect_shop',id);
  if r is null or r->>'sect_id'<>st->>'sect' or st->'quests'->(r->>'unlock_quest')->>'status' is distinct from 'CLAIMED' or game.play_stage(r->>'stage_id')>l.stage_idx or game.play_stage(r->>'stage_id')=l.stage_idx and (r->>'min_tier')::int>l.tang then raise exception 'sect_locked' using errcode='GM000';end if;
  cost:=(r->>'contribution_cost')::numeric;if (st->>'contribution')::numeric<cost then raise exception 'insufficient_contribution' using errcode='GM000';end if;
  perform game.play_quota(p_account,'sectshop:'||id,(r->>'daily_account_limit')::int);perform game.play_quota(p_account,'sectrefresh:'||id,(r->>'stock_per_refresh')::int,floor(now_s/((r->>'refresh_hours')::int*3600))::text);
  if (r->>'life_limit')::int>0 then perform game.play_quota(p_account,'sectlife:'||id,(r->>'life_limit')::int,p_life::text);end if;
  st:=jsonb_set(st,'{contribution}',to_jsonb((st->>'contribution')::numeric-cost));st:=game.play_give(st,r->>'item_id',(r->>'quantity')::int,'sect');
 elsif p_action in('interact_start','gather_start') then
  if st ? 'task' then raise exception 'job_busy' using errcode='GM000';end if;
  if p_action='interact_start' then
   r:=game.play_find('quest_interactions',id);j:=st->'quests'->(r->>'quest_id');
   if r is null or r->>'method' not in('world_interact','server_trial','choice') or j->>'status' is distinct from 'ACTIVE' then raise exception 'invalid_interaction' using errcode='GM000';end if;
   if r->>'server_event'='sect.joined' then raise exception 'use_sect_join' using errcode='GM000';end if;
   if st->>'node'<>r->>'location_node' then raise exception 'wrong_location' using errcode='GM000';end if;
   res:=coalesce(p_args->>'resource_id',r->'resource_ids'->>0);if not (r->'resource_ids' ? res) then raise exception 'invalid_resource' using errcode='GM000';end if;
   if r->'filters' ? 'allowed_values' and not(r->'filters'->'allowed_values' ? (p_args->>'choice')) then raise exception 'invalid_choice' using errcode='GM000';end if;
   if coalesce((r->'filters'->>'online_ack')::boolean,false) and p_args->>'ack'<>'true' then raise exception 'confirmation_required' using errcode='GM000';end if;
   if r->'filters' ? 'consent_id_required' and not exists(select 1 from jsonb_array_elements(st->'events') e where e->>'type'='consent.recorded' and (e->>'at')::numeric>=(j->>'accepted_at')::numeric) then raise exception 'consent_required' using errcode='GM000';end if;
   st:=jsonb_set(st,'{task}',jsonb_build_object('kind','interact','id',id,'resource_id',res,'choice',p_args->>'choice','ready_at',now_s+(r->>'duration_seconds')::int,'started_at',now_s));
  else
   r:=game.play_find('acquisition_rules',id);
   if r is null or r->>'source_kind' not in('gather','plant_and_gather') or game.play_stage(r->>'min_stage_id')>l.stage_idx or st->>'node'<>r->>'source_id' then raise exception 'wrong_location' using errcode='GM000';end if;
   perform game.play_quota(p_account,'gather:'||id,(r->>'per_account_day_cap')::int);
   st:=jsonb_set(st,'{task}',jsonb_build_object('kind','gather','id',id,'ready_at',now_s+coalesce((r->>'gather_seconds')::int,180),'started_at',now_s));
  end if;
 elsif p_action='task_claim' then
  j:=st->'task';if j is null or now_s<(j->>'ready_at')::numeric then raise exception 'not_ready' using errcode='GM000';end if;
  if j->>'kind'='travel' then
   r:=game.play_find('world_nodes',j->>'id');st:=jsonb_set(st,'{node}',j->'id');
   select x into v from jsonb_array_elements(game.play_data('activity_rewards')) x where x->>'world'=r->>'world' and x->>'event_type'='world.node_discovered';
   if v is not null and not(st->'flags' ? ('visit:'||(j->>'id'))) and coalesce((select used from game.play_quotas where account_id=p_account and group_code='activity:'||(v->>'id') and period=game.play_day()),0)<(v->>'per_account_day_cap')::int then perform game.play_quota(p_account,'activity:'||(v->>'id'),(v->>'per_account_day_cap')::int);perform game.play_money(p_life,v->>'currency',(v->>'amount_per_event')::numeric,p_request,'explore_reward');st:=jsonb_set(st,array['flags','visit:'||(j->>'id')],'true');end if;
  elsif j->>'kind'='gather' then
   r:=game.play_find('acquisition_rules',j->>'id');st:=game.play_give(st,j->>'id',coalesce((r->>'gather_yield')::int,1));
   select x into v from jsonb_array_elements(game.play_data('activity_rewards')) x where x->>'world'=w and x->>'event_type'='gather.completed' and x->>'target_id'=r->>'source_id';
   if v is not null and coalesce((select used from game.play_quotas where account_id=p_account and group_code='activity:'||(v->>'id') and period=game.play_day()),0)<(v->>'per_account_day_cap')::int then perform game.play_quota(p_account,'activity:'||(v->>'id'),(v->>'per_account_day_cap')::int);perform game.play_money(p_life,v->>'currency',(v->>'amount_per_event')::numeric,p_request,'gather_reward');end if;
  else
   r:=game.play_find('quest_interactions',j->>'id');if st->'quests'->(r->>'quest_id')->>'status' is distinct from 'ACTIVE' then raise exception 'quest_not_active' using errcode='GM000';end if;
   if r->>'location_node'<>st->>'node' then raise exception 'wrong_location' using errcode='GM000';end if;
   v:=jsonb_build_object(coalesce(r->'filters'->>'distinct_resource_key','resource_id'),j->>'resource_id','choice',j->>'choice');st:=game.play_event(st,r->>'server_event',r->>'target_id',v);
  end if;st:=st-'task';
 elsif p_action='plot_unlock' then
  select x into r from jsonb_array_elements(game.play_data('garden_plots')) x where x->>'slot_id'=slot;
  if r is null or st->'plots' ? slot or game.play_stage(r->>'stage_id')>l.stage_idx or not(st->'plots' ? ((slot::int-1)::text)) then raise exception 'plot_locked' using errcode='GM000';end if;
  perform game.play_money(p_life,r->>'currency',-(r->>'price')::numeric,p_request,'plot_unlock');st:=jsonb_set(st,array['plots',slot],'{}');
 elsif p_action in('sow','water','fertilize','remove_pests','harvest','crop_cancel') then
  if st->'quests'->'Q-HG-02'->>'status' is distinct from 'CLAIMED' or not(st->'plots' ? slot) then raise exception 'profession_locked' using errcode='GM000';end if;
  j:=st->'plots'->slot;
  if p_action='sow' then
   if j ? 'seed' then raise exception 'plot_occupied' using errcode='GM000';end if;
   inst:=st->'inventory'->id;select x into r from jsonb_array_elements(game.play_data('planting_recipes')) x where x->>'seed_item_id'=inst->>'item_id';
   if r is null or game.play_stage(r->>'min_stage_id')>l.stage_idx or game.play_level(coalesce((st->'xp'->>'garden')::int,0))<(r->>'min_profession_level')::int then raise exception 'recipe_locked' using errcode='GM000';end if;
   st:=game.play_take(st,id,1);j:=jsonb_build_object('seed',r->>'seed_item_id','started_at',now_s,'base_duration',(r->>'grow_seconds')::int,'ready_at',now_s+(r->>'grow_seconds')::int,'pests',game.roll()<.25,'water',false,'fertilize',false,'remove_pests',false);
  else
   if j->>'seed' is null then raise exception 'plot_empty' using errcode='GM000';end if;
   select x into r from jsonb_array_elements(game.play_data('planting_recipes')) x where x->>'seed_item_id'=j->>'seed';
   if p_action='harvest' then
    if now_s<(j->>'ready_at')::numeric then raise exception 'not_ready' using errcode='GM000';end if;
    qty:=case when (j->>'pests')::boolean and not(j->>'remove_pests')::boolean then 2 else 3 end;lv:=game.play_level(coalesce((st->'xp'->>'garden')::int,0));st:=game.play_give(st,r->>'harvest_item_id',qty,'',game.play_quality(lv));st:=game.play_exp(st,p_account,'garden',10);j:='{}';
   elsif p_action='crop_cancel' then j:='{}';
   else
    if coalesce((j->>p_action)::boolean,false) then raise exception 'already_done' using errcode='GM000';end if;
    if p_action='fertilize' then inst:=st->'inventory'->id;if inst->>'item_id' not in('FERT-HG','FERT-LG','FERT-TG') then raise exception 'invalid_fertilizer' using errcode='GM000';end if;st:=game.play_take(st,id,1);end if;
    if p_action='remove_pests' and (not(j->>'pests')::boolean or now_s<(j->>'started_at')::numeric+(j->>'base_duration')::numeric*.5) then raise exception 'no_pests' using errcode='GM000';end if;
    j:=jsonb_set(j,array[p_action],'true');if p_action in('water','fertilize') then cut:=case when (j->>'water')::boolean then 10 else 0 end+case when (j->>'fertilize')::boolean then 10 else 0 end;j:=jsonb_set(j,'{ready_at}',to_jsonb((j->>'started_at')::numeric+(j->>'base_duration')::numeric*(100-cut)/100));end if;
   end if;
  end if;st:=jsonb_set(st,array['plots',slot],j);
 elsif p_action='learn' then
  r:=game.play_find('crafting_recipes',id);prof:=r->>'profession';lv:=game.play_level(coalesce((st->'xp'->>prof)::int,0));
  if r is null or st->'quests'->'Q-HG-02'->>'status' is distinct from 'CLAIMED' or game.play_stage(r->>'min_stage_id')>l.stage_idx or lv<(r->>'min_level')::int then raise exception 'recipe_locked' using errcode='GM000';end if;
  select knowledge into k from game.play_accounts where account_id=p_account;if k ? id then raise exception 'already_learned' using errcode='GM000';end if;
  perform game.play_money(p_life,r->'knowledge_unlock'->>'fee_currency',-(r->'knowledge_unlock'->>'fee_amount')::numeric,p_request,'learn');update game.play_accounts set knowledge=jsonb_set(knowledge,array[id],'true') where account_id=p_account;
 elsif p_action='craft_start' then
  r:=game.play_find('crafting_recipes',id);prof:=r->>'profession';lv:=game.play_level(coalesce((st->'xp'->>prof)::int,0));select knowledge into k from game.play_accounts where account_id=p_account;
  if r is null or not(k ? id) or st->'quests'->'Q-HG-02'->>'status' is distinct from 'CLAIMED' or game.play_stage(r->>'min_stage_id')>l.stage_idx or lv<(r->>'min_level')::int then raise exception 'recipe_locked' using errcode='GM000';end if;
  if st->'jobs' ? prof then raise exception 'job_busy' using errcode='GM000';end if;
  arr:=p_args->'materials';if jsonb_typeof(arr)<>'array' or jsonb_array_length(arr)>3 or jsonb_array_length(arr)<1 then raise exception 'invalid_recipe' using errcode='GM000';end if;
  have:='{}';shift:=0;n:=0;
  for input in select value from jsonb_array_elements(arr) loop
   inst:=st->'inventory'->(input->>'instance_id');code:=inst->>'item_id';qty:=(input->>'quantity')::int;
   if code is null then raise exception 'invalid_recipe' using errcode='GM000';end if;
   shift:=shift+qty*case inst->>'quality' when 'fine' then 100 when 'superior' then 200 when 'supreme' then 300 else 0 end;n:=n+qty;
   have:=jsonb_set(have,array[code],to_jsonb(coalesce((have->>code)::int,0)+qty));st:=game.play_take(st,input->>'instance_id',qty);
  end loop;
  select jsonb_object_agg(x->>'item_id',x->'quantity') into expected from jsonb_array_elements(r->'ingredients') x;if have<>expected then raise exception 'invalid_recipe' using errcode='GM000';end if;
  success:=false;bind:=p_args->>'catalyst';if coalesce(bind,'')<>'' then inst:=st->'inventory'->bind;if inst->>'item_id' is distinct from r->>'quality_catalyst_item_id' then raise exception 'invalid_catalyst' using errcode='GM000';end if;st:=game.play_take(st,bind,1);success:=true;end if;
  if prof='talisman' then perform game.play_quota(p_account,'talisman_attempt',5+l.stage_idx-1);bp:=10000-least(6000,1000+100*(lv-1)+200*((r->>'tier')::int-1));else bp:=greatest(2000,least(9500,(r->>'base_success_bp')::int+(lv-1)*50));end if;
  shift:=shift/greatest(1,n);if prof='alchemy' and exists(select 1 from jsonb_each(st->'equipment') eq where st->'inventory'->(eq.value#>>'{}')->>'item_id'='EQ-073') then shift:=shift+500;end if;
  quality:=game.play_quality(lv,success,shift);success:=game.roll()*10000<bp;perform game.play_money(p_life,r->>'fee_currency',-(r->>'fee_amount')::numeric,p_request,'craft');
  st:=jsonb_set(st,array['jobs',prof],jsonb_build_object('id',gen_random_uuid(),'recipe',id,'ready_at',now_s+(r->>'duration_seconds')::int,'success',success,'quality',quality,'level',lv,'started_day',game.play_day()));
 elsif p_action='craft_claim' then
  prof:=id;j:=st->'jobs'->prof;if j is null or now_s<(j->>'ready_at')::numeric then raise exception 'not_ready' using errcode='GM000';end if;r:=game.play_find('crafting_recipes',j->>'recipe');success:=(j->>'success')::boolean;
  if success then st:=game.play_give(st,r->>'output_item_id',(r->>'output_quantity')::int,'',j->>'quality');end if;
  xp:=case when success then 20 else 8 end;if (j->>'level')::int-(r->>'min_level')::int>=5 then xp:=greatest(1,xp/4);end if;st:=game.play_exp(st,p_account,prof,xp);st:=st #- array['jobs',prof];out:=jsonb_build_object('success',success,'quality',case when success then j->>'quality' else null end);
 elsif p_action='battle_prepare' then
  select x into r from jsonb_array_elements(game.play_data('combat')->'encounters') x where x->>'monster_id'=id;
  if r is null or game.play_stage(r->>'stage_id')>l.stage_idx or r->>'world'<>w or st ? 'battle' then raise exception 'encounter_locked' using errcode='GM000';end if;
  res:=gen_random_uuid()::text;st:=jsonb_set(st,'{battle_intent}',jsonb_build_object('monster_id',id,'token',res,'expires_at',now_s+120));out:=jsonb_build_object('token',res,'mode',r->>'default_mode','warning','Chết thật sẽ mất toàn bộ tài sản của kiếp.');
 elsif p_action='battle_start' then
  j:=st->'battle_intent';if j is null or j->>'token'<>p_args->>'token' or now_s>(j->>'expires_at')::numeric or j->>'monster_id'<>id then raise exception 'intent_expired' using errcode='GM000';end if;
  select x into r from jsonb_array_elements(game.play_data('combat')->'monsters') x where x->>'id'=id;
  select x into c from jsonb_array_elements(game.play_data('realm_scalars')) x where x->>'index'=l.stage_idx::text;
  v:=jsonb_build_object('hp',round((c->>'hp_base')::numeric*(1+.07*(l.tang-1))*1.28),'atk',round((c->>'atk_base')::numeric*(1+.07*(l.tang-1))*1.208),'defense',round((c->>'def_base')::numeric*(1+.07*(l.tang-1))*1.16),'spirit',round((c->>'spirit_base')::numeric*(1+.07*(l.tang-1))*1.24),'spd',c->'spd_base','element',coalesce(l.linh_can->'elements'->>0,'Kim'));
  v:=game.play_actor('player',v);c:=game.play_actor('monster',r);
  -- Equipped stat effects are summed once against the immutable base.
  out:=v;
  for input in select x.value from jsonb_each(st->'equipment') x loop
   inst:=st->'inventory'->(input#>>'{}');i:=game.play_find('item_effects',inst->>'item_id');
   shift:=case inst->>'quality' when 'fine' then 10500 when 'superior' then 11000 when 'supreme' then 11500 else 10000 end;
   for k in select value from jsonb_array_elements(i->'effects') loop
    if k->>'op'='stat_percent' then code:=case k->>'stat' when 'ATK' then 'atk' when 'DEF' then 'defense' when 'HP' then 'maxhp' when 'SPIRIT' then 'spirit' when 'SPD' then 'spd' when 'PEN' then 'pen' when 'RES' then 'res' else null end;
     if code is not null then v:=jsonb_set(v,array[code],to_jsonb((v->>code)::numeric+case when code in('pen','res') then (k->>'amount_bp')::numeric*(case when (k->>'quality_scalable')::boolean then shift else 10000 end)/100000000 else (out->>code)::numeric*(k->>'amount_bp')::numeric*(case when (k->>'quality_scalable')::boolean then shift else 10000 end)/100000000 end));end if;
    end if;
   end loop;
  end loop;v:=jsonb_set(v,'{hp}',v->'maxhp');
  j:=jsonb_build_object('id',gen_random_uuid(),'monster_id',id,'mode',r->>'default_mode','turn',1,'phase',0,'player',v,'enemy',c,'player_base',v,'enemy_base',c,'ops','[]'::jsonb,'log','[]'::jsonb,'potion_ready',1,'talisman_used',false,'qi',100,'outcome','ACTIVE');
  st:=jsonb_set(st,'{battle}',game.play_phase(j));st:=st-'battle_intent';
 elsif p_action='battle_turn' then
  j:=st->'battle';if j is null or j->>'outcome'<>'ACTIVE' then raise exception 'no_battle' using errcode='GM000';end if;
  j:=game.play_phase(j);v:=game.play_dots(j->'player');c:=game.play_dots(j->'enemy');lv:=(j->>'turn')::int;code:=coalesce(p_args->>'move','attack');cost:=1;out:='{}';
  if v->'statuses' ? 'STUN' then code:='stunned';end if;
  if code='skill' then
   select x into r from jsonb_array_elements(game.play_data('combat')->'player_skills') x where x->>'id'=p_args->>'skill';
   if r is null or (r->>'tier')::int>(case when l.stage_idx<6 then 1 when l.stage_idx<10 then 2 else 3 end) or v->'statuses' ? 'SILENCE' or coalesce((v->'cooldowns'->>(r->>'id'))::int,0)>lv or (j->>'qi')::numeric<(r->>'qi_cost_pct')::numeric then raise exception 'skill_unavailable' using errcode='GM000';end if;
   cost:=(r->>'coefficient')::numeric;v:=jsonb_set(v,array['cooldowns',r->>'id'],to_jsonb(lv+(r->>'cooldown')::int+1));j:=jsonb_set(j,'{qi}',to_jsonb((j->>'qi')::numeric-(r->>'qi_cost_pct')::numeric));
  elsif code='item' then
   id:=p_args->>'instance_id';inst:=st->'inventory'->id;i:=game.play_find('item_effects',inst->>'item_id');
   if i is null or i->'restrictions'->>'use_world'<>w or i->>'activation' not in('consume','consume_in_battle') then raise exception 'item_unavailable' using errcode='GM000';end if;
   if (inst->>'item_id') like 'TAL-%' then if (j->>'talisman_used')::boolean then raise exception 'daily_limit' using errcode='GM000';end if;j:=jsonb_set(j,'{talisman_used}','true');
   elsif lv<(j->>'potion_ready')::int then raise exception 'item_cooldown' using errcode='GM000';else j:=jsonb_set(j,'{potion_ready}',to_jsonb(lv+3));end if;
   shift:=case inst->>'quality' when 'fine' then 10500 when 'superior' then 11000 when 'supreme' then 11500 else 10000 end;
   for k in select value from jsonb_array_elements(i->'effects') loop
    if k->>'op'='heal_hp' then v:=jsonb_set(v,'{hp}',to_jsonb(least((v->>'maxhp')::numeric,(v->>'hp')::numeric+floor((v->>'maxhp')::numeric*(k->>'amount_bp')::numeric*shift/100000000))));
    elsif k->>'op'='cleanse' then
     for input in select jsonb_build_object('key',key) from jsonb_each(v->'statuses') where (not(k ? 'status_ids') or k->'status_ids' ? key) and not coalesce((value->>'boss_mechanic')::boolean,false) order by key limit coalesce((k->>'count')::int,99) loop v:=v #- array['statuses',input->>'key'];end loop;
    elsif k->>'op' in('shield','shield_hp') then v:=jsonb_set(v,'{shield}',to_jsonb(floor((v->>'maxhp')::numeric*(k->>'amount_bp')::numeric*shift/100000000)));j:=jsonb_set(j,'{shield_until}',to_jsonb(lv+coalesce((k->>'duration_turns')::int,2)-1));
    elsif k->>'op'='damage_taken_reduce' then j:=jsonb_set(j,'{reduce}',jsonb_build_object('bp',k->'amount_bp','until',lv+(k->>'duration_turns')::int-1));
    elsif k->>'op'='damage' then c:=jsonb_set(c,'{hp}',to_jsonb(greatest(0,(c->>'hp')::numeric-(v->>'atk')::numeric*coalesce((k->>'coefficient_bp')::numeric,10000)*shift/100000000)));
    elsif k->>'op'='survive_lethal' then j:=jsonb_set(j,'{survive}','true');
    else raise exception 'effect_not_available_in_battle' using errcode='GM000';end if;
   end loop;st:=game.play_take(st,id,1);
  elsif code not in('attack','guard','stunned','flee') then raise exception 'invalid_move' using errcode='GM000';end if;
  if code='flee' then j:=jsonb_set(j,'{outcome}','"FLED"');
  else
   if code in('attack','skill') and (v->>'hp')::numeric>0 then
    amount:=0;for k in select value from jsonb_array_elements(j->'ops') loop if k->>'op'='damage_reduction' then amount:=amount+(k->>'amount_bp')::numeric/10000;elsif k->>'op'='element_resistance' and k->'elements' ? (v->>'element') then amount:=amount+(k->>'amount_bp')::numeric/10000;end if;end loop;
    out:=game.play_strike(v,c,cost,(v->>'atk')::numeric,false,least(.65,amount));c:=out->'target';
    for k in select value from jsonb_array_elements(j->'ops') loop if k->>'op'='reflect' then v:=jsonb_set(v,'{hp}',to_jsonb(greatest(0,(v->>'hp')::numeric-least((out->>'damage')::numeric*(k->>'amount_bp')::numeric/10000,(v->>'maxhp')::numeric*(k->>'player_hp_cap_bp')::numeric/10000))));end if;end loop;
   end if;
   v:=game.play_status_tick(v);
   if (v->>'hp')::numeric>0 and (c->>'hp')::numeric>0 then
    -- Server picks a legal boss skill; cast turns always expose a telegraph before damage.
    select x into r from jsonb_array_elements(game.play_data('combat')->'monster_skills') x where x->>'owner_id'=j->>'monster_id' and coalesce((c->'cooldowns'->>(x->>'id'))::int,0)<=lv order by (x->>'coefficient')::numeric desc limit 1;
    if j ? 'pending_skill' then select x into r from jsonb_array_elements(game.play_data('combat')->'monster_skills') x where x->>'id'=j->>'pending_skill';j:=j-'pending_skill';success:=true;
    elsif coalesce((r->>'cast_turns')::int,0)>0 then j:=jsonb_set(j,'{pending_skill}',r->'id');success:=false;
    else success:=true;end if;
    if success then
     cost:=coalesce((r->>'coefficient')::numeric,1);cut:=1;for k in select value from jsonb_array_elements(j->'ops') loop if k->>'op'='multihit' then cut:=(k->>'hits')::int;cost:=(k->>'coefficient_per_hit_bp')::numeric/10000;end if;end loop;
     amount:=case when coalesce((j->'reduce'->>'until')::int,0)>=lv then coalesce((j->'reduce'->>'bp')::numeric,0)/10000 else 0 end;
     for n in 1..cut loop
      out:=game.play_strike(c,v,cost,(c->>'atk')::numeric,code='guard',amount,0,case when r->>'slot'='ultimate' and not coalesce((j->>'first_ultimate_used')::boolean,false) then .55 else null end);v:=out->'target';if r->>'slot'='ultimate' then j:=jsonb_set(j,'{first_ultimate_used}','true');end if;
      if coalesce(r->>'status_id','')<>'' and game.roll()<(r->>'status_chance')::numeric*(1-least(.85,(v->>'res')::numeric)) then qty:=case when r->>'status_id' in('STUN','SILENCE') then 1 else 2 end;for k in select value from jsonb_array_elements(j->'ops') loop if k->>'op'='status_duration_bonus' and k->>'status'=r->>'status_id' then qty:=qty+(k->>'turns')::int;end if;end loop;v:=game.play_status(v,r->>'status_id',qty);end if;
      for k in select value from jsonb_array_elements(j->'ops') loop if k->>'op'='on_hit_status' and (out->>'hit')::boolean and game.roll()*10000<(k->>'chance_bp')::numeric then v:=game.play_status(v,k->>'status',1);end if;end loop;
     end loop;
     if r is not null then c:=jsonb_set(c,array['cooldowns',r->>'id'],to_jsonb(lv+coalesce((r->>'cooldown')::int,0)+1));end if;
    end if;
   end if;c:=game.play_status_tick(c);
   if (v->>'hp')::numeric<=0 and coalesce((j->>'survive')::boolean,false) then v:=jsonb_set(v,'{hp}','1');j:=jsonb_set(j,'{survive}','false');end if;
   if (v->>'hp')::numeric<=0 then j:=jsonb_set(j,'{outcome}',to_jsonb(case when j->>'mode'='lethal' then 'DEATH' else 'KO_SAFE' end));
   elsif (c->>'hp')::numeric<=0 then j:=jsonb_set(j,'{outcome}','"WIN"');
   elsif lv>=50 then j:=jsonb_set(j,'{outcome}','"TIMEOUT"');end if;
  end if;
  if coalesce((j->>'shield_until')::int,999999)<=lv then v:=jsonb_set(v,'{shield}','0');end if;
  if code in('attack','guard') then j:=jsonb_set(j,'{qi}',to_jsonb(least(100,(j->>'qi')::int+10)));end if;
  j:=j||jsonb_build_object('player',v,'enemy',c,'turn',lv+1,'log',(j->'log')||jsonb_build_array(jsonb_build_object('turn',lv,'move',code,'player_hp',v->'hp','enemy_hp',c->'hp','telegraph',j->>'pending_skill')));
  if j->>'outcome'='WIN' then
   st:=game.play_event(st,'combat.won',j->>'monster_id');st:=game.play_sources(st,p_account,j->>'monster_id');
   for r in select x from jsonb_array_elements(game.play_data('drop_table')) x where x->>'enemy_id'=j->>'monster_id' loop
    if game.roll()*100<(r->>'chance_pct')::numeric then
     qty:=split_part(r->>'quantity','-',1)::int;if position('-' in r->>'quantity')>0 then qty:=qty+floor(game.roll()*(split_part(r->>'quantity','-',2)::int-qty+1))::int;end if;
     if r->>'item' in('LT_HP','LT_TP','TN') then perform game.play_money(p_life,r->>'item',qty,p_request,'combat_drop');
     else select x->>'id' into res from jsonb_array_elements(game.play_data('item_catalog')) x where x->>'name'=r->>'item';if res is not null and game.play_find('acquisition_rules',res)->>'source_kind' not in('bound_quest_or_boss','weekly_boss_guaranteed','sect_task_bound_reward') then st:=game.play_give(st,res,qty);end if;end if;
    end if;
   end loop;
   select x into r from jsonb_array_elements(game.play_data('activity_rewards')) x where x->>'world'=w and x->>'target_id'='world_patrol';
   if r is not null and coalesce((select used from game.play_quotas where account_id=p_account and group_code='activity:'||(r->>'id') and period=game.play_day()),0)<(r->>'per_account_day_cap')::int then perform game.play_quota(p_account,'activity:'||(r->>'id'),(r->>'per_account_day_cap')::int);perform game.play_money(p_life,r->>'currency',(r->>'amount_per_event')::numeric,p_request,'patrol_reward');end if;
  end if;
  out:=jsonb_build_object('battle',j);if j->>'outcome'<>'ACTIVE' then st:=jsonb_set(st,'{last_battle}',j);st:=st-'battle';else st:=jsonb_set(st,'{battle}',j);end if;
 elsif p_action='item_use' then
  inst:=st->'inventory'->id;i:=game.play_find('item_effects',inst->>'item_id');
  if i is null or i->>'activation'<>'consume' or i->'restrictions'->>'use_world'<>w or game.play_stage(i->'restrictions'->>'min_stage_id')>l.stage_idx then raise exception 'item_unavailable' using errcode='GM000';end if;
  for k in select value from jsonb_array_elements(i->'effects') loop
   if k->>'op'='cultivation_progress' then
    if l.progress_s>=game.tang_seconds(l.stage_idx,l.tang)*.99 then raise exception 'progress_cap' using errcode='GM000';end if;
    update game.lives set progress_s=least(game.tang_seconds(stage_idx,tang)*.99,progress_s+game.tang_seconds(stage_idx,tang)*(k->>'amount_bp')::numeric/10000) where life_id=p_life;
   elsif k->>'op'='breakthrough_bonus' then
    if k ? 'only_stage' and k->>'only_stage'<>(select stage_id from game.stages where idx=l.stage_idx) then raise exception 'realm_locked' using errcode='GM000';end if;
    st:=jsonb_set(st,'{flags,breakthrough_bonus}',to_jsonb(greatest(coalesce((st->'flags'->>'breakthrough_bonus')::int,0),(k->>'amount_bp')::int)));
   else raise exception 'effect_not_available_outside_battle' using errcode='GM000';end if;
  end loop;
  qty:=(i->'restrictions'->'usage_limit'->>'count')::int;
  if qty is not null then period:=case i->'restrictions'->'usage_limit'->>'period' when 'major_realm' then p_life::text||':'||l.stage_idx::text when 'day' then game.play_day() else p_life::text end;perform game.play_quota(p_account,'consume:'||(inst->>'item_id'),qty,period);end if;
  st:=game.play_take(st,id,1);
 elsif p_action='ending_prepare' then
  if st->'quests'->'Q-TG-04'->>'status' is distinct from 'CLAIMED' then raise exception 'main_quest_required' using errcode='GM000';end if;
  res:=gen_random_uuid()::text;st:=jsonb_set(st,'{ending_intent}',jsonb_build_object('token',res,'expires_at',now_s+120));out:=jsonb_build_object('token',res,'warning','Quy Phàm kết thúc kiếp, mất tu vi và toàn bộ tài sản vật lý. Thiên Mệnh và chỉ số tài khoản được giữ. Bạn cũng có thể ở lại.');
 elsif p_action='ending' then
  if st->'quests'->'Q-TG-04'->>'status' is distinct from 'CLAIMED' then raise exception 'main_quest_required' using errcode='GM000';end if;
  if p_args->>'choice' in('remain','defer') then st:=jsonb_set(st,'{flags,ending_choice}',p_args->'choice');
  elsif p_args->>'choice'='return_home' then
   j:=st->'ending_intent';if j is null or j->>'token'<>p_args->>'token' or now_s>(j->>'expires_at')::numeric or p_args->>'ack'<>'true' then raise exception 'confirmation_required' using errcode='GM000';end if;
   perform game.claim_milestone(p_life,l.stage_idx,9::smallint);out:=jsonb_build_object('return_home',true);st:=st-'ending_intent';
  else raise exception 'invalid_choice' using errcode='GM000';end if;
 elsif p_action='auction_list' then
  if now()<(select created_at+interval '72 hours' from game.accounts where account_id=p_account) then raise exception 'trade_age_locked' using errcode='GM000';end if;
  inst:=st->'inventory'->id;i:=game.play_find('item_catalog',inst->>'item_id');r:=game.play_find('price_book',inst->>'item_id');qty:=coalesce((p_args->>'quantity')::int,1);
  if inst is null or coalesce(inst->>'bound','')<>'' or not game.play_tradeable(i) or now_s<coalesce((inst->>'trade_unlock_at')::numeric,0) then raise exception 'item_bound' using errcode='GM000';end if;
  if (select count(*) from game.server_auctions where seller=p_life and state='OPEN')>=5 then raise exception 'listing_limit' using errcode='GM000';end if;
  code:=p_args->>'currency';if code not in('LT_HP','LT_TP','TN') or code='TN' and l.stage_idx<10 or code='LT_TP' and l.stage_idx<6 then raise exception 'realm_locked' using errcode='GM000';end if;
  if coalesce(p_args->>'price','')!~'^[1-9][0-9]{0,77}$' or coalesce(p_args->>'hours','12') not in('6','12','24') then raise exception 'invalid_price' using errcode='GM000';end if;
  amount:=(p_args->>'price')::numeric;cost:=coalesce((r->>'reference_price')::numeric,0)*10*qty*game.play_rate(r->>'currency')/game.play_rate(code);
  if amount>cost or cost<=0 then raise exception 'price_cap' using errcode='GM000';end if;
  if coalesce(p_args->>'buyout','')<>'' and (p_args->>'buyout'!~'^[1-9][0-9]{0,77}$' or (p_args->>'buyout')::numeric<amount or (p_args->>'buyout')::numeric>cost) then raise exception 'invalid_price' using errcode='GM000';end if;
  st:=game.play_take(st,id,qty);perform game.play_money(p_life,code,-greatest(1,ceil(amount*.01)),p_request,'listing_fee');
  insert into game.server_auctions(seller,item,currency,opening,buyout,ends_at,original_end) values(p_life,jsonb_set(inst,'{quantity}',to_jsonb(qty)),code,amount,nullif(p_args->>'buyout','')::numeric,now()+make_interval(hours=>coalesce((p_args->>'hours')::int,12)),now()+make_interval(hours=>coalesce((p_args->>'hours')::int,12))) returning id::text into res;perform game.play_trade_hold(p_account,p_life,res::uuid,(r->>'reference_price')::numeric*qty*game.play_rate(r->>'currency'));out:=jsonb_build_object('auction_id',res);
 elsif p_action in('auction_bid','auction_cancel','auction_settle') then
  select to_jsonb(a) into j from game.server_auctions a where a.id=(p_args->>'id')::uuid for update;
  if j is null or j->>'state'<>'OPEN' then raise exception 'auction_closed' using errcode='GM000';end if;
  if p_action='auction_cancel' then
   if j->>'seller'<>p_life::text or j->>'bidder' is not null then raise exception 'cannot_cancel' using errcode='GM000';end if;
   st:=game.play_give(st,j->'item'->>'item_id',(j->'item'->>'quantity')::int,'',j->'item'->>'quality');update game.server_auctions set state='CANCELLED',version=version+1 where id=(j->>'id')::uuid;delete from game.trade_holds where auction_id=(j->>'id')::uuid;
  elsif p_action='auction_settle' then
   if now()<(j->>'ends_at')::timestamptz then raise exception 'not_ready' using errcode='GM000';end if;
   perform game.play_auction_settle((j->>'id')::uuid,p_request);
   -- Settlement may deliver to this actor; merge current inventory before final write.
   select state->'inventory' into v from game.play_lives where life_id=p_life;st:=jsonb_set(st,'{inventory}',coalesce(v,st->'inventory'));
  else
   if now()>=(j->>'ends_at')::timestamptz or (select account_id from game.lives where life_id=(j->>'seller')::uuid)=p_account then raise exception 'invalid_bid' using errcode='GM000';end if;
   if now()<(select created_at+interval '72 hours' from game.accounts where account_id=p_account) then raise exception 'trade_age_locked' using errcode='GM000';end if;
   code:=j->>'currency';if code='TN' and l.stage_idx<10 or code='LT_TP' and l.stage_idx<6 then raise exception 'realm_locked' using errcode='GM000';end if;
   if coalesce(p_args->>'amount','')!~'^[1-9][0-9]{0,77}$' then raise exception 'invalid_price' using errcode='GM000';end if;
   amount:=(p_args->>'amount')::numeric;
   if p_args->>'buyout'='true' then if j->>'buyout' is null then raise exception 'no_buyout' using errcode='GM000';end if;amount:=(j->>'buyout')::numeric;
   elsif amount<(case when j->>'bidder' is null then (j->>'opening')::numeric else (j->>'price')::numeric+greatest(1,ceil((j->>'price')::numeric*.05)) end) then raise exception 'bid_too_low' using errcode='GM000';end if;
   if j->>'buyout' is not null and amount>=(j->>'buyout')::numeric then amount:=(j->>'buyout')::numeric;end if;
   perform game.play_trade_hold(p_account,p_life,(j->>'id')::uuid,amount*game.play_rate(code));
   cost:=amount-case when j->>'bidder'=p_life::text then (j->>'price')::numeric else 0 end;perform game.play_money(p_life,code,-cost,p_request,'bid_escrow');
   if j->>'bidder' is not null and j->>'bidder'<>p_life::text then
    perform game.play_money((j->>'bidder')::uuid,code,(j->>'price')::numeric,p_request,'bid_refund');delete from game.trade_holds where auction_id=(j->>'id')::uuid and account_id=(select account_id from game.lives where life_id=(j->>'bidder')::uuid);
   end if;
   update game.server_auctions set bidder=p_life,price=amount,version=version+1,ends_at=case when now()>ends_at-interval '120 seconds' then least(original_end+interval '600 seconds',ends_at+interval '120 seconds') else ends_at end where id=(j->>'id')::uuid;
   if j->>'buyout' is not null and amount=(j->>'buyout')::numeric then
    perform game.play_auction_settle((j->>'id')::uuid,p_request,true);select state->'inventory' into v from game.play_lives where life_id=p_life;st:=jsonb_set(st,'{inventory}',v);
   end if;
  end if;
 elsif p_action in('equip','unequip') then
  if p_action='equip' then
   inst:=st->'inventory'->id;i:=game.play_find('item_catalog',inst->>'item_id');
   if inst->>'location' is distinct from 'inventory' or i->>'item_type'<>'equipment' or game.play_stage(game.play_data('equipment_rules')->'min_stage_by_tier'->>(i->>'tier'))>l.stage_idx then raise exception 'equipment_locked' using errcode='GM000';end if;
   slot:=i->>'slot';if slot is null then raise exception 'invalid_slot' using errcode='GM000';end if;
   code:=st->'equipment'->>slot;if code is not null then st:=jsonb_set(st,array['inventory',code,'location'],'"inventory"');end if;
   st:=jsonb_set(st,array['inventory',id,'location'],'"equipment"');st:=jsonb_set(st,array['equipment',slot],to_jsonb(id));
  else code:=st->'equipment'->>slot;if code is null then raise exception 'invalid_slot' using errcode='GM000';end if;st:=jsonb_set(st,array['inventory',code,'location'],'"inventory"');st:=st #- array['equipment',slot];end if;
 else
  raise exception 'unknown_action' using errcode='GM000';
 end if;
 update game.play_lives set state=st,version=ver+1 where life_id=p_life;
 out:=jsonb_build_object('request_id',p_request,'version',ver+1,'data',out);
 if out->'data'->>'return_home'='true' then perform game.end_life(p_life,'return_home');end if;
 if out->'data'->'battle'->>'outcome'='DEATH' then perform game.end_life(p_life,'combat');end if;
 insert into game.play_receipts values(p_account,p_request,payload,out);return out;
end$$;
-- Death erases every physical asset including jobs, mail and auction escrow.
create function game.play_on_death() returns trigger language plpgsql set search_path='' as $$
declare a game.server_auctions%rowtype;request uuid:=gen_random_uuid();begin
 if old.status='alive' and new.status='dead' then
  perform pg_advisory_xact_lock(210021);
  if old.ls>0 then insert into game.money_ledger(life_id,request_id,currency,delta,balance_after,reason) values(new.life_id,request,'LT_HP',-old.ls,0,'death_loss');end if;
  if old.lt>0 then insert into game.money_ledger(life_id,request_id,currency,delta,balance_after,reason) values(new.life_id,request,'LT_TP',-old.lt,0,'death_loss');end if;
  if old.tn>0 then insert into game.money_ledger(life_id,request_id,currency,delta,balance_after,reason) values(new.life_id,request,'TN',-old.tn,0,'death_loss');end if;
  for a in select * from game.server_auctions where state='OPEN' and (seller=new.life_id or bidder=new.life_id) order by id for update loop
   if a.seller=new.life_id then
    if a.bidder is not null and exists(select 1 from game.lives where life_id=a.bidder and status='alive') then perform game.play_money(a.bidder,a.currency,a.price,request,'seller_death_refund');end if;
    update game.server_auctions set state='LOST',bidder=null,price=0,version=version+1 where id=a.id;delete from game.trade_holds where auction_id=a.id;
   else update game.server_auctions set bidder=null,price=0,version=version+1 where id=a.id;delete from game.trade_holds where auction_id=a.id;end if;
  end loop;
  update game.life_history set snapshot=snapshot||jsonb_build_object('play',coalesce((select state from game.play_lives where life_id=new.life_id),'{}')) where life_id=new.life_id;
  update game.play_lives set state='{"inventory":{},"plots":{"1":{},"2":{}},"xp":{},"jobs":{},"quests":{},"events":[],"equipment":{},"flags":{},"sect":"","contribution":0,"node":"HG.SECT"}',version=version+1 where life_id=new.life_id;
  delete from game.social_lives where life_id=new.life_id;
 end if;return new;
end$$;
create trigger play_death after update of status on game.lives for each row execute function game.play_on_death();

create or replace function game.breakthrough_confirm(p_account uuid, p_intent uuid, p_now timestamptz default now()) returns jsonb
language plpgsql set search_path = '' as $$
declare l game.lives%rowtype; i game.breakthrough_intents%rowtype; s game.stages%rowtype; v_new uuid; v_next game.stages%rowtype; v_roll double precision;
begin
  select * into l from game.lives where account_id = p_account and status = 'alive' for update;
  if not found then raise exception 'no_alive_life' using errcode = 'GM000'; end if;
  select * into i from game.breakthrough_intents where intent_id = p_intent and life_id = l.life_id for update;
  if not found then raise exception 'intent_not_found' using errcode = 'GM000'; end if;
  if i.consumed_at is not null then raise exception 'intent_consumed' using errcode = 'GM000'; end if;
  if p_now > i.expires_at then
    update game.breakthrough_intents set consumed_at = p_now, outcome = 'expired' where intent_id = i.intent_id;
    raise exception 'intent_expired' using errcode = 'GM000';
  end if;

  perform game.settle_life(l.life_id, p_now);
  select * into l from game.lives where life_id = l.life_id;
  if l.status <> 'alive' then
    -- tọa hóa trong lúc chờ xác nhận: intent mất hiệu lực, không tính là kết quả đột phá
    update game.breakthrough_intents set consumed_at = p_now, outcome = 'superseded' where intent_id = i.intent_id;
    return jsonb_build_object('outcome', 'death', 'cause', 'lifespan', 'new_life_id', (select life_id from game.lives where account_id = p_account and status = 'alive'));
  end if;
  if l.stage_idx <> i.stage_idx or l.tang <> 9 then raise exception 'intent_stale' using errcode = 'GM000'; end if;

  select * into s from game.stages where idx = l.stage_idx;
  v_roll := game.roll();
  if v_roll < i.death_prob then
    update game.breakthrough_intents set consumed_at = p_now, outcome = 'death' where intent_id = i.intent_id;
    v_new := game.end_life(l.life_id, 'breakthrough', p_now);
    return jsonb_build_object('outcome', 'death', 'cause', 'breakthrough', 'new_life_id', v_new);
  end if;

  update game.breakthrough_intents set consumed_at = p_now, outcome = 'success' where intent_id = i.intent_id;
  perform game.claim_milestone(l.life_id, l.stage_idx, 9::smallint);

  if l.stage_idx = 14 then
    insert into game.play_lives(life_id) values(l.life_id) on conflict do nothing;
    update game.play_lives set state=jsonb_set(state,'{flags,endgame_ready}','true') where life_id=l.life_id;
    return jsonb_build_object('outcome','success','stage_idx',14,'stage_id','TG05','world',s.world,'ascended',false);
  end if;

  select * into v_next from game.stages where idx = l.stage_idx + 1;
  update game.lives set stage_idx = v_next.idx, tang = 1, progress_s = 0 where life_id = l.life_id;
  perform game.log_event(l.account_id, l.life_id, 'breakthrough_success', jsonb_build_object('from', s.stage_id, 'to', v_next.stage_id));
  if v_next.world <> s.world then
    -- Phi Thăng: chỉ chuyển map, KHÔNG kết thúc kiếp, không thưởng riêng.
    perform game.log_event(l.account_id, l.life_id, 'ascend', jsonb_build_object('from_world', s.world, 'to_world', v_next.world));
  end if;
  return jsonb_build_object('outcome', 'success', 'stage_idx', v_next.idx, 'stage_id', v_next.stage_id, 'world', v_next.world, 'ascended', v_next.world <> s.world);
end $$;

-- Legacy lethal paths acquire the same lock before taking a life lock.
alter function game.breakthrough_prepare(uuid,timestamptz) rename to breakthrough_prepare_v161;
create function game.breakthrough_prepare(p_account uuid,p_now timestamptz default now()) returns jsonb language plpgsql set search_path='' as $$
declare r jsonb;l uuid;bonus int;p numeric;begin
 r:=game.breakthrough_prepare_v161(p_account,p_now);select life_id into l from game.lives where account_id=p_account and status='alive';
 select (state->'flags'->>'breakthrough_bonus')::int into bonus from game.play_lives where life_id=l;
 p:=greatest(0,(r->>'death_prob')::numeric-coalesce(bonus,0)::numeric/10000);
 update game.breakthrough_intents set death_prob=p where intent_id=(r->>'intent_id')::uuid;
 return r||jsonb_build_object('death_prob',p,'success_prob',1-p,'lethal',p>0);
end$$;
alter function game.breakthrough_confirm(uuid,uuid,timestamptz) rename to breakthrough_confirm_v161;
create function game.breakthrough_confirm(p_account uuid,p_intent uuid,p_now timestamptz default now()) returns jsonb language plpgsql set search_path='' as $$
declare l game.lives%rowtype;st jsonb;q text;begin
 perform pg_advisory_xact_lock(210021);select * into l from game.lives where account_id=p_account and status='alive' for update;
 select state into st from game.play_lives where life_id=l.life_id;
 q:=case l.stage_idx when 5 then 'Q-HG-04' when 9 then 'Q-LG-03' when 14 then 'Q-TG-04' else null end;
 if q is not null and st->'quests'->q->>'status' is distinct from 'CLAIMED' then raise exception 'main_quest_required' using errcode='GM000';end if;
 update game.play_lives set state=state #- '{flags,breakthrough_bonus}' where life_id=l.life_id;
 return game.breakthrough_confirm_v161(p_account,p_intent,p_now);
end$$;
alter function game.lifespan_confirm(uuid,uuid,timestamptz) rename to lifespan_confirm_v161;
create function game.lifespan_confirm(p_account uuid,p_intent uuid,p_now timestamptz default now()) returns jsonb language plpgsql set search_path='' as $$begin perform pg_advisory_xact_lock(210021);return game.lifespan_confirm_v161(p_account,p_intent,p_now);end$$;

-- Expose exact decimal strings even in the compatibility sidebar.
alter function game.get_state(uuid,timestamptz) rename to get_state_v161_profile;
create function game.get_state(p_account uuid,p_now timestamptz default now()) returns jsonb language plpgsql set search_path='' as $$
declare s jsonb:=game.get_state_v161_profile(p_account,p_now);l game.lives%rowtype;begin
 if s->'life'<>'null'::jsonb then select * into l from game.lives where life_id=(s->'life'->>'life_id')::uuid;
 if coalesce((select (state->'flags'->>'endgame_ready')::boolean from game.play_lives where life_id=l.life_id),false) then s:=jsonb_set(s,'{life,ready_for_major}','false');end if;
 s:=jsonb_set(s,'{life,wallet}',jsonb_build_object('ls',l.ls::text,'lt',l.lt::text,'tn',l.tn::text));end if;return s;
end$$;
-- Wallet opening balances are explicit sources. History is append-only.
insert into game.money_ledger(life_id,request_id,currency,delta,balance_after,reason)
 select life_id,gen_random_uuid(),'LT_HP',ls,ls,'migration_opening' from game.lives where ls>0
 union all select life_id,gen_random_uuid(),'LT_TP',lt,lt,'migration_opening' from game.lives where lt>0
 union all select life_id,gen_random_uuid(),'TN',tn,tn,'migration_opening' from game.lives where tn>0;
create function game.play_new_life_ledger() returns trigger language plpgsql set search_path='' as $$begin
 if new.ls>0 then insert into game.money_ledger(life_id,request_id,currency,delta,balance_after,reason) values(new.life_id,gen_random_uuid(),'LT_HP',new.ls,new.ls,'new_life_grant');end if;return new;
end$$;
create trigger play_new_life_ledger after insert on game.lives for each row execute function game.play_new_life_ledger();
create function game.play_ledger_immutable() returns trigger language plpgsql set search_path='' as $$begin raise exception 'immutable_ledger';end$$;
create trigger money_ledger_immutable before update or delete on game.money_ledger for each row execute function game.play_ledger_immutable();
create table game.auction_history(id bigint generated always as identity primary key,auction_id uuid not null,before_row jsonb,after_row jsonb,created_at timestamptz not null default now());
alter table game.auction_history enable row level security;alter table game.auction_history force row level security;
revoke all on game.auction_history from public,anon,authenticated;grant select,insert on game.auction_history to service_role;
create function game.play_auction_audit() returns trigger language plpgsql set search_path='' as $$begin insert into game.auction_history(auction_id,before_row,after_row) values(new.id,case when TG_OP='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));return new;end$$;
create trigger auction_audit after insert or update on game.server_auctions for each row execute function game.play_auction_audit();
-- Least privilege: helpers are not public APIs. Only the authenticated Edge adapter calls game.*.
do $$declare p record;t text;begin
 foreach t in array array['trade_budgets','trade_holds'] loop execute format('alter table game.%I enable row level security',t);execute format('alter table game.%I force row level security',t);execute format('revoke all on game.%I from public,anon,authenticated',t);execute format('grant select,insert,update,delete on game.%I to service_role',t);end loop;
 for p in select oid::regprocedure::text sig from pg_proc where pronamespace='game'::regnamespace loop execute 'revoke all on function '||p.sig||' from public,anon,authenticated';execute 'grant execute on function '||p.sig||' to service_role';end loop;
 grant usage,select on all sequences in schema game to service_role;
end$$;

-- Hot-path indexes: open listings, death cleanup, daily reservations and audit history.
create index server_auctions_open_end on game.server_auctions(ends_at) where state='OPEN';
create index server_auctions_open_seller on game.server_auctions(seller) where state='OPEN';
create index server_auctions_open_bidder on game.server_auctions(bidder) where state='OPEN' and bidder is not null;
create index trade_holds_daily on game.trade_holds(account_id,day);
create index money_ledger_life on game.money_ledger(life_id,id);
create index auction_history_auction on game.auction_history(auction_id,id);
commit;
