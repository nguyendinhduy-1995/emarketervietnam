# 🌐 Hướng dẫn cấu hình DNS cho CRM

## Bạn cần làm gì?

Khi mua CRM trên eMarketer Hub, bạn cần trỏ domain của mình về server chúng tôi. Quá trình gồm 2 bước:

---

## Bước 1: Thêm TXT record (xác minh sở hữu)

| Mục | Giá trị |
|-----|---------|
| **Loại** | TXT |
| **Tên** | `_emk-verify.{domain_của_bạn}` |
| **Giá trị** | Mã xác minh hiển thị trên trang Setup |
| **TTL** | 300 (hoặc Auto) |

### Ví dụ:
Nếu domain là `crm.congtyban.com`:
- Tên: `_emk-verify.crm.congtyban.com`
- Giá trị: `emk-verify-abc123def456...`

---

## Bước 2: Thêm A record (trỏ domain về server)

| Mục | Giá trị |
|-----|---------|
| **Loại** | A |
| **Tên** | `{domain_của_bạn}` (ví dụ: `crm.congtyban.com`) |
| **Giá trị** | `76.13.190.139` |
| **TTL** | 300 (hoặc Auto) |

---

## Hướng dẫn theo nhà cung cấp

### Cloudflare
1. Dashboard → DNS → Records → Add Record
2. Thêm TXT record → Save
3. Thêm A record → **Tắt Proxy** (cloud icon chuyển xám) → Save

### GoDaddy
1. My Products → Domain → DNS
2. Add → TXT → Nhập tên + giá trị → Save
3. Add → A → Nhập @ hoặc subdomain + IP → Save

### Namecheap
1. Domain List → Manage → Advanced DNS
2. Add New Record → TXT → Host: `_emk-verify` / Value: token → Save
3. Add New Record → A → Host: `crm` / Value: IP → Save

### Tenten / PA Vietnam
1. Quản lý tên miền → Cấu hình DNS
2. Thêm bản ghi TXT + A theo hướng dẫn trên

---

## FAQ

**DNS mất bao lâu để cập nhật?**
Thường 5-30 phút, tối đa 48 giờ.

**Sau khi trỏ xong, làm gì tiếp?**
Quay lại trang Setup trên Hub, bấm "Xác minh". Nếu DNS đã cập nhật, hệ thống sẽ tự triển khai CRM.

**Trỏ sai thì sao?**
Không sao, chỉ cần sửa lại DNS record và bấm "Xác minh" lần nữa.

**Tôi dùng Cloudflare proxy được không?**
Không khuyến khích. Hãy tắt proxy (chuyển cloud xám) để SSL phía server hoạt động.
