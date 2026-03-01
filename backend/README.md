# Backend — Express API Server

The backend is the **brain of CompliAgent** — it bridges the React dashboard, the Monad blockchain, and the Unlink privacy SDK.

## Architecture

```
backend/
├── server.js                 ← Express app entry point (port 3001)
├── unlink-service.js          ← Unlink SDK lazy singleton (ESM dynamic import)
├── compliance-engine.js       ← Rule engine + payment processor
├── monad-provider.js          ← Monad RPC provider (rate-limited singleton)
├── rate-limiter.js            ← Token bucket rate limiter (25 req/sec)
├── privacy-helpers.js         ← ZK proof stamping + data redaction
├── config/
│   └── monad.js               ← Monad testnet configuration
├── routes/
│   ├── agents.js              ← Agent burner wallet routes
│   ├── funding.js             ← Privacy pool funding routes
│   └── payments.js            ← Agent payment routes
└── scripts/
    └── create-agent-wallets.js ← Wallet generation utility
```

## How Requests Flow

```
Client Request
      │
      ▼
┌─────────────┐
│  server.js   │  Express middleware: cors, json parsing
│  (port 3001) │
└──────┬───────┘
       │
       ├── /api/agents/*     → routes/agents.js     → unlink-service.js (burner derivation)
       ├── /api/funding/*    → routes/funding.js     → unlink-service.js (pool ↔ burner)
       ├── /api/payments/*   → routes/payments.js    → unlink-service.js (burner.send)
       ├── /api/compliance/* → compliance-engine.js  → rule checks + Unlink payment
       ├── /api/monad/*      → monad-provider.js     → Monad testnet RPC
       ├── /api/privacy/*    → privacy-helpers.js    → ZK stamp on ComplianceRegistry
       └── /api/admin/*      → in-memory rules       → allowlist + budget management
```

## File-by-File Guide

### `server.js` — Express Application

The main Express server with 15+ endpoints. Key responsibilities:

- **Mounts route modules** for agents, funding, and payments
- **Compliance processing** endpoint (`POST /api/compliance/process`)
- **Admin routes** for allowlist and budget management
- **Monad RPC proxy** routes for status, balance, block number
- **Privacy routes** for stamping ZK proofs and formatting transactions
- **Contract discovery** endpoint for frontend

**Startup sequence:**
1. Connect to Monad testnet RPC
2. Log connection status (chain ID, block number, latency)
3. Log wallet balance
4. Listen on port 3001

> Note: The Unlink SDK is NOT initialized at startup — it lazy-loads on first privacy route call. This keeps the server starting instantly even if the Unlink gateway is slow.

### `unlink-service.js` — Unlink SDK Singleton

Manages the Unlink SDK lifecycle with these key features:

1. **Dynamic ESM import** — `@unlink-xyz/node` is ESM-only, but our backend is CommonJS. We use `await import()` to bridge the gap.
2. **Lazy initialization** — SDK only loads when a route first calls `getUnlink()`.
3. **Promise deduplication** — if 5 requests hit `/api/agents/create` simultaneously, only one `initUnlink()` call runs; all 5 await the same promise.
4. **Auto seed/account creation** — `setup: true` creates the master seed and first account automatically.

```
First call to getUnlink():
  1. Dynamic import("@unlink-xyz/node")
  2. initUnlink({ chain: "monad-testnet", storage: sqlite })
  3. Verify seed exists (create if not)
  4. Verify account exists (create if not)
  5. Cache instance → all subsequent calls return immediately
```

### `compliance-engine.js` — Rule Engine

The compliance engine checks every payment against three rules:

| Rule | What it checks | Threshold |
|------|---------------|-----------|
| `VENDOR_ALLOWLIST` | Is the vendor address in the allowlist? | Set dynamically |
| `MAX_TRANSACTION` | Is the amount under the max? | 1,000 USDC |
| `BUDGET_CHECK` | Does the agent have sufficient balance? | Per-agent budget |

The `processAgentPayment()` flow:
1. Run all compliance checks
2. Build ERC-20 `transfer()` calldata
3. Execute via `unlink.burner.send()` (privacy-preserving)
4. Generate ZK proof hash: `keccak256(agentIndex, vendor, amount, timestamp)`
5. Return proof + tx hash for on-chain stamping

### `monad-provider.js` — Monad RPC Provider

Singleton `ethers.JsonRpcProvider` for Monad testnet. Key features:

- **Rate-limited** — wrapped with token bucket (25 req/sec) to respect public RPC limits
- **Health check** — `checkConnection()` returns latency, chain ID, block number
- **Balance lookup** — formats native MON balance from wei

### `rate-limiter.js` — Token Bucket

Sliding-window token bucket that limits Monad RPC calls to 25/second:

```
Request arrives → acquireToken() → token available?
  ├── YES → execute immediately
  └── NO  → wait (1000ms / capacity) → retry
```

The `wrapProviderWithRateLimit()` function monkey-patches the ethers provider's `send()` method to automatically throttle all RPC calls.

### `privacy-helpers.js` — ZK Proof Helpers

Handles the privacy-sensitive parts of the system:

| Function | What it does |
|----------|-------------|
| `stampShieldedPayment()` | Generates proof hash from private data, stamps on ComplianceRegistry |
| `batchStampPayments()` | Stamps multiple payments in one transaction (up to 50) |
| `formatPrivateTransaction()` | Strips sensitive data: amounts → "****", senders → "🔒 Shielded" |
| `formatPublicTransaction()` | Passes through all data for non-shielded transactions |

### `config/monad.js` — Configuration

Central configuration for Monad testnet:

```javascript
{
  chainId: 10143,
  rpcUrl: "https://testnet-rpc.monad.xyz",
  explorerUrl: "https://testnet.monadexplorer.com",
  blockTimeMs: 400,
  walletAddress: "0xA27bad84EDc13cd12f9740FC1a1de24e8904B406",
  contracts: {
    complianceRegistry: "0xC37a...",
    budgetVault: "0x56e8...",
    mockUSDC: "0x18c9...",
    affiliateSettler: "0x9284...",
  }
}
```

### `routes/agents.js` — Agent Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/agents/create` | POST | Derive burner address via Unlink `addressOf(index)` |
| `/api/agents/:index/balance` | GET | Get MON + USDC balance via Monad RPC (not Unlink gateway) |

> **Design note**: Balance lookups use our own Monad RPC provider rather than the Unlink gateway. This avoids 404 errors and is faster since we control the rate limiting.

### `routes/funding.js` — Privacy Pool Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/funding/fund-agent` | POST | Move tokens from private pool → burner wallet |
| `/api/funding/sweep-back` | POST | Return unused funds from burner → private pool |

### `routes/payments.js` — Payment Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/payments/agent-pay` | POST | Send ABI-encoded transaction from burner to vendor |

## Dependencies

| Package | Purpose |
|---------|---------|
| `express` | HTTP server framework |
| `cors` | Cross-origin resource sharing |
| `ethers` | Ethereum/Monad blockchain interaction |
| `@unlink-xyz/node` | Unlink SDK for privacy (burners, ZK proofs) |
| `@unlink-xyz/core` | Core cryptographic primitives (peer dep of node) |
| `better-sqlite3` | SQLite storage for Unlink wallet (via SDK) |

## Running

```bash
cd backend
npm install
node server.js
# Output:
# Monad Testnet: connected | Chain 10143 | Block #15957777 | 74ms
# Wallet 0xA27b...: 149.98 MON
# CompliAgent backend running on :3001
```
