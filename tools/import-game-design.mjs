/* Tạo snapshot dùng chung cho browser file:// và Node. Không sửa bộ Excel gốc. */
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pathArg = args.find(arg => !['--force','--check'].includes(arg));
const source = pathArg ? resolve(pathArg) : resolve(root, '../idea/data-game-chuan/du_lieu.json');
const target = resolve(root, 'data/design-raw.js');
const force = args.includes('--force');
const check = args.includes('--check');
try {
  await access(target);
  if (!force && !check) throw new Error(`Đã có ${target}; sao lưu và dùng --force nếu muốn thay.`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const data = JSON.parse(await readFile(source, 'utf8'));
for (const key of ['hạt giống', 'linh thảo', 'đan dược', 'đan phương', 'pháp bảo', 'hiệu ứng pháp bảo',
  'công pháp', 'bí tịch', 'rèn pháp bảo', 'phù lục', 'vẽ phù', 'quái vật', 'boss', 'giai đoạn boss',
  'vật phẩm rơi', 'npc', 'linh căn']) {
  if (!Array.isArray(data[key]) || !data[key].length) throw new Error(`Thiếu bảng dữ liệu: ${key}`);
}
const require = createRequire(import.meta.url);
const existing = new Set(require('../data/items.js').map(x => x.code));
const extras = {CP900:'BT-CP-900',CP901:'BT-CP-901',BT900:'BT-900',BT901:'BT-901',PL001:'TAL-PL-001'};
const groups = [['hạt giống','mã hạt','HG'],['linh thảo','mã cây','LT'],['đan dược','mã đan','DD'],
  ['pháp bảo','mã PB','PB'],['công pháp','mã CP','CP'],['bí tịch','mã BT','BT'],['phù lục','mã phù','PL']];
const ids = new Set(), used = new Set();
for (const [group,key,prefix] of groups) for (const row of data[group]) {
  const id=row[key], old=row['mã game cũ']||extras[id];
  if (typeof id!=='string'||!new RegExp('^'+prefix+'\\d{3}$').test(id)||ids.has(id)) throw new Error(`Mã trùng hoặc sai: ${id}`);
  if (!old||used.has(old)||(!existing.has(old)&&extras[id]!==old)) throw new Error(`Mã game cũ không hợp lệ: ${id} → ${old}`);
  ids.add(id);used.add(old);
}
const ref=(id,label)=>{if(!ids.has(id))throw new Error(`${label}: không tìm thấy ${id}`)};
const nonnegative=(value,label)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new Error(`${label}: cần số không âm`)};
for(const r of data['hạt giống']){
  ref(r['linh thảo thu được'],'Hạt giống');
  if(!Number.isInteger(r['độ khó'])||r['độ khó']<1||r['độ khó']>5||!(r['thời gian trồng (phút)']>0)||
    !Number.isInteger(r['sản lượng tối thiểu'])||!Number.isInteger(r['sản lượng tối đa'])||r['sản lượng tối thiểu']<1||r['sản lượng tối đa']<r['sản lượng tối thiểu'])throw new Error('Thông số hạt giống không hợp lệ: '+r['mã hạt']);
}
for(const r of data['đan phương']){ref(r['mã đan'],'Đan phương');ref(r['mã linh thảo'],'Đan phương');if(!(r['số lượng']>0))throw new Error('Số lượng đan phương không hợp lệ');}
for(const r of data['rèn pháp bảo']){ref(r['mã PB'],'Rèn');ref(r['mã bí tịch'],'Rèn');ref(r['mã linh thảo'],'Rèn');if(!(r['số lượng']>0))throw new Error('Số lượng rèn không hợp lệ');}
for(const r of data['vẽ phù']){ref(r['mã phù'],'Vẽ phù');ref(r['mã bí tịch'],'Vẽ phù');ref(r['mã linh thảo'],'Vẽ phù');}
for(const r of data['pháp bảo'])for(const field of ['hp cộng','mp cộng','atk cộng','def cộng','eva cộng (%)','sta cộng','crit cộng (%)'])nonnegative(r[field],r['mã PB']+' '+field);
for(const r of data['công pháp']){
  for(const field of ['tiêu hao mp','tiêu hao sta','hồi chiêu (giây)'])nonnegative(r[field],r['mã CP']+' '+field);
  if(!['công kích','phòng ngự','support'].includes(r['công dụng']))throw new Error('Công dụng công pháp không hợp lệ');
  if(r['công dụng']==='công kích')nonnegative(r.atk_multiplier,r['mã CP']+' atk_multiplier');
  if(r['công dụng']==='phòng ngự'){nonnegative(r.def_bonus,r['mã CP']+' def_bonus');nonnegative(r['thời gian buff (giây)'],r['mã CP']+' thời gian');}
  if(r.heal!==null&&r.heal!==undefined)nonnegative(r.heal,r['mã CP']+' heal');
  if(r['buff stat']){nonnegative(r['buff giá trị'],r['mã CP']+' buff');nonnegative(r['thời gian buff (giây)'],r['mã CP']+' thời gian');}
}
for(const r of data['hiệu ứng pháp bảo']){
  ref(r['mã PB'],'Hiệu ứng');nonnegative(r['tỉ lệ kích hoạt (%)'],'Tỉ lệ hiệu ứng');nonnegative(r['thời gian (giây)'],'Thời gian hiệu ứng');
  if(r['tỉ lệ kích hoạt (%)']>100||r['thời gian (giây)']<=0)throw new Error('Hiệu ứng không hợp lệ');
  const fields={'giáp ảo':['lá chắn (% hp tối đa)','hồi chiêu (giây)'],'hồi máu':['hồi máu (hp)','chu kỳ hồi (giây)','hồi chiêu (giây)'],
    'gây độc':['độc (sát thương/giây)','số lớp tối đa'],'chảy máu':['chảy máu (% hp hiện tại/giây)'],'đóng băng':[],'gây choáng':[]}[r['hiệu ứng']];
  if(!fields)throw new Error('Loại hiệu ứng không hợp lệ');for(const field of fields)nonnegative(r[field],r['mã PB']+' '+field);
  if(r['hiệu ứng']==='hồi máu'&&!r['chu kỳ hồi (giây)'])throw new Error('Chu kỳ hồi máu phải lớn hơn 0');
  if(r['hiệu ứng']==='chảy máu'&&r['chảy máu (% hp hiện tại/giây)']>100)throw new Error('Chảy máu không thể vượt 100% HP/giây');
  if(r['hiệu ứng']==='gây độc'&&(!Number.isInteger(r['số lớp tối đa'])||r['số lớp tối đa']<1))throw new Error('Số lớp độc không hợp lệ');
}
const enemies=new Set([...data['quái vật'].map(r=>r['mã quái']),...data.boss.map(r=>r['mã boss'])]);
for(const r of [...data['quái vật'],...data.boss]){for(const field of ['hp','atk','def','exp','eva (%)','crit (%)','crit_dame (%)'])nonnegative(r[field],(r['mã quái']||r['mã boss'])+' '+field);if(r.hp<=0||r['eva (%)']>100||r['crit (%)']>100)throw new Error('Chỉ số quái hoặc boss không hợp lệ');}
for(const r of data['vật phẩm rơi']){ref(r['mã vật phẩm'],'Vật phẩm rơi');if(!enemies.has(r['mã đối thủ'])||!(r['tỉ lệ (%)']>=0&&r['tỉ lệ (%)']<=100))throw new Error('Bảng rơi không hợp lệ');}
for(const r of data.npc){ref(r['thích (mã vật phẩm)'],'NPC');ref(r['không thích (mã vật phẩm)'],'NPC');if(r['mã hàng/dạy/đan'])ref(r['mã hàng/dạy/đan'],'NPC');}
if(check){console.log(`Dữ liệu hợp lệ: ${source}`);process.exit(0)}
const body = JSON.stringify(data);
await writeFile(target, `/* Snapshot từ idea/data-game-chuan/du_lieu.json; tạo bằng tools/import-game-design.mjs. */\n(function(root){const data=${body};root.HU_DESIGN_RAW=data;if(typeof module!=='undefined'&&module.exports)module.exports=data;})(typeof window!=='undefined'?window:globalThis);\n`, { flag: force ? 'w' : 'wx' });
console.log(`Đã tạo ${target} từ ${source}`);
