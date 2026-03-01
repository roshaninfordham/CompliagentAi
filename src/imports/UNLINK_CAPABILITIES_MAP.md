# CompliAgent x Unlink SDK — Complete Capabilities Map

> **Purpose:** This document lists every capability in the CompliAgent multi-agentic AI system
> that depends on the Unlink SDK. Each entry specifies: what the capability does, where it
> lives in the current codebase (and what's currently mocked), the exact Unlink SDK primitive(s)
> needed, the expected inputs/outputs, and what to ask Unlink AI Chat to get the real implementation.

---

## Table of Contents

1.  [Private Account Creation (Burner Wallets)](#1-private-account-creation-burner-wallets)
2.  [Burner Wallet Rotation & Lifecycle](#2-burner-wallet-rotation--lifecycle)
3.  [Enterprise Master Wallet (Private Account)](#3-enterprise-master-wallet-private-account)
4.  [Shielded Transfer — Agent-to-Vendor Payment (x402 Flow)](#4-shielded-transfer--agent-to-vendor-payment-x402-flow)
5.  [Shielded Transfer — Enterprise-to-Agent Budget Allocation](#5-shielded-transfer--enterprise-to-agent-budget-allocation)
6.  [Shielded Transfer — Three-Party Affiliate Commission Split](#6-shielded-transfer--three-party-affiliate-commission-split)
7.  [ZK Compliance Stamp — "Within Budget" Proof](#7-zk-compliance-stamp--within-budget-proof)
8.  [ZK Compliance Stamp — "Vendor Approved" Proof](#8-zk-compliance-stamp--vendor-approved-proof)
9.  [ZK Compliance Stamp — "AML Clean / No Sanctions" Proof](#9-zk-compliance-stamp--aml-clean--no-sanctions-proof)
10. [ZK Compliance Stamp — "Rate Limit Not Exceeded" Proof](#10-zk-compliance-stamp--rate-limit-not-exceeded-proof)
11. [ZK Commission Verification — Partial-Knowledge Split Proof (x + y = z)](#11-zk-commission-verification--partial-knowledge-split-proof-x--y--z)
12. [Selective Disclosure — Aggregate Audit Report](#12-selective-disclosure--aggregate-audit-report)
13. [Selective Disclosure — Sanctions Check Attestation](#13-selective-disclosure--sanctions-check-attestation)
14. [Selective Disclosure — KYC-Verified Entity Without Identity](#14-selective-disclosure--kyc-verified-entity-without-identity)
15. [On-Chain Proof Storage & Verification](#15-on-chain-proof-storage--verification)
16. [Transaction Privacy — Amount Hiding](#16-transaction-privacy--amount-hiding)
17. [Transaction Privacy — Sender/Receiver Unlinkability](#17-transaction-privacy--senderreceiver-unlinkability)
18. [FROST Threshold Signing — Multi-Party Authorization](#18-frost-threshold-signing--multi-party-authorization)
19. [Monad Connection Status & Block Monitoring](#19-monad-connection-status--block-monitoring)
20. [Real-Time Transaction Feed via Monad Events](#20-real-time-transaction-feed-via-monad-events)
21. [Compliance Stamp On-Chain Event Emission](#21-compliance-stamp-on-chain-event-emission)
22. [Shareable Audit Proof Link (Auditor Verification)](#22-shareable-audit-proof-link-auditor-verification)

---

## 1. Private Account Creation (Burner Wallets)

### What It Does
Creates ephemeral, unlinkable Ethereum-compatible wallet addresses for each AI agent. These burner accounts cannot be traced back to the enterprise's master wallet via on-chain transaction graph analysis.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `mock-data.ts` | L53-141 | `wallet: "0x7a3B...4f2E"` — static truncated strings |
| `AgentManager.tsx` | L68-71 | "Deploy Agent" button — currently no-op |
| `AgentDemo.tsx` | L31-38 | Step 1 ("Agent HTTP Request") — agent identity is hardcoded |

### Unlink SDK Primitive Needed
```
unlink.burner.create()
```

### Expected Input/Output
```typescript
// INPUT
{
  network: "monad-testnet",
  label?: "Alpha Data Scout",     // optional human-readable label
  linkedToEnterprise?: "0x...",    // optional: link to enterprise master (private)
}

// OUTPUT
{
  address: "0x...",               // full burner wallet address
  privateKey: "0x...",            // or managed by Unlink SDK internally
  createdAt: "2026-03-01T...",
  expiresAt?: "2026-03-02T...",   // if burner has TTL
}
```

### What to Ask Unlink AI Chat
> "How do I create a burner wallet address on Monad testnet using the Unlink SDK? I need ephemeral accounts for AI agents that are unlinkable to my enterprise master wallet. Show me the React SDK and Node.js SDK methods, the full function signature, and how to manage the private key securely."

---

## 2. Burner Wallet Rotation & Lifecycle

### What It Does
Periodically rotates agent burner addresses to prevent long-term transaction graph correlation. Also handles destroying/decommissioning old burners and sweeping remaining funds.

### Where It Is in the Codebase (Currently Mocked)
- **Not yet implemented.** The `AgentManager.tsx` shows agents with static wallets. Rotation is a production-level feature.

### Unlink SDK Primitive Needed
```
unlink.burner.rotate()
unlink.burner.destroy()
unlink.burner.list()
unlink.burner.sweep()   // move remaining funds before destroying
```

### Expected Input/Output
```typescript
// ROTATE
// Input:  { currentAddress: "0x...", network: "monad-testnet" }
// Output: { newAddress: "0x...", oldAddressDecommissioned: true }

// LIST
// Input:  { enterpriseId: "0x...", network: "monad-testnet" }
// Output: [{ address: "0x...", label: "Alpha", status: "active", createdAt: ... }, ...]

// SWEEP
// Input:  { fromAddress: "0x...", toAddress: "0x...", network: "monad-testnet" }
// Output: { txHash: "0x...", amountSwept: "1234.56" }
```

### What to Ask Unlink AI Chat
> "How do I rotate burner wallet addresses using the Unlink SDK? I need to: (1) list all active burners for an enterprise, (2) create a new burner, (3) sweep remaining funds from the old burner to the new one via a shielded transfer, and (4) destroy/decommission the old burner. Show me the full lifecycle API."

---

## 3. Enterprise Master Wallet (Private Account)

### What It Does
Creates the top-level enterprise private account that serves as the funding source for all agent burners. This wallet holds the enterprise's USDC budget on Monad and is itself an Unlink private account (not a regular EOA).

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `Dashboard.tsx` | L118-120 | `budgetUsed / totalBudget` — static numbers from `dashboardStats` |
| `mock-data.ts` | L391-401 | `dashboardStats.totalBudget: 530000` — hardcoded |
| `Layout.tsx` | L122 | User avatar "RS" / "CFO Admin" — static identity |

### Unlink SDK Primitive Needed
```
unlink.account.create()         // or unlink.enterprise.create()
unlink.account.getBalance()
unlink.account.fund()
```

### Expected Input/Output
```typescript
// CREATE
// Input:  { network: "monad-testnet", type: "enterprise", label: "CompliAgent Corp" }
// Output: { address: "0x...", type: "private", network: "monad-testnet" }

// GET BALANCE
// Input:  { address: "0x...", token: "USDC" }
// Output: { balance: "530000.00", token: "USDC", network: "monad-testnet" }
```

### What to Ask Unlink AI Chat
> "How do I create a private enterprise account on Monad using the Unlink SDK? This is the master wallet that funds AI agent burner wallets. I need to be able to check its USDC balance and fund it from an external source. Show me how the enterprise account relates to child burner accounts."

---

## 4. Shielded Transfer — Agent-to-Vendor Payment (x402 Flow)

### What It Does
Executes a privacy-preserving stablecoin (USDC) payment from an agent's burner wallet to a vendor's address. The amount, sender, and receiver are hidden from public block explorers. This is the core payment action in the x402 flow.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AgentDemo.tsx` | L63-71 | Step 5 ("Monad Settlement") — `setTimeout` of 1000ms simulates the transfer |
| `AgentDemo.tsx` | L195-203 | Mock tx hash and block number generated with `Math.random()` |
| `TransactionFeed.tsx` | L43-62 | Live feed generates random transactions with `shielded: true` |
| `mock-data.ts` | L143-281 | `transactions[]` — `shielded: true/false` flag and static `txHash` values |
| `Dashboard.tsx` | L190-198 | Shielded amounts shown as `****` in the live feed |

### Unlink SDK Primitive Needed
```
unlink.transfer.shielded()
```

### Expected Input/Output
```typescript
// INPUT
{
  from: "0x...",           // agent burner address
  to: "0x...",             // vendor address (or vendor burner)
  amount: "245.00",        // USDC amount
  token: "USDC",
  network: "monad-testnet",
  memo?: "x402-payment",   // optional metadata (kept private)
}

// OUTPUT
{
  txHash: "0x...",          // Monad transaction hash
  blockNumber: 1847296,
  status: "confirmed",
  shielded: true,           // confirms privacy was applied
  proofOfTransfer: "0x...", // cryptographic receipt
  gasUsed: "...",
  settlementTime: "0.8s",   // Monad finality
}
```

### What to Ask Unlink AI Chat
> "How do I execute a shielded USDC transfer on Monad testnet using the Unlink SDK? I'm sending from an agent's burner wallet to a vendor address. I need the sender, receiver, and amount to all be hidden from public block explorers. Show me the full `transfer.shielded()` method — parameters, return value, error handling, and how to get the Monad tx hash and block number from the receipt."

---

## 5. Shielded Transfer — Enterprise-to-Agent Budget Allocation

### What It Does
Moves USDC from the enterprise master wallet to an agent's burner wallet. This is a shielded transfer so that on-chain observers cannot see the enterprise funding multiple agent wallets (which would link them).

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AgentManager.tsx` | L273-275 | "Allocate Budget" button — currently no-op, just styled |
| `mock-data.ts` | L58, L69, ... | `budgetAllocated` and `budgetUsed` — static per agent |

### Unlink SDK Primitive Needed
```
unlink.transfer.shielded()  // same primitive as #4, different context
```

### Expected Input/Output
```typescript
// INPUT
{
  from: "0x...",            // enterprise master private account
  to: "0x...",              // agent burner address
  amount: "50000.00",       // budget allocation in USDC
  token: "USDC",
  network: "monad-testnet",
  memo?: "budget-allocation-agent-001",
}

// OUTPUT — same shape as #4
```

### What to Ask Unlink AI Chat
> "I'm using Unlink shielded transfers to fund AI agent burner wallets from an enterprise master wallet. The key requirement is that an observer watching the Monad chain cannot determine that wallets A, B, C, D are all funded by the same enterprise. How does Unlink ensure unlinkability between the enterprise source and multiple agent destinations?"

---

## 6. Shielded Transfer — Three-Party Affiliate Commission Split

### What It Does
Splits a single buyer payment into two shielded transfers: one to the merchant (85%) and one to the affiliate (15%). Both transfers are hidden, and a ZK proof verifies that `affiliate_amount + merchant_amount = total_payment` without revealing individual values.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AgentDemo.tsx` | L82-131 | `affiliateSteps[]` — Steps 4 & 5 simulate two shielded transfers with `setTimeout` |
| `AgentDemo.tsx` | L99-106 | Step 3 ("ZK Commission Verification") — mock proof with `Math.random()` |

### Unlink SDK Primitives Needed
```
unlink.transfer.shielded()     // called twice (to affiliate, to merchant)
unlink.proof.verifySplit()     // or custom ZK circuit for x + y = z
```

### Expected Input/Output
```typescript
// SPLIT PAYMENT INPUT
{
  buyerAddress: "0x...",
  merchantAddress: "0x...",
  affiliateAddress: "0x...",
  totalAmount: "1000.00",
  affiliateShare: "150.00",    // 15%
  merchantShare: "850.00",     // 85%
  token: "USDC",
  network: "monad-testnet",
}

// OUTPUT
{
  affiliateTxHash: "0x...",
  merchantTxHash: "0x...",
  splitProofHash: "0x...",      // ZK proof that 150 + 850 = 1000
  blockNumber: 1847302,
  verified: true,
}
```

### What to Ask Unlink AI Chat
> "How do I implement a three-party commission split with Unlink shielded transfers on Monad? Buyer pays $1000, merchant receives $850, affiliate receives $150. I need: (1) both transfers to be shielded (amounts hidden), (2) a ZK proof that the two destination amounts sum to the total without revealing individual values, (3) everything settled on Monad. Does Unlink have a `verifySplit` or similar primitive, or do I need to compose multiple `transfer.shielded()` calls with a custom ZK circuit?"

---

## 7. ZK Compliance Stamp — "Within Budget" Proof

### What It Does
Generates a zero-knowledge proof that an agent's transaction amount is within its approved budget cap, without revealing the actual transaction amount or the remaining budget.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AgentDemo.tsx` | L56-60 | Step 4 ("ZK Compliance Stamp") — label says "Generating zero-knowledge proof via Unlink SDK" |
| `AgentDemo.tsx` | L187-193 | Generates mock proof hash: `0xZK${Math.random().toString(16)}` |
| `ComplianceRules.tsx` | L284-290 | Rule "Max Single Transaction $10,000" — currently UI-only toggle |
| `ComplianceRules.tsx` | L319-328 | Rule "Daily Agent Budget Cap $25,000/day" — currently UI-only |

### Unlink SDK Primitive Needed
```
unlink.proof.generate()      // with "budget_check" circuit/type
// OR
unlink.selectiveDisclosure.prove()
```

### Expected Input/Output
```typescript
// INPUT
{
  type: "budget_compliance",
  privateInputs: {
    transactionAmount: 245,            // actual amount (PRIVATE — never leaves client)
    agentBudgetCap: 10000,             // max per-transaction (PRIVATE)
    agentRemainingBudget: 17550,       // remaining budget (PRIVATE)
    dailySpendSoFar: 7450,            // today's cumulative spend (PRIVATE)
    dailyCap: 25000,                  // daily limit (PRIVATE)
  },
  publicInputs: {
    agentId: "agent-001",              // can be pseudonymous
    ruleId: "rule-001",
    timestamp: 1709312400,
  },
}

// OUTPUT
{
  proofHash: "0xZK01...a3f2",          // cryptographic proof
  verified: true,
  claims: [
    "transaction_amount <= per_transaction_cap",
    "daily_spend + transaction_amount <= daily_cap",
    "remaining_budget >= transaction_amount",
  ],
  // The proof PROVES these claims without revealing the actual numbers
}
```

### What to Ask Unlink AI Chat
> "How do I generate a ZK proof with Unlink that proves a transaction amount is within a budget cap WITHOUT revealing the actual amount or the budget? I need to prove three things simultaneously: (1) amount <= per-transaction limit, (2) cumulative daily spend + amount <= daily limit, (3) remaining budget >= amount. What Unlink SDK method do I use, and what is the circuit/proof type parameter?"

---

## 8. ZK Compliance Stamp — "Vendor Approved" Proof

### What It Does
Proves that a vendor receiving payment is on the enterprise's approved vendor allowlist, without revealing which vendor it is or exposing the full allowlist.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AgentDemo.tsx` | L50-54 | Step 3 description: "budget ✓ vendor allowlist ✓ AML clean ✓" |
| `ComplianceRules.tsx` | L159-200 | Vendor Allowlist tab — 12 vendors, add/remove is local state only |
| `mock-data.ts` | L376-389 | `vendorAllowlist` — 12 static vendor names |

### Unlink SDK Primitive Needed
```
unlink.proof.generate()     // with "set_membership" or "allowlist_check" circuit
```

### Expected Input/Output
```typescript
// INPUT
{
  type: "vendor_allowlist",
  privateInputs: {
    vendorAddress: "0x...",                    // actual vendor (PRIVATE)
    vendorName: "DataStream Pro API",          // human-readable (PRIVATE)
    allowlistMerkleRoot: "0x...",              // root of vendor allowlist Merkle tree
    merkleProof: ["0x...", "0x...", ...],      // inclusion proof
  },
  publicInputs: {
    allowlistVersion: 3,                       // which version of the allowlist
    enterpriseId: "compliagent-corp",
  },
}

// OUTPUT
{
  proofHash: "0xZK...",
  verified: true,
  claims: ["vendor_in_approved_allowlist_v3"],
}
```

### What to Ask Unlink AI Chat
> "How do I prove that a recipient address is a member of an approved allowlist using Unlink ZK proofs? I have a list of 12+ approved vendor addresses. I need to prove 'this vendor is on the list' without revealing which vendor it is or exposing the full list. Does Unlink support Merkle-tree set membership proofs? Show me how to construct the Merkle tree from my vendor list, generate the inclusion proof, and verify it on-chain."

---

## 9. ZK Compliance Stamp — "AML Clean / No Sanctions" Proof

### What It Does
Proves that neither the sending agent nor the receiving vendor appears on OFAC, EU, or other sanctions lists, without revealing the identities of either party.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AgentDemo.tsx` | L50-54 | Step 3: "AML clean ✓" in description text |
| `AuditReports.tsx` | L253-256 | "No OFAC/EU sanctioned entities detected" — static text |
| `ComplianceRules.tsx` | L303-310 | Rule "AML Threshold Check $5,000 auto-flag" — UI toggle only |
| `ComplianceRules.tsx` | L329-337 | Rule "Sanctioned Entity Screen OFAC + EU list" — UI toggle only |

### Unlink SDK Primitive Needed
```
unlink.proof.generate()     // with "sanctions_check" or "aml_compliance" type
// Possibly also:
unlink.kyc.attestation()    // if Unlink provides KYC attestation primitives
```

### Expected Input/Output
```typescript
// INPUT
{
  type: "aml_sanctions_check",
  privateInputs: {
    senderAddress: "0x...",             // agent burner (PRIVATE)
    recipientAddress: "0x...",          // vendor (PRIVATE)
    senderKycHash: "0x...",             // hash of KYC data (PRIVATE)
    recipientKycHash: "0x...",          // hash of vendor KYC (PRIVATE)
    sanctionsListRoot: "0x...",         // Merkle root of OFAC+EU list
    senderNonInclusionProof: [...],     // Merkle non-inclusion proof
    recipientNonInclusionProof: [...],
  },
  publicInputs: {
    sanctionsListVersion: "2026-02-28",
    checkTimestamp: 1709312400,
  },
}

// OUTPUT
{
  proofHash: "0xZK...",
  verified: true,
  claims: [
    "sender_not_on_sanctions_list_v2026-02-28",
    "recipient_not_on_sanctions_list_v2026-02-28",
  ],
}
```

### What to Ask Unlink AI Chat
> "How do I use Unlink to generate a ZK proof that neither the sender nor receiver of a transaction is on a sanctions list (OFAC, EU), without revealing who the sender or receiver is? I need a non-inclusion proof against a Merkle tree of sanctioned addresses. Does Unlink have built-in AML/sanctions checking, or do I need to construct the Merkle tree myself and use a generic ZK proof primitive?"

---

## 10. ZK Compliance Stamp — "Rate Limit Not Exceeded" Proof

### What It Does
Proves that an agent has not exceeded its allowed transaction frequency (e.g., 50 transactions per hour) without revealing the agent's actual transaction count or history.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `ComplianceRules.tsx` | L314-318 | Rule "Rate Limit (per agent) 50 txns/hour" — UI toggle only |

### Unlink SDK Primitive Needed
```
unlink.proof.generate()     // with "rate_limit" or "counter_check" circuit
```

### Expected Input/Output
```typescript
// INPUT
{
  type: "rate_limit_compliance",
  privateInputs: {
    currentHourTxCount: 23,     // how many txns this agent did this hour (PRIVATE)
    rateLimit: 50,              // max allowed per hour (PRIVATE)
  },
  publicInputs: {
    windowStart: 1709312400,    // hour boundary timestamp
    agentPseudonym: "agent-001",
  },
}

// OUTPUT
{
  proofHash: "0xZK...",
  verified: true,
  claims: ["agent_tx_count_within_hourly_rate_limit"],
}
```

### What to Ask Unlink AI Chat
> "How do I generate a ZK proof that a counter value is below a threshold using Unlink? Specifically, I need to prove 'this agent has made fewer than 50 transactions this hour' without revealing the actual count. Is there a range proof or comparison proof primitive in the Unlink SDK?"

---

## 11. ZK Commission Verification — Partial-Knowledge Split Proof (x + y = z)

### What It Does
In the affiliate settlement flow, proves that `affiliate_share + merchant_share = total_payment` without revealing any of the three individual values to external observers. This is the core "partial-knowledge verification" from the blueprint.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AgentDemo.tsx` | L99-106 | Step 3 ("ZK Commission Verification"): "Proving x + y = z without revealing individual values (x=150, y=850)" |
| `AgentDemo.tsx` | L187-193 | Mock proof hash generated with `Math.random()` |

### Unlink SDK Primitive Needed
```
unlink.proof.generate()        // with "sum_verification" circuit
// OR Unlink's FROST-based threshold signing for multi-party verification
```

### Expected Input/Output
```typescript
// INPUT
{
  type: "commission_split_verification",
  privateInputs: {
    totalPayment: 1000,             // z (PRIVATE)
    affiliateShare: 150,            // x (PRIVATE)
    merchantShare: 850,             // y (PRIVATE)
    commissionRate: 15,             // percentage (PRIVATE)
  },
  publicInputs: {
    programId: "affiliate-program-001",
    timestamp: 1709312400,
  },
}

// OUTPUT
{
  proofHash: "0xZK...",
  verified: true,
  claims: [
    "affiliate_share + merchant_share == total_payment",
    "affiliate_share == total_payment * commission_rate / 100",
  ],
}
```

### What to Ask Unlink AI Chat
> "How do I use Unlink to prove that two secret values sum to a known total (x + y = z) without revealing x or y? This is for a three-party affiliate commission split. Buyer pays z, affiliate gets x, merchant gets y. I need a ZK proof that the split is correct. Does Unlink support custom arithmetic constraint proofs, or is there a specific 'sum verification' primitive? Also, does Unlink's FROST threshold signing help here for multi-party agreement on the split?"

---

## 12. Selective Disclosure — Aggregate Audit Report

### What It Does
Generates a cryptographically verifiable audit report that proves:
- Total number of transactions processed
- Aggregate compliance pass rate (e.g., 98.7%)
- All transactions were within policy
- No sanctions violations detected

...WITHOUT revealing any individual transaction details, amounts, agent identities, or vendor names.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AuditReports.tsx` | L22-25 | `handleGenerate()` — just sets `isGenerating=true` for 2.5s, no real proof |
| `AuditReports.tsx` | L62-103 | Summary cards — static values from `dashboardStats` |
| `AuditReports.tsx` | L106-118 | Selective Disclosure notice banner — just informational text |
| `AuditReports.tsx` | L120-197 | Report list — static `auditReports[]` from mock data |
| `AuditReports.tsx` | L200-268 | Proof Detail Modal — shows static proof hash, block number |
| `mock-data.ts` | L340-374 | `auditReports[]` — 3 static reports with fake proof hashes |

### Unlink SDK Primitive Needed
```
unlink.selectiveDisclosure.generateReport()
// OR
unlink.proof.aggregate()
```

### Expected Input/Output
```typescript
// INPUT
{
  type: "aggregate_audit",
  timeRange: {
    from: "2026-02-28T00:00:00Z",
    to: "2026-03-01T00:00:00Z",
  },
  privateInputs: {
    transactions: [                    // full transaction set (PRIVATE)
      { txHash: "0x...", amount: 245, compliant: true, ... },
      { txHash: "0x...", amount: 1200, compliant: true, ... },
      // ... all 1,247 transactions
    ],
  },
  disclosedFields: [                   // what the proof REVEALS
    "total_transaction_count",
    "compliant_count",
    "rejected_count",
    "pass_rate_percentage",
    "no_sanctions_violations",
    "total_shielded_percentage",
  ],
  hiddenFields: [                      // what the proof HIDES
    "individual_amounts",
    "agent_identities",
    "vendor_identities",
    "spending_patterns",
    "transaction_timestamps",
  ],
}

// OUTPUT
{
  reportId: "audit-001",
  proofHash: "0xZKAudit01...f8a2c3",
  blockNumber: 1847200,               // stored on Monad
  attestation: {
    totalTransactions: 1247,
    compliantCount: 1231,
    rejectedCount: 16,
    passRate: 98.7,
    sanctionsClean: true,
    shieldedPercentage: 94.2,
  },
  verificationUrl: "https://verify.compliagent.xyz/audit-001",
  verified: true,
}
```

### What to Ask Unlink AI Chat
> "How do I use Unlink's selective disclosure to generate an aggregate audit report? I have ~1,000-5,000 transactions. I need to generate a single ZK proof that reveals ONLY: total count, compliant count, pass rate, and 'no sanctions violations' — while hiding all individual transaction details (amounts, agents, vendors). How does Unlink's selective disclosure work? What's the method signature? Can I store the proof hash on Monad and share a verification link with auditors?"

---

## 13. Selective Disclosure — Sanctions Check Attestation

### What It Does
Part of the audit report. Specifically attests that across all transactions in a reporting period, zero transactions involved sanctioned entities, without revealing which entities were checked.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AuditReports.tsx` | L252-256 | "No OFAC/EU sanctioned entities detected" — static green text with checkmark |

### Unlink SDK Primitive Needed
```
unlink.selectiveDisclosure.prove()   // with sanctions_clean claim
```

### What to Ask Unlink AI Chat
> "How do I generate a selective disclosure proof with Unlink that attests 'zero transactions in this batch involved OFAC/EU sanctioned entities' without revealing which entities were transacted with? This is for an audit report. I need the proof to be verifiable by a third-party auditor."

---

## 14. Selective Disclosure — KYC-Verified Entity Without Identity

### What It Does
Proves that the enterprise operating CompliAgent is a KYC-verified entity (has completed identity verification) without revealing the entity's actual identity, jurisdiction, or KYC data.

### Where It Is in the Codebase (Currently Mocked)
- **Not yet in UI.** Referenced in blueprint Section 5.8: "ZK proofs: KYC-verified entity without revealing who"

### Unlink SDK Primitive Needed
```
unlink.kyc.prove()
// OR
unlink.selectiveDisclosure.prove({ type: "kyc_verified" })
```

### Expected Input/Output
```typescript
// INPUT
{
  type: "kyc_verification",
  privateInputs: {
    kycProvider: "Jumio",           // who did the KYC (PRIVATE)
    verificationDate: "2026-01-15", // when (PRIVATE)
    entityName: "CompliAgent Corp", // legal name (PRIVATE)
    jurisdiction: "US-DE",          // state of incorporation (PRIVATE)
    kycHash: "0x...",               // hash of full KYC record (PRIVATE)
  },
  publicInputs: {
    kycStandard: "BSA-AML",         // which standard was met
    expirationDate: "2027-01-15",
  },
}

// OUTPUT
{
  proofHash: "0xZK...",
  verified: true,
  claims: ["entity_is_kyc_verified_bsa_aml", "kyc_not_expired"],
}
```

### What to Ask Unlink AI Chat
> "Does Unlink provide KYC attestation primitives? I need to generate a ZK proof that says 'this entity has completed KYC verification under BSA-AML standards' without revealing the entity's name, jurisdiction, or KYC data. Is this a built-in Unlink feature, or do I need to integrate with a separate KYC provider and then use Unlink's generic proof system?"

---

## 15. On-Chain Proof Storage & Verification

### What It Does
Stores ZK proof hashes on the Monad blockchain (via the `ComplianceRegistry` smart contract) so that anyone can later verify that a compliance stamp was genuine by checking the on-chain record.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `mock-data.ts` | L155-156 | `proofHash: "0xZK01...a3f2", blockNumber: 1847293` — static values |
| `AuditReports.tsx` | L226-241 | Proof Detail Modal shows static proof hash and block number |
| `TransactionFeed.tsx` | L303-311 | Transaction detail shows ZK proof hash with green checkmark |

### Unlink SDK Primitive Needed
```
// Unlink generates the proof, then you store it on-chain:
unlink.proof.generate()        // generates proof
// Then call your Solidity contract:
ComplianceRegistry.verifyAndStamp(txHash, proofHash)
```

### Smart Contract Function
```solidity
function verifyAndStamp(bytes32 txHash, bytes32 proofHash) external;
event ComplianceStamped(bytes32 indexed txHash, bytes32 proofHash, uint256 blockNumber);
```

### What to Ask Unlink AI Chat
> "After generating a ZK compliance proof with Unlink, how do I store the proof hash on-chain? Does Unlink provide a built-in on-chain verification contract, or do I call my own Solidity contract's `verifyAndStamp(txHash, proofHash)` method? Can Unlink verify proofs on-chain directly on Monad, or is verification off-chain only?"

---

## 16. Transaction Privacy — Amount Hiding

### What It Does
Ensures that the USDC amount transferred in any agent payment is not visible on the Monad block explorer. Observers see a valid transaction but cannot determine the value transferred.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `TransactionFeed.tsx` | L189-195 | Shielded amounts shown as `****` in purple — this IS the correct UX |
| `Dashboard.tsx` | L242-243 | Same `****` masking in live feed |
| `mock-data.ts` | L153-155 | `shielded: true` flag determines if amount is displayed |

### Unlink SDK Primitive Needed
```
unlink.transfer.shielded()    // amount hiding is built into shielded transfers
```

### What to Ask Unlink AI Chat
> "When I use Unlink's shielded transfer, is the amount automatically hidden from block explorers? Or do I need to use a specific parameter to enable amount hiding? What does a shielded transfer look like on the Monad block explorer — can an observer see the token type (USDC) but not the amount, or is everything hidden?"

---

## 17. Transaction Privacy — Sender/Receiver Unlinkability

### What It Does
Ensures that external observers cannot determine (a) which enterprise funded an agent, (b) which agent paid a vendor, or (c) that two transactions came from the same enterprise. This is the core "unlinkability" property that gives Unlink its name.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AgentDemo.tsx` | L454-469 | "Privacy-Preserved" panel lists: Agent Identity, Vendor Identity, Payment Amount, Data Purchased — all marked with Lock icon |
| `AgentDemo.tsx` | L473-494 | "Cryptographically Proven" panel lists what IS proven: Within Budget, Vendor Approved, AML Clean |

### Unlink SDK Primitive Needed
```
unlink.transfer.shielded()     // sender/receiver hiding is built-in
unlink.burner.create()          // burner addresses provide unlinkability
```

### What to Ask Unlink AI Chat
> "How does Unlink achieve sender/receiver unlinkability in shielded transfers on Monad? Specifically: (1) Can an observer link two transactions to the same sender? (2) Can an observer determine that burner wallet A and burner wallet B are both owned by the same enterprise? (3) What cryptographic mechanism does Unlink use — stealth addresses, ring signatures, FROST, or something else?"

---

## 18. FROST Threshold Signing — Multi-Party Authorization

### What It Does
Uses FROST (Flexible Round-Optimized Schnorr Threshold) signatures for multi-party transaction authorization. For example, requiring 2-of-3 enterprise admins to approve a high-value agent payment, or requiring both the compliance engine and the enterprise admin to co-sign a compliance stamp.

### Where It Is in the Codebase (Currently Mocked)
- **Not yet in UI.** Referenced in blueprint Section 2.3: "FROST threshold signing and ephemeral burner accounts"

### Unlink SDK Primitive Needed
```
unlink.frost.createGroup()
unlink.frost.sign()
unlink.frost.verify()
```

### Expected Input/Output
```typescript
// CREATE THRESHOLD GROUP
// Input:  { participants: ["admin1", "admin2", "complianceEngine"], threshold: 2 }
// Output: { groupId: "frost-group-001", publicKey: "0x...", threshold: 2, total: 3 }

// SIGN (each participant contributes a partial signature)
// Input:  { groupId: "frost-group-001", message: "0x...(txHash)", participantId: "admin1" }
// Output: { partialSignature: "0x..." }

// AGGREGATE + VERIFY
// Input:  { groupId: "...", partialSignatures: ["0x...", "0x..."], message: "0x..." }
// Output: { aggregateSignature: "0x...", verified: true }
```

### What to Ask Unlink AI Chat
> "Does Unlink SDK expose FROST threshold signing? I want to implement 2-of-3 multi-party authorization for high-value agent transactions. How do I create a FROST signing group, collect partial signatures from participants, aggregate them, and verify the threshold signature on-chain on Monad?"

---

## 19. Monad Connection Status & Block Monitoring

### What It Does
Maintains a live connection to the Monad testnet RPC, displays the current block number, and indicates connection health in the sidebar.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `Layout.tsx` | L84-96 | Static "Monad Connected" + green pulsing dot + "Block #1,847,296" |

### Implementation (ethers.js / viem — NOT Unlink-specific)
```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");

// Get current block
const blockNumber = await provider.getBlockNumber();

// Subscribe to new blocks
provider.on("block", (blockNumber) => {
  setBlockNumber(blockNumber);
  setConnectionStatus("connected");
});
```

### What to Ask Unlink AI Chat
> "Does the Unlink SDK provide its own Monad RPC provider, or do I use a standard ethers.js/viem provider alongside Unlink? When using Unlink shielded transfers, does Unlink manage the Monad connection internally, or do I need to pass a provider instance to the SDK?"

---

## 20. Real-Time Transaction Feed via Monad Events

### What It Does
Subscribes to on-chain events emitted by the ComplianceRegistry contract to populate the live transaction feed with real compliance stamp events.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `TransactionFeed.tsx` | L40-66 | `setInterval` every 5s generates random mock transaction objects |
| `Dashboard.tsx` | L111-116 | `setInterval` every 3s increments transaction counter by random 0-2 |

### Implementation (ethers.js + Solidity events)
```typescript
// Listen for ComplianceStamped events from your deployed contract
const contract = new ethers.Contract(
  COMPLIANCE_REGISTRY_ADDRESS,
  ComplianceRegistryABI,
  provider
);

contract.on("ComplianceStamped", (txHash, proofHash, blockNumber, event) => {
  // Add to transaction feed
  setTransactions(prev => [{
    txHash, proofHash, blockNumber,
    timestamp: new Date(),
    status: "compliant",
    shielded: true,
  }, ...prev]);
});
```

### What to Ask Unlink AI Chat
> "When Unlink executes a shielded transfer on Monad, does it emit any events that I can listen to? Or do I only get events from my own ComplianceRegistry contract? How do I correlate an Unlink shielded transfer with my compliance stamp — do I store the Unlink transfer receipt hash in my contract?"

---

## 21. Compliance Stamp On-Chain Event Emission

### What It Does
After a ZK compliance proof is generated and stored on-chain, the `ComplianceRegistry` contract emits a `ComplianceStamped` event that the frontend can subscribe to for real-time updates.

### Where It Is in the Codebase (Currently Mocked)
- **Not yet implemented.** All transaction status updates are from mock data.

### Solidity Contract Event
```solidity
event ComplianceStamped(
    bytes32 indexed txHash,
    bytes32 proofHash,
    address indexed agent,
    uint256 timestamp,
    uint256 blockNumber
);

event RuleUpdated(
    bytes32 indexed ruleId,
    bytes ruleData,
    address updatedBy,
    uint256 timestamp
);

event AuditGenerated(
    bytes32 indexed auditId,
    bytes32 proofHash,
    uint256 totalTransactions,
    uint256 compliantCount,
    uint256 blockNumber
);
```

### What to Ask Unlink AI Chat
> "When I call `verifyAndStamp()` on my ComplianceRegistry contract after an Unlink proof generation, what's the best way to pass the Unlink proof hash to the contract? Does Unlink provide the proof in a format that's directly compatible with `bytes32` in Solidity, or do I need to hash/encode it?"

---

## 22. Shareable Audit Proof Link (Auditor Verification)

### What It Does
Generates a URL that an auditor can visit to independently verify a compliance audit report. The URL leads to a verification page that checks the on-chain proof without requiring the auditor to have any CompliAgent access.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AuditReports.tsx` | L186-190 | "Share with Auditor" button (Share2 icon) — currently no-op |
| `AuditReports.tsx` | L261-264 | "Share with Auditor" button in proof modal — currently no-op |

### Unlink SDK Primitive Needed
```
unlink.selectiveDisclosure.shareableLink()
// OR construct manually:
// https://verify.compliagent.xyz/proof/{proofHash}?chain=monad-testnet&block={blockNumber}
```

### What to Ask Unlink AI Chat
> "Does Unlink provide a hosted verification endpoint where third parties can verify ZK proofs? I want to generate a shareable URL for auditors. If not, how do I build a standalone verification page that checks an Unlink proof against a Monad on-chain record?"

---

## Quick Reference: Unlink SDK Methods Needed

| # | Capability | Unlink Method | Priority |
|---|-----------|---------------|----------|
| 1 | Burner wallet creation | `unlink.burner.create()` | **P0 — Critical** |
| 2 | Burner rotation/lifecycle | `unlink.burner.rotate/destroy/list()` | P1 |
| 3 | Enterprise private account | `unlink.account.create()` | **P0 — Critical** |
| 4 | Shielded transfer (x402 payment) | `unlink.transfer.shielded()` | **P0 — Critical** |
| 5 | Shielded transfer (budget allocation) | `unlink.transfer.shielded()` | **P0 — Critical** |
| 6 | Shielded transfer (affiliate split) | `unlink.transfer.shielded()` x2 | P1 |
| 7 | ZK proof — budget compliance | `unlink.proof.generate()` | **P0 — Critical** |
| 8 | ZK proof — vendor allowlist | `unlink.proof.generate()` | **P0 — Critical** |
| 9 | ZK proof — AML/sanctions | `unlink.proof.generate()` | P1 |
| 10 | ZK proof — rate limit | `unlink.proof.generate()` | P2 |
| 11 | ZK proof — commission split | `unlink.proof.generate()` | P1 |
| 12 | Selective disclosure — audit report | `unlink.selectiveDisclosure.generateReport()` | **P0 — Critical** |
| 13 | Selective disclosure — sanctions attestation | `unlink.selectiveDisclosure.prove()` | P1 |
| 14 | Selective disclosure — KYC attestation | `unlink.kyc.prove()` | P2 |
| 15 | On-chain proof storage | `unlink.proof.generate()` + Solidity | P1 |
| 16 | Amount hiding | Built into `transfer.shielded()` | **P0** (automatic) |
| 17 | Sender/receiver unlinkability | Built into `burner.create()` + `transfer.shielded()` | **P0** (automatic) |
| 18 | FROST threshold signing | `unlink.frost.createGroup/sign/verify()` | P2 |
| 19 | Monad connection | ethers.js (not Unlink-specific) | P0 |
| 20 | Real-time event feed | ethers.js + Contract events | P1 |
| 21 | On-chain event emission | Solidity events | P1 |
| 22 | Shareable verification link | `unlink.selectiveDisclosure.shareableLink()` | P2 |

---

## Recommended Order of Implementation

### Phase 1: Core Privacy (Get the demo working end-to-end)
1. **#3** Enterprise master wallet
2. **#1** Burner wallet creation for agents
3. **#4** Shielded transfer (agent-to-vendor)
4. **#7** ZK proof — within budget
5. **#8** ZK proof — vendor approved
6. **#15** Store proof hash on Monad
7. **#19** Monad connection (live block number)

### Phase 2: Auditability (Prove compliance to regulators)
8. **#12** Aggregate audit report with selective disclosure
9. **#9** ZK proof — AML clean
10. **#13** Sanctions check attestation
11. **#20** Real-time event feed from Monad
12. **#21** Contract event emission

### Phase 3: Multi-Party Flows (Affiliate settlement)
13. **#6** Three-party shielded split
14. **#11** Commission verification proof (x + y = z)

### Phase 4: Production Hardening
15. **#2** Burner wallet rotation
16. **#5** Shielded budget allocation
17. **#14** KYC attestation
18. **#10** Rate limit proof
19. **#18** FROST threshold signing
20. **#22** Shareable audit verification links

---

## How to Use This Document with Unlink AI Chat

1. Start with **Phase 1, Capability #3** (enterprise wallet)
2. Copy the "What to Ask Unlink AI Chat" prompt verbatim
3. Get the real SDK code back
4. Replace the corresponding mock in your codebase (the "Where It Is" table tells you exactly which file and line)
5. Move to the next capability
6. Repeat until all 22 capabilities are real

**Pro tip:** When talking to Unlink AI Chat, always specify:
- "I'm deploying on **Monad testnet** (EVM-compatible, chain ID 10143)"
- "I'm using the **React SDK** for frontend and **Node.js SDK** for backend"
- "I need the **exact import statement** and **full function call** with all parameters"
- "Show me the **return type** so I can update my TypeScript interfaces"
