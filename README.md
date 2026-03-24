# Vested — Real-Time Trading Dashboard

A full-stack real-time trading dashboard with live price simulation, interactive charting, and price alerts. Built with React, TypeScript, Express, and WebSockets.

![Dashboard Preview](assets/Screenshot_2026-03-24_at_1.26.19_PM-dfff237d-836f-4b99-81e5-1f1e16df9e3e.png)

## Overview

Vested simulates a live trading environment with six tickers (crypto + equities), streaming price updates at 1-second intervals via WebSocket. Users can browse a watchlist, view interactive candlestick/area charts across multiple timeframes, set price alerts with customizable triggers, and receive real-time notifications.

**Key features:**

- Live price simulation using geometric Brownian motion (random walk with drift)
- 30 days of generated historical OHLCV data across 6 intervals (1m, 5m, 15m, 1h, 4h, 1d)
- Interactive charting powered by TradingView Lightweight Charts
- Price alerts with threshold-crossing detection (above/below, once/every time)
- Bell icon notification center for triggered alerts
- Mock JWT authentication
- Dark theme UI with responsive layout

## Architecture

```
real-time-trading-dashboard/
├── backend/                 # Express + WebSocket server (TypeScript)
│   └── src/
│       ├── config.ts                # Ports, tickers, intervals, JWT config
│       ├── server.ts                # App entry — wires services, routes, WS
│       ├── types/index.ts           # Shared TypeScript interfaces
│       ├── services/
│       │   ├── marketDataGenerator.ts   # GBM-based price simulation (EventEmitter)
│       │   ├── historicalDataService.ts # Mock OHLCV history + LRU cache
│       │   └── alertService.ts          # Threshold-crossing alert evaluation
│       ├── routes/
│       │   ├── auth.ts              # POST /api/auth/login (mock JWT)
│       │   ├── tickers.ts           # GET /api/tickers, GET /api/tickers/:symbol/history
│       │   └── alerts.ts            # CRUD /api/alerts (JWT-protected)
│       ├── middleware/
│       │   └── auth.ts              # JWT verification middleware
│       ├── websocket/
│       │   └── handler.ts           # WS subscription management + broadcasting
│       └── __tests__/               # Jest unit & integration tests
│
├── frontend/                # React + Vite (TypeScript)
│   └── src/
│       ├── App.tsx                  # Root component — layout, state, alert wiring
│       ├── types/index.ts           # Mirrored backend types
│       ├── services/api.ts          # REST API client (tickers, history, auth, alerts)
│       ├── hooks/
│       │   ├── useWebSocket.ts      # WS connection, reconnection, tick/alert callbacks
│       │   ├── useAuth.ts           # JWT + user state (localStorage)
│       │   └── useTickerData.ts     # Historical data fetch + live candle merging
│       ├── components/
│       │   ├── Header.tsx           # Brand, connection status, bell notifications, avatar
│       │   ├── Dashboard.tsx        # CSS Grid layout (sidebar + main)
│       │   ├── TickerList.tsx       # Watchlist with search + WS price updates
│       │   ├── TickerCard.tsx       # Individual ticker row with alert bell icon
│       │   ├── TickerInfoBar.tsx    # Selected ticker detail bar (price, 24h stats)
│       │   ├── IntervalSelector.tsx # Timeframe + chart type toggle
│       │   ├── PriceChart.tsx       # TradingView Lightweight Charts integration
│       │   ├── AlertModal.tsx       # Manage / create / edit alerts modal
│       │   └── LoginModal.tsx       # Sign-in modal
│       └── styles/index.css         # Global dark theme styles
```

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND  :4000                                 │
│                                                                             │
│  ┌─────────────────────┐         emits tick         ┌────────────────────┐  │
│  │  MarketDataGenerator │──────────────────────────►│    WsHandler       │  │
│  │  (GBM simulation)    │───┐                       │  WebSocket :4000/ws│  │
│  │  1s tick interval    │   │                       └────────┬───────────┘  │
│  └──────────┬───────────┘   │                                │              │
│             │               │   emits tick                   │ broadcasts   │
│             │               │                                │ price_update │
│             ▼               ▼                                │ alert_triggered
│  ┌──────────────────┐  ┌──────────────────┐                  │              │
│  │ HistoricalData   │  │  AlertService    │──── triggers ────┘              │
│  │ Service          │  │  (crossing       │    broadcastAll                 │
│  │ (OHLCV + LRU)   │  │   detection)     │                                │
│  └──────────────────┘  └──────────────────┘                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                     Express REST API                            │        │
│  │                                                                 │        │
│  │   /api/auth/login     /api/tickers     /api/tickers/:sym/history│        │
│  │   /api/alerts (CRUD, JWT-protected)    /api/health              │        │
│  └─────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                    │ HTTP                              │ WebSocket
                    ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND  :3000                                  │
│                                                                             │
│  ┌──────────────┐   ┌───────────────────────────────────────────────────┐   │
│  │  api.ts      │   │  useWebSocket hook                                │   │
│  │  (REST calls)│   │  ┌─────────────┐    ┌──────────────────────────┐  │   │
│  └──────┬───────┘   │  │  onTick     │    │  onAlert                 │  │   │
│         │           │  │  callback   │    │  callback                │  │   │
│         │           │  └──────┬──────┘    └────────────┬─────────────┘  │   │
│         │           └─────────┼────────────────────────┼────────────────┘   │
│         │                     │                        │                    │
│         ▼                     ▼                        ▼                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         App.tsx                                     │    │
│  │                                                                     │    │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────────┐  ┌──────────────┐  │    │
│  │  │ Header   │  │ TickerList│  │ PriceChart   │  │ AlertModal   │  │    │
│  │  │ (bell    │  │ (watchlist│  │ (TradingView │  │ (manage/     │  │    │
│  │  │  notifs) │  │  + prices)│  │  Lightweight)│  │  create/edit)│  │    │
│  │  └──────────┘  └───────────┘  └──────────────┘  └──────────────┘  │    │
│  │                                                                     │    │
│  │  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │    │
│  │  │TickerInfoBar │  │IntervalSelector  │  │ LoginModal           │  │    │
│  │  │(24h stats)   │  │(1m-1d + chart)   │  │ (JWT auth)          │  │    │
│  │  └──────────────┘  └──────────────────┘  └──────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Setup

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd real-time-trading-dashboard

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Running in Development

