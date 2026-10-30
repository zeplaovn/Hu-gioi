# Kiến thức thiết kế backend áp dụng cho Hư Giới

Tài liệu này tổng hợp các nguyên tắc backend đã tra cứu, nói rõ **điều nào nguồn xác nhận**, **điều nào là quyết định của dự án**, và khung `server/` hiện thực chúng ở đâu. Kế hoạch dài hạn (PostgreSQL, WebSocket, nhiều người chơi) vẫn ở [backend-plan.md](backend-plan.md); tài liệu này là phần đã được hiện thực trong khung.

## 1. Server-authoritative hay client-authoritative

**Nguồn nói gì.** Metaplay mô tả mô hình server-authoritative là server luôn giữ bản trạng thái chính thức và kiểm tra lại mọi thay đổi, nên client bị sửa cũng không đổi được tiền, hạng hay hành trang; log của server còn giúp xử tranh chấp. Cái giá là mỗi hành động tốn một vòng mạng (khoảng 50–200 ms theo bài này), tốn công dựng dự đoán/đồng bộ, và **không chống được bot hay tự động hóa**. Mã luật dùng chung giữa client và server cần tính xác định (RNG có seed, thứ tự ổn định). Phần lớn game thực tế là lai: kinh tế, tiến trình, xếp hạng do server giữ; phần trình bày và trạng thái ngoại tuyến ở client. ([Metaplay](https://www.metaplay.io/comparisons/server-authoritative-vs-client-authoritative); Unity Cloud Code nêu cùng ý: dữ liệu tiến trình và luật kiểm tra nằm ở server, client không sửa trực tiếp điểm hay thành tựu — [Unity](https://docs.unity.com/en-us/cloud-code/3.0.0/server-authority).)

**Quan điểm ngược lại.** Bài về game idle offline-first coi thiết bị là nguồn sự thật cho trạng thái của chính nó, lưu bản lưu dạng blob có phiên bản kèm khóa lạc quan, đồng bộ định kỳ, và chỉ thêm kiểm tra server nơi có cạnh tranh như bảng xếp hạng ([HostedGG](https://hostedgg.com/blog/signaldecay-offline-first-idle-games)).

**Quyết định cho Hư Giới.** Hai chế độ cùng một engine:

- Chế độ **offline** (hiện có): `LocalSession`, thiết bị là nguồn sự thật, không cạnh tranh.
- Chế độ **online**: server-authoritative, vì kế hoạch có tông môn, đấu giá, PvP và bảng xếp hạng dùng chung. Client chỉ gửi ý định + ID.

Vì vậy `engine/` phải xác định và không đụng thời gian/RNG trực tiếp (đã là quy ước của repo). Server-authoritative không thay thế được chống bot: cần giới hạn tốc độ (§6).

## 2. Idempotency: retry an toàn

**Nguồn nói gì (Stripe).** Client sinh khóa duy nhất (khuyến nghị UUID v4, tối đa 255 ký tự, không dùng dữ liệu nhạy cảm); server lưu mã trạng thái và nội dung phản hồi của lần đầu rồi trả lại y nguyên cho lần retry cùng khóa; so tham số với lần đầu và báo lỗi nếu khác; khóa có thể bị xóa sau ít nhất 24 giờ; kết quả chỉ được lưu **sau khi endpoint bắt đầu thực thi** (lỗi kiểm tra tham số hoặc xung đột đồng thời thì không lưu, nên retry được) ([Stripe](https://docs.stripe.com/api/idempotent_requests?lang=node)).

**Nguồn nói gì (Brandur).** Bảng khóa duy nhất theo `(user_id, idempotency_key)`; lưu method, path, params, `recovery_point`, mã/nội dung phản hồi; cùng khóa khác tham số → 409; khóa đang bị khóa xử lý → 409; mỗi pha chạy trong transaction, serializable; việc gọi dịch vụ ngoài phải qua pha riêng và dùng khóa riêng; tác vụ nền được "stage" trong cùng transaction; có completer xử lý khóa bị bỏ dở và reaper xóa sau khoảng 72 giờ ([Brandur](https://brandur.org/idempotency-keys)).

**Quyết định.** Lệnh game chỉ ghi vào **một** kho (state + receipt + outbox trong cùng giao dịch), không gọi dịch vụ ngoài giữa chừng, nên **không cần recovery point/completer** của Brandur; đó chỉ là cần khi có gọi ngoài như thanh toán. Áp dụng:

- `requestId` do client sinh; receipt khóa theo `(playerId, requestId)` kèm dấu vân tay của `type + payload`.
- Cùng khóa, cùng dấu vân tay → trả lại kết quả đã lưu (`replayed: true`), không cấp thưởng hai lần.
- Cùng khóa, khác dấu vân tay → `IDEMPOTENCY_KEY_REUSED` (409).
- Lệnh bị từ chối (payload sai, không đủ linh thạch…) **không** lưu receipt, đúng như Stripe.
- Receipt hết hạn sau `RECEIPT_TTL_HOURS` (mặc định 72).

## 3. Đồng thời: revision và khóa

**Nguồn nói gì.** Khóa lạc quan gắn token phiên bản vào từng dòng; ghi có điều kiện `UPDATE … SET version = version + 1 WHERE id = ? AND version = ?`; không khớp dòng nào nghĩa là xung đột, ứng dụng tải lại rồi thử lại hoặc trả 409. Nhược điểm: mọi lần ghi đều đổi token nên có xung đột giả. Khóa bi quan chặn trước, hợp khi xung đột thường xuyên nhưng giảm đồng thời và có thể deadlock ([Milan Jovanović](https://milanjovanovic.tech/blog/ef-core-postgresql-xmin-concurrency)).

**Quyết định.**

- Mỗi người chơi có `revision`. Lệnh gửi `expectedRevision`; lệch → `REVISION_CONFLICT` (409) kèm `currentRevision`, client sync lại.
- Mọi giao dịch của **cùng một người chơi** được xếp hàng tuần tự (mutex theo `playerId` trong kho bộ nhớ; ở PostgreSQL là `SELECT … FOR UPDATE` hoặc ghi có điều kiện). Hai thiết bị cùng lúc không thể cùng áp lệnh lên một state.
- Kiểm tra revision và ghi nằm trong cùng giao dịch.

## 4. Outbox: tác dụng phụ không mất, không nhân đôi

**Nguồn nói gì.** Mẫu outbox lưu tin nhắn đi cùng giao dịch dữ liệu để không ghi hai nơi rời nhau; thư viện được dẫn bảo đảm gửi *ít nhất một lần* và xử lý đúng một lần nhờ inbox phía nhận; đây là lựa chọn thay cho two-phase commit ([pg-transactional-outbox](https://github.com/Zehelein/pg-transactional-outbox)). Trang đó không mô tả lược đồ bảng hay so sánh polling với logical replication, nên phần dưới là quyết định của dự án, không phải trích nguồn.

**Quyết định.** Lệnh có thể sinh sự kiện (`player.breakthrough`, cập nhật bảng xếp hạng, thư…). Sự kiện được ghi vào outbox **trong cùng giao dịch** với state. `OutboxWorker` thăm dò theo lô, gọi handler theo `type`, chỉ xác nhận (`ack`) sau khi handler thành công. Vì giao ít nhất một lần, **handler phải idempotent** (dùng `event.id`). Khung hiện chạy trong bộ nhớ; PostgreSQL dùng bảng `outbox` + `FOR UPDATE SKIP LOCKED`.

## 5. Tiến trình ngoại tuyến (bế quan)

**Nguồn nói gì.** Clicker Heroes mô phỏng tiến trình khi vắng mặt từ DPS nhàn rỗi tại lúc thoát: chỉ DPS nhàn rỗi được tính, không tự bấm/kỹ năng chủ động, vàng không được tiêu và nhân vật không lên cấp trong lúc vắng; mô phỏng dừng khi DPS không đủ hạ quái để tiến vùng. Bài này **không nêu nguồn thời gian** (đồng hồ máy hay server) và không cho công thức số, nên không dùng làm căn cứ cho đồng hồ ([Clicker Heroes](https://blog.clickerheroes.com/offline-progression-in-clicker-heroes/embed/)). Bài Signal Decay: giới hạn thời gian bù (ví dụ 12 giờ) là một đòn bẩy thiết kế, không phải giới hạn kỹ thuật; nếu không giới hạn, vắng mặt dài làm vỡ kinh tế và người chơi hằng ngày/hằng tuần bị lệch xa; dùng cùng một phép toán cho lúc đang chơi và lúc vắng ([HostedGG](https://hostedgg.com/blog/signaldecay-offline-first-idle-games)).

**Quyết định.**

- Online: **đồng hồ do server cấp**, không nhận `now` từ client. Service đảm bảo `now` không lùi (`max(clock, lastUpdate)`).
- Trần và hiệu suất bù nằm trong luật (`data/formulas.js` đã có `offline_cap`, `offline_efficiency`), do engine áp dụng; service chỉ truyền `advance(now, offline)`.
- Phép toán bế quan phải là cùng một hàm với tu luyện lúc đang chơi (một nguồn luật).

## 6. Giới hạn tốc độ

**Nguồn nói gì.** Token bucket: *capacity* là số lần bùng nổ tối đa, *refill rate* là thông lượng bền vững, mỗi yêu cầu tiêu *cost* token; xô rỗng thì từ chối. Khóa theo người dùng, theo loại yêu cầu, theo IP, hoặc toàn cục, và nên xếp lớp; capacity quá lớn cho kẻ tấn công cửa sổ dài để tràn, quá nhỏ gây từ chối nhầm ([ws-kit](https://kriasoft.com/ws-kit/posts/token-bucket-policies)).

**Quyết định.** Ba xô: theo IP cho mọi yêu cầu, theo tài khoản cho `/api/commands` (cost 1), và xô riêng chặt hơn cho đăng nhập/đăng ký (chống dò mật khẩu), trả 429 kèm `Retry-After`. Giá trị mặc định ở `server/config.js`, chỉ là điểm xuất phát cần chỉnh theo tải thật.

## 7. Phiên và mật khẩu

**Phiên (OWASP).** ID phiên sinh bằng CSPRNG, ít nhất 64 bit entropy và khuyến nghị 128 bit nếu tự sinh; cookie `Secure`, `HttpOnly`, `SameSite` đặt rõ (`Strict` ưu tiên, hoặc `Lax`), tiền tố `__Host-` (cần `Secure`, không `Domain`, `Path=/`); cấp lại ID khi đăng nhập và đổi quyền; có timeout nhàn rỗi **và** timeout tuyệt đối, thực thi ở server; hủy phiên phía server khi đăng xuất; chỉ nhận ID từ cookie, không từ URL ([OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)).

**Mật khẩu.** Trang OWASP Password Storage không đọc được trong phiên này (bị chặn), nên số liệu dưới đây lấy từ một bài tóm tắt, **cần đối chiếu lại với OWASP hiện hành trước khi triển khai**: ưu tiên Argon2id (bài ghi tối thiểu 15 MiB, 2 lượt, song song 1, hoặc 37 MiB, 1 lượt); bcrypt chi phí tối thiểu 10 và cắt ở 72 byte; PBKDF2-HMAC-SHA256 310.000 vòng khi cần FIPS; salt riêng mỗi mật khẩu (IETF khuyến nghị 128 bit), pepper là bí mật hệ thống nằm ngoài DB và không thay salt ([Classmethod](https://dev.classmethod.jp/articles/modern-password-hashing-owasp-way/)).

**Quyết định.** Node 22 chưa có Argon2 tích hợp, mà khung không muốn thêm phụ thuộc, nên dùng `crypto.scrypt` (N=2^15, r=8, p=1, salt 16 byte, so sánh bằng `timingSafeEqual`). Thông số scrypt là lựa chọn của dự án chứ không phải số liệu trích từ OWASP; khi thêm phụ thuộc, chuyển sang Argon2id. Định dạng hash tự mô tả thông số (`scrypt$N$r$p$salt$hash`) nên đổi thuật toán không cần di trú toàn bộ.

Phiên: token 128 bit; DB chỉ lưu **băm SHA-256** của token; cookie `__Host-hu_sid` khi bật HTTPS, `hu_sid` khi chạy HTTP cục bộ; idle 30 phút, tuyệt đối 12 giờ (game idle, người chơi để tab mở lâu; chỉnh được); cấp lại ID khi đăng nhập. Phòng CSRF: cookie `SameSite=Lax`, chỉ nhận `application/json`, và kiểm tra `Origin` trùng `Host` với phương thức ghi.

## 8. Kinh tế và chống gian lận

Chưa tìm được nguồn đáng tin cậy chi tiết cho sổ cái kinh tế (các kết quả chỉ là bài blog tổng quát, chưa đọc), nên khung **không** hiện thực sổ cái. Điều đã xác nhận là nguyên tắc của Metaplay: tiền tệ, hành trang, giao dịch nằm ở server để chặn nhân bản vật phẩm, và log server là bằng chứng khi tranh chấp. Mục thiết kế sổ cái trong [backend-plan.md §9](backend-plan.md) vẫn là đề xuất chưa kiểm chứng bằng nguồn ngoài.

## 9. Ánh xạ sang mã

| Nguyên tắc | Nơi hiện thực | Test |
|---|---|---|
| Idempotency, revision, rollback | `server/services/player-service.js` | `tools/test-backend.mjs` |
| Giao dịch theo người chơi, outbox | `server/repositories/memory-player-repository.js`, `server/workers/outbox-worker.js` | `tools/lib/repository-contract.mjs` |
| Token bucket | `server/http/rate-limit.js` | `tools/test-backend.mjs` |
| Mật khẩu, phiên, cookie | `server/auth/*` | `tools/test-backend.mjs` |
| Lỗi chuẩn, định tuyến, giới hạn body | `server/http/*` | `tools/test-backend.mjs` |
| API | `server/api/routes.js` | `tools/test-backend.mjs` |

## 10. Chưa kiểm chứng / ngoài phạm vi khung

- Không có nguồn nào đọc được về xử lý thời gian phía server cho game idle; quyết định §5 là của dự án.
- Argon2id, TLS, HSTS, CSP bản online, sao lưu và quan sát vận hành: xem [backend-plan.md](backend-plan.md) §11–12, chưa kiểm chứng ở đây.
- WebSocket/SSE cho chat và presence: chưa nghiên cứu trong đợt này.

## Nguồn

- [Metaplay — Server-authoritative vs client-authoritative](https://www.metaplay.io/comparisons/server-authoritative-vs-client-authoritative)
- [Unity Cloud Code — Server authority](https://docs.unity.com/en-us/cloud-code/3.0.0/server-authority)
- [HostedGG — Signal Decay, offline-first idle games](https://hostedgg.com/blog/signaldecay-offline-first-idle-games)
- [Clicker Heroes blog — Offline progression](https://blog.clickerheroes.com/offline-progression-in-clicker-heroes/embed/)
- [Stripe — Idempotent requests](https://docs.stripe.com/api/idempotent_requests?lang=node)
- [Brandur — Implementing Stripe-like idempotency keys in Postgres](https://brandur.org/idempotency-keys)
- [Milan Jovanović — Optimistic concurrency với Postgres xmin](https://milanjovanovic.tech/blog/ef-core-postgresql-xmin-concurrency)
- [pg-transactional-outbox](https://github.com/Zehelein/pg-transactional-outbox)
- [OWASP — Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Classmethod — Modern password hashing, OWASP way](https://dev.classmethod.jp/articles/modern-password-hashing-owasp-way/)
- [ws-kit — Token bucket policies](https://kriasoft.com/ws-kit/posts/token-bucket-policies)
