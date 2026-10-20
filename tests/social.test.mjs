import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../tools/csv.mjs';
const json = n => JSON.parse(readFileSync(new URL(`../data/social/${n}.json`,import.meta.url),'utf8'));
const story=json('story_dialogues').scenes, daily=json('daily_dialogues'), events=json('random_events');
const config=json('social_config');
test('canonical NPC content has complete, unique linked scenes and choices',()=>{
 assert.equal(story.length,95);assert.equal(daily.length,76);assert.equal(events.length,38);
 const all=[...story,...daily,...events];
 const npcs=new Set(all.map(s=>s.npc_id));assert.equal(npcs.size,19);
 assert.equal(new Set(all.map(s=>s.scene_id??s.dialogue_id)).size,209);
 assert.equal(new Set(all.flatMap(s=>s.choices.map(c=>c.choice_id))).size,627);
 for(const id of npcs){assert.equal(story.filter(s=>s.npc_id===id).length,5);assert.equal(daily.filter(s=>s.npc_id===id).length,4);assert.equal(events.filter(s=>s.npc_id===id).length,2);}
 for(const s of story){assert.equal(s.choices.length,3);if(s.scene_index>1) assert(story.some(p=>p.dialogue_id+'_completed'===s.prerequisite && p.npc_id===s.npc_id));}
 for(const s of [...daily,...events]) for(const c of s.choices){const rules=(s.kind==='daily'?config.daily:config.events).base_choice_delta[c.label];assert.equal(c.affection_delta,rules.affection);assert.equal(c.trust_delta,rules.trust);}
});
test('gifts retain unset prices and preferences refer to actual items and NPCs',()=>{
 const gifts=parseCsv(readFileSync(new URL('../data/social/gift_catalog.csv',import.meta.url),'utf8'));
 assert.equal(gifts.length,36);assert.equal(new Set(gifts.map(g=>g.gift_id)).size,36);
 for(const g of gifts){assert.equal(g.price,'BALANCE_TBD');assert.equal(g.is_quest_artifact,'False');assert.equal(g.currency,'linh_thach_ha_pham');}
 const prefs=json('gift_preferences').preferences;assert.equal(prefs.length,95);
 for(const p of prefs){assert(gifts.some(g=>g.gift_id===p.gift_id));assert(daily.some(s=>s.npc_id===p.npc_id));const r=config.gifts.reaction_points[p.preference];assert.equal(p.affection_delta,r.affection);assert.equal(p.trust_delta,r.trust);}
});
