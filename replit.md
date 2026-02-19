# VЛАДОНИ Control Panel

## Overview
Dark-themed operational dashboard for a multi-location foodtruck/food-service business in Saint Petersburg, Russia. Connects to a remote VPS Python API via SSH tunnel.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui, dark mode, Russian locale
- **Backend**: Express.js proxy that tunnels requests to a Python API on VPS via SSH (ssh2 library)
- **API Auth**: HTTP Basic Auth (admin/password from DASHBOARD_PASSWORD env var)
- **SSH**: Credentials from VPS_VL secret (format: `user@host:password`)

## Key Technical Details
- SSH tunnel with keepalive, auto-reconnect on disconnect
- All API routes proxied: GET/POST forwarded through SSH forwardOut
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
  pages/dashboard.tsx - Main dashboard with 7 tabs
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
  hooks/use-dashboard.ts - React Query hooks for all API endpoints
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

## Environment Secrets
- VPS_VL: SSH credentials (user@host:password)
- DASHBOARD_PASSWORD: API Basic Auth password
- SESSION_SECRET: Express session secret

## API Endpoints (proxied to VPS)
GET: /api/state, /api/order/catalog, /api/salary/calculate, /api/routines, /api/overrides, /api/journal, /api/reports/daily
POST: /api/tasks/toggle, /api/tasks/add, /api/checklist/complete, /api/sync, /api/day/regenerate, /api/grid/cell/save, etc.
