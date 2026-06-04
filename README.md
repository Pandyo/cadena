# Cadena Exchange

MetaMask 지갑으로 로그인하고, Sepolia ETH를 기준으로 가상 CDA 잔액을 매수/매도하는 보안뉴스 기반 거래 대시보드입니다. 백엔드는 보안뉴스 RSS/HTML을 수집해 CDA/ETH 가격 히스토리를 만들고, 프론트엔드는 차트, 거래, 위치 보상, 뉴스 화면을 제공합니다.

## 현재 구조

```text
.
├── frontend/   React 18 + Vite 대시보드
├── backend/    Express + MongoDB REST API
├── contracts/  Hardhat 기반 CDA ERC-20 컨트랙트
├── crawler/    백엔드 가격 업데이트 API를 호출하는 선택 실행 프로세스
└── README.md
```

| 경로 | 역할 |
| --- | --- |
| `frontend/` | MetaMask 로그인, CDA/ETH 차트, 매수/매도, 위치 보상, 보안뉴스 UI |
| `backend/` | JWT 인증, 거래 내역, 위치 보상, 뉴스 수집, 가격 히스토리 저장 |
| `contracts/` | `Cadena Token (CDA)` ERC-20 컨트랙트 컴파일/배포 |
| `crawler/` | `POST /api/news/update-price`를 주기적으로 호출하는 별도 크롤러 |

## 실행 요구사항

- Node.js 18 이상
- MongoDB
- MetaMask 브라우저 확장
- 거래 기능 사용 시 Sepolia 테스트 ETH

## 빠른 시작

### 1. 백엔드

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

기본 포트는 `3001`입니다. 서버 시작 시 MongoDB에 `PriceHistory`가 비어 있으면 기본 CDA 가격 `0.0005 ETH`가 seed 됩니다.

### 2. 프론트엔드

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

브라우저에서 `http://localhost:5173`을 엽니다. Vite 개발 서버는 `/api` 요청을 `http://localhost:3001`로 프록시합니다.

### 3. 컨트랙트 선택 배포

```bash
cd contracts
npm install
cp .env.example .env
npm run compile
npm run deploy:sepolia
```

로컬 Hardhat 네트워크를 쓰려면 별도 터미널에서 `npm run node`를 실행한 뒤 `npm run deploy:local`을 실행합니다.

### 4. 크롤러 선택 실행

백엔드 자체도 1분마다 뉴스 기반 가격 업데이트를 실행합니다. `crawler/`는 별도 프로세스나 서버에서 같은 업데이트 API를 호출하고 싶을 때 사용합니다.

```bash
cd crawler
npm install
npm start
```

## 환경변수

### `backend/.env`

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `PORT` | `3001` | Express 서버 포트 |
| `MONGODB_URI` | `mongodb://localhost:27017/cadana` | MongoDB 연결 문자열 |
| `JWT_SECRET` | `dev_secret` | JWT 서명 키. 운영/공유 환경에서는 반드시 변경 |
| `LOCATION_REWARD_CDA` | `100` | 위치 인증 성공 시 지급할 CDA 수량 |
| `LOCATION_COOLDOWN_HOURS` | `24` | 위치 보상 재수령 대기 시간 |
| `PROVIDER_URL` | Sepolia public RPC | 백엔드 treasury 지갑이 사용할 RPC URL |
| `TREASURY_PRIVATE_KEY` | 없음 | CDA 매도 시 사용자에게 ETH를 송금할 서버 지갑 private key |

`backend/.env.example`에는 과거 KRW 기반 설정인 `INITIAL_KRW`, `CDA_BASE_PRICE`도 남아 있지만 현재 코드에서는 직접 사용하지 않습니다.

### `frontend/.env`

| 변수 | 설명 |
| --- | --- |
| `VITE_TREASURY_ADDRESS` | 사용자가 CDA를 매수할 때 Sepolia ETH를 보낼 treasury 지갑 주소 |

### `contracts/.env`

| 변수 | 설명 |
| --- | --- |
| `SEPOLIA_RPC_URL` | Sepolia RPC endpoint |
| `PRIVATE_KEY` | 배포자 지갑 private key |
| `ETHERSCAN_API_KEY` | Etherscan 검증용 API key |

### `crawler`

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `BACKEND_URL` | `http://localhost:3001` | 가격 업데이트 API를 호출할 백엔드 주소 |

## 주요 동작

### 인증

1. 프론트엔드가 MetaMask 계정 주소로 `GET /api/auth/nonce/:address`를 호출합니다.
2. 백엔드는 사용자가 없으면 생성하고 nonce를 반환합니다.
3. 사용자가 `Cadena 로그인 인증\nNonce: {nonce}` 메시지에 서명합니다.
4. 프론트엔드가 `POST /api/auth/verify`로 주소와 서명을 보냅니다.
5. 백엔드는 서명을 검증하고 24시간 JWT를 발급합니다.

