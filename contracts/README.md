# Smart Contracts — Solidity on Monad

This folder contains 4 Solidity smart contracts deployed on **Monad Testnet** (Chain ID: 10143). They handle on-chain compliance stamps, budget management, token issuance, and affiliate settlement.

## Architecture

```
contracts/
├── hardhat.config.cjs          ← Hardhat config (Monad testnet network)
├── deployed-addresses.json     ← All deployed contract addresses
├── .env                        ← Private key + RPC (gitignored)
├── contracts/
│   ├── MockUSDC.sol            ← ERC-20 stablecoin (6 decimals)
│   ├── ComplianceRegistry.sol  ← On-chain compliance stamps + rules
│   ├── BudgetVault.sol         ← Enterprise budget vault
│   └── AffiliateSettler.sol    ← Affiliate commission splitter
└── scripts/
    ├── deploy.js               ← Phase 1 deployment
    ├── deploy-phase4.js        ← Phase 4 deployment (V2 + affiliate)
    ├── deposit-budget.js       ← Deposit USDC into vault
    ├── phase2-interactions.js  ← Demo: allocate, pay, stamp
    └── phase4-setup-v2.js      ← Set rules + batch stamp
```

## Contract Overview

```
┌───────────────────┐     ┌────────────────────────┐
│    MockUSDC        │     │  ComplianceRegistry V2  │
│    (ERC-20)        │     │                          │
│                    │     │  • verifyAndStamp()      │
│  • mint()          │     │  • batchVerifyAndStamp() │
│  • transfer()      │     │  • setRule() / getRule() │
│  • approve()       │     │  • isCompliant()         │
│  • balanceOf()     │     │  • emitAudit()           │
└────────┬───────────┘     └────────────────────────┘
         │ USDC                        ▲
         │ payments                    │ proof hashes
         ▼                            │
┌───────────────────┐     ┌────────────────────────┐
│   BudgetVault      │     │  AffiliateSettler       │
│                    │     │                          │
│  • depositBudget() │     │  • registerProgram()     │
│  • allocateBudget()│     │  • processPayment()      │
│  • executePayment()│     │  • toggleProgram()       │
│  • utilization()   │     │                          │
│  • emergencyStop() │     │  Splits: 95% vendor      │
└────────────────────┘     │          5% affiliate    │
                           └────────────────────────┘
```

## Deployed Addresses (Monad Testnet)

