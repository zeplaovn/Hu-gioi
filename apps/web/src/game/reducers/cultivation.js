import { PROGRESSION, REALMS, SKILLS, skillById } from '../catalog.js';
import { breakChance, maxHp, monthGain, needExp, power } from '../rules.js';
import { addItem, log, rng } from '../mutations.js';
export function cultivationReducer(s,a){const p=s.profile;if(!p)return false;
  switch(a.type){
    case'TRAIN':{const gain=monthGain(s);p.exp+=gain;p.qi+=Math.max(1,Math.floor(gain*.12));p.ageMonths+=1;s.tracking.trains++;log(s,`Tu luyện một tháng, thu được ${gain} tu vi.`,'cyan');return true;}
    case'APPLY_IDLE':{const months=Math.min(72,Math.max(0,Math.floor(Number(a.months)||0)));if(!months)return true;const gain=monthGain(s)*months;p.exp+=gain;p.qi+=Math.floor(gain*.08);p.ageMonths+=months;log(s,`Bế quan ${months} tháng khi vắng mặt, nhận ${gain} tu vi.`,'cyan');return true;}
    case'REST':{const heal=Math.max(1,Math.floor(p.maxHp*.35));const before=p.hp;p.hp=Math.min(p.maxHp,p.hp+heal);log(s,`Tĩnh dưỡng, hồi ${p.hp-before} khí huyết.`,'green');return true;}
    case'BREAKTHROUGH':{const need=needExp(p);if(p.exp<need){log(s,`Cần ${need} tu vi để đột phá.`,'red');return true;}const chance=breakChance(s),roll=rng(a)();if(roll<=chance){p.exp-=need;s.tracking.breaks++;if(p.layer<9)p.layer++;else if(p.realm<REALMS.length-1){p.layer=1;p.realm++;p.lifespanMonths+=(PROGRESSION.life[p.realm]||0)*12;}else{p.exp+=need;log(s,'Đã đạt cực hạn Độ Kiếp.','gold');return true;}p.breakBonus=0;p.maxHp=maxHp(s);p.hp=p.maxHp;p.power=power(s);log(s,`Đột phá thành công — ${REALMS[p.realm]} tầng ${p.layer}.`,'gold');}else{p.exp=Math.floor(p.exp*(p.layer===9?.60:.70));p.hp=Math.max(1,Math.floor(p.hp*.72));p.breakBonus=0;s.tracking.breakFails++;log(s,`Đột phá thất bại (${Math.round(chance*100)}%), đạo cơ chấn động.`,'red');}return true;}
    case'LEARN_SKILL':{const sk=skillById(a.id);if(!sk||p.skills.includes(sk.id))return true;if(p.realm<sk.realm){log(s,'Cảnh giới chưa đủ học công pháp này.','red');return true;}if(p.spiritStones<sk.cost){log(s,'Không đủ linh thạch.','red');return true;}p.spiritStones-=sk.cost;p.skills.push(sk.id);p.maxHp=maxHp(s);p.hp=Math.min(p.maxHp,p.hp+(sk.hp||0));p.power=power(s);log(s,`Lĩnh ngộ ${sk.name}.`,'gold');return true;}
    case'USE_ITEM':{const id=a.id;if((s.inventory[id]||0)<=0)return true;if(id==='qiPill'){addItem(s,id,-1);p.exp+=Math.floor(needExp(p)*.06);}
      else if(id==='healPill'){addItem(s,id,-1);p.hp=Math.min(p.maxHp,p.hp+Math.floor(p.maxHp*.6));}
      else if(id==='breakPill'){addItem(s,id,-1);p.breakBonus=Math.min(.4,(p.breakBonus||0)+.12);}
      else if(id==='powerTalisman'){addItem(s,id,-1);p.qi+=30;p.power=power(s)+8;}
      else if(id==='guardTalisman'){addItem(s,id,-1);p.hp=Math.min(p.maxHp,p.hp+25);}
      else return true;s.tracking.itemsUsed++;log(s,'Đã sử dụng vật phẩm.','green');return true;}
    case'EQUIP':{const id=a.id;if((s.inventory[id]||0)<=0)return true;const slot=id==='sword'?'weapon':id==='robe'?'robe':id==='ring'?'ring':null;if(!slot)return true;s.equipment[slot]=id;p.maxHp=maxHp(s);p.hp=Math.min(p.maxHp,p.hp);p.power=power(s);log(s,'Đã thay đổi pháp khí.','cyan');return true;}
  }return false;
}
