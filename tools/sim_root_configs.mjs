// Các bộ số thử cho tools/sim_root.mjs (hướng 1: đuổi kịp theo cảnh giới, 2: bù thọ nguyên / giữ tu vi, 3: nén biên độ).
export default TT => {
  const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
  /** Hướng 1: bonus tu vi của linh căn trôi dần về MID khi lên cảnh giới (hết trôi ở realm END). rareExp: bonus Dị căn trước khi trôi. */
  const catchUp = (MID, END, rareTo = MID + 0.05) => (els, realm, info, rare, elemBonus) => lerp(info.exp, rare ? rareTo : MID, realm / END) + elemBonus;
  const lifeBy = { 1: 0, 2: 0, 3: 20, 4: 45, 5: 70 };            // thọ nguyên cộng thêm mỗi lần đại đột phá theo số nguyên tố
  const keepBy = { 1: 0, 2: 0, 3: 0.03, 4: 0.06, 5: 0.10 };
  const life = (els, info, rare) => (rare ? 0 : lifeBy[info.n]);
  const keep = (els, info, rare) => (rare ? 0 : keepBy[info.n]);
  const squash = (els, realm, info, rare, elemBonus) => ({ 1: 0.30, 2: 0.18, 3: 0.08, 4: 0.02, 5: -0.04 }[info.n] ?? 0) * (rare ? 0 : 1) + (rare ? 0.34 : 0) + elemBonus;
  return {
    "H1 đuổi kịp": { exp: catchUp(0.12, 6) },
    "H2 thọ nguyên": { life, keep },
    "H1+H2": { exp: catchUp(0.12, 6), life, keep },
    "H3 nén": { exp: squash },
    "H3+H2": { exp: squash, life, keep },
    "H1 + nhịp x1.25": { exp: catchUp(0.12, 6, 0.12), speed: 1.25 },
    "H1 + H2 nhẹ + nhịp x1.2": { exp: catchUp(0.12, 6, 0.12), speed: 1.2, life: (e, i, r) => (r ? 0 : { 1: 0, 2: 0, 3: 8, 4: 15, 5: 25 }[i.n]), keep: (e, i, r) => (r ? 0 : { 1: 0, 2: 0, 3: 0.01, 4: 0.02, 5: 0.04 }[i.n]) },
    "H3 + nhịp x1.3": { exp: squash, speed: 1.3 },
  };
};
