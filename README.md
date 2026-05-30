# Cadana Exchange

A blockchain-based virtual cryptocurrency exchange where users trade **CDA (Cadana Token)** with virtual KRW. Wallet authentication via MetaMask, GPS location rewards, and a CDA price engine driven by daily security news counts.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│   React + Vite + ethers.js (localhost:5173)                 │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│   │Dashboard │ │TradePanel│ │PriceChart│ │LocationVerify│  │
│   └──────────┘ └──────────┘ └──────────┘ └─────────────┘  │
│             MetaMask Extension (Wallet / Signing)           │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP /api/*
┌───────────────────────────▼─────────────────────────────────┐
│              Node.js + Express (localhost:3001)              │
│  Routes: /auth  /trade  /location  /news  /price            │
│  Services: newsService (RSS)  priceService (seed)           │
│  Cron: daily price update @ 00:15 UTC                       │
└───────────┬────────────────────────────┬────────────────────┘
            │                            │
┌───────────▼──────────┐   ┌────────────▼──────────────────┐
│  MongoDB (port 27017) │   │   Sepolia Testnet (optional)  │
│  cadana DB           │   │   CDA ERC-20 Smart Contract   │
│  users / transactions│   │   (Hardhat deploy)            │
│  priceHistory        │   └───────────────────────────────┘
└──────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Standalone Crawler (optional, crawler/)                 │
│  Calls POST /api/news/update-price daily via node-cron   │
└──────────────────────────────────────────────────────────┘
```

---

## Modules

| Directory      | Stack                        | Purpose                              |
|---------------|------------------------------|--------------------------------------|
| `frontend/`   | React 18, Vite, ethers.js    | UI, MetaMask wallet, trading         |
| `backend/`    | Node.js, Express, Mongoose   | REST API, auth, trade, price engine  |
| `contracts/`  | Solidity 0.8.24, Hardhat     | CDA ERC-20 token (Sepolia testnet)   |
| `crawler/`    | Node.js, rss-parser, axios   | Standalone daily news crawler        |

---

## Quick Start

### Prerequisites

- Node.js >= 18
- MongoDB running locally (`mongod`)
- MetaMask browser extension installed

---

### 1. Smart Contracts (optional — for on-chain deployment)

```bash
cd contracts
npm install
cp .env.example .env
# Fill in SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY

# Compile
npm run compile

# Deploy to Sepolia testnet
npm run deploy:sepolia

# Or run a local Hardhat node
npm run node
npm run deploy:local
```

---

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your values (JWT_SECRET at minimum)

# Start (production)
npm start

# Start with auto-reload (development)
npm run dev
```

The backend starts on **http://localhost:3001**.

On first startup with an empty MongoDB, the price will default to `CDA_BASE_PRICE` (1000 KRW) from `.env`.

---

### 3. Frontend

```bash
cd frontend
npm install

# Start dev server
npm run dev
```

Open **http://localhost:5173** in a browser with MetaMask installed.

---

### 4. Crawler (optional — standalone)

The backend already runs its own internal cron. The crawler module is a separate process that can run on a different server.

```bash
cd crawler
npm install

# Run (triggers immediately, then daily at midnight)
npm start
```

Set `BACKEND_URL` env var if your backend is not at `http://localhost:3001`.

---

## Environment Variables

### backend/.env

| Variable                  | Default                              | Description                               |
|--------------------------|--------------------------------------|-------------------------------------------|
| `PORT`                   | `3001`                               | Express server port                       |
| `MONGODB_URI`            | `mongodb://localhost:27017/cadana`   | MongoDB connection string                 |
| `JWT_SECRET`             | *(required)*                         | Secret for signing JWT tokens             |
| `INITIAL_KRW`            | `1000000`                            | KRW given to new users on signup          |
| `LOCATION_REWARD_CDA`    | `100`                                | CDA rewarded per location claim           |
| `LOCATION_COOLDOWN_HOURS`| `24`                                 | Hours between location claims             |
| `CDA_BASE_PRICE`         | `1000`                               | Initial CDA price in KRW                 |

### contracts/.env

| Variable             | Description                          |
|---------------------|--------------------------------------|
| `SEPOLIA_RPC_URL`   | Infura/Alchemy Sepolia RPC endpoint  |
| `PRIVATE_KEY`       | Deployer wallet private key          |
| `ETHERSCAN_API_KEY` | For contract verification            |

---

## API Endpoints

### Auth

| Method | Path                    | Auth | Description                          |
|--------|-------------------------|------|--------------------------------------|
| GET    | `/api/auth/nonce/:addr` | No   | Get or create user, return nonce     |
| POST   | `/api/auth/verify`      | No   | Verify MetaMask signature, get JWT   |
| GET    | `/api/auth/me`          | JWT  | Get current user balances            |

### Trade

| Method | Path                  | Auth | Description              |
|--------|-----------------------|------|--------------------------|
| POST   | `/api/trade/buy`      | JWT  | Buy CDA with KRW         |
| POST   | `/api/trade/sell`     | JWT  | Sell CDA for KRW         |
| GET    | `/api/trade/history`  | JWT  | Last 50 transactions     |

**Buy/Sell body:** `{ "cdaAmount": 100 }`

### Location

| Method | Path                    | Auth | Description                          |
|--------|-------------------------|------|--------------------------------------|
| POST   | `/api/location/claim`   | JWT  | Claim GPS reward (24h cooldown)      |

**Body:** `{ "latitude": 37.5665, "longitude": 126.9780 }`

### News & Price

| Method | Path                        | Auth | Description                      |
|--------|-----------------------------|------|----------------------------------|
| GET    | `/api/news`                 | No   | Fetch latest security news       |
| POST   | `/api/news/update-price`    | No   | Trigger manual price update      |
| GET    | `/api/price/current`        | No   | Current CDA price                |
| GET    | `/api/price/history`        | No   | Price history (default 30 items) |

---

## Price Mechanism

CDA price is updated **once daily** (00:15 UTC) by crawling three RSS feeds:

- The Hacker News — `https://feeds.feedburner.com/TheHackersNews`
- BleepingComputer — `https://www.bleepingcomputer.com/feed/`
- KR-CERT — `https://krcert.or.kr/rss/rss.do`

The number of articles published **today** (KST midnight) determines the adjustment:

```
If today_articles > 5:  new_price = base_price × (1 + (count - 5) × 0.02)   [+2% per article]
If today_articles < 5:  new_price = base_price × (1 + (count - 5) × 0.01)   [-1% per article]
If today_articles = 5:  price unchanged
Minimum price floor: 100 KRW
```

Example: base price 1,000 KRW, 8 articles today → 1,000 × (1 + 3 × 0.02) = **1,060 KRW**

---

## Location Reward System

1. User clicks "위치 인증하고 CDA 받기" on the Location tab.
2. Browser Geolocation API requests GPS coordinates.
3. Coordinates are sent to `POST /api/location/claim`.
4. Backend checks `lastLocationClaim` timestamp:
   - If fewer than 24 hours have passed → `429` with hours remaining.
   - Otherwise → add 100 CDA to balance, update `lastLocationClaim`.
5. Transaction is recorded with type `location_reward`.

Duplicate prevention is enforced server-side via the `lastLocationClaim` field per wallet address — client-side timing is only used for UI feedback.

---

## Authentication Flow

```
1. User clicks "MetaMask로 시작하기"
2. Frontend calls GET /api/auth/nonce/:address
   → Backend creates user if new (with 1,000,000 KRW), returns nonce
3. Frontend asks MetaMask to sign:
   "Cadana 로그인 인증\nNonce: {nonce}"
4. Frontend calls POST /api/auth/verify with { address, signature }
   → Backend recovers signer with ethers.verifyMessage()
   → If match: rotate nonce, issue JWT (24h expiry)
5. JWT stored in localStorage, attached to all subsequent API requests
```

---

## Project Structure

```
cadana/
├── frontend/          React + Vite UI
├── backend/           Express REST API
├── contracts/         Solidity CDA token + Hardhat
├── crawler/           Standalone RSS news crawler
└── README.md
```
