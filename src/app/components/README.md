# /src/app/components Directory

All React components for the CompliAgent dashboard. Each page is a standalone component that imports mock data and renders its own UI, modals, and interactions.

---

## Table of Contents

1. [Layout.tsx](#layouttsx---sidebar--top-bar)
2. [Dashboard.tsx](#dashboardtsx---dashboard-overview)
3. [AgentDemo.tsx](#agentdemotsx---live-demo-simulation)
4. [AgentManager.tsx](#agentmanagertsx---agent-management)
5. [ComplianceRules.tsx](#compliancerulestsx---compliance-rule-editor)
6. [AuditReports.tsx](#auditreportstsx---zk-verified-audit-reports)
7. [TransactionFeed.tsx](#transactionfeedtsx---live-transaction-feed)
8. [mock-data.ts](#mock-datats---mock-data--interfaces)
9. [ui/ Directory](#ui-directory---shadcnui-primitives)
10. [figma/ Directory](#figma-directory---figma-utilities)

---

## Layout.tsx - Sidebar + Top Bar

**Route:** Wraps all pages (parent route component)

**Purpose:** Provides the persistent shell around every page: sidebar navigation, top bar with page title, notification bell, user avatar, and the Sonner toast container.

### Structure

```
+------------------------------------------+
| Sidebar (260px)    | Top Bar              |
|                    | Page Title > Breadcrumb|
| Logo + Branding    | Bell / Settings / User|
| Nav Links (6)      |-----------------------|
|                    |                       |
| ...                | <Outlet /> (page)     |
|                    |                       |
| Monad Status       |                       |
+--------------------+-----------------------+
                     | Toaster (bottom-right)|
```

### Key Elements

| Element                | Description                                                     |
|-----------------------|-----------------------------------------------------------------|
| **Logo block**         | Purple shield icon + "CompliAgent" + "Monad Testnet" subtitle  |
| **Navigation**         | 6 items: Dashboard, Live Demo, Agents, Compliance Rules, Audit Reports, Transactions |
| **Active state**       | Purple background (`bg-[#7C3AED]`) with white text             |
| **Monad status**       | Bottom of sidebar: green pulsing dot + "Monad Connected" + block number |
| **Page title**         | Dynamically computed from `useLocation().pathname`             |
| **Notification bell**  | Badge shows `3` (static -- wire to real notification count)    |
| **User avatar**        | Purple circle with "RS" initials + "CFO Admin" label           |
| **Toaster**            | `<Toaster>` from `sonner` at `position="bottom-right"`        |

### Navigation Items Array

```typescript
const navItems = [
  { to: "/",             icon: LayoutDashboard, label: "Dashboard" },
  { to: "/demo",         icon: Play,            label: "Live Demo" },
  { to: "/agents",       icon: Bot,             label: "Agents" },
  { to: "/rules",        icon: ShieldCheck,      label: "Compliance Rules" },
  { to: "/audit",        icon: FileText,         label: "Audit Reports" },
  { to: "/transactions", icon: Activity,         label: "Transactions" },
];
```

### Integration Points

| What to wire            | How                                                             |
|------------------------|-----------------------------------------------------------------|
| Monad block number      | Replace static `#1,847,296` with live `provider.getBlockNumber()` |
| Notification count      | Replace static `3` with real unread count from your backend      |
| User identity           | Replace "RS" / "CFO Admin" with authenticated user data          |
| Connection status       | Replace static "Connected" with real Monad RPC connection state  |

---

## Dashboard.tsx - Dashboard Overview

**Route:** `/` (index route)

**Purpose:** High-level overview of the entire CompliAgent system. Shows key metrics, live transaction feed, agent status, budget utilization, and quick action buttons.

### Sections (top to bottom)

1. **Stats Grid** (4 cards)
   - Active Agents: count + total deployed + weekly trend
   - Transactions Processed: live-incrementing counter (simulated every 3s)
   - Compliance Rate: percentage + rejected count today
   - Budget Utilized: dollar amount + bar

2. **Budget Utilization Bar**
   - Full-width progress bar with color coding:
     - Purple (`#7C3AED`): under 70%
     - Amber (`#f59e0b`): 70-85%
     - Red (`#ef4444`): over 85%

3. **Two-Column Layout**
   - **Left (2/3):** Live Transaction Feed - last 6 transactions with agent name, vendor, privacy badge, compliance badge, tx hash, amount (masked if shielded)
   - **Right (1/3):** Agent Status - agent list with name, wallet, budget mini-bar, status dot

4. **Quick Actions** (3 buttons)
   - Deploy New Agent -> navigates to `/agents` with toast
   - Generate Audit Report -> navigates to `/audit` with toast
   - Avg Settlement Time display (static "0.8s")

### Internal Components

| Component         | Props                                        | Purpose                      |
|-------------------|----------------------------------------------|------------------------------|
| `StatCard`        | icon, label, value, subValue, trend, trendUp, accentColor | Metric display card |
| `ComplianceBadge` | status: string                               | Green/red/amber status pill  |
| `PrivacyBadge`    | shielded: boolean                            | EyeOff/Eye icon + label     |

### Live Data Simulation

```typescript
// Increments transaction count every 3 seconds
useEffect(() => {
  const interval = setInterval(() => {
    setLiveTxCount((prev) => prev + Math.floor(Math.random() * 3));
  }, 3000);
  return () => clearInterval(interval);
}, []);
```

### Integration Points

| What to wire               | Replace with                                          |
|---------------------------|-------------------------------------------------------|
| `dashboardStats` import    | Real-time API call to your backend aggregation endpoint |
| `transactions.slice(0,6)` | WebSocket feed from Monad block listener               |
| `agents.slice(0,5)`       | API call to Unlink SDK `burner.list()`                 |
| Live counter simulation    | Real Monad event listener counting CompliAgent events  |
| Quick action navigation    | Keep as-is (navigation is correct)                     |

---

## AgentDemo.tsx - Live Demo Simulation

**Route:** `/demo`

**Purpose:** The **hackathon demo centerpiece**. Provides an animated, step-by-step visual simulation of the two core CompliAgent flows. Designed to be run during a live presentation.

### Demo Modes

| Mode              | Steps | Description                                            |
|-------------------|-------|--------------------------------------------------------|
| **x402 Agent Purchase** | 6 | AI agent -> HTTP 402 -> Compliance -> ZK Stamp -> Monad -> Data |
| **Affiliate Settlement** | 6 | Buyer Pay -> Compliance -> ZK Split -> Affiliate -> Merchant -> Done |

### How the Demo Works

1. User clicks "Run Agent Demo" or "Run Affiliate Demo"
2. Each step transitions through: `idle` -> `running` (with spinner) -> `success` (with checkmark)
3. Steps have configurable durations (800ms - 2000ms) to simulate realistic processing
4. At the ZK step, a mock proof hash is generated and shown via toast
5. At the settlement step, a mock tx hash + block number are generated
6. On completion, a result panel shows:
   - Monad Tx Hash (copyable)
   - Block Number
   - ZK Proof Hash
   - "Privacy-Preserved" section (what's hidden: agent identity, vendor, amount, data)
   - "Cryptographically Proven" section (what's proven: within budget, vendor approved, AML clean)

### State Management

```typescript
const [activeDemo, setActiveDemo] = useState<"x402" | "affiliate">("x402");
const [steps, setSteps] = useState<DemoStep[]>(initialSteps);
const [isRunning, setIsRunning] = useState(false);
const [currentStep, setCurrentStep] = useState(-1);
const [demoComplete, setDemoComplete] = useState(false);
const [txHash, setTxHash] = useState("");
const [blockNumber, setBlockNumber] = useState(0);
const [proofHash, setProofHash] = useState("");
```

### Step Data Structure

```typescript
type DemoStep = {
  id: string;         // Unique step identifier
  label: string;      // Step title (e.g., "ZK Compliance Stamp")
  description: string; // Detail text shown below label
  icon: any;          // Lucide icon component
  status: "idle" | "running" | "success" | "error";
  duration: number;   // How long this step "runs" in ms
};
```

### Integration Points

| What to wire                        | Replace with                                          |
|-------------------------------------|-------------------------------------------------------|
| `setTimeout(resolve, step.duration)` | Actual Unlink SDK / Monad RPC calls with real latency |
| Random hex hash generation           | Real `unlink.proof.generate()` return value           |
| Random tx hash generation            | Real `provider.sendTransaction()` return hash         |
| Random block number                  | Real `receipt.blockNumber` from Monad                 |
| Toast notifications                  | Keep (but update messages with real data)             |

### Abort Mechanism

The demo uses `useRef` for abort control to prevent state updates after unmount or manual stop:

```typescript
const abortRef = useRef(false);
// In loop: if (abortRef.current) return;
// On stop: abortRef.current = true;
```

---

## AgentManager.tsx - Agent Management

**Route:** `/agents`

**Purpose:** CRUD interface for managing AI agent wallets. View all agents, search/filter, inspect details, and manage budget/status.

### Features

| Feature                | Implementation                                         |
|-----------------------|--------------------------------------------------------|
| **Search**             | Text filter on agent name + wallet address             |
| **Status filter**      | Segmented control: All / Active / Paused / Inactive   |
| **Agent table**        | 7 columns: Agent, Wallet, Budget, Status, Compliance, Last Txn, Actions |
| **Budget visualization** | Progress bar with color coding (purple/amber/red)   |
| **Detail modal**       | Click any row -> modal with wallet, utilization, budget bar, status controls |
| **Actions**            | Allocate Budget button, Pause/Activate toggle          |

### Internal Components

| Component              | Purpose                                                |
|-----------------------|--------------------------------------------------------|
| `StatusBadge`          | Agent status pill (Active/Paused/Inactive)            |
| `ComplianceIndicator`  | Shield icon badge (Compliant/Flagged/Pending)         |

### Detail Modal Contents

When a table row is clicked:
- Agent name, type, and icon
- Wallet address (Roboto Mono)
- Utilization percentage
- Budget progress bar (used / allocated)
- Status + Compliance badges
- "Allocate Budget" button (primary)
- "Pause" / "Activate" toggle button

### Integration Points

| What to wire               | Replace with                                          |
|---------------------------|-------------------------------------------------------|
| `agents` import            | API call: `GET /api/agents` -> `Agent[]`              |
| "Deploy Agent" button      | Modal with `unlink.burner.create()` SDK call          |
| "Allocate Budget" button   | API call + on-chain budget allocation transaction     |
| "Pause/Activate" button    | API call + on-chain status update                     |
| `agent.wallet` display     | Real burner wallet address from Unlink SDK            |
| `agent.budgetUsed`         | Real-time aggregation from Monad event logs           |

---

## ComplianceRules.tsx - Compliance Rule Editor

**Route:** `/rules`

**Purpose:** Configure the compliance rules that CompliAgent enforces on every transaction. Two tabs: rule management and vendor allowlist.

### Tab 1: Compliance Rules

Each rule card shows:
- Type icon (color-coded: purple=budget, blue=vendor, red=AML, amber=rate limit)
- Rule name and type badge
- Current value (e.g., "$10,000", "50 txns/hour")
- Last updated by + date
- Edit button (placeholder)
- Enable/disable toggle (functional -- updates local state)

### Tab 2: Vendor Allowlist

- Text input + "Add" button to add new vendors
- List of approved vendors with green checkmark
- Delete button (red on hover) to remove vendors
- Supports Enter key to add

### Rule Types

```typescript
const ruleTypeConfig = {
  budget_cap:      { icon: DollarSign,    color: "#7C3AED", label: "Budget Cap" },
  vendor_allowlist: { icon: Users,        color: "#3b82f6", label: "Vendor Allowlist" },
  aml_threshold:   { icon: AlertTriangle, color: "#ef4444", label: "AML Threshold" },
  rate_limit:      { icon: Clock,         color: "#f59e0b", label: "Rate Limit" },
};
```

### Add Rule Modal

Opens on "Add Rule" button click. Fields:
- Rule Name (text input)
- Rule Type (select dropdown: Budget Cap / Vendor Allowlist / AML Threshold / Rate Limit)
- Value (text input)

Currently does NOT persist the new rule (just closes the modal). To make it functional:

```typescript
// Replace the empty onClick with:
const handleAddRule = (name, type, value) => {
  setRules(prev => [...prev, {
    id: `rule-${Date.now()}`,
    name, type, value,
    enabled: true,
    updatedAt: new Date(),
    updatedBy: "CFO Admin",
  }]);
  setShowAddRule(false);
};
```

### Integration Points

| What to wire               | Replace with                                          |
|---------------------------|-------------------------------------------------------|
| `complianceRules` import   | API: `GET /api/rules` + on-chain `ComplianceRegistry.getRules()` |
| Toggle enable/disable      | API: `PUT /api/rules/:id` + on-chain rule update     |
| Add rule modal submit      | API: `POST /api/rules` + on-chain rule registration  |
| `vendorAllowlist` import   | API: `GET /api/vendors` + on-chain vendor registry   |
| Add/remove vendor          | API: `POST/DELETE /api/vendors` + on-chain update    |

---

## AuditReports.tsx - ZK-Verified Audit Reports

**Route:** `/audit`

**Purpose:** Generate and view ZK-verified compliance audit reports. Each report attests to a period's transaction compliance without exposing individual transaction data.

### Sections

1. **Summary Cards** (4)
   - Pass Rate (98.7%, ZK-Verified)
   - Total Verified (14,892 all-time)
   - Rejected Today (3)
   - Shielded (94.2% Unlink-protected)

2. **Selective Disclosure Notice**
   - Purple-tinted banner explaining that auditors can verify aggregate compliance without seeing individual transactions

3. **Reports List**
   - Each report shows: date, transaction count, pass rate (color-coded), block number, "Verified" badge, action buttons
   - Action buttons: View Proof (ExternalLink), Download, Share with Auditor

4. **Proof Detail Modal**
   - Triggered by clicking View Proof on any report
   - Shows: "Cryptographically Verified" banner, proof hash (copyable), Monad block number, attestation count, sanctions check result
   - "Share with Auditor" primary button

### Generate Report Flow

```typescript
const handleGenerate = () => {
  setIsGenerating(true);           // Shows spinner on button
  setTimeout(() => {
    setIsGenerating(false);        // Completes after 2.5s
  }, 2500);
};
```

Currently this is cosmetic only -- it doesn't add a new report to the list.

### Integration Points

| What to wire                | Replace with                                          |
|----------------------------|-------------------------------------------------------|
| `auditReports` import      | API: `GET /api/audit/reports`                         |
| "Generate Report" button    | Real ZK proof generation: `unlink.proof.aggregate()` -> store on Monad |
| Proof hash in modal         | Real ZK proof hash from on-chain `AuditProofStore`   |
| "Share with Auditor" button | Generate shareable link with selective disclosure params |
| Block number in modal       | Real Monad block number where proof was stored        |
| Sanctions check result      | Real OFAC/EU screening API integration               |
| Download button              | Generate PDF/JSON report file                        |

---

## TransactionFeed.tsx - Live Transaction Feed

**Route:** `/transactions`

**Purpose:** Real-time monitoring of all agent transactions. Searchable, filterable, with live simulation of new transactions arriving.

### Features

| Feature                | Implementation                                         |
|-----------------------|--------------------------------------------------------|
| **Live indicator**     | Green pulsing "Live" badge, toggleable to "Paused"    |
| **Search**             | Text filter on agent name, vendor, or tx hash         |
| **Status filter**      | Segmented: All / Compliant / Rejected / Pending       |
| **Transaction table**  | 8 columns: Agent, Vendor, Amount, Privacy, Status, Tx Hash, Time, Details |
| **Shielded amounts**   | Shown as "****" in purple (amount hidden)             |
| **Detail modal**       | Click any row -> full transaction details + ZK proof  |
| **Auto-refresh**       | New mock transaction every 5 seconds (when Live)      |
| **Reset**              | Button to restore original mock data                  |

### Live Transaction Simulation

```typescript
useEffect(() => {
  if (!isLive) return;
  const interval = setInterval(() => {
    // Generate new random transaction
    const newTx: Transaction = {
      agentName: randomFrom(["Alpha Data Scout", "Beta Market Analyzer", ...]),
      vendor: randomFrom(["DataStream Pro API", "MarketPulse Analytics", ...]),
      amount: Math.floor(Math.random() * 5000) + 10,
      status: Math.random() > 0.1 ? "compliant" : "rejected",  // 90% compliant
      shielded: Math.random() > 0.15,                           // 85% shielded
      // ... etc
    };
    setTxList(prev => [newTx, ...prev].slice(0, 50));  // Cap at 50 transactions
  }, 5000);
  return () => clearInterval(interval);
}, [isLive]);
```

### Detail Modal Contents

When a table row is clicked:
- Compliance badge + Unlink Shielded badge (if applicable)
- Agent name, vendor, amount (or "shielded"), type, tx hash (copyable), block number, ZK proof hash
- If compliant + has proof: green banner "Compliance verified via ZK proof on Monad block #X"
- If rejected: red banner "Transaction rejected: exceeded budget cap or vendor not on allowlist"

### Time Formatting

```typescript
function formatTime(date: Date): string {
  // Returns: "30s ago", "5m ago", "2h ago"
}
```

### Integration Points

| What to wire               | Replace with                                          |
|---------------------------|-------------------------------------------------------|
| Mock transaction generation | WebSocket subscription to Monad blocks + CompliAgent events |
| `transactions` import      | API: `GET /api/transactions?page=1&limit=50`         |
| Tx hash display             | Real Monad transaction hashes (link to explorer)     |
| Block number display        | Real block numbers from transaction receipts         |
| ZK proof hash               | Real proof hashes from Unlink SDK                    |
| Amount masking ("****")     | Keep for shielded txns (this IS the real behavior)   |
| Click-to-explorer          | Link to `https://testnet.monadexplorer.com/tx/{hash}` |

---

## mock-data.ts - Mock Data & Interfaces

**Purpose:** Central data store for the entire dashboard. All components import from here. Contains TypeScript interfaces that define the exact shape of data your real API should return.

### TypeScript Interfaces

#### `Agent`
```typescript
interface Agent {
  id: string;                                    // Unique identifier (e.g., "agent-001")
  name: string;                                  // Display name (e.g., "Alpha Data Scout")
  wallet: string;                                // Truncated wallet address (e.g., "0x7a3B...4f2E")
  budgetAllocated: number;                       // Total budget in USDC (e.g., 50000)
  budgetUsed: number;                            // Spent budget in USDC (e.g., 32450)
  status: "active" | "inactive" | "paused";      // Operational status
  lastTransaction: string;                       // Human-readable time (e.g., "2 min ago")
  complianceStatus: "compliant" | "flagged" | "pending"; // Compliance state
  type: string;                                  // Agent category (e.g., "Data Acquisition")
}
```

#### `Transaction`
```typescript
interface Transaction {
  id: string;                // Unique identifier
  agentName: string;         // Agent that initiated this tx
  agentId: string;           // Reference to Agent.id
  vendor: string;            // Receiving vendor name
  amount: number;            // Amount in USDC (hidden if shielded)
  status: "compliant" | "rejected" | "pending";
  txHash: string;            // Monad transaction hash (truncated)
  timestamp: Date;           // When the tx occurred
  shielded: boolean;         // Whether Unlink privacy was used
  type: string;              // Transaction type (e.g., "x402 Data Purchase")
  proofHash?: string;        // ZK compliance proof hash (if compliant)
  blockNumber?: number;      // Monad block number (if confirmed)
}
```

#### `ComplianceRule`
```typescript
interface ComplianceRule {
  id: string;
  name: string;                                              // Rule display name
  type: "budget_cap" | "vendor_allowlist" | "aml_threshold" | "rate_limit";
  value: string;                                             // Human-readable value
  enabled: boolean;                                          // Toggle state
  updatedAt: Date;
  updatedBy: string;                                         // Who last modified
}
```

#### `AuditReport`
```typescript
interface AuditReport {
  id: string;
  generatedAt: Date;
  totalTransactions: number;
  compliantCount: number;
  rejectedCount: number;
  passRate: number;           // Percentage (e.g., 98.7)
  proofHash: string;          // ZK aggregate proof hash
  blockNumber: number;        // Monad block where proof is stored
  status: "verified" | "pending" | "expired";
}
```

### Mock Data Inventory

| Export            | Records | Notable Details                                       |
|------------------|---------|-------------------------------------------------------|
| `agents`         | 8       | Mix: 6 active, 1 paused, 1 inactive. One is flagged. Budget utilization ranges from 51% to 98%. |
| `transactions`   | 10      | 7 compliant, 2 rejected, 1 pending. 8 shielded, 2 public. Amounts range from $15 to $25,000. |
| `complianceRules`| 6       | 2 budget caps, 1 vendor allowlist, 2 AML thresholds, 1 rate limit. All enabled. |
| `auditReports`   | 3       | All verified. Pass rates: 98.7%, 99.3%, 98.9%. |
| `vendorAllowlist`| 12      | API/data vendors. Used by ComplianceRules vendor tab. |
| `dashboardStats` | 1 obj   | Aggregated: 8 agents (6 active), 14892 txns, 98.7% rate, $370K/$530K budget. |

### How to Replace Mock Data with Real API

**Step 1:** Create an API service file:

```typescript
// src/app/services/api.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

export async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch(`${API_BASE}/agents`);
  return res.json();
}

export async function fetchTransactions(params?: {
  status?: string;
  limit?: number;
}): Promise<Transaction[]> {
  const qs = new URLSearchParams(params as any).toString();
  const res = await fetch(`${API_BASE}/transactions?${qs}`);
  return res.json();
}

// ... etc for each data type
```

**Step 2:** Replace imports in each component:

```typescript
// BEFORE:
import { agents } from "./mock-data";
// Agent data is directly available

// AFTER:
import { fetchAgents } from "../services/api";
import { useState, useEffect } from "react";

const [agents, setAgents] = useState<Agent[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchAgents().then(data => {
    setAgents(data);
    setLoading(false);
  });
}, []);
```

---

## ui/ Directory - shadcn/ui Primitives

Pre-installed headless UI component library based on Radix UI + Tailwind. These are available but **not currently used by the dashboard pages** (the pages use custom-built components for the hackathon aesthetic).

### Available Components

Accordion, Alert, AlertDialog, AspectRatio, Avatar, Badge, Breadcrumb, Button, Calendar, Card, Carousel, Chart, Checkbox, Collapsible, Command, ContextMenu, Dialog, Drawer, DropdownMenu, Form, HoverCard, Input, InputOTP, Label, Menubar, NavigationMenu, Pagination, Popover, Progress, RadioGroup, Resizable, ScrollArea, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Sonner, Switch, Table, Tabs, Textarea, Toggle, ToggleGroup, Tooltip

### Utility Files

| File           | Purpose                                           |
|---------------|---------------------------------------------------|
| `utils.ts`    | `cn()` helper - merges Tailwind classes with `clsx` + `tailwind-merge` |
| `use-mobile.ts` | `useIsMobile()` hook - returns true if viewport width < 768px |

### Using shadcn/ui in Your Extensions

```typescript
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader } from "./ui/dialog";
import { cn } from "./ui/utils";

// Use cn() to conditionally merge classes:
<div className={cn("p-4", isActive && "bg-primary text-white")} />
```

---

## figma/ Directory - Figma Utilities

Contains a single utility component used for image fallbacks.

### `ImageWithFallback.tsx`

A drop-in replacement for `<img>` that shows a placeholder if the image fails to load. **Do not modify this file** -- it's a protected system file.

```typescript
import { ImageWithFallback } from "./components/figma/ImageWithFallback";

<ImageWithFallback src="https://..." alt="..." className="w-full h-48" />
```

---

## Component Dependency Graph

```
App.tsx
  └── routes.tsx
       └── Layout.tsx (parent route, wraps all children)
            ├── Dashboard.tsx
            │    └── imports: mock-data.ts (dashboardStats, transactions, agents)
            │    └── uses: react-router (useNavigate), sonner (toast)
            │
            ├── AgentDemo.tsx
            │    └── uses: sonner (toast)
            │    └── self-contained (no mock-data import, generates its own data)
            │
            ├── AgentManager.tsx
            │    └── imports: mock-data.ts (agents, Agent type)
            │
            ├── ComplianceRules.tsx
            │    └── imports: mock-data.ts (complianceRules, vendorAllowlist, ComplianceRule type)
            │
            ├── AuditReports.tsx
            │    └── imports: mock-data.ts (auditReports, dashboardStats)
            │
            └── TransactionFeed.tsx
                 └── imports: mock-data.ts (transactions, Transaction type)
```

---

## Adding a New Page - Step by Step

1. **Create the component:**
   ```bash
   touch src/app/components/NewPage.tsx
   ```

2. **Write the component:**
   ```tsx
   export function NewPage() {
     return (
       <div className="space-y-6">
         <p className="text-[13px] text-muted-foreground">
           Description of this page
         </p>
         {/* Your content */}
       </div>
     );
   }
   ```

3. **Add the route** in `routes.tsx`:
   ```tsx
   import { NewPage } from "./components/NewPage";
   // ...
   { path: "new-page", Component: NewPage },
   ```

4. **Add the nav item** in `Layout.tsx`:
   ```tsx
   import { SomeIcon } from "lucide-react";
   // Add to navItems array:
   { to: "/new-page", icon: SomeIcon, label: "New Page" },
   ```

5. **Add the page title** in `Layout.tsx`'s `getPageTitle()`:
   ```tsx
   if (path === "/new-page") return "New Page Title";
   ```

---

## Styling Conventions Used Throughout

| Pattern                           | Example                                              |
|----------------------------------|------------------------------------------------------|
| Card container                    | `bg-card rounded-xl border border-border p-5`       |
| Section spacing                   | `space-y-6` on page root div                        |
| Text sizes (explicit px)          | `text-[13px]`, `text-[11px]`, `text-[14px]`        |
| Monospace text                    | `style={{ fontFamily: "'Roboto Mono', monospace" }}` |
| Purple accent                     | `bg-[#7C3AED]`, `text-[#7C3AED]`, `bg-[#7C3AED]/10` |
| Purple hover                      | `hover:bg-[#6D28D9]`                                |
| Table row hover                   | `hover:bg-muted/30 transition-colors cursor-pointer` |
| Modal overlay                     | `fixed inset-0 z-50 flex items-center justify-center bg-black/40` |
| Modal container                   | `bg-card rounded-2xl border border-border w-full max-w-md mx-4 shadow-xl` |
| Icon sizing                       | `w-4 h-4` (small), `w-5 h-5` (medium), `w-10 h-10` (large in circles) |
| Status dot                        | `w-1.5 h-1.5 rounded-full bg-emerald-500`           |
