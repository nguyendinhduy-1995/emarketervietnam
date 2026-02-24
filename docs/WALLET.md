# Hệ thống Ví tiền (Wallet) – eMarketer Hub

## Tổng quan

Hệ thống ví tiền cho phép khách hàng nạp tiền bằng QR code và sử dụng để thanh toán các dịch vụ trên Hub: gói CRM, miniapp, tính năng.

## Data Models

| Model | Mô tả |
|---|---|
| `Wallet` | Ví theo workspace (balanceAvailable = cache, source of truth = ledger) |
| `WalletLedger` | Sổ cái bất biến: mọi giao dịch CREDIT/DEBIT với idempotencyKey |
| `TopupIntent` | Ý định nạp tiền: transferContent unique + QR VietQR |
| `BankAccount` | Cấu hình tài khoản nhận tiền |
| `Purchase` | Giao dịch mua hàng trừ từ ví |

## Nguyên tắc tính tiền

1. **Balance = Σ CREDIT - Σ DEBIT** (từ WalletLedger)
2. `balanceAvailable` trên Wallet chỉ là cache, được sync lại sau mỗi giao dịch
3. Mọi giao dịch phải có **idempotencyKey unique** (chống double credit/debit)
4. Trừ tiền dùng **Prisma $transaction** (atomic)
5. Nạp tối thiểu: 100.000đ

## API Endpoints

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/hub/wallet` | Số dư + ledger + pending topup |
| POST | `/api/hub/wallet/topup-intents` | Tạo QR nạp tiền (min 100k) |
| GET | `/api/hub/wallet/topup-intents/[id]` | Trạng thái nạp tiền (auto-expire) |
| POST | `/api/hub/wallet/purchase` | Mua bằng ví (atomic debit) |
| POST | `/api/webhooks/bank-credit` | Webhook nhận ghi có từ ngân hàng |
| GET | `/api/emk-crm/wallets` | Admin: xem tất cả ví |
| GET | `/api/emk-crm/topups` | Admin: xem TopupIntents |
| POST | `/api/emk-crm/topups` | Admin: manual adjust |

## Flow nạp tiền

```
1. User chọn số tiền → POST /topup-intents
2. Server tạo transferContent unique (EMK{ws}-{id})
3. Server tạo QR URL từ VietQR + bank info
4. User quét QR, chuyển khoản đúng nội dung
5. Webhook/cron match transferContent → confirm
6. Tạo WalletLedger CREDIT + cập nhật balance
```

## Flow mua hàng

```
1. User chọn sản phẩm → POST /purchase + idempotencyKey
2. Server lookup price (không tin client)
3. $transaction: check balance → create DEBIT → create Purchase
4. Nếu thiếu tiền → 402 + CTA nạp thêm
```

## Idempotency Keys

| Loại | Format |
|---|---|
| Nạp tiền (bank) | `BANKTX:{bankTxId}` |
| Mua hàng | Client gửi (UUID) |
| Điều chỉnh admin | `ADJUST:{timestamp}-{random}` |

## Test Cases

1. ✅ Nạp < 100k bị chặn (400)
2. ✅ Tạo QR → intent PENDING + VietQR URL
3. ✅ Bank match transferContent → CONFIRMED + balance tăng
4. ✅ Gửi lại cùng bankTxId → không cộng lại
5. ✅ Mua đủ tiền → Purchase PAID + balance trừ
6. ✅ Mua thiếu tiền → 402 + CTA nạp thêm
7. ✅ Double request → idempotency block (409)

## Cấu hình BankAccount

Tạo record trong bảng `BankAccount`:
```sql
INSERT INTO "BankAccount" (id, "bankName", "bankCode", "accountNumber", "accountName", "isActive")
VALUES ('bank1', 'Vietcombank', 'VCB', '1234567890', 'EMARKETERVIETNAM', true);
```

## Bank Ingest Adapter

Interface đã chuẩn bị để gắn provider thật:
```typescript
interface BankIngestProvider {
  fetchIncomingTransactions(since: Date): Promise<BankTransaction[]>;
}
```
