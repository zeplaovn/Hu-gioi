/* Điểm vào luật game dùng chung: Node require() hoặc classic scripts/file://. */
(function(root){
'use strict';
const node=typeof module!=='undefined'&&module.exports;
const F=node?require('./rules/formulas.js'):root.HU_FORMULAS;
const C=node?require('./data/character.js'):root.HU_CHARACTER;
const D=node?require('./data/catalog.js'):root.HU_CATALOG;
const S=node?require('./state/player.js'):root.HU_PLAYER_STATE;
const social=node?require('./data/social.js'):root.HU_SOCIAL_DATA;
class Game{
 constructor(state=S.create(),rng=Math.random,onLog=null){this.s=state;this.rng=rng;this.onLog=onLog}
 log(message){this.s.logs.unshift(message);this.s.logs.length=Math.min(38,this.s.logs.length);this.onLog?.(message)}
 count(key){return this.s.bag[key]||0}
 add(key,count=1){if(!D.item(key))throw Error('Mã vật phẩm không hợp lệ.');this.s.bag[key]=Math.min(1e9,this.count(key)+Math.max(0,Math.floor(count)))}
 take(key,count=1){if(this.count(key)<count)throw Error('Không đủ '+D.item(key)?.name);this.s.bag[key]-=count;if(!this.s.bag[key])delete this.s.bag[key]}
 spend(value){if(!Number.isFinite(value)||value<0||this.s.stone<value)throw Error('Không đủ linh thạch.');this.s.stone-=value}
}
const API={F,...C,...D,...social,VERSION:S.VERSION,Game,create:S.create,metaDefault:S.metaDefault,normalizeMeta:S.normalizeMeta,normalize:(raw,now=Date.now())=>S.normalize(raw,now,Game)};
const modules=node?[
 require('./rules/progression.js'),require('./rules/inventory.js'),require('./rules/crafting.js'),require('./rules/combat.js'),
 require('./rules/world.js'),require('./rules/social.js'),require('./rules/adventures.js'),require('./rules/time.js'),require('./rules/creation.js')
]:[root.HU_PROGRESSION,root.HU_INVENTORY,root.HU_CRAFTING,root.HU_COMBAT,root.HU_WORLD,root.HU_SOCIAL,root.HU_ADVENTURES,root.HU_TIME,root.HU_CREATION];
modules.forEach(m=>m.install(API));
root.HU_GAME=API;if(node)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
