#!/bin/bash
set -e # Exit with nonzero exit code if anything fails

echo "🚀 Bắt đầu Verification Pipeline (Hub SaaS CRM)..."

echo "⏳ Đang kiểm tra TypeScript tsc..."
npx tsc --noEmit
echo "✅ TypeScript Passed!"

echo "⏳ Đang kiểm tra Build & Linting tổng hợp (Next.js)..."
npm run build
echo "✅ Build & Linting Passed!"

echo "⏳ Đang chạy Playwright E2E Tests..."
npx playwright test
echo "✅ E2E Tests Passed!"

echo "🎉 CHÚC MỪNG! Toàn bộ codebase đã pass Verification Pipeline. Sẵn sàng Deploy! 🚀"
