import { ITEMS, RARE_ELEMENTS, STATS, cleanRoot, rootLabel, skillById, SKILLS } from './catalog.js';
import { addItem, log } from './mutations.js';
import { maxHp, monthGain } from './rules.js';
const ri=(random,a,b)=>Math.floor(random()*(b-a+1))+a;
const pick=(random,arr)=>arr[Math.min(arr.length-1,Math.floor(random()*arr.length))];
const lifeBonus=(base,realm)=>Math.round(base*(1+realm*.5));
const gainMonths=(s,k)=>{const g=Math.max(1,Math.trunc(monthGain(s)*k));s.profile.exp+=g;return g;};
const statUp=(s,random)=>{const pool=STATS.filter(k=>s.profile.stats[k]<40);if(!pool.length)return'';const k=pick(random,pool);s.profile.stats[k]++;return k;};
const qualityHerbs=(s,random,n)=>{addItem(s,'herb',n);return n;};
const EVENTS={
 c:[
  ['Linh Tuyền Bên Suối',(s,r)=>{const n=ri(r,6,16)+s.profile.realm*6;s.profile.spiritStones+=n;return`+${n} linh thạch.`;}],
  ['Lão Nông Chỉ Điểm',(s,r)=>`Tu vi +${gainMonths(s,ri(r,2,4))}.`],
  ['Quả Dại Linh Khí',(s)=>{const h=Math.round(maxHp(s)*.3);s.profile.hp=Math.min(maxHp(s),s.profile.hp+h);return`Khí huyết +${h}, tu vi +${gainMonths(s,1)}.`;}],
  ['Quý Nhân Giúp Đỡ',(s,r)=>{const n=ri(r,10,25)+s.profile.realm*8;s.profile.spiritStones+=n;return`Được tặng ${n} linh thạch.`;}],
  ['Hái Dược Thảo',(s,r)=>{const n=qualityHerbs(s,r,ri(r,1,3));return`Hái được ${n} Linh Thảo.`;}],
  ['Nghe Thiền Ngộ Đạo',(s,r)=>`Tu vi +${gainMonths(s,ri(r,3,5))}.`],
  ['Hạt Giống Từ Trời Rơi',(s,r)=>{const n=ri(r,1,2);addItem(s,'seed',n);return`Nhặt được ${n} Hạt Linh Thảo.`;}],
  ['Kẻ Lừa Đảo',(s,r)=>{const n=Math.min(s.profile.spiritStones,ri(r,3,10)+s.profile.realm*3);s.profile.spiritStones-=n;return`Mất ${n} linh thạch.`;},true],
  ['Chướng Khí Núi Hoang',(s,r)=>{const d=Math.max(0,Math.min(s.profile.hp-1,ri(r,8,20)+s.profile.realm*4));s.profile.hp-=d;return`Khí huyết -${d}.`;},true]
 ],
 r:[
  ['Di Tích Tu Sĩ Cổ',(s,r)=>`Tu vi +${gainMonths(s,ri(r,10,16))}.`],
  ['Mạch Linh Thạch Nhỏ',(s,r)=>{const n=ri(r,40,80)+s.profile.realm*30;s.profile.spiritStones+=n;return`+${n} linh thạch.`;}],
  ['Động Thiên Phúc Địa',(s,r)=>{const n=ri(r,1,2);addItem(s,'qiPill',n);if(s.profile.realm>=1)addItem(s,'healPill',1);return`Nhặt được ${n} Tụ Khí Đan${s.profile.realm>=1?' và 1 Hồi Huyết Đan':''}.`; }],
  ['Cao Nhân Điểm Hóa',(s,r)=>{const k=statUp(s,r);return k?`${k} +1.`:`Tu vi +${gainMonths(s,8)}.`;}],
  ['Linh Tuyền Tẩy Thể',(s)=>{s.profile.hp=maxHp(s);return`Khí huyết hồi đầy, tu vi +${gainMonths(s,4)}.`;}],
  ['Nguyên Tố Cộng Hưởng',(s,r)=>{const el=pick(r,s.profile.root.els),n=ri(r,1,2);s.profile.ess[el]=(s.profile.ess[el]||0)+n;return`Ngưng tụ ${n} Tinh Hoa ${el}.`; }],
  ['Thương Nhân Bí Ẩn',(s)=>{addItem(s,'ore',2);addItem(s,'paper',2);return'Tặng 2 Quặng Linh Thiết và 2 Giấy Phù.';}]
 ],
 e:[
  ['Thiên Thư Truyền Thừa',(s,r)=>{const left=SKILLS.filter(k=>!s.profile.skills.includes(k.id)&&k.realm<=s.profile.realm);if(!left.length)return`Tu vi +${gainMonths(s,20)}.`;const sk=pick(r,left);s.profile.skills.push(sk.id);return`Lĩnh ngộ ${sk.name}.`; }],
  ['Trường Thọ Quả Chín Muồi',(s,r)=>{const y=lifeBonus(ri(r,5,8),s.profile.realm);s.profile.lifespanMonths+=y*12;return`Thọ nguyên +${y} năm.`;}],
  ['Linh Đan Trên Vách Đá',(s)=>{addItem(s,'breakPill',1);return'Nhặt được 1 Phá Cảnh Đan.';}],
  ['Linh Khí Triều Tịch',(s,r)=>`Tu vi +${gainMonths(s,ri(r,25,40))}.`],
  ['Tinh Hoa Đất Trời',(s,r)=>{const got=[];for(const el of s.profile.root.els){const n=ri(r,2,4);s.profile.ess[el]=(s.profile.ess[el]||0)+n;got.push(`${n} ${el}`);}return`Tinh Hoa: ${got.join(', ')}.`;}]
 ],
 m:[
  ['Thiên Địa Linh Dịch',(s,r)=>{const root=cleanRoot(s.profile.root);if(root.els.length>=2&&!RARE_ELEMENTS.includes(root.els[0])){const drop=pick(r,root.els),before=rootLabel(root);s.profile.root={els:root.els.filter(x=>x!==drop)};return`${before} tinh lọc, loại ${drop} căn → ${rootLabel(s.profile.root)}.`;}const k=statUp(s,r);return`Tu vi +${gainMonths(s,30)}${k?`, ${k} +1`:''}.`; }],
  ['Tiên Nhân Quán Đỉnh',(s,r)=>{const y=lifeBonus(10,s.profile.realm),k=statUp(s,r),g=gainMonths(s,ri(r,60,90));s.profile.lifespanMonths+=y*12;return`Tu vi +${g}, thọ nguyên +${y} năm${k?`, ${k} +1`:''}.`; }]
 ]
};
const RAR={c:{name:'Thường',w:62,tone:'cyan'},r:{name:'Hiếm',w:26,tone:'green'},e:{name:'Cực hiếm',w:10,tone:'orange'},m:{name:'Thiên cơ',w:2,tone:'gold'}};
export function rollEncounter(s,random=Math.random){const p=s.profile;if(!p||s.runtime.end)return false;let cd=Math.max(0,Math.trunc(Number(s.runtime.encounterCooldown)||0));if(cd>0){s.runtime.encounterCooldown=cd-1;return false;}const luck=p.stats['Phúc Duyên']+p.stats['Vận Khí'];if(random()>Math.min(.25,.08+luck*.004))return false;const rareBoost=1+Math.min(1.5,luck*.02),pool=[];for(const key of Object.keys(RAR)){const list=EVENTS[key],rw=RAR[key].w*(key==='c'?1:rareBoost);for(const ev of list)pool.push([key,ev,rw/list.length*(ev[2]?1/(1+luck*.03):1)]);}let total=pool.reduce((n,x)=>n+x[2],0),t=random()*total,chosen=pool[0];for(const x of pool){t-=x[2];if(t<=0){chosen=x;break;}}const[key,ev]=chosen,[name,run]=ev;s.runtime.encounterCooldown=ri(random,3,6);const text=run(s,random);p.enc[name]=(p.enc[name]||0)+1;s.tracking.encounters=(s.tracking.encounters||0)+1;if(key==='m')s.tracking.heavenlyEncounters=(s.tracking.heavenlyEncounters||0)+1;log(s,`✦ Kỳ ngộ [${RAR[key].name}] ${name}: ${text}`,RAR[key].tone);return true;}
