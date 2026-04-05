# ⬡ Blockchain-Based Crowdsourcing Annotation Platform

A production-ready, research-grade decentralized annotation system built on Ethereum (Sepolia testnet). Every annotation is anchored to an immutable on-chain transaction, inter-annotator agreement is measured via Fleiss' Kappa, and ETH rewards are distributed transparently through smart contracts.

---

## 🎯 What This System Solves

| Problem | Solution |
|---|---|
| Data tampering | Annotations stored on-chain (immutable) |
| No audit trail | Every annotation has a Sepolia tx hash |
| Unfair rewards | Smart contract distributes ETH automatically |
| Quality uncertainty | Fleiss' Kappa + expert ground-truth comparison |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (React + Vite → Vercel)                           │
│  Task browser · Annotation UI · Dashboard · Tx history      │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API (JWT)
┌──────────────────────▼──────────────────────────────────────┐
│  BACKEND (FastAPI → Render/Railway)                         │
│  Auth · Task mgmt · Kappa engine · Web3.py signer           │
└────────┬──────────────────────────────┬─────────────────────┘
         │                              │
┌────────▼────────┐          ┌──────────▼──────────────────────┐
│  PostgreSQL      │          │  Ethereum Sepolia Testnet        │
│  (Neon/Supabase) │          │  AnnotationPlatform.sol          │
│  Users · Tasks   │          │  submitAnnotation()              │
│  Annotations     │          │  payReward()                     │
│  Kappa scores    │          │  createTask()                    │
└─────────────────┘          └─────────────────────────────────┘
```

---

## 📁 Project Structure

```
blockchain-annotation-platform/
├── contracts/                    # Hardhat + Solidity
│   ├── contracts/
│   │   └── AnnotationPlatform.sol
│   ├── scripts/
│   │   ├── deploy.js
│   │   └── fund.js
│   ├── test/
│   │   └── annotation.test.js
│   ├── hardhat.config.js
│   ├── package.json
│   └── .env.example
│
├── backend/                      # FastAPI (Python)
│   ├── app/
│   │   ├── main.py               # App entry + CORS
│   │   ├── config.py             # Pydantic settings
│   │   ├── database.py           # SQLAlchemy engine
│   │   ├── models.py             # DB models
│   │   ├── schemas.py            # Pydantic schemas
│   │   ├── auth.py               # JWT auth
│   │   ├── abi/                  # Contract ABI (copy after deploy)
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── tasks.py
│   │   │   ├── annotations.py
│   │   │   ├── rewards.py
│   │   │   └── analytics.py
│   │   └── services/
│   │       ├── blockchain.py     # Web3.py interaction
│   │       ├── kappa.py          # Fleiss' Kappa implementation
│   │       └── export.py         # CSV/JSON research export
│   ├── alembic/                  # DB migrations
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/                     # React + Vite
    ├── src/
    │   ├── App.jsx
    │   ├── index.css
    │   ├── main.jsx
    │   ├── api/
    │   │   └── client.js
    │   ├── components/
    │   │   ├── Nav.jsx
    │   │   ├── AgreementChart.jsx
    │   │   └── TxHistory.jsx
    │   └── pages/
    │       ├── Home.jsx
    │       ├── Login.jsx
    │       ├── Register.jsx
    │       ├── Tasks.jsx
    │       ├── Annotate.jsx
    │       └── Dashboard.jsx
    ├── package.json
    ├── vite.config.js
    └── .env.example
```

---

## 🚀 Quick Start (Full Deployment)

### Prerequisites
- Node.js 18+
- Python 3.11+
- An [Infura](https://infura.io) or [Alchemy](https://alchemy.com) account (free)
- A funded Sepolia wallet ([faucet](https://sepoliafaucet.com))
- PostgreSQL (use [Neon.tech](https://neon.tech) free tier)

---

### Step 1 — Deploy Smart Contract

```bash
cd contracts
npm install
cp .env.example .env
# Edit .env: add INFURA_SEPOLIA_URL and DEPLOYER_PRIVATE_KEY

npx hardhat compile
npx hardhat test                          # run tests first
npx hardhat run scripts/deploy.js --network sepolia
# → Note the deployed contract address

# Copy ABI to backend
cp artifacts/contracts/AnnotationPlatform.sol/AnnotationPlatform.json \
   ../backend/app/abi/AnnotationPlatform.json
```

---

### Step 2 — Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your values (see Environment Variables section below)

# Run DB migrations
alembic upgrade head

# Start locally
uvicorn app.main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

---

### Step 3 — Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:8000 for local dev

npm run dev
# → http://localhost:5173
```

