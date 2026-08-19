# eMarketer AI Commercial OS

## 1. Mục tiêu

Biến eMarketer Hub thành hệ điều hành cho một công ty thương mại tinh gọn, nơi AI xử lý phần lớn nghiên cứu, phân tích, vận hành và đề xuất quyết định; con người giữ quyền phê duyệt các hành động có rủi ro cao.

Mô hình kinh doanh đích:

**Nhà sản xuất / xưởng / chủ sản phẩm** cung cấp năng lực sản xuất, nguồn hàng, QC và fulfillment.

**eMarketer** cung cấp năng lực thương mại hóa: chiến lược, thương hiệu, creative, paid growth, CRM, AI, analytics, finance control và scale.

## 2. Nguyên tắc thiết kế

1. AI không được tự ý chuyển tiền, ký hợp đồng, đặt PO lớn, thay đổi chính sách pháp lý/thuế hoặc scale ngân sách vượt ngưỡng.
2. Mọi quyết định phải dựa trên dữ liệu và lưu decision log.
3. Mọi business unit/SKU phải có P&L riêng.
4. Tối ưu theo **lợi nhuận sau thuế và dòng tiền**, không tối ưu doanh thu đơn thuần.
5. Không scale nếu chưa chứng minh unit economics.
6. Các agent dùng workflow và tool rõ ràng, không cho phép agent tự do hành động ngoài danh sách quyền.
7. Kiến trúc phải hỗ trợ nhiều ngành hàng với cùng một commercial engine.

## 3. Mô hình tham khảo từ GitHub

### MetaGPT / ChatDev
Dùng làm nguồn tham khảo về cách mô hình hóa một tổ chức AI theo vai trò và SOP. Không dùng làm core runtime cho hoạt động thương mại.

### CrewAI
Có thể dùng cho các workflow nhiều vai trò, ví dụ research → product → brand → analyst review. MIT license phù hợp để tham khảo/tích hợp.

### LangGraph
Ưu tiên cho workflow có state, checkpoint, retry, human-in-the-loop và approval gate. Đây là ứng viên phù hợp làm orchestration core cho những quyết định quan trọng.

### n8n
Dùng như integration/action layer cho nhu cầu nội bộ: webhook, Ads API, CRM, email, messaging, shipping, database và scheduled jobs. Không nhúng/fork thành sản phẩm thương mại nếu điều khoản license không cho phép; giữ dưới dạng dịch vụ automation nội bộ hoặc đánh giá license thương mại riêng.

### Twenty / Relaticle
Tham khảo mô hình CRM, object model, activity, people/company/opportunity và AI/MCP integration. Không fork mù vì phần lớn mã chịu AGPL hoặc license riêng; ưu tiên tích hợp qua API/SDK hoặc xây CRM domain riêng trong eMarketer khi cần proprietary core.

## 4. Kiến trúc mục tiêu

```text
                         DUY / HUMAN BOARD
                               │
                    Approval & Strategy Layer
                               │
                    AI Chief Commercial Officer
                               │
        ┌──────────────────────┼───────────────────────┐
        │                      │                       │
   Deal & Product          Growth Engine         Control Engine
        │                      │                       │
  Deal Scout             Brand Director        Finance Controller
  Product Strategist     Growth Operator        Compliance Guardian
                         Sales/CRM Manager       Business Analyst
                         Operations Controller
        │                      │                       │
        └──────────────────────┼───────────────────────┘
                               │
                   LangGraph / Agent Runtime
                               │
              Policy Engine + Approval Gates
                               │
                  Tool / Integration Gateway
                               │
       n8n ─ Ads APIs ─ CRM ─ OMS ─ Shipping ─ Bank*
                               │
                   Postgres / Data Warehouse
```

`Bank*`: mặc định read-only. Mọi money movement yêu cầu phê duyệt con người và cơ chế xác thực riêng.

## 5. 10 AI roles ban đầu

1. **AI Chief Commercial Officer** — phân bổ vốn, xếp hạng business unit, SCALE/HOLD/KILL.
2. **AI Deal Scout** — tìm và chấm điểm xưởng/nhà sản xuất/đối tác.
3. **AI Product Strategist** — SKU, pricing, offer, test economics.
4. **AI Brand Director** — positioning, creative brief, brand system.
5. **AI Growth Operator** — Ads test/optimize/scale theo profit.
6. **AI Sales & CRM Manager** — conversion, follow-up, segmentation, retention.
7. **AI Operations Controller** — tồn kho, fulfillment, supplier, returns.
8. **AI Finance Controller** — P&L, cashflow, break-even, tax allocation.
9. **AI Compliance Guardian** — pháp lý, claim, privacy, tax risk.
10. **AI Business Analyst** — root-cause, dashboard, scenario, daily executive brief.

