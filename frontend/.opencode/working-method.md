# Quy tắc làm việc (bắt buộc mọi phiên)

## 1. Khi nhận yêu cầu
- Không code ngay. Đọc hiểu kiến trúc hiện tại trước.
- So sánh: cũ vs yêu cầu mới vs đề xuất của tôi.
- Mỗi thay đổi phải rõ lý do (KEEP / V2 / NEW).
- Trình bày ngôn ngữ đời thường, bảng so sánh, không code.

## 2. Khi code — XỬ LÝ TRIỆT ĐỂ

### 2a. Chỉ làm đúng việc trong plan
- Không tự ý sửa thêm bất cứ thứ gì ngoài plan.
- Không "nhân tiện" refactor, đổi tên, tái cấu trúc.
- Không thêm tính năng "thấy hay hay", "để sau này".

### 2b. Kiểm tra sau mỗi lần sửa
- Code có chạy được không? Lỗi syntax? Lỗi type?
- Import có thiếu không? Có import chết không?
- Logic có bị gãy luồng không?
- Phải tính toán trước khi kết luận "xong".

### 2c. Không sinh code rác
- Xóa console.log dùng để debug.
- Xóa comment thừa, comment vô nghĩa.
- Xóa biến, hàm, import không dùng đến.
- Giữ code sạch như trước khi sửa.

### 2d. Không tự ý sáng tạo
- Không thêm pattern mới nếu không trong plan.
- Không đổi cấu trúc file, cách tổ chức code.
- Tuân thủ style code hiện có (tên biến, cách đặt file, cấu trúc hàm).
- Khi không chắc → hỏi, không tự quyết.

## 3. Trước khi kết thúc phiên
- Kiểm tra lại tất cả file đã sửa có chạy ổn không.
- Báo cáo: đã sửa file nào, nội dung gì, đã kiểm tra gì.