JWT는 `localStorage`의 `cadana_token`에 저장되며 이후 API 요청의 `Authorization: Bearer ...` 헤더로 전달됩니다.

### 거래

- 매수: 프론트엔드가 사용자의 MetaMask로 `VITE_TREASURY_ADDRESS`에 Sepolia ETH를 전송한 뒤, `POST /api/trade/buy`에 CDA 수량과 `txHash`를 보내 백엔드 CDA 잔액을 증가시킵니다.
- 매도: `POST /api/trade/sell` 호출 시 백엔드가 `TREASURY_PRIVATE_KEY` 지갑으로 사용자 주소에 Sepolia ETH를 송금하고, 성공 후 CDA 잔액을 차감합니다.
- CDA 잔액과 거래 내역은 MongoDB에 저장됩니다. 현재 CDA ERC-20 컨트랙트 잔액과 백엔드 CDA 잔액은 자동으로 동기화되지 않습니다.

### 위치 보상

`POST /api/location/claim`은 위도/경도를 받아 고정 캠퍼스 좌표 `(37.713203, 126.890075)` 반경 500m 이내인지 검사합니다. 성공하면 기본 `100 CDA`를 지급하고, 같은 지갑은 기본 24시간 동안 다시 받을 수 없습니다.

### 가격 엔진

- 백엔드는 `backend/server.js`에서 1분마다 `updatePriceFromNews()`를 실행합니다.
- 뉴스 소스는 보안뉴스 RSS와 보안뉴스 목록 페이지 스크래핑입니다.
- 최신 분석 대상 기사의 제목에서 긍정/부정 키워드를 찾아 감성 점수를 계산합니다.
- 감성 점수는 가격 배수로 변환되고, CDA 가격은 `0.0005 ETH`부터 `0.001 ETH` 사이로 제한됩니다.
- 가격과 분석 결과는 `PriceHistory` 컬렉션에 저장됩니다.

## API

### Auth

| Method | Path | Auth | 설명 |
| --- | --- | --- | --- |
| `GET` | `/api/auth/nonce/:address` | 없음 | 사용자 생성 또는 조회 후 nonce 반환 |
| `POST` | `/api/auth/verify` | 없음 | MetaMask 서명 검증 및 JWT 발급 |
| `GET` | `/api/auth/me` | JWT | 현재 사용자 정보 조회 |

### Trade

| Method | Path | Auth | 설명 |
| --- | --- | --- | --- |
| `POST` | `/api/trade/buy` | JWT | CDA 매수 반영 |
| `POST` | `/api/trade/sell` | JWT | CDA 매도 및 ETH 송금 |
| `GET` | `/api/trade/history` | JWT | 최근 거래 50건 조회 |

매수 body:

```json
{ "cdaAmount": 100, "txHash": "0x..." }
```

매도 body:

```json
{ "cdaAmount": 100 }
```

### Location

| Method | Path | Auth | 설명 |
| --- | --- | --- | --- |
| `POST` | `/api/location/claim` | JWT | 캠퍼스 반경 500m 내 위치 보상 수령 |

```json
{ "latitude": 37.713203, "longitude": 126.890075 }
```

### News

| Method | Path | Auth | 설명 |
| --- | --- | --- | --- |
| `GET` | `/api/news` | 없음 | 최신 보안뉴스 최대 30건 조회 |
| `GET` | `/api/news?date=YYYY-MM-DD` | 없음 | 특정 KST 날짜의 보안뉴스 조회 |
| `GET` | `/api/news/monthly-count?year=YYYY&month=MM` | 없음 | 날짜별 월간 기사 수 조회 |
| `POST` | `/api/news/update-price` | 없음 | 뉴스 기반 가격 업데이트 수동 실행 |

### Price

| Method | Path | Auth | 설명 |
| --- | --- | --- | --- |
| `GET` | `/api/price/current` | 없음 | 현재 CDA/ETH 가격 조회 |
| `GET` | `/api/price/history?limit=30` | 없음 | 가격 히스토리 조회 |
| `POST` | `/api/price/update-from-news` | 없음 | 뉴스 기반 가격 업데이트 수동 실행 |
| `POST` | `/api/price/reset` | 없음 | 가격 히스토리 초기화 후 seed 가격 재생성 |

## 개발 메모

- 프론트엔드 API base URL은 `frontend/src/api/client.js`의 `/api`이며, 개발 중 실제 대상은 `frontend/vite.config.js`의 프록시 설정입니다.
- 백엔드 CORS origin은 현재 `http://localhost:5173`으로 고정되어 있습니다.
- `backend/src/utils/priceScale.js`는 과거 KRW 스케일 가격이 DB에 남아 있어도 ETH 범위로 정규화합니다.
- 매도 기능은 실제 Sepolia ETH 송금을 수행하므로 `TREASURY_PRIVATE_KEY`와 RPC 설정을 주의해서 관리해야 합니다.
