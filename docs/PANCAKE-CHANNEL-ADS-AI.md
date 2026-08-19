# AI Channel & Ads Performance Manager

## Mục tiêu

AI này là lớp quản lý chỉ số và cố vấn kênh thương mại/quảng cáo của AI Control Tower.

Nó **không thay Pancake/Botcake/Pancake POS/Pancake CRM**, không trực Page và không tự ý chi tiền quảng cáo. Nhiệm vụ là đồng bộ dữ liệu, chuẩn hóa KPI, tìm điểm nghẽn, cảnh báo sớm và đưa đề xuất để chủ doanh nghiệp phê duyệt.

## Nguồn dữ liệu ưu tiên

### Pancake POS Open API — Ads Manager

Base URL:

`https://pos.pages.fm/api/v1`

Các endpoint Ads Manager đã được Pancake công khai:

- `GET /shops/{SHOP_ID}/ads_manager/ad_accounts`
- `GET /shops/{SHOP_ID}/ads_manager/campaigns_v2`
- `GET /shops/{SHOP_ID}/ads_manager/ad_sets_v2`
- `GET /shops/{SHOP_ID}/ads_manager/ads_v2`

Pancake POS cũng là nguồn dữ liệu đơn hàng, doanh thu, sản phẩm, tồn kho, giao hàng, hoàn/hủy và các kênh marketplace. Vì vậy dữ liệu Ads lấy từ Pancake phải được join với dữ liệu thương mại thực tế thay vì chỉ nhìn attribution của nền tảng quảng cáo.

## Nguyên tắc đo lường

AI không đánh giá quảng cáo chỉ bằng ROAS.

Mỗi Business Unit phải có tối thiểu 4 lớp chỉ số:

### 1. Media metrics

- Spend
- Impressions
- Reach
- CPM
- Clicks
- CTR
- CPC
- Conversations
- Cost / Conversation

### 2. Funnel metrics

Tùy loại Business Unit:

**Commerce**

`Conversation → Data → Order → Confirmed → Shipped → Delivered → Repeat`

**Service**

`Conversation → Data → Appointment → Arrival → Sale → Repeat`

Các KPI:

- Message → Data
- Data → Order / Appointment
- Appointment → Arrival
- Order → Delivered
- CAC / Order
- CAC / Delivered Order
- Cost / Arrival
- Cost / Sale

### 3. Commerce metrics

- Orders
- Delivered orders
- Revenue
- Attributed revenue
- Refund / Return rate
- Average order value
- Gross margin
- Contribution margin
- Inventory cover
- Repeat rate

### 4. Executive marketing metrics

- ROAS = attributed revenue / ad spend
- MER = total business revenue / total ad spend
- Contribution profit after ads
- CAC delivered
- Profit / campaign
- Profit / channel
- Capital efficiency

ROAS dùng để đọc attribution quảng cáo. MER và contribution profit dùng để quyết định kinh doanh.

## Cấu trúc phân tích

```text
Pancake Ads Manager
        │
        ├── Ad Account
        │      └── Campaign
        │            └── Ad Set
        │                  └── Ad / Creative
        │
Pancake / Botcake
        │
        └── Conversation / Data

Pancake POS / CRM
        │
        ├── Order / Appointment
        ├── Delivered / Arrival
        ├── Revenue
        ├── Return / Cancellation
        └── Customer

Inventory / Finance
        │
        ├── COGS
        ├── Stock
        ├── Fees
        └── Cash

            ▼
AI Channel & Ads Performance Manager
            │
            ├── Normalize metrics
            ├── Compare baseline
            ├── Detect anomaly
            ├── Find bottleneck
            ├── Estimate financial impact
            └── Recommend action
```

## Đầu ra AI bắt buộc

Mỗi đề xuất phải trả lời 6 câu hỏi:

1. **Chỉ số nào đang thay đổi?**
2. **Thay đổi bao nhiêu so với baseline / mục tiêu?**
3. **Điểm nghẽn nằm ở tầng nào?**
4. **Ảnh hưởng lợi nhuận ước tính bao nhiêu?**
5. **Nguyên nhân khả năng cao là gì?**
6. **Đề xuất hành động cụ thể là gì?**

