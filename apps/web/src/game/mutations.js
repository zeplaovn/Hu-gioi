import { ACHIEVEMENTS } from './catalog.js';
export function log(s,message,tone='normal'){s.logs=[{id:`${Date.now()}-${Math.random()}`,message,tone,at:Date.now()},...(s.logs||[])].slice(0,160);}
export function addItem(s,id,n=1){s.inventory[id]=Math.max(0,Number(s.inventory[id]||0)+Number(n||0));}
export function hasCost(s,cost={}){return Object.entries(cost).every(([id,n])=>Number(s.inventory[id]||0)>=n);}
export function payCost(s,cost={}){for(const[id,n]of Object.entries(cost))addItem(s,id,-n);}
export function grant(s,reward={}){for(const[id,n]of Object.entries(reward))addItem(s,id,n);}
export function unlockAchievements(s){for(const a of ACHIEVEMENTS){if(!s.meta.achievements.includes(a.id)&&a.check(s)){s.meta.achievements.push(a.id);s.meta.destiny+=2;log(s,`Thành tựu mở khóa: ${a.name} (+2 Thiên Mệnh).`,'gold');}}}
export function rng(action){return typeof action?.rng==='function'?action.rng:Math.random;}