Registry nằm tại `src/lib/ai-company/registry.ts`.

## 6. Commercial Unit Economics

Mọi SKU/business unit phải gửi snapshot chuẩn:

```text
Revenue
- Refunds / returns
= Revenue after returns

- Product cost
- Ad spend
- Fulfillment
- Platform/payment fees
= Contribution profit

- Allocated payroll
- Allocated tax
= Net operating profit
```

Các chỉ số bắt buộc:

- Contribution Margin
- Net Operating Margin
- CAC / Delivered Order
- Return & Refund Rate
- Repeat Rate
- Cash Conversion Cycle
- Inventory Days
- ROIC theo business unit

Calculator ban đầu: `src/lib/ai-company/economics.ts`.

## 7. Decision Engine

Decision chuẩn:

- `TEST`: đủ điều kiện test nhỏ.
- `HOLD`: tiếp tục nhưng chưa tăng vốn.
- `SCALE`: đạt economics và guardrail.
- `KILL`: không đạt điều kiện, dừng vốn.
- `REVIEW`: dữ liệu thiếu hoặc có rủi ro cần người duyệt.

Ví dụ scale policy tương lai:

```text
IF delivered_orders >= minimum_sample
AND contribution_margin >= target
AND return_rate <= max_return
AND cash_buffer_after_scale >= safety_buffer
AND compliance_status = PASS
THEN recommend SCALE
ELSE HOLD / KILL / REVIEW
```

Không để LLM tự quyết logic tài chính cốt lõi. Các threshold phải nằm trong deterministic policy/config; LLM dùng để giải thích và đề xuất.

## 8. Data model cần bổ sung

Giai đoạn sau thêm các domain:

- BusinessUnit
- Partner
- Supplier
- Deal
- Brand
- Product / SKU
- Offer
- Campaign
- Creative
- Customer / Segment
- Order / Fulfillment
- InventorySnapshot
- CommercialSnapshot
- PnLSnapshot
- AgentRun
- AgentDecision
- ApprovalRequest
- WorkflowRun
- ToolAuditLog

Mỗi record phải gắn `businessUnitId` để tránh trộn dữ liệu giữa thời trang, thực phẩm và các ngành hàng sau này.

## 9. Workflow mẫu: đưa một sản phẩm mới vào hệ thống

```text
Partner submitted
→ Deal Scout due diligence
→ Product Strategist unit economics
→ Compliance Guardian pre-check
→ Human approves TEST budget
→ Brand Director builds positioning/brief
→ Growth Operator launches test
→ CRM Manager handles inbound/follow-up
→ Operations Controller tracks delivery/returns
→ Finance Controller closes daily economics
→ Business Analyst explains drivers
→ CCO recommends SCALE / HOLD / KILL
→ Human approves capital allocation
```

## 10. Automation boundary

### AI được tự động
- research và tổng hợp dữ liệu
- scoring
- tạo brief/content draft
- phân nhóm khách
- cảnh báo tồn kho
- pause campaign khi chạm hard loss limit (nếu rule deterministic đã duyệt)
- tạo báo cáo
- tạo approval request

### AI cần phê duyệt
- tăng ngân sách
- launch campaign mới có chi phí
- đổi giá
- đặt hàng
- refund lớn
- ký/chỉnh hợp đồng
- thay supplier
- claim quảng cáo nhạy cảm
- chuyển tiền
- thay đổi xử lý thuế/pháp lý

## 11. Roadmap triển khai

### Phase 1 — Control Tower
- AI registry
- unit economics engine
- BusinessUnit + SKU + CommercialSnapshot
- dashboard Daily Profit
- decision log + approval gate

### Phase 2 — Growth Loop
- Meta/TikTok/Google data ingest
- creative registry
- campaign/SKU attribution
- deterministic scale/kill rules
- AI daily growth brief

### Phase 3 — CRM & Retention
- customer 360
- conversation/order timeline
- AI lead scoring
- next-best-action
- repeat/retention workflows

### Phase 4 — Operations
- supplier scorecard
- purchase/reorder suggestions
- inventory days
- fulfillment exceptions
- return root-cause

### Phase 5 — Deal Factory
- partner intake
- due diligence
- deal economics
- profit-share/JV model simulator
- standardized onboarding into Commercial OS

## 12. Mục tiêu cuối

Hệ thống phải cho phép Duy thực hiện một chu trình ở cấp CEO:

```text
Tìm đối tác → nhập sản phẩm → duyệt test → theo dõi dashboard → duyệt scale/kill
```

Phần lớn công việc còn lại được AI + automation + một operator ngành hàng thực hiện và audit đầy đủ.