---

### Step 4 — Cloud Deployment

#### Backend → Render
1. Push `backend/` to GitHub
2. New **Web Service** on [render.com](https://render.com)
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add all environment variables from `.env`

#### Frontend → Vercel
1. Push `frontend/` to GitHub
2. Import to [vercel.com](https://vercel.com)
3. Add env var: `VITE_API_URL=https://your-backend.onrender.com`
4. Deploy

#### Database → Neon
1. Create project at [neon.tech](https://neon.tech)
2. Copy connection string → `DATABASE_URL` in backend env

---

## 🔑 Environment Variables

### `contracts/.env`
| Variable | Description |
|---|---|
| `INFURA_SEPOLIA_URL` | `https://sepolia.infura.io/v3/YOUR_KEY` |
| `DEPLOYER_PRIVATE_KEY` | `0x...` Ethereum wallet private key |
| `ETHERSCAN_API_KEY` | For contract verification (optional) |

### `backend/.env`
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT secret (`openssl rand -hex 32`) |
| `WEB3_PROVIDER_URL` | Same Infura/Alchemy Sepolia URL |
| `CONTRACT_ADDRESS` | Deployed contract address from Step 1 |
| `DEPLOYER_PRIVATE_KEY` | Same wallet — backend signs all txns |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Default: 60 |

### `frontend/.env`
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL (no trailing slash) |

---

## 📊 Research Workflow

```
1. Admin creates task + uploads data items (with expert labels)
2. Admin funds smart contract with ETH
3. Annotators register, provide wallet address
4. Annotators label items → each triggers on-chain submitAnnotation()
5. Admin computes Fleiss' Kappa (POST /analytics/kappa/{task_id})
6. Admin pays rewards (POST /rewards/pay/{annotation_id})
   → ETH sent directly to annotator wallets via smart contract
7. Export results for paper:
   GET /analytics/export/{task_id}        → JSON
   GET /analytics/export/{task_id}/csv    → CSV
```

---

## 📐 Fleiss' Kappa Interpretation

| κ value | Interpretation |
|---|---|
| < 0.00 | Less than chance agreement |
| 0.01 – 0.20 | Slight |
| 0.21 – 0.40 | Fair |
| 0.41 – 0.60 | Moderate |
| 0.61 – 0.80 | Substantial |
| 0.81 – 1.00 | Almost perfect |

---

## 🔐 Security Notes

- Private keys live **only** in backend environment variables — never sent to frontend
- All blockchain transactions are signed server-side
- `submitAnnotation()` prevents duplicate annotations on-chain (per annotator per item)
- Role-based access: admin endpoints require `role=admin` JWT claim
- CORS restricted to your Vercel domain

---

## 🧪 Running Tests

```bash
cd contracts
npx hardhat test
```

Tests cover:
- Task creation
- Annotation submission + event emission
- Duplicate annotation prevention
- Reward payment + balance verification
- Annotator stats tracking

---

## 📦 Key Dependencies

### Contracts
- `hardhat` — development environment
- `@nomicfoundation/hardhat-toolbox` — testing + verification

### Backend
- `fastapi` — REST API framework
- `web3` — Ethereum interaction
- `sqlalchemy` + `alembic` — ORM + migrations
- `numpy` / `scipy` — Fleiss' Kappa computation
- `python-jose` — JWT authentication
- `passlib` — password hashing

### Frontend
- `react` + `react-router-dom` — UI + routing
- `vite` — build tool

---

## 📄 API Reference (Key Endpoints)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register user |
| POST | `/auth/token` | — | Login → JWT |
| GET | `/tasks/` | User | List active tasks |
| POST | `/tasks/` | Admin | Create task (on-chain) |
| POST | `/tasks/{id}/items` | Admin | Add data items |
| POST | `/tasks/{id}/fund` | Admin | Fund contract |
| POST | `/annotations/` | User | Submit annotation (on-chain) |
| GET | `/annotations/mine` | User | My annotation history |
| POST | `/analytics/kappa/{id}` | Admin | Compute Fleiss' Kappa |
| POST | `/rewards/pay/{id}` | Admin | Pay ETH reward |
| GET | `/analytics/export/{id}` | Admin | JSON export |
| GET | `/analytics/export/{id}/csv` | Admin | CSV export |

---

## 📖 Citing This System

If you use this platform in academic research, please cite the on-chain contract address and include the Sepolia Etherscan link for full auditability. Every annotation in your dataset has a verifiable `tx_hash` that can be independently confirmed.

---

## License

MIT