| Contract | Address | Explorer |
|----------|---------|----------|
| MockUSDC | `0x18c945c79f85f994A10356Aa4945371Ec4cD75D4` | [View](https://testnet.monadexplorer.com/address/0x18c945c79f85f994A10356Aa4945371Ec4cD75D4) |
| ComplianceRegistry V2 | `0xC37a8f0ca860914BfAce8361Bf0621EAEa14863F` | [View](https://testnet.monadexplorer.com/address/0xC37a8f0ca860914BfAce8361Bf0621EAEa14863F) |
| BudgetVault | `0x56e8C1ED242396645376A92e6b7c6ECd2d871DD5` | [View](https://testnet.monadexplorer.com/address/0x56e8C1ED242396645376A92e6b7c6ECd2d871DD5) |
| AffiliateSettler | `0x9284cB50d7b7678be61F11A7688DC768f0E02A89` | [View](https://testnet.monadexplorer.com/address/0x9284cB50d7b7678be61F11A7688DC768f0E02A89) |

## Contract Details

### MockUSDC.sol

A simple ERC-20 token for testing. Not for production use.

| Property | Value |
|----------|-------|
| Name | Mock USDC |
| Symbol | mUSDC |
| Decimals | 6 |
| Minting | Owner-only |

**Key Functions:**
- `mint(address to, uint256 amount)` — Owner mints tokens
- Standard ERC-20: `transfer()`, `approve()`, `transferFrom()`, `balanceOf()`

### ComplianceRegistry.sol (V2)

The core on-chain compliance layer. Every compliant payment gets stamped here.

**Compliance Stamps:**
- `verifyAndStamp(bytes32 txHash, bytes32 proofHash)` — stamp one tx
- `batchVerifyAndStamp(bytes32[] txHashes, bytes32[] proofHashes)` — stamp up to 50 txs in one call
- `isCompliant(bytes32 txHash)` — check if a tx is stamped
- `getStamp(bytes32 txHash)` — get proof hash + timestamp

**Rule Management:**
- `setRule(string name, string ruleType, uint256 value)` — create a rule
- `updateRule(uint256 index, string name, string ruleType, uint256 value)` — update
- `toggleRule(uint256 index)` — enable/disable
- `getRule(uint256 index)` — read rule details
- `getRuleCount()` — total rules
- `totalStamped()` — counter of all stamps

**Audit Events:**
- `emitAudit(bytes32 txHash, string action, string details)` — emit audit log

**Configured Rules (on-chain):**

| # | Name | Type | Value |
|---|------|------|-------|
| 0 | Max Budget Per Agent | budget_cap | 100,000 USDC |
| 1 | Vendor Allowlist | vendor_allowlist | 1 (enabled) |
| 2 | AML Threshold | aml_threshold | 10,000 USDC |
| 3 | Transaction Rate Limit | rate_limit | 100 tx/window |
| 4 | KYC Verification | kyc_check | 1 (required) |

### BudgetVault.sol

Enterprise treasury for AI agent budgets.

**Flow:**
```
CFO deposits 100K USDC
  → allocateAgentBudget(AgentAlpha, 50K)
    → executeAgentPayment(AgentAlpha, Vendor, 1K)
      → Agent Alpha: allocated=50K, spent=1K, remaining=49K
```

**Key Functions:**
- `depositBudget(uint256 amount)` — deposit USDC (requires prior `approve()`)
- `allocateAgentBudget(address agent, uint256 amount)` — allocate from pool
- `executeAgentPayment(address agent, address vendor, uint256 amount)` — pay vendor
- `getAgentUtilization(address agent)` — returns `(allocated, spent, remaining, active)`
- `getAvailableBudget()` — unallocated funds
- `setAgentStatus(address agent, bool active)` — activate/deactivate
- `emergencyWithdraw(uint256 amount)` — owner-only safety valve

**Current State:**
- Total deposited: 100,000 USDC
- Agent Alpha allocated: 50,000+ USDC
- Payments executed: 1,000+ USDC to vendors

### AffiliateSettler.sol

Handles referral/affiliate commission programs.

**How it works:**
1. Register a program: `registerProgram("Referral", affiliateAddress, 500)` (500 bps = 5%)
2. Process payment: `processPayment(programId, vendor, 1000_000000)` (1000 USDC)
3. Automatic split: 950 USDC → vendor, 50 USDC → affiliate

**Key Functions:**
- `registerProgram(string name, address affiliate, uint256 commissionBps)` — max 5000 bps (50%)
- `processPayment(uint256 programId, address vendor, uint256 amount)` — split and transfer
- `toggleProgram(uint256 programId)` — enable/disable
- `getProgram(uint256 programId)` — read program details

**Configured Program:**
- "Demo Referral" — 5% commission to Agent Theta (`0x5a4d612c15B80d641a4b6599195Ca032CeB98215`)

## Deployment Guide

### Prerequisites

```bash
cd contracts
npm install
```

### Environment Setup

Create `contracts/.env`:
```env
DEPLOYER_PRIVATE_KEY=your_private_key_here
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
```

### Deploy

```bash
# Phase 1: Core contracts (MockUSDC, ComplianceRegistry, BudgetVault)
npx hardhat run scripts/deploy.js --network monad-testnet --config hardhat.config.cjs

# Phase 4: V2 Registry + AffiliateSettler
npx hardhat run scripts/deploy-phase4.js --network monad-testnet --config hardhat.config.cjs
```

### Post-Deployment Setup

```bash
# Deposit 100K USDC into BudgetVault
npx hardhat run scripts/deposit-budget.js --network monad-testnet --config hardhat.config.cjs

# Set compliance rules + batch stamp demo
npx hardhat run scripts/phase4-setup-v2.js --network monad-testnet --config hardhat.config.cjs

# Run interaction demo (allocate, pay, stamp)
npx hardhat run scripts/phase2-interactions.js --network monad-testnet --config hardhat.config.cjs
```

## Hardhat Configuration

- **Solidity**: 0.8.20 with optimizer (200 runs)
- **Network**: `monad-testnet` (chain ID 10143, RPC `https://testnet-rpc.monad.xyz`)
- **Dependencies**: OpenZeppelin 5.x for ERC-20 and Ownable
