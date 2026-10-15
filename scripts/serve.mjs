// Server tĩnh cục bộ cho lúc phát triển (chỉ cần Node):  npm run serve  ->  http://localhost:8000
// Dùng cho thư mục gốc dự án; muốn thử bản phát hành thì chạy:  npm run serve -- dist
import http from "node:http"; import fs from "node:fs"; import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", process.argv[2] || "."), port = +process.env.PORT || 8000;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".json": "application/json; charset=utf-8", ".ico": "image/x-icon" };

http.createServer((req, res) => {
  let rel; try { rel = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (rel.includes("\0")) { res.writeHead(400); return res.end(); }                                           // fs.stat ném lỗi đồng bộ với ký tự NUL và làm sập server
  const file = path.join(root, rel.endsWith("/") ? rel + "index.html" : rel);
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }          // chặn ../
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end("Không tìm thấy"); }
    res.writeHead(200, { "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-cache" });
    fs.createReadStream(file).pipe(res);
  });
}).listen(port, "127.0.0.1", () => console.log(`Đang chạy: http://localhost:${port}  (thư mục ${path.relative(process.cwd(), root) || "."})`));
