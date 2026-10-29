# Lá · Sổ thu chi cá nhân

Bản này đã cấu hình chạy tại **https://truongparker.io.vn/chitieucanhan/**, tự build từ GitHub qua Cloudflare Workers. Xem **[DEPLOY-CLOUDFLARE.md](DEPLOY-CLOUDFLARE.md)** để thiết lập. Đã giữ chức năng reset dữ liệu và toàn bộ tính năng thu chi.

Ứng dụng Vue 3 + Vite, giao diện tiếng Việt, ưu tiên điện thoại. Tiền tệ VND, số tiền nguyên. Không cần tài khoản để dùng chế độ local.

## Chạy trên Windows

Cần Node.js 22.12 trở lên (hoặc phiên bản LTS mới hơn).

Giải nén source vào `D:\WebChiTieuCaNhan`, mở PowerShell tại thư mục đó:

```powershell
npm.cmd ci
npm.cmd run dev
```

Mở địa chỉ Local mà Vite hiển thị, mặc định `http://localhost:5173/chitieucanhan/`. Để thử trên điện thoại cùng Wi-Fi, mở `http://<IP-máy-tính>:5173/chitieucanhan/`; cho phép cổng này trong tường lửa nếu cần. Mỗi địa chỉ trình duyệt là một kho dữ liệu riêng.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

`dist/` là bản production, có thể phục vụ bằng web server tĩnh. Không mở trực tiếp index.html qua file://. Chế độ local lưu trên trình duyệt; không đồng bộ giữa các máy, trình duyệt hoặc địa chỉ web. Trình duyệt phải bật JavaScript và localStorage. Không có service worker/offline cache.

## Tính năng

- Tạo, sửa, xóa thu/chi: ngày, số tiền, ghi chú, danh mục và nhiều tag.
- Tạo, sửa danh mục thu/chi và tag. Không xóa danh mục đang có giao dịch; không đổi loại của danh mục đã dùng. Xóa tag gỡ tag khỏi giao dịch.
- Chu kỳ lặp theo ngày bắt đầu 1–31. Ngày 25 nghĩa là 25 tháng này đến hết 24 tháng sau. Khi tháng thiếu ngày bắt đầu, lấy ngày cuối tháng. Chuyển chu kỳ trước/sau; về kỳ hiện tại.
- Dashboard thu, chi, số dư trong kỳ, phân bổ theo danh mục hoặc tag cho cả thu lẫn chi, biểu đồ theo ngày.
- Tìm và lọc giao dịch theo nội dung, loại, danh mục và tag trong chu kỳ đang xem.
- Sao lưu/khôi phục JSON có kiểm tra định dạng và xác nhận trước khi thay thế dữ liệu.
- Sổ trống khi bắt đầu; dữ liệu mẫu chỉ được thêm khi người dùng chọn.

Số dư là thu trừ chi **trong chu kỳ**, không phải số dư tài khoản tích lũy. Một giao dịch nhiều tag được tính đủ giá trị ở từng tag; giao diện ghi rõ quy tắc này. Trả nợ/Thu nợ là các danh mục để ghi dòng tiền, chưa có tính năng quản lý khoản vay/công nợ.

## Cấu trúc

- `src/App.vue`: giao diện và thao tác ứng dụng.
- `src/style.css`: responsive, sidebar desktop và thanh điều hướng dưới trên mobile.
- `src/domain.js`: dữ liệu ban đầu, chu kỳ tháng, tính tổng và kiểm tra dữ liệu.
- `src/repository.js`: `LocalRepository` và `RestRepository` dùng chung giao diện `load()/save()`.
- `tests/domain.test.js`: kiểm tra quy tắc chu kỳ và dữ liệu.
- `API.md`: hợp đồng JSON và cách chuyển sang backend.

Mặc định dữ liệu lưu tại khóa `la.personal-ledger.v1` trong localStorage. Lưu thất bại không cập nhật dữ liệu trong bộ nhớ. Dữ liệu hỏng không tự động bị ghi đè; màn hình lỗi cho phép xuất bản gốc để phục hồi thủ công. Hãy dùng chức năng xuất JSON định kỳ, nhất là trước khi xóa dữ liệu trình duyệt hoặc đổi địa chỉ chạy ứng dụng.

Chưa có server/database được triển khai. REST adapter là điểm tích hợp có sẵn để kết nối backend theo API.md; cần kiểm thử tích hợp với backend thực tế trước khi sử dụng chế độ đó.

## Kết quả kiểm tra


pm test` kiểm tra chu kỳ 25→24, đổi năm, năm nhuận, liên tục giữa các kỳ cho ngày 1–31; kiểm tra import từ chối số tiền âm/lẻ, ngày không tồn tại, tham chiếu sai và ID trùng; kiểm tra tổng thu/chi. Build production đã chạy thành công. Lưu giao dịch có tag đã được thử trực tiếp trên trình duyệt.

## Reset dữ liệu
Trong Cài đặt → Reset dữ liệu, popup yêu cầu xác nhận và có nút xuất bản sao lưu. Chọn Hủy, đóng popup hoặc Escape không xóa dữ liệu. Xác nhận xóa toàn bộ sẽ gỡ khóa localStorage của sổ để giải phóng dung lượng, khôi phục danh mục/tag mặc định trong bộ nhớ và chu kỳ ngày 1. Không xóa dữ liệu của ứng dụng khác, cache hay file sao lưu đã tải xuống. Nếu dùng REST, reset thay thế sổ trên server bằng dữ liệu mặc định qua PUT có kiểm tra ETag. Xóa thất bại giữ dữ liệu hiện tại và hiển thị lỗi.



Đã kiểm tra thêm trên Wrangler cục bộ: HTML/JS/CSS tại /chitieucanhan/ trả 200; chuyển hướng dấu / cuối trả 308; đường dẫn ngoài phạm vi trả 404. Kiểm tra đóng gói wrangler deploy --dry-run đã đạt. Chưa deploy lên Cloudflare production.

