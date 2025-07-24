# Example Source Folder

Thư mục này chứa các file mã nguồn PHP mẫu để test tool migration map.

## Cấu trúc

- `src/`: Chứa các file code PHP mẫu để phân tích
- `result/`: Chứa kết quả phân tích (JSON, PDF, ...)

## Danh sách file mẫu trong src/

- UserController.php: Controller API mẫu (PHP)
- User.php: Model mẫu (PHP)
- config.php: File cấu hình mẫu (PHP)
- PaymentService.php: Service tích hợp bên ngoài mẫu (PHP)

## Cách chạy test

```bash
node migration-map.js ./example/src --pdf ./example/result/migration-map.pdf -o ./example/result/migration-map.json
```

Kết quả sẽ xuất ra file migration-map.json và migration-map.pdf trong thư mục result/.
