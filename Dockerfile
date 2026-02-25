# Step 1. Rebuild the source code only when needed
FROM node:20-alpine AS builder

WORKDIR /app

# Enable corepack for modern package managers (optional, using npm here)
# RUN corepack enable

COPY package.json package-lock.json* ./
# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Generate Prisma clients
RUN npm run prisma:generate

# Build Next.js app (Standalone mode must be enabled in next.config.ts)
RUN npm run build

# Build worker script
RUN npx tsc --project tsconfig.worker.json

# Step 2. Production image, copy all the files and run next
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy Prisma engines and generated clients
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Copy bullmq and other required production dependencies
COPY --from=builder /app/node_modules ./node_modules

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy the compiled worker script
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist

# Copy prisma schema for DB pushes/migrations in prod if needed
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Default command starts Next.js. Worker will override this in docker-compose.
CMD ["node", "server.js"]