Ví dụ:

```text
BUSINESS UNIT: SHIEN
STATUS: WARNING

CAC Delivered: 186.000đ
Target: 160.000đ
7-day baseline: 152.000đ
Change: +22,4%

Root-cause signal:
- CPM +6%
- CTR -17%
- Page → Order gần như không đổi
- Delivered rate không đổi

Diagnosis:
Creative fatigue nhiều khả năng là nguyên nhân chính.

Financial impact:
Nếu giữ xu hướng hiện tại với 300 đơn/ngày,
chi phí tăng thêm khoảng 7,8 triệu/ngày.

Recommendation:
HOLD ngân sách hiện tại.
Không scale.
Thay creative tại nhóm có CTR giảm mạnh nhất.
Đánh giá lại sau khi đủ dữ liệu mới.

Requires owner approval: NO
```

Nếu đề xuất tăng ngân sách:

```text
Recommendation: SCALE +20%
Reason: CAC Delivered dưới target 18%, contribution margin 27%, inventory cover 21 ngày.
Requires owner approval: YES
```

## Cảnh báo sớm

AI phải theo dõi cả mức tuyệt đối và xu hướng.

Ví dụ rule ban đầu:

- CAC Delivered > target → WARNING
- CAC Delivered > target 20% → CRITICAL
- CAC tăng >15% so kỳ trước → WATCH
- ROAS < minimum → WARNING
- MER < minimum → WARNING
- Return rate > ceiling → CRITICAL
- CTR giảm liên tục + CPM ổn định → nghi creative fatigue
- CPM tăng mạnh + CTR ổn định → nghi auction/audience issue
- Ads metrics tốt nhưng Order conversion giảm → chuyển điều tra sang Pancake/Botcake/funnel
- Ads + funnel tốt nhưng Delivered giảm → chuyển điều tra sang fulfillment/logistics
- Ads + sales tốt nhưng contribution margin giảm → chuyển điều tra sang cost/discount/return

Các rule chỉ là lớp bảo vệ deterministic. Sau đó AI phân tích chuỗi thời gian, seasonality và bối cảnh Business Unit để tránh cảnh báo máy móc.

## Kênh thương mại

AI phải so sánh hiệu quả theo channel, không chỉ campaign:

- Facebook / Instagram
- TikTok
- Shopee
- Lazada
- Website
- Offline
- Các kênh mới sau này

Mỗi channel được đánh giá theo:

`Revenue → Contribution Profit → CAC → Repeat → Return → Capital Efficiency`

Không mặc định kênh doanh thu cao nhất là kênh tốt nhất.

## Quyền hạn

AI được phép:

- Đồng bộ dữ liệu.
- Tính KPI.
- Xếp hạng kênh/campaign/ad set/ad.
- Cảnh báo.
- Dự báo.
- Đề xuất thay creative.
- Đề xuất HOLD / SCALE / KILL.
- Đề xuất phân bổ ngân sách.

AI **không được tự động**:

- Tăng ngân sách.
- Tạo campaign có chi phí.
- Di chuyển tiền.
- Thay đổi giá bán.

Các hành động có tiền phải đi qua Approval Engine của chủ doanh nghiệp.

## Tần suất đồng bộ đề xuất

- Ads performance: mỗi 15–30 phút khi campaign đang hoạt động.
- Orders / revenue: webhook hoặc 5–15 phút.
- Fulfillment / delivered / returns: 30–60 phút.
- Inventory: 30–60 phút hoặc theo event.
- Executive summary: realtime dashboard + daily brief.

Không cần chạy LLM ở mỗi lần sync. Collector và metric engine chạy deterministic; chỉ gọi AI khi có anomaly, cần root-cause analysis, cần forecast hoặc cần tạo executive recommendation.

## Nguyên tắc chi phí AI

`DATA SYNC → RULE ENGINE → ANOMALY DETECTOR → AI DIAGNOSIS`

Không dùng:

`EVERY EVENT → LLM`

Thiết kế này giúp hệ thống có thể quản lý nhiều Business Unit mà chi phí AI vẫn thấp và dữ liệu có thể audit được.
