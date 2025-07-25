# AI Migration Map & Checklist

## Giới thiệu

**AI Migration Map & Checklist** là bộ công cụ web hỗ trợ:

- Phân tích, lập kế hoạch chuyển đổi (migration) dự án giữa các ngôn ngữ (PHP, Node.js, Java, Python, C#, Ruby, ...)
- Sinh checklist/manual test case kiểm thử tự động bằng AI (OpenAI GPT-3.5/4)
- Review kết quả migration và checklist trực tiếp trên web (PDF viewer)

## Tính năng nổi bật

- Phân tích tự động dependency graph, nhóm module, phát hiện schema/truy vấn SQL
- Đề xuất công nghệ hiện đại ở ngôn ngữ đích (ORM, GraphQL, NoSQL, ...)
- Sinh checklist kiểm thử UI/integration tự động, xuất file .xlsx và .pdf
- Giao diện web hiện đại, dễ dùng, xem kết quả PDF trực tiếp không cần tải về

## Hướng dẫn sử dụng

### 1. Cài đặt

```bash
npm install
```

### 2. Thiết lập OpenAI API Key

- **PowerShell:**
  ```powershell
  $env:OPENAI_API_KEY="your_openai_api_key"
  ```
- **CMD:**
  ```cmd
  set OPENAI_API_KEY=your_openai_api_key
  ```

### 3. Chạy ứng dụng

```bash
node migration-map-server.js
```

Mặc định chạy ở http://localhost:3000

### 4. Sử dụng giao diện web

#### Trang chủ

Truy cập [http://localhost:3000/](http://localhost:3000/)

![Trang chủ](docs/screenshot-home.png)

Chọn:

- **Bước 1: Migration Map** (`/migration_map`)
- **Bước 2: Checklist AI Test** (`/qa_test`)

#### Bước 1: Migration Map (`/migration_map`)

![Migration Map](docs/screenshot-migration-map.png)

- Nhập đường dẫn source code (trên server, ví dụ: `example/src`)
- Chọn ngôn ngữ nguồn và ngôn ngữ đích
- Đặt tên file output JSON, PDF (có thể giữ mặc định)
- Nhấn **Set API Key** để nhập OpenAI API key (lưu trên trình duyệt)
- Nhấn **Generate Migration Map**
- Sau khi chạy xong:
  - Có thể **Download JSON** hoặc **Download PDF**
  - Nhấn **Xem PDF** để review migration plan trực tiếp trên web (PDF sẽ mở trong modal)

#### Bước 2: Checklist AI Test (`/qa_test`)

![Checklist AI Test](docs/screenshot-qa-test.png)

- Nhập đường dẫn source code (trên server, ví dụ: `example/src`)
- Chọn ngôn ngữ checklist (Tiếng Việt/English)
- Đặt tên file output (mặc định: `manual-checklist.xlsx`)
- Checkbox “Tạo file PDF checklist” luôn được tick sẵn
- Nhấn **Set API Key** để nhập OpenAI API key (lưu trên trình duyệt)
- Nhấn **Generate Checklist**
- Sau khi chạy xong:
  - Có thể **Download Checklist (.xlsx)** hoặc **Download PDF**
  - Nhấn **Xem PDF** để review checklist trực tiếp trên web (PDF sẽ mở trong modal)

### 5. Lưu ý

- Đường dẫn source code là đường dẫn trên server (máy chạy Node.js)
- API key chỉ lưu trên trình duyệt, bảo mật
- Nếu mã nguồn lớn, nên chia nhỏ để AI xử lý tốt hơn
- Nếu thiếu package, cài thêm bằng `npm install <tên-package>`

## Kết quả xuất ra

- **JSON**: Chi tiết migration plan, dependency, gợi ý công nghệ, ... (dùng cho automation/dev)
- **PDF**: Trình bày rõ ràng từng nhóm file/module, migration plan, checklist kiểm thử, ... (dễ review, trình bày)

## Ví dụ kết quả (PDF/JSON)

| Files                                            | Migration Plan                                                             | Suggested Tech        | Database Suggestion    | Note                                |
| ------------------------------------------------ | -------------------------------------------------------------------------- | --------------------- | ---------------------- | ----------------------------------- |
| UserController.php, PaymentService.php, User.php | Refactor thành các module Node.js, dùng ORM Sequelize, chuyển SQL sang ORM | Sequelize, ES6 module | PostgreSQL/MySQL + ORM | Lưu ý async/await, khác biệt syntax |
| config.php                                       | Chuyển sang JSON config, dùng package 'config'                             | config (Node.js)      | ORM cho DB             | Lưu ý khác biệt cấu hình            |
| schema.sql                                       | Chuyển schema sang model ORM                                               | Sequelize/Knex.js     | PostgreSQL/MySQL       | Lưu ý mapping type                  |

## Đóng góp & liên hệ

- Nếu có vấn đề, góp ý, hoặc muốn mở rộng tool cho ngôn ngữ khác, hãy liên hệ hoặc tạo issue trên repo!

---

> **Lưu ý:**
>
> - Các ảnh minh họa (screenshot) để trong thư mục `docs/`. Nếu chưa có, hãy chụp màn hình giao diện và lưu vào `docs/screenshot-home.png`, `docs/screenshot-migration-map.png`, `docs/screenshot-qa-test.png` để README hiển thị đẹp nhất.
