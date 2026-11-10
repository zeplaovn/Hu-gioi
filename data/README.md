# data/

Dữ liệu thiết kế và mô hình cân bằng. Thuần dữ liệu và hàm số học, không có state, không đụng DOM/mạng; chạy trong Node và trình duyệt.

| File | Nội dung |
|---|---|
| `balance.js` | Bảng hằng số cân bằng (cảnh giới, hệ số, tiền tệ, đan, bảng giá). |
| `formulas.js` | Mô hình số học `F` (tu vi cần, tốc độ tu, sát thương, xác suất đột phá, thọ nguyên, giá…). Phụ thuộc `balance.js`. |
| `items.js` | Danh mục vật phẩm gốc. |
| `design-raw.js` | Snapshot dữ liệu thiết kế (snapshot đã lưu; công cụ `tools/import-game-design.mjs` cũ hiện không còn). |
| `design.js` | Lớp ánh xạ từ snapshot thiết kế sang mã game. |
| `catalog.js` | Tra cứu vật phẩm hợp nhất (`item()`, `ITEMS`, `ZONES`…). |
| `roots.js` | Linh căn ngũ hành, Dị linh căn, Hỗn Độn. |
| `character.js` | Chủng tộc, thiên phú, thiên mệnh, thành tựu, tạo tên. |
| `meridians.js` | 12 chính kinh, 8 kỳ kinh, hệ ngũ hành và tạp chất (hiện chỉ xem trước; luật trong engine chưa triển khai). |
| `social.js` | Tri kỷ, đạo hữu, đối thủ, giao du. |
| `adventures.js` | Bí cảnh, kỳ ngộ, tông môn, nhiệm vụ tông môn, tôi luyện linh căn. |
| `story.js` | Thiên Thư, 14 chương và hội thoại NPC; dữ liệu không tự cấp thưởng. |

Quy ước: file này không `require` bất cứ thứ gì ngoài `data/`. Tài liệu về phạm vi dữ liệu thiết kế: [docs/design-integration.md](../docs/design-integration.md).
