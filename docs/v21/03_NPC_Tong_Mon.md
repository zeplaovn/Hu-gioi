# Thiên Vân Đại Lục — NPC và tông môn v2.1

Có 9 NPC tương tác có định danh; cùng một người xuất hiện qua nhiều giới vẫn chỉ dùng một ID. Người bán hàng là vai trò trên các NPC này, không sinh NPC mới. Người dân trong nền không có định danh, không giao nhiệm vụ và không mở shop.

| ID | Nhân vật | Chức năng |
|---|---|---|
| NPC-01 | Trần Minh | Hướng dẫn, Hội Quy Hương, nối tuyến chính |
| NPC-02 | Tô Nhược Vân | Thanh Vân, Thái Hư, khảo hạch kiếm đạo, shop |
| NPC-03 | Diệp Hồng Y | Huyết Sát, Vô Tướng, nhánh sát nghiệp, shop |
| NPC-04 | Bạch Tử Yên | Vạn Dược, Bách Thảo, luyện đan, shop |
| NPC-05 | Tạ Thiên Cơ | Trận pháp, Thiên Cơ Các, Vạn Pháp, giới môn, shop |
| NPC-06 | Cơ Vô Ngôn | Sử quan, xác minh chứng cứ |
| NPC-07 | Tư Mệnh Tiên Quân | Thiên Sổ, Tiên Đình, tranh luận luật, shop |
| NPC-08 | Mạnh Bà Vô Diện | Ký ức, U Minh, shop |
| NPC-09 | Người Gác Đài Quy Hương | Quy Phàm, lựa chọn cuối, shop |

## Tông môn và tiến trình

Giữ ba lựa chọn Hạ Giới: Thanh Vân, Huyết Sát, Vạn Dược. Khi lên Linh Giới nối lần lượt sang Thái Hư, Vô Tướng, Bách Thảo. Thiên Cơ và các thế lực Tiên Giới là quầy mở bằng nhiệm vụ. Không yêu cầu gia nhập lại để nhận vật phẩm bắt buộc. Chưởng môn và các nhân vật phụ vẫn có thể được nhắc trong sách, thư, lịch sử; không có thực thể tương tác riêng.

## Cách gộp mà không đổi lịch sử

Tô Nhược Vân nhận khảo hạch và kiếm đạo; Diệp Hồng Y nhận thử luyện ma đạo; Bạch Tử Yên nhận cứu trợ và đan viện; Tạ Thiên Cơ nhận trận pháp và giới môn; Cơ Vô Ngôn nhận xác minh tư liệu; Tư Mệnh nhận Thiên Sổ; Mạnh Bà nhận ký ức; Người Gác Đài nhận Quy Phàm; Trần Minh dẫn nhập và Hội Quy Hương. Đây là chuyển chức năng, không đồng nhất những con người cũ. Ánh xạ5 ID hội thoại nhập nằm trong ../data/v21/migration.json; các chức năng cũ được ghi ở bảng phân vai trên.

## Tính liên tục qua các kiếp

Trạng thái quan hệ, nhiệm vụ, tồn tại của NPC dùng life_id. NPC vắng mặt cung cấp thư hoặc sổ nhiệm vụ qua giao diện, không tạo người thay thế. Không khóa tuyến chính vì nhánh quan hệ. Nhân vật chỉ hiện diện trực tiếp tại một giới trong một thời điểm; dùng thư/truyền tin để nối tuyến trước khi điều kiện phi thăng của họ hoàn tất. Thư không hồi sinh tài sản kiếp trước. Giữ riêng cờ hiểu biết tài khoản và tiến độ kiếp.

## Shop

Dữ liệu chuẩn: ../data/v21/sect_shop.json và ../data/v21/config.json. Mua bằng cống hiến kiếp hiện tại; 20/ngày và 50/tuần từ nhiệm vụ tông môn. Hàng bảo đảm, làm mới 8 giờ, hạn mức ngày không đặt lại theo lần refresh. Đồ mua khóa giao dịch và bán lại; không bán vật phẩm Thiên Mệnh, cổ vật Lục Mệnh hoặc vật chứng tuyến chính. Cống hiến theo kiếp mất khi chết, giữ khi phi thăng.