Start both servers in separate terminals:

```bash
# Terminal 1 — Backend (port 4000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

```bash
cd backend
npm test
```

### Environment Variables

All variables are optional — sensible defaults are provided.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Backend server port |
| `JWT_SECRET` | `dev-secret-do-not-use-in-prod` | Secret for signing JWTs |
| `VITE_API_URL` | `http://localhost:4000` | Frontend API base URL |
| `VITE_WS_URL` | `ws://localhost:4000/ws` | Frontend WebSocket URL |

### Mock Login Credentials

| Username | Password |
|----------|----------|
| `admin` | `password` |

## API Reference

Base URL: `http://localhost:4000`

### Health Check

```
GET /api/health
```

**Response:** `{ "status": "ok", "timestamp": 1711234567890 }`

---

### Authentication

```
POST /api/auth/login
```

**Body:**

```json
{ "username": "admin", "password": "password" }
```

**200 Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "1", "username": "admin", "displayName": "Neha Chaudhary" }
}
```

**401:** `{ "error": "Invalid credentials" }`

---

### Tickers

```
GET /api/tickers
```

**200 Response:** Array of `TickerSnapshot`

```json
[
  {
    "symbol": "BTC/USDT",
    "fullName": "Bitcoin",
    "iconColor": "#f7931a",
    "price": 87250.42,
    "change": 123.50,
    "changePercent": 0.14,
    "high24h": 87464.46,
    "low24h": 87159.96,
    "volume24h": 1580000,
    "timestamp": 1711234567890
  }
]
```

---

```
GET /api/tickers/:symbol/history?interval=1h&days=30
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `interval` | `1m \| 5m \| 15m \| 1h \| 4h \| 1d` | `1h` | Candle interval |
| `days` | `number` | `30` | History lookback |

**200 Response:**

```json
{
  "symbol": "BTC/USDT",
  "interval": "1h",
  "count": 720,
  "candles": [
    { "time": 1711000000, "open": 87100, "high": 87300, "low": 87050, "close": 87250, "volume": 2500 }
  ]
}
```

**400:** Invalid interval | **404:** Unknown symbol

---

### Alerts (JWT Required)

All alert endpoints require header: `Authorization: Bearer <token>`

```
GET /api/alerts
```

**200 Response:** Array of `Alert`

```json
[
  {
    "id": "uuid",
    "symbol": "ETH/USDT",
    "threshold": 3200,
    "direction": "above",
    "frequency": "every_time",
    "triggered": false,
    "triggerCount": 0,
    "createdAt": 1711234567890
  }
]
```

---

```
POST /api/alerts
```

**Body:**

```json
{
  "symbol": "ETH/USDT",
  "threshold": 3200,
  "direction": "above",
  "frequency": "every_time"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `symbol` | `string` | Yes | Ticker symbol |
| `threshold` | `number` | Yes | Target price |
| `direction` | `"above" \| "below"` | Yes | Trigger direction |
| `frequency` | `"once" \| "every_time"` | No (default `once`) | Re-trigger on each crossing or fire once |

**201 Response:** Created `Alert` object

---

```
DELETE /api/alerts/:id
```

**200:** `{ "ok": true }` | **404:** `{ "error": "Alert not found" }`

## WebSocket Protocol

**Endpoint:** `ws://localhost:4000/ws`

### Client → Server

**Subscribe to price updates:**

```json
{ "type": "subscribe", "symbols": ["BTC/USDT", "ETH/USDT"] }
```

**Unsubscribe:**

```json
{ "type": "unsubscribe", "symbols": ["BTC/USDT"] }
```

### Server → Client

**Price update** (sent every ~1s for subscribed symbols):

```json
{
  "type": "price_update",
  "data": {
    "symbol": "BTC/USDT",
    "price": 87363.17,
    "change": -76.07,
    "changePercent": -0.09,
    "high24h": 87464.46,
    "low24h": 87159.96,
    "volume24h": 1580000,
    "timestamp": 1711234567890
  }
}
```

**Alert triggered** (broadcast to all connected clients when an alert's threshold is crossed):

```json
{
  "type": "alert_triggered",
  "data": {
    "symbol": "ETH/USDT",
    "threshold": 3200,
    "direction": "above",
    "currentPrice": 3201.45
  }
}
```

### Server acknowledgements

**On subscribe:**

```json
{ "type": "subscribed", "symbols": ["BTC/USDT", "ETH/USDT"] }
```

**On unsubscribe:**

```json
{ "type": "unsubscribed", "symbols": ["BTC/USDT"] }
```

### Connection behavior

- The server pings clients every 30 seconds; unresponsive clients are dropped
- The frontend auto-reconnects with exponential backoff (1s → 30s max)


## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, TradingView Lightweight Charts |
| Backend | Node.js, Express, TypeScript, ws (WebSocket) |
| Auth | JSON Web Tokens (mock) |
| Caching | LRU Cache (historical data) |
| Testing | Jest, ts-jest, Supertest |
| Dev tooling | tsx (watch mode), ESLint |
