# Setup Guide — CompliAgent AI

Step-by-step instructions to get the entire stack running locally.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org/) |
| pnpm | ≥ 8 | `npm install -g pnpm` |
| npm | ≥ 9 | Ships with Node.js |
| Git | any | [git-scm.com](https://git-scm.com/) |
| MetaMask | browser ext | [metamask.io](https://metamask.io/) (optional, for on-chain interaction) |

## 1. Clone the Repository

```bash
git clone https://github.com/roshaninfordham/CompliagentAi.git
cd CompliagentAi
```

## 2. Environment Variables

### Backend

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
# Required — your wallet private key (with MON testnet tokens)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Optional — defaults shown
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
PORT=3001
```

> **Getting MON testnet tokens:** Visit the [Monad Testnet Faucet](https://faucet.monad.xyz/) and paste your wallet address.

### Contracts (only if redeploying)

```bash
cp contracts/.env.example contracts/.env
```

Edit `contracts/.env`:

```env
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
```

### Frontend

No `.env` file needed — config is in `src/config/monad.ts`.

## 3. Install Dependencies

```bash
# Frontend (from project root)
pnpm install

# Backend
cd backend && npm install && cd ..

# Contracts (only if modifying/redeploying)
cd contracts && npm install && cd ..
```

## 4. Start the Backend

```bash
cd backend
node server.js
```

Expected output:

```
🚀 CompliAgent AI Backend running on port 3001
📋 Endpoints:
  GET  /api/health
  POST /api/agents/create
  GET  /api/agents/:id/balance
  ...
```

The backend will lazy-load the Unlink SDK on the first privacy-related API call. A `wallet.db` file will be created automatically to store the HD seed.

### Verify Backend

```bash
# Health check
curl http://localhost:3001/api/health

# Create a test agent
curl -X POST http://localhost:3001/api/agents/create \
  -H "Content-Type: application/json" \
  -d '{"name": "test-agent", "budget": 500}'
```

## 5. Start the Frontend

```bash
# From project root
pnpm dev
```

Opens at [http://localhost:5173](http://localhost:5173) (or next available port).

## 6. (Optional) Deploy Your Own Contracts

The default config points to already-deployed contracts on Monad Testnet. If you want to deploy fresh copies:

```bash
cd contracts

# Compile
npx hardhat compile

# Deploy (uses PRIVATE_KEY from .env)
npx hardhat run scripts/deploy.js --network monad

# Update addresses in:
#   - backend/config.js
#   - src/config/monad.ts
```

Current deployed addresses:

| Contract | Address |
|----------|---------|
| MockUSDC | `0x18c945c79f85f994A10356Aa4945371Ec4cD75D4` |
| ComplianceRegistry V2 | `0xC37a8f0ca860914BfAce8361Bf0621EAEa14863F` |
| BudgetVault | `0x56e8C1ED242396645376A92e6b7c6ECd2d871DD5` |
| AffiliateSettler | `0x9284cB50d7b7678be61F11A7688DC768f0E02A89` |

---

## Troubleshooting

### `Error [ERR_REQUIRE_ESM]` when starting backend

**Cause:** `@unlink-xyz/core` is ESM-only but the backend uses CommonJS.

**Solution:** This is already handled — the backend uses dynamic `import()` to load the Unlink SDK. If you see this error, make sure you're running `node server.js` directly (not through a bundler that forces CJS).

### `wallet.db` errors or "seed already exists"

**Cause:** Stale or corrupt SQLite database from a previous failed initialization.

**Solution:**
```bash
cd backend
rm wallet.db wallet.db-journal
node server.js
```
The SDK will create a fresh seed on next init.

### `JsonRpcProvider failed to detect network` spam

**Cause:** Unlink SDK trying to sync with a non-responsive RPC.

**Solution:** Ensure `sync: false` is set in the Unlink SDK config (already configured in `unlink-service.js`).

### Backend starts but API calls fail

**Cause:** Unlink SDK hasn't initialized yet (lazy loading).

**Solution:** The first API call to a privacy endpoint triggers initialization, which can take 2-3 seconds. Wait for it to complete. Subsequent calls are instant.

### Frontend shows "failed to fetch" errors

**Cause:** Backend not running or CORS issues.

**Solution:**
1. Make sure the backend is running on port 3001
2. Check that `server.js` has CORS enabled (it does by default)
3. Check browser console for specific error messages

### MetaMask "wrong network" warning

**Solution:** Add Monad Testnet to MetaMask:
- Network Name: `Monad Testnet`
- RPC URL: `https://testnet-rpc.monad.xyz`
- Chain ID: `10143`
- Currency Symbol: `MON`
- Explorer: `https://testnet.monadexplorer.com`

### Contract transactions revert

**Cause:** Likely insufficient MON for gas, or calling a function without the required role.

**Solution:**
1. Get testnet MON from the faucet
2. Check you're using the correct deployer wallet (only the owner can call admin functions)
3. For `ComplianceRegistry`: only the owner can call `stampCompliance` and `batchStamp`
4. For `BudgetVault`: only the owner can `allocateToAgent`
