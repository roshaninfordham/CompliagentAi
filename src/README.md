# Frontend — React Dashboard

The frontend is the **CFO's view** — a real-time compliance dashboard showing agent activity, on-chain data, compliance status, and privacy-preserving transaction feeds.

## Architecture

```
src/
├── main.tsx                      ← Entry point (UnlinkProvider + React root)
├── config/
│   └── monad.ts                  ← Monad testnet config (mirrors backend)
├── hooks/
│   ├── useCompliAgent.js         ← Unlink SDK React hook (deposit, send, withdraw)
│   └── useMonadContracts.js      ← On-chain event subscriptions + contract reads
├── utils/
│   └── explorer.ts               ← Monad explorer URL helpers
├── app/
│   ├── App.tsx                   ← Root component (RouterProvider)
│   ├── routes.tsx                ← Route definitions (6 pages)
│   └── components/
│       ├── Layout.tsx            ← App shell (sidebar + topbar + outlet)
│       ├── Dashboard.tsx         ← Main dashboard (714 lines)
│       ├── AgentManager.tsx      ← Agent CRUD & monitoring
│       ├── ComplianceRules.tsx   ← Rule editor & vendor allowlist
│       ├── AuditReports.tsx      ← ZK proof viewer & report cards
│       ├── TransactionFeed.tsx   ← Live tx feed with privacy badges
│       ├── AgentDemo.tsx         ← Interactive step-by-step demo
│       ├── mock-data.ts          ← TypeScript interfaces + sample data
│       ├── figma/
│       │   └── ImageWithFallback.tsx
│       └── ui/                   ← 48 shadcn/ui components
└── styles/
    ├── index.css                 ← Master import
    ├── fonts.css                 ← Inter + Roboto Mono
    ├── tailwind.css              ← Tailwind v4 directives
    └── theme.css                 ← Design tokens (#7C3AED purple)
```

## Page Routes

```
/                  → Dashboard        Main dashboard with live chain data
/agents            → AgentManager     Create and monitor AI agents
/rules             → ComplianceRules  Configure compliance rules
/audit             → AuditReports     View audit reports + ZK proofs  
/transactions      → TransactionFeed  Live transaction feed
/demo              → AgentDemo        Interactive demo simulator
```

All routes are wrapped in `Layout.tsx` which provides the sidebar navigation and top bar.

## Component Guide

### Layout.tsx — App Shell

The persistent wrapper for all pages:

```
┌─────────┬──────────────────────────────────┐
│         │  Top Bar                          │
│ Sidebar │  (Page title, notifications)      │
│         ├──────────────────────────────────┤
│ • Home  │                                   │
│ • Agents│  <Outlet />                       │
│ • Rules │  (Page content renders here)      │
│ • Audit │                                   │
│ • Txs   │                                   │
│ • Demo  │                                   │
│         │                                   │
│ Status: │                                   │
│ ● Monad │                                   │
│  online │                                   │
└─────────┴──────────────────────────────────┘
```

### Dashboard.tsx — Main Dashboard (714 lines)

The primary view with multiple data panels:

| Section | Data Source | Description |
|---------|------------|-------------|
| Stats Grid | Mock data + on-chain | Active agents, compliance rate, budget, avg settlement |
| Live Block | `useMonadContracts` | Animated green pulse, 2s polling from Monad RPC |
| Events Feed | `useMonadContracts` | Real-time ComplianceStamped + Budget events |
| Compliance Rules | `useMonadContracts` | 5 on-chain rules with active/disabled badges |
| Transaction Table | Mock data | Tx hashes link to Monad explorer |
| Agent Sidebar | Mock data | Status indicators (active/idle/under review) |
| Private Pool | `useCompliAgent` | Unlink shielded balance + deposit button |
| Quick Actions | UI actions | Deploy Agent, Generate Audit, View Settlement |

### AgentDemo.tsx — Interactive Demo (501 lines)

Two demo flows that animate step-by-step:

**Flow 1: x402 Agent Purchase**
1. Agent receives API request requiring payment
2. Compliance engine checks rules
3. Funds drawn from Unlink privacy pool
4. Payment goes through burner wallet (unlinkable!)
5. Vendor receives payment
6. Compliance stamp on-chain

**Flow 2: Affiliate Commission Split**
1. Payment triggers affiliate program
2. AffiliateSettler splits: 95% vendor / 5% affiliate
3. Both transfers in one transaction

### AgentManager.tsx — Agent Management (295 lines)

- Search and filter agents by name/status
- Agent cards showing wallet addresses, budgets, compliance score
- Detail panel with full agent history
- Status badges: Active (green), Idle (gray), Under Review (yellow)

