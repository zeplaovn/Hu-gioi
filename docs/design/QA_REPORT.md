# QA REPORT — THIÊN VÂN ĐẠI LỤC FINAL v1.3

**Ngày rà soát: 17/10/2026** · Kết quả sinh bởi `python3 scripts/qa_check.py` (chạy lại được, mọi check đọc dữ liệu thật)

## Kiểm tra tự động
```text
PASS  Số dòng linh_duoc.csv = 72                                            thực tế 72
PASS  Số dòng dan_duoc.csv = 60                                             thực tế 60
PASS  Số dòng nguyen_lieu.csv = 54                                          thực tế 54
PASS  Số dòng trang_bi.csv = 82                                             thực tế 82
PASS  Số dòng affix.csv = 20                                                thực tế 20
PASS  Số dòng set_trang_bi.csv = 9                                          thực tế 9
PASS  Số dòng quai_boss.csv = 30                                            thực tế 30
PASS  Số dòng drop_table.csv = 132                                          thực tế 132
PASS  Số dòng death_rules.csv = 9                                           thực tế 9
PASS  Số dòng thien_menh_cac.csv = 17                                       thực tế 17
PASS  Số dòng progression_60_days.csv = 15                                  thực tế 15
PASS  Số dòng economy_60_days.csv = 60                                      thực tế 60
PASS  ID duy nhất linh_duoc.csv                                             
PASS  ID duy nhất dan_duoc.csv                                              
PASS  ID duy nhất nguyen_lieu.csv                                           
PASS  ID duy nhất trang_bi.csv                                              
PASS  ID duy nhất drop_table.csv                                            
PASS  ID duy nhất quai_boss.csv                                             
PASS  ID duy nhất affix.csv                                                 
PASS  ID duy nhất set_trang_bi.csv                                          
PASS  ID duy nhất death_rules.csv                                           
PASS  ID duy nhất thien_menh_cac.csv                                        
PASS  Chỉ ba map Hạ/Linh/Tiên                                               ['Hạ Giới', 'Linh Giới', 'Tiên Giới']
PASS  Tổng ngày progression = 60                                            
PASS  Economy: sink_total/net/ratio nhất quán                               
PASS  Source/sink cửa sổ 7 ngày trong 0.9–1.35                              min 1.127 max 1.216
PASS  Source/sink cửa sổ 7 ngày trong vùng khỏe 1.05–1.25                   
PASS  TM mỗi kiếp = tầng × giai đoạn × TM/tầng                              135
PASS  Giá Quán Đỉnh trong CSV khớp config                                   
PASS  Tổng giá Quán Đỉnh = config                                           2280
PASS  Giá item TM trong khoảng config                                       
PASS  Item Thiên Mệnh không xuất hiện ở drop/shop/nguồn thường              
PASS  tho_nguyen.csv khớp công thức                                         
PASS  Không còn ký tự xuống dòng literal (backslash-n) trong md             
PASS  Không còn migration save cũ / meta.ascended trong tài liệu            
PASS  Kế hoạch có "Phi Thăng chỉ chuyển map"                                
PASS  Kế hoạch có "135 TM"                                                  
PASS  Kế hoạch có "2.280"                                                   
PASS  Kế hoạch có "Database làm mới từ đầu"                                 
PASS  Kế hoạch có "Thọ nguyên"                                              
PASS  Balance Master khớp kế hoạch (135 TM, 2.280)                          
PASS  Stack/API/frontend để OPEN (không ghi công nghệ cụ thể làm baseline)  
PASS  Heading Balance Master không trùng số                                 
PASS  Simulator tái lập kết quả đã lưu (seed cố định)                       
PASS  Guardrail: kiếp sạch thứ 2+ median ≥ 45 ngày                          58.78
PASS  Phân phối thời gian không suy biến (P25 < median < P75)               
PASS  xlsx không có lỗi công thức                                           
PASS  xlsx Dashboard khớp config (TM/kiếp, tổng giá)
```

## Điều đã kiểm chứng và điều chưa
**Đã kiểm chứng (bằng script):** số lượng và ID dữ liệu master; chỉ ba map; nhất quán bảng kinh tế (sink, net, tỉ lệ; cửa sổ 7 ngày trong 1,127–1,216); giá Thiên Mệnh khớp giữa CSV, config và xlsx; item Thiên Mệnh không nằm trong drop/shop; thọ nguyên khớp công thức; tài liệu không còn migration save cũ hay lỗi `\n` literal; simulator tái lập đúng kết quả đã lưu; xlsx không lỗi công thức (300 công thức).

**Chưa thể kiểm chứng (cần engine và closed beta):**
- Xác suất chết thật. Simulator dùng giả định và báo độ nhạy ×0,5/×1,0/×1,5 (median 61,9–67,4 ngày; P90 89,7–131,2 ngày).
- Tác dụng thật của Thiên Mệnh lên sức mạnh chiến đấu và xác suất đột phá (mô hình chỉ đo tốc độ).
- `death_loss_expected` trong bảng kinh tế là giá trị mô hình, chưa suy từ mô hình tài sản tích lũy.
- Ngưỡng chiến lực Lục Mệnh, giá cuối Quán Đỉnh/item, các luật [Đề xuất v1.3].

## Các lỗi của v1.2 đã được xử lý
- Migration save cũ mâu thuẫn quyết định "database làm mới từ đầu".
- Thiên Mệnh: quy tắc +1/tầng không khớp simulator (15 TM/kiếp); tổng giá Quán Đỉnh ~240 kiếp.
- Simulator: P10 = P25 = median = 60,0 do không có phân tán.
- Phụ lục bị vỡ định dạng (12 ký tự `\n` literal mỗi file).
- Số mục Balance Master bị trùng; xlsx và CSV chưa đồng bộ.

## Kết luận
Gói nhất quán và kiểm được bằng máy. Cân bằng thực tế vẫn là giả định thiết kế cho đến khi có engine và telemetry.
