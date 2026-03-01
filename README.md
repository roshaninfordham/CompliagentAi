# CompliAgent

**Institutional-Grade Compliance Dashboard for AI Agents on Monad**

CompliAgent is a privacy-first compliance layer for autonomous AI agents that execute on-chain financial transactions. It enforces enterprise compliance rules (budget caps, vendor allowlists, AML thresholds, rate limits) while preserving transaction privacy via the Unlink SDK's zero-knowledge primitives (burner accounts, shielded transfers, unlinkable payments), all settled on Monad's high-performance L1.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Available Scripts](#available-scripts)
6. [Pages & Routes](#pages--routes)
7. [Design System](#design-system)
8. [Mock Data & How to Replace with Real APIs](#mock-data--how-to-replace-with-real-apis)
9. [Integration Roadmap](#integration-roadmap)
10. [Key Concepts](#key-concepts)
11. [Environment Variables (Future)](#environment-variables-future)
12. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
                                 CompliAgent Architecture
                                 
 +------------------+     HTTP 402     +-------------------+
 |   AI Agent       | <-------------> |  Paywalled API     |
 |   (Autonomous)   |                 |  (Resource Server) |
 +--------+---------+                 +-------------------+
          |
          | x402 payment required
          v
 +------------------+     Compliance    +-------------------+
 |   CompliAgent    | <-- Rules ------> |  Rule Engine       |
 |   Middleware      |                  |  (Budget/AML/Vendor)|
 +--------+---------+                  +-------------------+
          |
          | ZK Compliance Stamp
          v
 +------------------+     Shielded     +-------------------+
 |   Unlink SDK     | <-- Transfer --> |  Monad L1          |
 |   (Privacy)      |                  |  (Settlement)      |
 +------------------+                  +-------------------+
```

**Core Flow (x402 Agent Purchase):**
1. AI agent makes HTTP request to paywalled resource
2. Server responds with HTTP 402 + payment requirements (x402 protocol)
3. CompliAgent intercepts, validates against compliance rules
4. Unlink SDK generates ZK compliance stamp (proof of compliance without identity exposure)
5. Shielded transfer settles on Monad (~800ms finality)
6. Agent retries request with payment receipt, receives data

**Affiliate Flow (3-Party Commission Split):**
1. Buyer initiates purchase via x402
2. CompliAgent validates all three parties + commission structure
3. ZK proof verifies `affiliate_share + merchant_share = total` without revealing individual values
4. Shielded transfers to both parties settle on Monad

---

## Tech Stack

| Layer        | Technology                      | Version   | Purpose                                    |
|------------- |---------------------------------|-----------|-------------------------------------------|
| Framework    | React                           | 18.3.1    | UI component library                       |
| Routing      | React Router (Data mode)        | 7.13.0    | Client-side routing with `RouterProvider`  |
| Styling      | Tailwind CSS v4                 | 4.1.12    | Utility-first CSS framework               |
| Build Tool   | Vite                            | 6.3.5     | Dev server + production bundler            |
| Icons        | Lucide React                    | 0.487.0   | Icon library (used throughout)             |
| Toasts       | Sonner                          | 2.0.3     | Toast notification system                  |
| Animation    | Motion                          | 12.23.24  | Animation library (available, not yet used)|
| UI Primitives| Radix UI                        | various   | Headless accessible components (available) |
| Package Mgr  | pnpm                            | -         | Fast, disk-space efficient package manager |

**Future integrations (not yet wired):**
- Unlink SDK - Privacy primitives (burner accounts, shielded transfers)
- Monad RPC - On-chain settlement and block data
- ethers.js / viem - Ethereum-compatible wallet interactions

---

## Project Structure

```
/
├── package.json                    # Dependencies & scripts
├── vite.config.ts                  # Vite build configuration (path aliases, plugins)
├── postcss.config.mjs              # PostCSS config (empty - Tailwind v4 handles it)
├── README.md                       # <-- You are here
│
├── src/
│   ├── styles/
│   │   ├── index.css               # Master CSS entry (imports fonts, tailwind, theme)
│   │   ├── fonts.css               # Google Fonts imports (Inter + Roboto Mono)
│   │   ├── tailwind.css            # Tailwind v4 directives + animation plugin
│   │   └── theme.css               # Design tokens (colors, radii, typography)
│   │
│   ├── imports/
│   │   ├── compliagent-blueprint.md  # Full architecture blueprint (reference doc)
│   │   └── compliagent-dashboard.md  # Dashboard UI specification (reference doc)
│   │
│   └── app/
│       ├── App.tsx                 # Root component (RouterProvider)
│       ├── routes.tsx              # Route definitions (all 6 pages)
│       │
│       └── components/
│           ├── Layout.tsx          # Sidebar + top bar + Sonner Toaster
│           ├── Dashboard.tsx       # Dashboard Overview page (/)
│           ├── AgentDemo.tsx       # Live Demo simulation (/demo)
│           ├── AgentManager.tsx    # Agent Manager page (/agents)
│           ├── ComplianceRules.tsx # Compliance Rules page (/rules)
│           ├── AuditReports.tsx    # Audit Reports page (/audit)
│           ├── TransactionFeed.tsx # Transaction Feed page (/transactions)
│           ├── mock-data.ts        # All mock data + TypeScript interfaces
│           ├── ui/                 # shadcn/ui component library (pre-installed)
│           └── figma/              # Figma-specific utilities (ImageWithFallback)
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **pnpm** (recommended) or npm/yarn

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd compliagent

# 2. Install dependencies
pnpm install
# or: npm install
# or: yarn install

# 3. Start the dev server
pnpm dev
# or: npx vite

# 4. Open in browser
# Navigate to http://localhost:5173
```

### Production Build

```bash
pnpm build
# Output goes to /dist
```

---

## Available Scripts

| Script        | Command         | Description                               |
|--------------|-----------------|-------------------------------------------|
| `build`      | `vite build`    | Create production bundle in `/dist`       |

> **Note:** You may need to add a `"dev"` script to `package.json`:
> ```json
> "scripts": {
>   "dev": "vite",
>   "build": "vite build",
>   "preview": "vite preview"
> }
> ```

---

## Pages & Routes

All routes are defined in `/src/app/routes.tsx` using React Router's Data mode pattern (`createBrowserRouter` + `RouterProvider`).

| Route            | Component            | File                          | Description                                                                                                   |
|-----------------|----------------------|-------------------------------|---------------------------------------------------------------------------------------------------------------|
| `/`             | `Dashboard`          | `Dashboard.tsx`               | Overview with stat cards (active agents, transactions, compliance rate, budget), live transaction feed, agent status sidebar, budget utilization bar, quick action buttons |
| `/demo`         | `AgentDemo`          | `AgentDemo.tsx`               | **Hackathon killer feature** - animated step-by-step simulation of Flow 1 (x402 agent purchase) and Flow 2 (affiliate 3-party settlement) with mock ZK proof generation and Monad settlement |
| `/agents`       | `AgentManager`       | `AgentManager.tsx`            | Searchable/filterable agent table with budget progress bars, status badges, compliance indicators, and detail modal with pause/activate controls |
| `/rules`        | `ComplianceRules`    | `ComplianceRules.tsx`         | Two tabs: (1) Toggle-able compliance rules list with type badges, (2) Vendor allowlist CRUD. Add rule modal for new rules |
| `/audit`        | `AuditReports`       | `AuditReports.tsx`            | ZK-verified audit report generation with loading state, summary cards (pass rate, total verified, rejected, shielded %), selective disclosure notice, report list with proof detail modal |
| `/transactions` | `TransactionFeed`    | `TransactionFeed.tsx`         | Live-updating feed (new mock tx every 5s), searchable, filterable by status, detail modal showing ZK proof hash, block number, shielded/public indicator |

### Layout Structure

All pages render inside `Layout.tsx` which provides:
- **Left sidebar** (260px): Logo, navigation links, Monad connection status indicator
- **Top bar**: Dynamic page title, breadcrumb, notification bell (3 unread), settings icon, user avatar
- **Main content area**: Scrollable, 24px padding, renders `<Outlet />` from React Router
- **Toast container**: Sonner `<Toaster>` at bottom-right for notifications

---

## Design System

### Colors

| Token               | Value       | Usage                                    |
|---------------------|-------------|------------------------------------------|
| `--primary`         | `#7C3AED`   | Purple accent - buttons, badges, icons   |
| `--background`      | `#f8f9fc`   | Page background                          |
| `--foreground`      | `#1a1a2e`   | Primary text                             |
| `--card`            | `#ffffff`   | Card/panel backgrounds                   |
| `--muted`           | `#f1f1f5`   | Muted backgrounds                        |
| `--muted-foreground`| `#6b7280`   | Secondary text                           |
| `--border`          | `rgba(0,0,0,0.08)` | Subtle borders                  |
| `--destructive`     | `#ef4444`   | Error/rejection states                   |

### Fonts

| Font           | Usage                          | Import                                |
|---------------|--------------------------------|---------------------------------------|
| Inter          | Body text, headings, labels    | Google Fonts (via `fonts.css`)        |
| Roboto Mono    | Code, hashes, numbers, labels  | Google Fonts (via `fonts.css`)        |

Fonts are applied inline via `style={{ fontFamily: "'Roboto Mono', monospace" }}` for monospace elements.

### Badge System

| Badge Type       | States                      | Visual                                 |
|-----------------|-----------------------------|-----------------------------------------|
| Compliance       | compliant / rejected / pending | Green / Red / Amber dot + text       |
| Privacy          | shielded / public            | Purple EyeOff / Gray Eye icon + text  |
| Agent Status     | active / paused / inactive   | Green / Amber / Gray dot + text       |
| Compliance Status| compliant / flagged / pending | Green / Red / Amber shield icon       |

---

## Mock Data & How to Replace with Real APIs

All mock data lives in `/src/app/components/mock-data.ts`. It exports:

### TypeScript Interfaces

```typescript
Agent         // AI agent with wallet, budget, status, compliance
Transaction   // On-chain transaction with ZK proof, shielded flag
ComplianceRule // Compliance rule with type, value, toggle state
AuditReport   // ZK-verified audit report with proof hash
```

### Exported Data

| Export            | Type               | Count | Description                                |
|------------------|--------------------|-------|--------------------------------------------|
| `agents`         | `Agent[]`          | 8     | Agent roster with varied statuses/budgets  |
| `transactions`   | `Transaction[]`    | 10    | Mix of compliant, rejected, pending txns   |
| `complianceRules`| `ComplianceRule[]` | 6     | Budget, vendor, AML, rate limit rules      |
| `auditReports`   | `AuditReport[]`    | 3     | Historical audit reports with proof hashes |
| `vendorAllowlist`| `string[]`         | 12    | Approved vendor names                      |
| `dashboardStats` | `object`           | 1     | Aggregated stats for dashboard cards       |

### Replacement Strategy

To wire up real APIs, replace mock imports in each component:

```typescript
// BEFORE (mock):
import { agents } from "./mock-data";

// AFTER (real API):
const [agents, setAgents] = useState<Agent[]>([]);
useEffect(() => {
  fetch("/api/agents").then(res => res.json()).then(setAgents);
}, []);
```

**Key integration points per component:**

| Component          | Replace With                                       |
|-------------------|----------------------------------------------------|
| `Dashboard.tsx`    | Real-time WebSocket feed for live transactions      |
| `AgentManager.tsx` | REST API for CRUD agent wallets + Unlink SDK calls  |
| `ComplianceRules.tsx` | API for rule CRUD + on-chain rule registry       |
| `AuditReports.tsx` | Real ZK proof generation via Unlink SDK             |
| `TransactionFeed.tsx` | Monad RPC + WebSocket for live block monitoring  |
| `AgentDemo.tsx`    | Replace `setTimeout` delays with real SDK calls     |

---

## Integration Roadmap

### Phase 1: Unlink SDK Integration

```bash
npm install @aspect-build/unlink-sdk
```

**Where to integrate:**

| SDK Method                     | Dashboard Location       | Currently Mocked As              |
|-------------------------------|--------------------------|----------------------------------|
| `unlink.burner.create()`      | AgentManager (Deploy)    | Static wallet addresses          |
| `unlink.burner.list()`        | AgentManager (Table)     | `agents` array                   |
| `unlink.transfer.shielded()`  | AgentDemo (Step 5)       | `setTimeout` delay               |
| `unlink.proof.generate()`     | AgentDemo (Step 4)       | Random hex string generation     |
| `unlink.proof.verify()`       | AuditReports (Verify)    | Static "verified" status         |

### Phase 2: Monad Testnet Deployment

```bash
npm install ethers  # or: npm install viem
```

**Configuration needed:**

```typescript
// src/config/monad.ts (create this)
export const MONAD_CONFIG = {
  chainId: 10143,                    // Monad Testnet
  rpcUrl: "https://testnet-rpc.monad.xyz",
  explorerUrl: "https://testnet.monadexplorer.com",
  contracts: {
    complianceRegistry: "0x...",     // Deploy ComplianceRegistry.sol
    auditProofStore: "0x...",        // Deploy AuditProofStore.sol
  },
};
```

**Replace in Layout.tsx:**
```typescript
// BEFORE (static):
<span>Block #1,847,296</span>

// AFTER (live):
const [blockNumber, setBlockNumber] = useState(0);
useEffect(() => {
  const provider = new ethers.JsonRpcProvider(MONAD_CONFIG.rpcUrl);
  provider.on("block", (block) => setBlockNumber(block));
}, []);
```

### Phase 3: Smart Contract Deployment

Deploy two contracts to Monad Testnet:

1. **ComplianceRegistry.sol** - Stores compliance rules on-chain, emits events when rules are checked
2. **AuditProofStore.sol** - Stores ZK proof hashes from Unlink, allows public verification

### Phase 4: Real x402 Flow

Wire up the HTTP 402 payment protocol:

```typescript
// In your backend (Express/Fastify):
app.use("/api/premium/*", (req, res, next) => {
  if (!req.headers["x-payment-receipt"]) {
    return res.status(402).json({
      payTo: "0x...",
      amount: "245000000",  // 245 USDC (6 decimals)
      token: "USDC",
      network: "monad-testnet",
    });
  }
  // Verify receipt, serve data
  next();
});
```

### Phase 5: Affiliate Settlement

Implement the 3-party commission split with partial-knowledge verification.

---

## Key Concepts

### x402 Protocol
HTTP status code 402 ("Payment Required") repurposed for machine-to-machine payments. When an AI agent hits a paywalled API, the server responds with 402 + payment instructions. The agent's payment middleware (CompliAgent) handles the payment automatically.

### ZK Compliance Stamps
Zero-knowledge proofs that attest "this transaction is compliant" without revealing what was bought, how much was paid, or who the buyer is. In this demo, these are mocked as random hex hashes. In production, Unlink SDK would generate actual ZKPs.

### Shielded vs Public Transactions
- **Shielded** (marked with purple EyeOff icon): Amount, sender, and recipient are hidden on the public ledger via Unlink's privacy primitives
- **Public** (marked with gray Eye icon): Standard transparent transaction visible on Monad explorer

### Burner Accounts
Ephemeral wallets created via Unlink SDK for each agent or transaction batch. They are unlinkable to the parent enterprise wallet, preventing transaction graph analysis.

### Selective Disclosure
Audit reports can prove aggregate compliance (e.g., "98.7% pass rate across 14,892 transactions") without exposing individual transaction details. This is critical for regulatory audits where auditors need assurance without seeing sensitive business data.

---

## Environment Variables (Future)

When integrating with real services, create a `.env` file:

```env
# Monad Testnet
VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
VITE_MONAD_CHAIN_ID=10143

# Unlink SDK
VITE_UNLINK_API_KEY=your_unlink_api_key
VITE_UNLINK_NETWORK=monad-testnet

# Smart Contracts (after deployment)
VITE_COMPLIANCE_REGISTRY=0x...
VITE_AUDIT_PROOF_STORE=0x...

# Optional: Backend API
VITE_API_BASE_URL=http://localhost:3001/api
```

Access in code via `import.meta.env.VITE_MONAD_RPC_URL`.

---

## Troubleshooting

### Common Issues

**`pnpm install` fails with peer dependency warnings:**
React 18.3.1 is listed as a peer dependency. If you're using npm, add `--legacy-peer-deps`:
```bash
npm install --legacy-peer-deps
```

**Tailwind classes not applying:**
This project uses Tailwind CSS v4 with `@tailwindcss/vite` plugin. Do NOT create a `tailwind.config.js` - configuration is handled in `theme.css` and `tailwind.css`.

**Route not found / blank page:**
React Router is in Data mode (`createBrowserRouter`). Make sure your dev server supports client-side routing (Vite does by default). For production, configure your hosting to redirect all routes to `index.html`.

**Fonts not loading:**
Check that `fonts.css` imports are working. The app uses Google Fonts (Inter + Roboto Mono) loaded via CDN. If offline, download the fonts and update the import paths.

**`sonner` toast not appearing:**
The `<Toaster>` component is rendered in `Layout.tsx`. If you're testing a page outside the Layout, toasts won't show. Make sure your component is rendered as a child of the Layout route.

---

## License

Built for hackathon demonstration purposes. See your specific hackathon rules for licensing requirements.

## Reference Documents

- `/src/imports/compliagent-blueprint.md` - Full architecture blueprint with all flows, contracts, and integration details
- `/src/imports/compliagent-dashboard.md` - Dashboard UI specification with wireframes and component requirements