### ComplianceRules.tsx — Rule Editor (263 lines)

- Tabbed interface: Rules | Vendor Allowlist
- Rule cards with enable/disable toggles
- Add/remove vendors from allowlist
- Shows rule types: budget_cap, vendor_allowlist, aml_threshold, rate_limit

### AuditReports.tsx — Audit Reports (272 lines)

- Report cards with pass rates and compliance scores
- ZK proof generation simulation (animated)
- Proof hash modal with explorer links to Monad testnet
- Date range and status filters

### TransactionFeed.tsx — Live Transaction Feed (338 lines)

- Auto-simulated incoming transactions (with toast notifications)
- Privacy badges: "Shielded" (purple) vs "Public" (blue)
- Search by tx hash, agent name, vendor
- Transaction detail modal with full metadata
- Filter by status: completed, pending, flagged

## Custom Hooks

### `useCompliAgent.js` — Unlink SDK Hook

Wraps `@unlink-xyz/react`'s `useUnlink()` hook for enterprise wallet operations:

```javascript
const {
  isReady,           // SDK loaded and wallet initialized
  shieldedBalance,   // Current balance in Unlink privacy pool
  initializeEnterprise,  // Create wallet + mnemonic
  depositToPool,         // CFO deposits tokens into private pool
  privateSend,           // Send from pool (internal transfer)
  withdrawToPublic,      // Withdraw from pool to public address
} = useCompliAgent();
```

### `useMonadContracts.js` — On-Chain Hook

Subscribes to smart contract events and provides read helpers:

```javascript
const {
  onChainEvents,       // Array of real-time events from contracts
  availableBudget,     // BudgetVault unallocated funds

  // Read functions
  getAgentUtilization, // → { allocated, spent, remaining, active }
  checkCompliance,     // → boolean (is tx stamped?)
  getComplianceStamp,  // → { proofHash, timestamp, stamped }
  getComplianceRules,  // → [{ name, ruleType, value, enabled }]
  getTotalStamped,     // → number (total stamps)
} = useMonadContracts();
```

**Subscribed Events:**
- `ComplianceStamped(txHash, proofHash, timestamp)` — from ComplianceRegistry
- `BatchStamped(txHashes, proofHashes, timestamp)` — batch stamps
- `BudgetDeposited(amount, totalBudget)` — from BudgetVault
- `BudgetAllocated(agent, amount)` — agent budget allocation
- `PaymentExecuted(agent, vendor, amount)` — agent payment

## Styling

### Design System

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#7C3AED` (purple) | Buttons, active states, links |
| Background | `oklch(1 0 0)` light / `oklch(0.145 0 0)` dark | Page background |
| Card | `oklch(1 0 0)` light / `oklch(0.205 0 0)` dark | Card backgrounds |
| Font | Inter 400-700 | Body text |
| Mono | Roboto Mono 400-500 | Code, addresses, hashes |
| Border radius | `0.625rem` | Default corner rounding |

### CSS Architecture

```
styles/index.css
  → @import fonts.css     (Google Fonts: Inter + Roboto Mono)
  → @import tailwind.css  (Tailwind v4 directives + tw-animate-css)
  → @import theme.css     (CSS custom properties for light/dark themes)
```

### UI Components

48 shadcn/ui components based on Radix UI primitives. All are in `src/app/components/ui/` and follow the same pattern:

- Headless (Radix provides accessibility, you style with Tailwind)
- Composable (e.g. `<Card><CardHeader><CardTitle>`)
- Dark mode compatible via CSS custom properties

## Configuration

### `config/monad.ts`

Frontend mirror of the backend config:

```typescript
export const MONAD_CONFIG = {
  chainId: 10143,
  rpcUrl: "https://testnet-rpc.monad.xyz",
  explorerUrl: "https://testnet.monadexplorer.com",
  contracts: {
    complianceRegistry: "0xC37a...",
    budgetVault: "0x56e8...",
    mockUSDC: "0x18c9...",
    affiliateSettler: "0x9284...",
  }
};
```

### `utils/explorer.ts`

URL helpers for linking to Monad explorer:

```typescript
getExplorerUrl(txHash)      // → "https://testnet.monadexplorer.com/tx/0x..."
getAddressExplorerUrl(addr) // → "https://testnet.monadexplorer.com/address/0x..."
getBlockExplorerUrl(num)    // → "https://testnet.monadexplorer.com/block/123"
```

## Running

```bash
# From project root
pnpm install
pnpm dev
# → http://localhost:5173
```

The frontend expects the backend at `http://localhost:3001` for API calls. Run the backend first (see `backend/README.md`).
