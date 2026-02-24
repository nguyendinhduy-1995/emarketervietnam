# Feature Matrix

## Core vs Add-on Classification

| # | Feature | featureKey | Tier | Dependency | Core-safe? | UI Files | API Routes | DB Models |
|---|---------|-----------|------|------------|------------|----------|------------|-----------|
| 1 | CRM Dashboard | `CORE_DASHBOARD` | Core | — | ✅ | `emk-crm/page.tsx` | `api/emk-crm/dashboard` | EmkAccount, EmkLead |
| 2 | Lead Management | `CORE_LEADS` | Core | — | ✅ | `emk-crm/leads/*` | `api/emk-crm/accounts`, `api/emk-crm/ingest` | EmkLead, EmkNote |
| 3 | Task Management | `CORE_TASKS` | Core | — | ✅ | `emk-crm/tasks/*` | `api/emk-crm/tasks` | EmkTask |
| 4 | Wallet & Billing | `CORE_BILLING` | Core | — | ✅ | `hub/billing/*` | `api/hub/wallet/*`, `api/emk-crm/wallets` | Wallet, WalletLedger, TopupIntent |
| 5 | Marketplace | `CORE_MARKETPLACE` | Core | — | ✅ | `hub/marketplace/*` | `api/hub/products/*` | Product, Plan |
| 6 | Team Management | `CORE_TEAM` | Core | — | ✅ | `hub/team/*` | `api/hub/team` | Membership |
| 7 | Support Tickets | `CORE_SUPPORT` | Core | — | ✅ | `hub/support/*` | `api/hub/support/*` | SupportTicket, TicketMessage |
| 8 | AI Chat Assistant | `AI_ASSISTANT` | Add-on | AI Provider Key | ✅ | `components/AiChatWidget` | `api/ai/chat` | AiProviderKey |
| 9 | AI Analytics | `AI_ANALYTICS` | Add-on | AI Provider Key | ✅ | `emk-crm/analytics` | `api/ai/analytics` | — |
| 10 | AI Lead Scoring | `AI_LEAD_SCORE` | Add-on | AI Provider Key | ✅ | `emk-crm/leads (score column)` | `api/ai/lead-score` | — |
| 11 | AI Churn Prediction | `AI_CHURN` | Add-on | AI Provider Key | ✅ | `emk-crm/dashboard (churn card)` | `api/ai/churn` | — |
| 12 | AI Content Generator | `AI_GENERATE` | Add-on | AI Provider Key | ✅ | (modal) | `api/ai/generate` | — |
| 13 | AI Summary | `AI_SUMMARY` | Add-on | AI Provider Key | ✅ | (inline) | `api/ai/summary` | — |
| 14 | Automation Rules | `AUTOMATION` | Add-on | — | ✅ | `emk-crm/automation` | `api/emk-crm/automation` | (rules in JSON) |
| 15 | Drip Campaigns | `DRIP_CAMPAIGN` | Add-on | AUTOMATION | ✅ | `emk-crm/drip` | `api/emk-crm/drip` | EmkDripCampaign, EmkDripLog |
| 16 | Messaging (SMS/Zalo) | `MESSAGING` | Add-on | — | ✅ | `emk-crm/messaging` | `api/emk-crm/messaging` | — |
| 17 | Data Export (CSV/Excel) | `DATA_EXPORT` | Add-on | — | ✅ | (export button) | `api/emk-crm/export` | — |
| 18 | Online Booking (Public) | `ONLINE_BOOKING` | Add-on | — | ✅ | Public `/book/*` | `api/public/book/[slug]` | — |
| 19 | CMS / Blog | `CMS` | Add-on | — | ✅ | `emk-crm/cms` | `api/emk-crm/cms` | CmsPost |
| 20 | Digital Products | `DIGITAL_ASSETS` | Add-on | — | ✅ | `hub/downloads` | `api/hub/downloads`, `api/emk-crm/digital-assets` | DigitalAsset, DownloadGrant |
| 21 | Affiliate System | `AFFILIATES` | Add-on | — | ✅ | `emk-crm/affiliates` | `api/emk-crm/affiliates`, `api/emk-crm/commissions`, `api/emk-crm/payouts` | AffiliateAccount, Commission, Referral |
| 22 | Email Templates | `EMAIL_TEMPLATES` | Add-on | — | ✅ | `emk-crm/templates` | `api/emk-crm/templates` | EmkEmailTemplate |
| 23 | Knowledge Base | `KNOWLEDGE_BASE` | Add-on | — | ✅ | `hub/help` | `api/hub/help` | KbCategory, KbArticle |
| 24 | AI Settings Vault | `AI_SETTINGS` | Add-on | AI Provider Key | ✅ | `emk-crm/ai-settings` | `api/ai/settings` | AiProviderKey |
| 25 | Finance/Reconciliation | `FINANCE_ADMIN` | Admin | — | ✅ | `emk-crm/finance` | `api/emk-crm/reconciliation`, `api/emk-crm/refunds`, `api/emk-crm/coupons` | Receipt, RefundRecord, Coupon |

## Notes

- **Core-safe = Yes** cho tất cả: tắt bất kỳ add-on nào thì hệ thống core vẫn chạy bình thường
- **AI features** (8-13, 24) phụ thuộc vào `AiProviderKey` — tenant phải cấu hình API key riêng
- **DRIP_CAMPAIGN** phụ thuộc **AUTOMATION** — cần enable automation trước
- Tất cả add-on hiện **KHÔNG CÓ gating** — bất kỳ user nào cũng truy cập được full features
