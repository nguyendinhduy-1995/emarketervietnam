# Audit: Commerce / Wallet Safety

## 1. Wallet + Ledger

### 1.1 Wallet Model (schema.prisma:918-932)

| Field | Value | Status |
|-------|-------|--------|
| `balanceAvailable` | VND thật | ✅ |
| `creditBalance` | VND khuyến mãi | ✅ |
| `status` | ACTIVE/LOCKED/FROZEN | ✅ |
| Ledger | `WalletLedger` model | ✅ |
| Ledger idempotency | `@@unique([userId, idempotencyKey])` | ✅ |
| Direct `balance` update | **Không** — chỉ dùng `decrement/increment` | ✅ |

### 1.2 Debit Flow (checkout/route.ts:111-136)

```typescript
// Credit first, then real balance
await tx.wallet.update({
    where: { id: wallet.id },
    data: {
        balanceAvailable: { decrement: realUsed },   // ⚠️ Prisma decrement
        creditBalance: { decrement: creditUsed },
    },
});
await tx.walletLedger.create({ ... }); // ✅ Always write ledger
```

**⚠️ Issue**: `decrement` trong Prisma dùng `SET balance = balance - X` — **không** `SELECT FOR UPDATE`. Dưới concurrent requests có thể để balance < 0.

**Fix cần**: Dùng `$queryRaw` với `SELECT ... FOR UPDATE` trước khi debit.

### 1.3 Refund Flow (refunds/route.ts:30-90)

```typescript
await db.$transaction(async (tx) => {
    const refund = await tx.refundRecord.create({...});   // ✅
    await tx.wallet.update({ balanceAvailable: { increment: amount } }); // ✅
    await tx.walletLedger.create({...});                   // ✅
    await tx.commerceOrder.update({ refundedAmount: ... }); // ✅
    await tx.entitlement.updateMany({ status: 'REVOKED' }); // ✅
    await tx.receipt.create({...});                         // ✅
    await tx.notificationQueue.create({...});              // ✅
});
```

**Verdict**: Refund flow ĐẠT — atomic, tạo ledger, revoke entitlement, receipt, notify.

## 2. Idempotency

| Operation | Key | Field | Status |
|-----------|-----|-------|--------|
| Checkout | `idempotencyKey` | `CommerceOrder.idempotencyKey` @unique | ✅ |
| PAYG Usage | `requestId` | `UsageEvent.requestId` @unique | ✅ |
| Refund | `idempotencyKey` | `RefundRecord.idempotencyKey` @unique | ✅ |
| Wallet Ledger | `idempotencyKey` | `WalletLedger` @unique([userId, idempotencyKey]) | ✅ |
| Topup | `transferContent` | `TopupIntent.transferContent` @unique | ✅ |

**Verdict**: ✅ Idempotency coverage tốt.

## 3. Price Snapshot

| Model | Field | Status |
|-------|-------|--------|
| `OrderItem` | `priceSnapshot` Json | ✅ `{unitPrice, billing, version}` |
| `UsageEvent` | `unitPrice` + `total` | ✅ |
| `Plan` | `version`, `effectiveFrom`, `effectiveTo` | ✅ |
| `MeteredItem` | `version`, `effectiveFrom`, `effectiveTo` | ✅ |

**Verdict**: ✅ Pricing versioning ĐẠT.

## 4. JWT Handling trong Commerce Routes

| Route | Auth method | Issue |
|-------|------------|-------|
| Hub Checkout | `Buffer.from(sessionToken.split('.')[1])` | ❌ **P0**: Không verify signature |
| PAYG Usage | Same manual parse | ❌ **P0**: Same |
| Hub Orders | Same manual parse | ❌ **P0**: Same |
| Hub Downloads | Same manual parse | ❌ **P0**: Same |
| Hub Notifications | Same manual parse | ❌ **P0**: Same |

> Tất cả routes này chỉ decode JWT payload mà **KHÔNG verify signature**. Attacker có thể craft fake JWT với bất kỳ `userId`.

**Fix**: Đổi sang `getSession()` từ `src/lib/auth/jwt.ts` (đã verify bằng jose).

## 5. Audit Trail

| Event | Logged? | Where |
|-------|---------|-------|
| Wallet debit | ✅ | `WalletLedger` |
| Wallet topup | ✅ | `WalletLedger` + `TopupIntent` |
| Refund | ✅ | `RefundRecord` + `WalletLedger` |
| Entitlement grant | ⚠️ Partial | Only via `order.meta` in Entitlement.meta |
| Entitlement revoke | ⚠️ Partial | `revokedAt` field but no separate log |
| Admin action | ❌ | No admin action audit log |
| Price change | ❌ | Plan versioning exists but no change log |

## 6. Missing for Production

| Item | Priority | Notes |
|------|----------|-------|
| Row lock for wallet debit | P0 | `SELECT FOR UPDATE` instead of `decrement` |
| Fix JWT verification | P0 | Use `getSession()` / `verifyToken()` |
| Admin audit log | P1 | Who changed what, when |
| Balance floor check in DB | P1 | Check constraint `balance >= 0` |
| Subscription renewal billing | P1 | No auto-charge on period end |
| Usage charge JWT fix | P0 | Same as checkout |
