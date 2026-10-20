#!/usr/bin/env python3
"""Thiên Vân Đại Lục simulator v1.5 — permadeath + Thiên Mệnh (theo tầng) + thọ nguyên.

MÔ HÌNH THIẾT KẾ 30–45 NGÀY, KHÔNG PHẢI ENGINE THẬT. Xác suất chết là GIẢ ĐỊNH (chưa đo); dùng cờ
--hazard-scale để xem độ nhạy. Thời gian có phân tán (mức chăm chỉ + nhiễu từng giai đoạn),
nên kết quả là phân phối thật, không phải một đỉnh nhọn.
"""
import argparse, json, math, random, statistics

# (id, ngày mục tiêu của giai đoạn, xác suất chết ở tầng 9/đại đột phá)
STAGES = [('HG00', 0.55, 0.0), ('HG01', 1.1, 0.005), ('HG02', 1.65, 0.008), ('HG03', 2.2, 0.01), ('HG04', 1.65, 0.012), ('HG05', 1.1, 0.03), ('LG01', 2.75, 0.01), ('LG02', 3.85, 0.012), ('LG03', 3.3, 0.015), ('LG04', 1.1, 0.06), ('TG01', 2.2, 0.01), ('TG02', 3.3, 0.012), ('TG03', 3.3, 0.015), ('TG04', 2.75, 0.02), ('TG05', 2.2, 0.025)]
RISKY_AFTER = {5: 0.025, 9: 0.035, 14: 0.040}   # bí cảnh/boss lethal sau giai đoạn idx
TANG = 9                                         # 9 tầng mỗi cảnh giới, +1 TM mỗi tầng
STATS = {  # tên: (giá cấp 0, bước tăng, trọng số ưu tiên mua, hệ số tốc độ, hệ số giảm rủi ro)
    'CanCot':  (8, 2, 1.0, 0.002, 0.010),
    'NgoTinh': (8, 2, 0.8, 0.004, 0.000),
    'VanKhi':  (9, 2, 0.6, 0.000, 0.005),
    'TuongMao':(6, 1, 0.2, 0.000, 0.000),
    'PhucDuyen':(7,1, 0.2, 0.000, 0.000)}
CAP = 20; SPEED_CAP = 1.25; RISK_FLOOR = 0.5
THO_START, THO_PER_DAY_GRANT, THO_PER_DAY_USE = 100, 20, 10
DAY_END, acc = [], 0
for _, d, _ in STAGES: acc += d; DAY_END.append(acc)

def spend(tm, lv):
    spent = 0
    while True:
        best, bs = None, 0
        for s,(b,st,w,_,_) in STATS.items():
            if lv[s] >= CAP: continue
            c = b + st*lv[s]
            if c <= tm and w/c > bs: best, bs = s, w/c
        if best is None: return tm, spent
        c = STATS[best][0] + STATS[best][1]*lv[best]; tm -= c; spent += c; lv[best] += 1

def one(rng, hz):
    a = math.exp(rng.gauss(0, 0.15))             # mức chăm chỉ cố định của người chơi
    lv = {s:0 for s in STATS}; tm_bal = 0; tm_all = 0; spent_all = 0
    elapsed = 0.0; deaths = 0; lives = 0; later_clean = None
    while True:
        lives += 1
        tm_bal, sp = spend(tm_bal, lv); spent_all += sp
        speed = min(SPEED_CAP, 1 + sum(STATS[s][3]*lv[s] for s in STATS))
        rr = max(RISK_FLOOR, 1 - sum(STATS[s][4]*lv[s] for s in STATS))
        life_days = 0.0; dead = False
        for i,(_,days,pd) in enumerate(STAGES):
            t = days / (speed * a) * max(0.8, rng.gauss(1, 0.05))
            life_days += t; elapsed += t
            if 10*life_days > THO_START + THO_PER_DAY_GRANT*DAY_END[i]:   # tọa hóa
                dead = True; break
            tm_bal += TANG-1; tm_all += TANG-1                              # tầng 1..8
            if rng.random() < pd*hz*rr: dead = True; break
            tm_bal += 1; tm_all += 1                                        # tầng 9 thành công
            if i in RISKY_AFTER and rng.random() < RISKY_AFTER[i]*hz*rr: dead = True; break
        if dead: deaths += 1; continue
        if lives >= 2: later_clean = life_days
        return elapsed, deaths, lives, tm_all, spent_all, later_clean, lives == 1

def pct(a, p):
    a = sorted(a); x = (len(a)-1)*p; lo, hi = int(math.floor(x)), int(math.ceil(x))
    return a[lo] if lo == hi else a[lo] + (a[hi]-a[lo])*(x-lo)

def run(runs, seed, hz):
    rng = random.Random(seed); rs = [one(rng, hz) for _ in range(runs)]
    ts = [r[0] for r in rs]; lc = [r[5] for r in rs if r[5] is not None]
    return {'hazard_scale': hz,
        'p10_days': round(pct(ts,.1),2), 'p25_days': round(pct(ts,.25),2), 'median_days': round(pct(ts,.5),2),
        'p75_days': round(pct(ts,.75),2), 'p90_days': round(pct(ts,.9),2), 'mean_days': round(statistics.mean(ts),2),
        'first_life_clear_pct': round(sum(r[6] for r in rs)/runs*100,2),
        'mean_deaths': round(statistics.mean(r[1] for r in rs),3), 'p90_lives': pct([r[2] for r in rs],.9),
        'median_tm_earned': statistics.median(r[3] for r in rs), 'median_tm_spent': statistics.median(r[4] for r in rs),
        'later_life_clean_days_median': round(statistics.median(lc),2) if lc else None, 'later_life_samples': len(lc)}

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--runs', type=int, default=20000)
    ap.add_argument('--seed', type=int, default=20261017); ap.add_argument('--hazard-scale', type=float, default=1.0)
    ap.add_argument('--sensitivity', action='store_true'); a = ap.parse_args()
    out = {'runs': a.runs, 'seed': a.seed,
           'note': 'Design-level model; hazards are ASSUMPTIONS, not telemetry.'}
    if a.sensitivity: out['sensitivity'] = [run(a.runs, a.seed, h) for h in (0.5, 1.0, 1.5)]
    else: out.update(run(a.runs, a.seed, a.hazard_scale))
    print(json.dumps(out, ensure_ascii=False, indent=2))
