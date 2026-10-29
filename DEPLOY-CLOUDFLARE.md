# Đưa Lá lên GitHub và Cloudflare Workers

Địa chỉ production được chuẩn bị: **https://truongparker.io.vn/chitieucanhan/**.

Source này có đủ chức năng sổ thu chi, reset dữ liệu, cấu hình build Vue và Worker phục vụ ứng dụng trong đường dẫn con. Bạn tự tải lên GitHub và liên kết tài khoản Cloudflare. Chưa có thay đổi nào được thực hiện trên tài khoản hoặc DNS của bạn.

## 1. Đưa source lên GitHub

Giải nén ZIP. Đưa **các file bên trong thư mục WebChiTieuCaNhan** vào gốc repository để `package.json`, `package-lock.json`, `wrangler.jsonc`, `vite.config.js`, `src/` và `worker/` cùng nằm ở gốc repository.

Commit cả `package-lock.json` và `.gitignore`. Không đưa `node_modules/`, `dist/`, `.wrangler/`, `.env.local` hoặc các file sao lưu giao dịch cá nhân lên GitHub. Các thư mục sinh tự động đã được khai báo trong `.gitignore`.

## 2. Kết nối với Workers Builds

Trong Cloudflare dashboard, vào **Workers & Pages → Create application → kết nối/import GitHub repository** và chọn repository của bạn. Giao diện có thể thay đổi tên nút; mục tiêu là tạo Worker có liên kết GitHub.

Nhập các giá trị:

| Thiết lập | Giá trị |
|---|---|
| Worker / Project name | `so-thu-chi-ca-nhan` |
| Production branch | `main` (hoặc nhánh production thực tế của bạn) |
| Root directory | Gốc repository nếu `package.json` ở gốc; nếu nằm trong thư mục con thì chọn đúng thư mục đó |
| Build command | `npm run test && npm run build` |
| Deploy command | `npm run deploy` |
| Build variable `NODE_VERSION` | `22` |
| Build variable `VITE_STORAGE_DRIVER` | `local` (cũng là mặc định khi không đặt) |

Tên Worker phải trùng `name` trong `wrangler.jsonc`. Cloudflare cài dependencies từ package/lockfile rồi chạy lệnh build và deploy. `npm run deploy` gọi Wrangler đã được khai báo trong dự án. Không cần GitHub Actions riêng cho quy trình này.

Nhấn Deploy. Các lần push tiếp theo lên nhánh production sẽ tự động kiểm thử, build và cập nhật website.

## 3. Dùng đường dẫn con trên website hiện tại

Điều kiện: zone `truongparker.io.vn` đang **Active** trong cùng tài khoản Cloudflare và bản ghi DNS phục vụ `truongparker.io.vn` đang **Proxied** (mây cam).

`wrangler.jsonc` đã khai báo đúng hai route:

```text
truongparker.io.vn/chitieucanhan
truongparker.io.vn/chitieucanhan/*
```

Wrangler tạo/cập nhật hai route này khi deploy. Có thể kiểm tra trong **Worker → Settings → Domains & Routes**. Không tạo Custom Domain cho toàn bộ `truongparker.io.vn`, không thay bản ghi DNS đang trỏ đến website chính, và không dùng route bao phủ `truongparker.io.vn/*` cho Worker thu chi.

Worker chỉ xử lý đường dẫn của ứng dụng thu chi; website chính tiếp tục xử lý `/` và các đường dẫn khác. Nếu website chính cũng dùng một Worker với route rộng, route cụ thể của sổ thu chi được ưu tiên. Nếu đang có một Worker khác gắn chính xác hai route trên, cần kiểm tra cấu hình đó trước khi chuyển route sang ứng dụng này.

Nếu deploy báo thiếu quyền quản lý route/zone, kiểm tra API token của Workers Builds: cần quyền triển khai Worker và chỉnh Workers Routes trên zone `truongparker.io.vn`. Quản lý token trong Cloudflare, không commit token vào source.

Địa chỉ sử dụng chuẩn có dấu `/` cuối: **https://truongparker.io.vn/chitieucanhan/**. Địa chỉ không có `/` cuối sẽ được Worker chuyển hướng sang bản có `/`. Nên dùng bản có `/` khi gắn query string hoặc tạo bookmark.

URL thử nghiệm `workers.dev` (nếu được Cloudflare bật) cũng dùng đường dẫn `/chitieucanhan/`, ví dụ `https://<worker>.<account>.workers.dev/chitieucanhan/`. `/` của Worker thu chi trả 404 có chủ đích vì ứng dụng được mount trong đường dẫn con.

## 4. Kiểm tra sau triển khai

1. Mở domain chính `/`: website đang có vẫn hoạt động.
2. Mở `/chitieucanhan/`: thấy ứng dụng Lá, không lỗi tải JS/CSS.
3. Tạo một giao dịch, tải lại: dữ liệu vẫn còn.
4. Vào Cài đặt → Reset dữ liệu → Hủy: dữ liệu giữ nguyên.
5. Để chuyển dữ liệu từ localhost hoặc workers.dev sang domain chính, xuất JSON ở địa chỉ cũ rồi khôi phục tại địa chỉ mới.

LocalStorage phân theo origin (giao thức + hostname + cổng), không phân theo đường dẫn. Sổ này chỉ sử dụng khóa `la.personal-ledger.v1`; reset chỉ gỡ khóa đó. Dữ liệu vẫn nằm trên trình duyệt, chưa đồng bộ nhiều thiết bị.

## 5. Chạy và kiểm tra trên máy cá nhân

Cần Node.js 22.12 trở lên. PowerShell tại thư mục dự án:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run dev
```

Mở `http://localhost:5173/chitieucanhan/`.

Kiểm tra đúng môi trường Worker:

```powershell
npm.cmd run cf:dev
```

Mở `http://localhost:8787/chitieucanhan/` (hoặc cổng Wrangler hiển thị).

Kiểm tra cấu hình đóng gói, không deploy:

```powershell
npm.cmd run build
npm.cmd run cf:check
```

## Các file cấu hình chính

- `vite.config.js`: base URL `/chitieucanhan/`, để JS/CSS tải đúng đường dẫn con.
- `wrangler.jsonc`: tên Worker, binding static assets và hai route production.
- `worker/index.js`: chuyển hướng về dấu `/` cuối, bỏ tiền tố đường dẫn trước khi đọc asset từ `dist/`.
- `.nvmrc`, `package.json`, `package-lock.json`: phiên bản Node và dependencies, gồm Wrangler.
- `tests/worker.test.js`: kiểm tra chuyển hướng, đường dẫn asset và phạm vi xử lý Worker.

## Tài liệu chính thức

- [Workers Builds và Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Cấu hình build/deploy](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Workers Routes và điều kiện DNS](https://developers.cloudflare.com/workers/configuration/routing/routes/)
