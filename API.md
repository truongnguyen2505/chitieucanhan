# Hợp đồng REST API — phiên bản 1

## Bật adapter

Sao chép `.env.example` thành `.env.local`, đặt:

```ini
VITE_STORAGE_DRIVER=rest
VITE_API_BASE_URL=https://your-server.example/api
```

Khởi động lại dev server hoặc build lại sau khi đổi biến môi trường. Không đặt token, mật khẩu hoặc bí mật vào biến `VITE_*` vì chúng được nhúng vào client.

## Tài nguyên sổ của người dùng đang đăng nhập

Adapter dùng một tài nguyên aggregate để ghi nhất quán giao dịch, tag, danh mục và cài đặt. Backend có thể tách thành các bảng DB; hợp đồng client không phụ thuộc cách lưu DB.

- `GET /api/v1/ledger`: trả `200` và toàn bộ JSON của sổ. Với tài khoản mới, server trả cấu trúc trống hợp lệ (có danh mục mặc định), không trả 404.
- `PUT /api/v1/ledger`: nhận toàn bộ JSON, kiểm tra dữ liệu, cập nhật bằng một DB transaction; trả `200` hoặc `204` khi thành công. Gửi lại ETag mới.
- `401/403`: chưa đăng nhập/không có quyền; `400/422`: dữ liệu không hợp lệ; `412`: ETag cũ; `500`: lỗi máy chủ.

Client gửi `credentials: include`. Backend cần triển khai đăng nhập qua session cookie HttpOnly/Secure, CSRF protection phù hợp, kiểm tra Origin và quyền sở hữu sổ. Backend phải phân vùng dữ liệu theo người dùng được xác thực, không tin ID từ client để xác định chủ sở hữu.

Hỗ trợ `ETag` cho GET/PUT và `If-Match` trên PUT để chống ghi đè giữa nhiều thiết bị. Khi `412`, UI thông báo tải lại. Nếu khác origin, cấu hình CORS đúng origin frontend, `Access-Control-Allow-Credentials: true`, cho phép `Content-Type, If-Match`, expose `ETag`. Không dùng wildcard origin với cookie.

## JSON

```json
{
  "version": 1,
  "settings": { "startDay": 25, "displayName": "Minh Anh" },
  "categories": [
    { "id": "food", "name": "Ăn uống", "type": "expense", "color": "#f1a65a", "icon": "Utensils" },
    { "id": "salary", "name": "Lương", "type": "income", "color": "#5aab8c", "icon": "BriefcaseBusiness" }
  ],
  "tags": [{ "id": "personal", "name": "Cá nhân" }],
  "quickTemplates": [
    { "id": "coffee-template", "name": "Cà phê buổi sáng", "type": "expense", "amount": 25000, "note": "Cà phê", "categoryId": "food", "tagIds": ["personal"] }
  ],
  "transactions": [
    { "id": "unique-uuid", "date": "2026-10-29", "type": "expense", "amount": 85000, "note": "Bữa trưa", "categoryId": "food", "tagIds": ["personal"] }
  ]
}
```

Ngày là ngày lịch `YYYY-MM-DD`, không phải UTC timestamp; không tự chuyển múi giờ. `amount` là số nguyên VND dương trong giới hạn safe integer JavaScript. `type` là `income` hoặc `expense`; category phải tồn tại và cùng type với transaction; mọi tagId phải tồn tại. ID phải duy nhất trong từng collection. `name` tối đa 80 ký tự, `note` tối đa 500 ký tự. Client kiểm tra dữ liệu nhưng server vẫn phải tự kiểm tra.

`settings.displayName` là tên hiển thị cá nhân, kiểu chuỗi, tối đa 80 ký tự. Client loại bỏ khoảng trắng ở đầu và cuối; chuỗi rỗng dùng tên mặc định. Dữ liệu phiên bản 1 cũ có thể thiếu trường này và được đọc thành chuỗi rỗng. Tên được lưu cùng sổ, đi kèm bản sao lưu JSON và được xóa khi reset dữ liệu.

`quickTemplates` là danh sách mẫu ghi nhanh, mặc định `[]` khi đọc sổ hoặc bản sao lưu phiên bản 1 cũ thiếu trường này. Mỗi mẫu gồm `id`, `name` (1–80 ký tự sau khi bỏ khoảng trắng đầu/cuối), `type`, `amount`, `note`, `categoryId`, `tagIds`; các trường giao dịch dùng cùng quy tắc kiểm tra như trên. ID phải duy nhất trong danh sách mẫu. Mẫu không cần ngày, không tính vào tổng thu/chi. Backend phải lưu và trả lại danh sách này cùng sổ, bao gồm khi PUT/reset; nếu bỏ trường này khi trả GET thì các mẫu sẽ không còn hiển thị trên client.

Khi dùng mẫu hoặc sao chép giao dịch, client tạo bản nháp với ID mới và ngày hôm nay theo lịch địa phương, giữ loại thu/chi, số tiền, ghi chú, danh mục và tag. Chỉ khi người dùng lưu, bản nháp mới được thêm vào `transactions`. Tạo/sửa/xóa mẫu không sửa giao dịch đã ghi. Không cho xóa hoặc đổi loại danh mục đang được dùng trong giao dịch hay mẫu; xóa tag gỡ tham chiếu khỏi cả hai danh sách.

## Chuyển dữ liệu local sang DB

1. Xuất JSON tại Cài đặt trên địa chỉ web local hiện tại.
2. Triển khai backend và xác thực; đổi env sang REST.
3. Đăng nhập, mở app REST và khôi phục JSON đã xuất; dữ liệu được gửi qua PUT.
4. Kiểm tra lại số giao dịch, tổng thu/chi, danh mục và tag trước khi ngừng dùng sổ local.

Không có việc âm thầm đẩy dữ liệu local lên server. Import thay thế toàn bộ sổ nên cần sao lưu sổ server trước khi nhập.
