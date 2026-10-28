/* Bên sở hữu phiên chọn hồ sơ gieo; luật kiểm tra thiên phú và cấp đồ khởi đầu. */
(function(root){
'use strict';
function install(H){
 H.createCharacter=function(profile,now=Date.now(),rng=Math.random){
  const name=H.cleanName(profile.name),talent={},keys=H.TALENT_INFO.map(t=>t.key);
  if(!name)throw Error('Đạo hiệu không hợp lệ.');
  if(!['nam','nu'].includes(profile.gender)||!H.RACES.some(r=>r[0]===profile.race))throw Error('Hồ sơ nhân vật không hợp lệ.');
  if(!Number.isInteger(profile.age)||profile.age<14||profile.age>30)throw Error('Tuổi khởi nguyên không hợp lệ.');
  if(!Array.isArray(profile.roots)||profile.roots.length!==5||!profile.roots.every(n=>Number.isInteger(n)&&n>=0&&n<=100)||!Object.hasOwn(H.F.LINH_CAN_RATE,profile.rootType))throw Error('Linh căn không hợp lệ.');
  let total=0;
  for(const key of keys){const n=profile.talent?.[key]??0;if(!Number.isInteger(n)||n<0||n>H.TALENT_MAX)throw Error('Thiên phú không hợp lệ.');talent[key]=n;total+=n}
  if(total>H.TALENT_MAX)throw Error('Thiên phú vượt quá 8 điểm.');
  while(total++<H.TALENT_MAX)talent[keys[Math.floor(rng()*keys.length)]]++;
  const s=H.create(now);
  Object.assign(s,{name,gender:profile.gender,race:profile.race,roots:[...profile.roots],rootType:profile.rootType,age:profile.age,talent,created:true});
  s.stone=H.startStone(talent);
  const g=new H.Game(s,rng);g.add('MAT-001',8);g.add('INK-HG',2);s.hp=g.stats().HP;s.mp=g.maxMp();
  const label=['Dị','Âm Dương','Hỗn Độn'].includes(s.rootType)?s.rootType+' Linh Căn':s.rootType+' linh căn';
  g.log(`Thọ nguyên dự kiến ${H.raceLife(s.race,0)} tuổi. Bạn đã nhập định — tu vi tự tăng theo thời gian.`);
  g.log(`Bạn mở mắt ra: ${name}, ${s.age} tuổi, chủng tộc ${H.raceName(s.race)}, mang ${label} giữa Hư Giới.`);
  return s;
 };
}
root.HU_CREATION={install};if(typeof module!=='undefined'&&module.exports)module.exports={install};
})(typeof window!=='undefined'?window:globalThis);
