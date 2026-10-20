/* Gợi ý đạo hiệu ngẫu nhiên khi người chơi bấm xúc xắc. Chỉ để gợi ý chữ; đạo hiệu thật do server kiểm tra lại. */
const FAMILY = ["Hàn", "Lục", "Tô", "Mạc", "Vũ", "Diệp", "Bạch", "Tạ", "Lăng", "Âu Dương", "Thượng Quan", "Tiêu", "Lý", "Phong", "Mộ Dung", "Đoàn"];
const MALE = ["Thiên Sơn", "Vô Kỵ", "Chấn Phong", "Hạo Nhiên", "Nghịch Thiên", "Thanh Vân", "Kiếm Tâm", "Tử Hiên", "Minh Triết", "Trường Không", "Dạ Lan", "Khải Lăng"];
const FEMALE = ["Nhược Vân", "Tuyết Nhi", "Linh Âm", "Thanh Ngọc", "Hồng Y", "Yên Hà", "Mộng Điệp", "Tử Yên", "Băng Tâm", "Thu Thủy", "Lam Nguyệt", "Dao Quang"];

export const NAME_MAX = 20;
const pick = (a, rnd) => a[Math.floor(rnd() * a.length)];

/** @param {"Nam"|"Nữ"} gender @param {() => number} [rnd] */
export function randomName(gender = "Nam", rnd = Math.random) {
  return `${pick(FAMILY, rnd)} ${pick(gender === "Nữ" ? FEMALE : MALE, rnd)}`.slice(0, NAME_MAX);
}

/** Cùng quy tắc với server (game.clean_dao_hieu): gộp khoảng trắng, 2–20 ký tự, không ký tự điều khiển/HTML. Trả null nếu không hợp lệ. */
export function cleanName(raw) {
  const c = String(raw ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
  // eslint-disable-next-line no-control-regex
  return c.length >= 2 && c.length <= NAME_MAX && !/[\u0000-\u001f\u007f<>&"'`[\]]/.test(c) ? c : null;
}
