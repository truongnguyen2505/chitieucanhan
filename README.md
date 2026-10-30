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

- Đặt hoặc đổi tên cá nhân tại Cài đặt → Tên của bạn. Tên và chữ cái đại diện hiển thị trên thanh điều hướng; trang Tổng quan chào theo tên. Tên được lưu cùng sổ, có trong sao lưu JSON và được xóa khi reset. Để trống tên để dùng “Sổ của tôi”.
- Tạo, sửa, xóa thu/chi: ngày, số tiền, ghi chú, danh mục và nhiều tag.
- Ghi nhanh: tạo/sửa/xóa mẫu khoản thu hoặc chi ở Tổng quan/Giao dịch; chọn mẫu để điền sẵn biểu mẫu với ngày hôm nay, kiểm tra rồi lưu. Có thể tạo mẫu từ nội dung biểu mẫu giao dịch. Mẫu lưu cùng sổ và bản sao lưu JSON, không tính vào tổng thu/chi.
- Sao chép giao dịch bằng nút cạnh từng dòng hoặc trong màn hình sửa. Bản sao có ID mới, mặc định ngày hôm nay; giữ số tiền, loại, danh mục, ghi chú và tag. Có thể sửa hoặc hủy trước khi lưu. Giao dịch gốc giữ nguyên.
- Tạo, sửa danh mục thu/chi và tag. Không xóa hoặc đổi loại danh mục đang được dùng trong giao dịch hay mẫu ghi nhanh. Xóa tag gỡ tag khỏi cả giao dịch và mẫu.
- Chu kỳ lặp theo ngày bắt đầu 1–31. Ngày 25 nghĩa là 25 tháng này đến hết 24 tháng sau. Khi tháng thiếu ngày bắt đầu, lấy ngày cuối tháng. Chuyển chu kỳ trước/sau; về kỳ hiện tại.
- Dashboard thu, chi, số dư trong kỳ, phân bổ theo danh mục hoặc tag cho cả thu lẫn chi, biểu đồ theo ngày.
- So sánh giữa các kỳ trên Tổng quan: đối chiếu kỳ đang xem với kỳ liền trước về thu nhập, chi tiêu và số dư; xem chênh lệch tiền, tỷ lệ thay đổi, danh mục chi tăng/giảm nhiều nhất. Mở “So sánh theo danh mục” để xem chi tiết thu hoặc chi và biểu đồ hai kỳ.
- Chọn “Cả kỳ” để so toàn bộ hai chu kỳ hoặc “Cùng số ngày” để so cùng số ngày đầu kỳ (đến tối đa hôm nay nếu đang xem kỳ hiện tại, giới hạn theo kỳ ngắn hơn). Khoảng ngày thực tế luôn được hiển thị. Kỳ tương lai chỉ hỗ trợ “Cả kỳ”. Không tính tỷ lệ phần trăm khi mốc kỳ trước bằng 0 hoặc âm; số dư vẫn là thu trừ chi trong từng kỳ.
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
Trong Cài đặt → Reset dữ liệu, popup yêu cầu xác nhận và có nút xuất bản sao lưu. Chọn Hủy, đóng popup hoặc Escape không xóa dữ liệu. Xác nhận xóa toàn bộ sẽ gỡ khóa localStorage của sổ để giải phóng dung lượng, khôi phục danh mục/tag mặc định trong bộ nhớ, tên cá nhân trống và chu kỳ ngày 1. Không xóa dữ liệu của ứng dụng khác, cache hay file sao lưu đã tải xuống. Nếu dùng REST, reset thay thế sổ trên server bằng dữ liệu mặc định qua PUT có kiểm tra ETag. Xóa thất bại giữ dữ liệu hiện tại và hiển thị lỗi.



Đã kiểm tra thêm trên Wrangler cục bộ: HTML/JS/CSS tại /chitieucanhan/ trả 200; chuyển hướng dấu / cuối trả 308; đường dẫn ngoài phạm vi trả 404. Kiểm tra đóng gói wrangler deploy --dry-run đã đạt. Chưa deploy lên Cloudflare production.

## Thêm vào màn hình chính (iOS / Android)

Trong Tổng quan hoặc Cài đặt, chọn **Thêm vào màn hình chính** để xem hướng dẫn theo thiết bị:

- **Android / Chrome:** chọn **Cài đặt ứng dụng** khi trình duyệt cho phép, hoặc menu **⋮ → Thêm vào màn hình chính / Cài đặt ứng dụng**.
- **iPhone / iPad / Safari:** **Chia sẻ → Thêm vào Màn hình chính → Thêm**. Bật **Mở dưới dạng ứng dụng web** nếu có.
- Nếu đang xem từ Zalo/Facebook, mở trang bằng Safari hoặc Chrome trước.

Icon mở đúng đường dẫn `/chitieucanhan/` trong cửa sổ riêng. Manifest và mọi icon đều nằm dưới đường dẫn này; không dùng manifest/icon ở gốc domain. Nút cài đặt trực tiếp chỉ xuất hiện sau sự kiện `beforeinstallprompt`; iOS có hướng dẫn thao tác thủ công. Khi ứng dụng đang mở độc lập, lời mời cài đặt ở Tổng quan được ẩn.

Cần HTTPS khi dùng trên điện thoại thật (production đã có HTTPS); localhost dùng để phát triển. Tính năng này không bổ sung service worker hay khả năng tải trang khi mất mạng. Việc lưu dữ liệu vẫn theo origin và vùng lưu trữ của trình duyệt/ứng dụng web. Nếu mở icon thấy sổ trống, xuất JSON từ trình duyệt đang có dữ liệu rồi khôi phục trong ứng dụng web.

Các file liên quan: `src/install.js`, `src/InstallApp.vue`, `public/manifest.webmanifest`, `public/icons/`. Để tạo lại các PNG trên Windows: `powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1`.

Tham khảo: [Apple: thêm trang web vào màn hình chính](https://support.apple.com/vi-vn/guide/iphone/iphea86e5236/ios), [MDN: điều kiện cài đặt ứng dụng web](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

### Tên riêng dưới icon

Mỗi người có thể nhập **Tên dưới icon** trong **Thêm vào màn hình chính**, chọn **Lưu tên trước khi cài** rồi thực hiện cài đặt. Trang tải lại và tự mở tiếp hướng dẫn với tên đã chọn. Tên tối đa 40 ký tự; iOS cũng cho sửa tên ở màn hình xác nhận thêm icon. Tên của icon đã cài được hệ điều hành/trình duyệt quản lý, không bảo đảm đổi ngay khi sửa tên trên trang.

Tên được giữ trong tham số `app_name` của đường dẫn mở ứng dụng và manifest riêng; `name`/`short_name` và tiêu đề Apple dùng cùng tên. Danh tính `id`, phạm vi `scope`, icon và dữ liệu sổ không thay đổi. Không lưu tên icon vào dữ liệu giao dịch. HTML/manifest có tên riêng dùng `Cache-Control: private, no-store` để không dùng nhầm tên giữa các đường dẫn. Vite dev, preview và Worker cục bộ đều hỗ trợ cách đặt tên này.
