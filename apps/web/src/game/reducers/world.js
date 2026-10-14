import { allRegions, regionById, secretById } from '../catalog.js';
import { addItem, grant, log, rng } from '../mutations.js';
import { power } from '../rules.js';
export function worldReducer(s,a){const p=s.profile;if(!p)return false;
  switch(a.type){
    case'TRAVEL':{const r=regionById(a.id);if(!r||p.realm<r.realm){log(s,'Cảnh giới chưa đủ để đi tới khu vực này.','red');return true;}s.world.location=r.id;if(!s.world.discovered.includes(r.id))s.world.discovered.push(r.id);log(s,`Đã tới ${r.name} (${r.worldName}).`,'cyan');return true;}
    case'EXPLORE':{const r=regionById(s.world.location),random=rng(a),roll=random();p.ageMonths+=1;s.tracking.explores++;
      if(roll<.18){const dmg=Math.min(p.hp-1,Math.max(1,Math.floor((5+r.danger*5)*(1-Math.min(.45,p.stats['Vận Khí']*.008)))));p.hp-=Math.max(0,dmg);s.tracking.kills++;log(s,`Chạm trán yêu thú ở ${r.name}, mất ${dmg} khí huyết.`,'red');}
      else if(roll<.48){const n=1+Math.floor(random()*3);addItem(s,'herb',n);log(s,`Tìm được ${n} Linh Thảo.`,'green');}
      else if(roll<.70){const n=1+Math.floor(random()*2);addItem(s,'ore',n);log(s,`Khai được ${n} Quặng Linh Thiết.`,'green');}
      else if(roll<.84){const n=1+Math.floor(random()*3);addItem(s,'paper',n);log(s,`Nhặt được ${n} Giấy Phù.`,'green');}
      else{const stone=8+r.danger*8+Math.floor(random()*12);p.spiritStones+=stone;p.exp+=stone*2;log(s,`Gặp kỳ ngộ: +${stone} linh thạch, +${stone*2} tu vi.`,'gold');}return true;}
    case'START_SECRET':{const d=secretById(a.id);if(!d||p.realm<d.realm){log(s,'Cảnh giới chưa đủ vào bí cảnh.','red');return true;}if(s.secret.active)return true;s.secret.active={id:d.id,start:Date.now(),end:Date.now()+d.duration*1000};s.secret.runs++;log(s,`Tiến vào bí cảnh ${d.name}.`,'cyan');return true;}
    case'RESOLVE_SECRET':{const active=s.secret.active;if(!active)return true;const d=secretById(active.id);if(!d){s.secret.active=null;return true;}if(Date.now()<active.end&&!a.force)return true;const random=rng(a),chance=Math.max(.12,Math.min(.95,.42+power(s)/(80+d.danger*35)*.35+p.stats['Vận Khí']*.008));if(random()<=chance){grant(s,d.reward);s.secret.cleared[d.id]=(s.secret.cleared[d.id]||0)+1;p.exp+=d.danger*35;log(s,`Phá cảnh ${d.name} thành công, thu được chiến lợi phẩm.`,'gold');}else{const dmg=Math.min(p.hp-1,Math.floor(p.maxHp*.3));p.hp-=Math.max(0,dmg);log(s,`Thất bại tại ${d.name}, mất ${dmg} khí huyết.`,'red');}s.secret.active=null;return true;}
  }return false;
}
