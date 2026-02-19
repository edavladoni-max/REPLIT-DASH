# VЛАДОНИ Control Panel

## Overview
Dark-themed operational dashboard for a multi-location foodtruck/food-service business in Saint Petersburg, Russia. Connects to a remote VPS Python API via SSH tunnel.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui, dark mode, Russian locale
- **Backend**: Express.js proxy that tunnels requests to a Python API on VPS via SSH (ssh2 library)
- **API Auth**: HTTP Basic Auth (admin/password from DASHBOARD_PASSWORD env var)
- **SSH**: Credentials from VPS_VL secret (format: `user@host:password`)
- **Agent Command Queue**: local API + PostgreSQL table `agent_commands` for confirm/start/finish workflow
- **MemOS Auto-Context**: on command creation dashboard can auto-fetch relevant memory context from MemOS (`/product/search`)

## Key Technical Details
- SSH tunnel with keepalive, auto-reconnect on disconnect
- All API routes proxied: GET/POST forwarded through SSH forwardOut
- Agent command routes are local (not proxied): `/api/agent/*`
- MemOS context can be auto-injected when `memosContext` is empty and query/title is provided
- Local env files are auto-loaded on server start: `.env` then `.env.local` (local overrides)
- VPS API port: 8080 (env var VPS_API_PORT)
- Auto-refresh: 30s polling via TanStack Query refetchInterval
- Dark mode permanently enabled (class="dark" on html element)

## Project Structure
```
server/
  routes.ts          - SSH proxy, API route forwarding
  index.ts           - Express + Vite server setup
client/src/
  App.tsx             - Root app, QueryClient, router
  pages/dashboard.tsx - Main dashboard with 8 tabs
  components/
    msk-clock.tsx     - Moscow time clock display
    tabs/
      tab-home.tsx      - Главная: locations, shifts, hot zone, suppliers, finance, key dates, concerts
      tab-tasks.tsx     - Задачи: task list, add task, daily checklist, ops checklist
      tab-shifts.tsx    - Смены: weekly shift grid, draft schedule, concerts
      tab-suppliers.tsx - Поставщики: deadlines, deliveries, supplier catalog
      tab-finance.tsx   - Финансы: financial reports
      tab-journal.tsx   - Журнал: daily event log
      tab-salary.tsx    - ЗП: salary calculation, employee directory, routines
      tab-agent.tsx     - Команды: queue with confirmation and execution status
  hooks/use-dashboard.ts - React Query hooks for all API endpoints
  hooks/use-agent-commands.ts - React Query hooks for command queue
  lib/api.ts          - TypeScript interfaces for API response types
shared/schema.ts      - Drizzle schema (minimal, app uses external API)
```

## Tabs (Russian labels)
1. Главная (Home) - overview dashboard
2. Задачи (Tasks) - task management
3. Смены (Shifts) - shift schedule grid
4. Поставщики (Suppliers) - supplier deadlines
5. Финансы (Finance) - financial data
6. Журнал (Journal) - event log
7. ЗП (Salary) - salary calculations
8. Команды (Commands) - agent task queue and confirmation flow

## Environment Secrets
- VPS_VL: SSH credentials (user@host:password)
- DASHBOARD_PASSWORD: API Basic Auth password
- SESSION_SECRET: Express session secret
- DATABASE_URL: PostgreSQL connection string for persistent `agent_commands` table
- MEMOS_AUTO_CONTEXT: `true|false` (default `true`)
- MEMOS_BASE_URL: MemOS API base URL (default `http://127.0.0.1:8000`)
- MEMOS_USER_ID: MemOS user (default `openclaw-main`)
- MEMOS_READABLE_CUBES: comma-separated cube IDs for retrieval scope
- MEMOS_TOP_K: number of memories to fetch per command (default `6`)
- MEMOS_TIMEOUT_MS: timeout for MemOS search calls (default `7000`)

## API Endpoints (proxied to VPS)
GET: /api/state, /api/order/catalog, /api/salary/calculate, /api/routines, /api/overrides, /api/journal, /api/reports/daily
POST: /api/tasks/toggle, /api/tasks/add, /api/checklist/complete, /api/sync, /api/day/regenerate, /api/grid/cell/save, etc.

## API Endpoints (local command queue)
GET: /api/agent/health, /api/agent/commands
POST: /api/agent/commands, /api/agent/memos/search, /api/agent/commands/:id/confirm, /api/agent/commands/:id/reject, /api/agent/commands/:id/start, /api/agent/commands/:id/complete, /api/agent/commands/:id/fail, /api/agent/commands/:id/context
