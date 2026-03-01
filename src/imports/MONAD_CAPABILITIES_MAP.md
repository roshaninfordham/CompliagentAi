# CompliAgent x Monad — Complete Capabilities Map

> **Purpose:** This document lists every capability in the CompliAgent multi-agentic AI system
> that depends on the Monad blockchain. Each entry specifies: what the capability does, where it
> lives in the current codebase (and what's currently mocked), the exact Monad-specific
> technique/API needed, expected inputs/outputs, and a **copy-paste prompt** to ask Monad AI Chat
> for the real implementation code.
>
> **Monad Testnet Specs:**
> - Chain ID: `10143`
> - RPC: `https://testnet-rpc.monad.xyz`
> - Explorer: `https://testnet.monadexplorer.com`
> - Block time: ~400ms | Finality: ~800ms | TPS: 10,000
> - 100% EVM-compatible (Solidity, ethers.js, Hardhat, Foundry all work)
> - Unique RPC method: `eth_sendTransactionSync` (returns receipt in same call)

---

## Table of Contents

1.  [RPC Provider Connection & Health Check](#1-rpc-provider-connection--health-check)
2.  [Live Block Number Subscription](#2-live-block-number-subscription)
3.  [`eth_sendTransactionSync` — Sub-Second Receipts](#3-eth_sendtransactionsync--sub-second-receipts)
4.  [Smart Contract Deployment — ComplianceRegistry.sol](#4-smart-contract-deployment--complianceregistrysol)
5.  [Smart Contract Deployment — BudgetVault.sol](#5-smart-contract-deployment--budgetvaultsol)
6.  [Smart Contract Deployment — AffiliateSettler.sol](#6-smart-contract-deployment--affiliatesettlersol)
7.  [Smart Contract Deployment — MockUSDC.sol (Testnet Token)](#7-smart-contract-deployment--mockusdcsol-testnet-token)
8.  [Contract Interaction — `setComplianceRule()`](#8-contract-interaction--setcompliancerule)
9.  [Contract Interaction — `verifyAndStamp()`](#9-contract-interaction--verifyandstamp)
10. [Contract Interaction — `isCompliant()` (View Call)](#10-contract-interaction--iscompliant-view-call)
11. [Contract Interaction — `getAuditTrail()` (View Call)](#11-contract-interaction--getaudittrail-view-call)
12. [Contract Interaction — `depositBudget()`](#12-contract-interaction--depositbudget)
13. [Contract Interaction — `allocateAgentBudget()`](#13-contract-interaction--allocateagentbudget)
14. [Contract Interaction — `executeAgentPayment()`](#14-contract-interaction--executeagentpayment)
15. [Contract Interaction — `getAgentUtilization()` (View Call)](#15-contract-interaction--getagentutilization-view-call)
16. [Contract Interaction — `registerProgram()` (Affiliate)](#16-contract-interaction--registerprogram-affiliate)
17. [Contract Interaction — `processPayment()` (Affiliate Split)](#17-contract-interaction--processpayment-affiliate-split)
18. [Contract Interaction — `verifyCommissionSplit()` (ZK Verify)](#18-contract-interaction--verifycommissionsplit-zk-verify)
19. [Event Listening — `ComplianceStamped`](#19-event-listening--compliancestamped)
20. [Event Listening — `RuleUpdated`](#20-event-listening--ruleupdated)
21. [Event Listening — `AuditGenerated`](#21-event-listening--auditgenerated)
22. [Event Listening — `BudgetDeposited` / `BudgetAllocated` / `PaymentExecuted`](#22-event-listening--budgetdeposited--budgetallocated--paymentexecuted)
23. [Historical Data Indexing (Envio / Goldsky / Subsquid)](#23-historical-data-indexing-envio--goldsky--subsquid)
24. [Monad Testnet Faucet — Getting Free Test Tokens](#24-monad-testnet-faucet--getting-free-test-tokens)
25. [Wallet Management — Agent Wallet Creation (EOA)](#25-wallet-management--agent-wallet-creation-eoa)
26. [Gas Estimation & Optimization on Monad](#26-gas-estimation--optimization-on-monad)
27. [Transaction Hash → Block Explorer Link](#27-transaction-hash--block-explorer-link)
28. [Monad-Optimized Batch Compliance Stamping](#28-monad-optimized-batch-compliance-stamping)

---

## 1. RPC Provider Connection & Health Check

### What It Does
Establishes a persistent connection to the Monad testnet RPC endpoint, monitors connection health, and exposes connection status to the sidebar UI. This is the foundation — every other Monad capability depends on this.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `Layout.tsx` | L84-96 | Static "Monad Connected" green dot + static "Block #1,847,296" |

### Monad Implementation
```typescript
import { ethers } from "ethers";

// Create provider
const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");

// Health check
async function checkConnection(): Promise<{
  connected: boolean;
  chainId: number;
  blockNumber: number;
  latency: number;
}> {
  const start = Date.now();
  try {
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber(),
    ]);
    return {
      connected: true,
      chainId: Number(network.chainId),  // expect 10143
      blockNumber,
      latency: Date.now() - start,
    };
  } catch (err) {
    return { connected: false, chainId: 0, blockNumber: 0, latency: -1 };
  }
}
```

### What to Replace in Code
```typescript
// Layout.tsx — Replace L88-94:
// BEFORE: static "Monad Connected" + "Block #1,847,296"
// AFTER:
const [monadStatus, setMonadStatus] = useState({ connected: false, blockNumber: 0 });

useEffect(() => {
  const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");
  const check = async () => {
    try {
      const block = await provider.getBlockNumber();
      setMonadStatus({ connected: true, blockNumber: block });
    } catch { setMonadStatus({ connected: false, blockNumber: 0 }); }
  };
  check();
  const interval = setInterval(check, 5000);
  return () => clearInterval(interval);
}, []);
```

### What to Ask Monad AI Chat
> "How do I connect to the Monad testnet RPC with ethers.js v6? I need to: (1) create a JsonRpcProvider pointing to the Monad testnet, (2) verify the chain ID is 10143, (3) get the current block number, and (4) monitor connection health with periodic polling. Also, what is the rate limit on the public Monad testnet RPC (I read 25 req/sec — is that per-IP or per-API-key)?"

---

## 2. Live Block Number Subscription

### What It Does
Subscribes to new block events on Monad to display the live block number in the sidebar and drive real-time dashboard updates. Monad produces blocks every ~400ms, so the block number should update rapidly.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `Layout.tsx` | L92-94 | `Block #1,847,296` — hardcoded, never changes |
| `Dashboard.tsx` | L111-116 | `setInterval` every 3s increments a fake counter instead of reading real blocks |

### Monad Implementation
```typescript
// Option A: WebSocket subscription (if Monad testnet supports WSS)
const wsProvider = new ethers.WebSocketProvider("wss://testnet-rpc.monad.xyz");
wsProvider.on("block", (blockNumber: number) => {
  setBlockNumber(blockNumber);
});

// Option B: Polling (if WSS not available — Monad public RPC may be HTTP-only)
const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");
const interval = setInterval(async () => {
  const block = await provider.getBlockNumber();
  setBlockNumber(block);
}, 2000); // poll every 2s (respects 25 req/sec limit)
```

### What to Ask Monad AI Chat
> "Does the Monad testnet public RPC support WebSocket subscriptions (`wss://`) for real-time block events, or is it HTTP-only? If HTTP-only, what's the recommended polling interval for block numbers given the 25 req/sec rate limit? Also, with 400ms block times, how should I throttle block updates on the frontend to avoid excessive re-renders?"

---

## 3. `eth_sendTransactionSync` — Sub-Second Receipts

### What It Does
Monad's unique RPC method that returns the transaction receipt in the same HTTP response as the send call, instead of requiring a separate `eth_getTransactionReceipt` poll. This is what enables the "800ms settlement" claim — the receipt comes back immediately after the block containing the tx is produced.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AgentDemo.tsx` | L63-71 | Step 5 ("Monad Settlement") — `setTimeout(1000ms)` simulates 800ms finality |
| `AgentDemo.tsx` | L195-203 | Mock tx hash + block number generated with `Math.random()` |
| `Dashboard.tsx` | L335-337 | "Avg. Settlement 0.8s" — static display |

### Monad Implementation
```typescript
// Standard ethers.js does NOT know about eth_sendTransactionSync.
// You must call it as a raw RPC method:

const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Build the transaction
const tx = {
  to: vendorAddress,
  value: ethers.parseEther("0"),
  data: contractInterface.encodeFunctionData("executeAgentPayment", [
    agentAddress, vendorAddress, amount
  ]),
  gasLimit: 200000,
  // Monad uses standard EIP-1559 gas
};

// Sign it
const signedTx = await wallet.signTransaction(tx);

// Send via Monad-specific sync method
const receipt = await provider.send("eth_sendTransactionSync", [signedTx]);
// receipt immediately contains: transactionHash, blockNumber, status, gasUsed
// No need to poll eth_getTransactionReceipt!

console.log(receipt.transactionHash);  // "0x..."
console.log(receipt.blockNumber);      // e.g., 1847296
console.log(receipt.status);           // "0x1" (success)
```

### What to Ask Monad AI Chat
> "How do I use `eth_sendTransactionSync` on Monad testnet with ethers.js v6? I need to: (1) sign a transaction, (2) send it via `provider.send('eth_sendTransactionSync', [signedTx])`, (3) get the receipt back in the same response. Show me the full code including signing, sending, and parsing the receipt. What is the exact format of the receipt returned? Does it match the standard `TransactionReceipt` type, or does it have Monad-specific fields? Also, does this work with contract calls (not just value transfers)?"

---

## 4. Smart Contract Deployment — ComplianceRegistry.sol

### What It Does
Deploys the core compliance contract to Monad testnet. This contract stores compliance rules on-chain, stamps transactions with ZK proof hashes, tracks compliance status, and provides audit trail query functions.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `mock-data.ts` | L283-338 | `complianceRules[]` — 6 static rule objects in local state |
| `mock-data.ts` | L340-374 | `auditReports[]` — 3 static reports with fake proof hashes |
| `ComplianceRules.tsx` | All | Rules are local React state — no on-chain storage |
| `AuditReports.tsx` | All | Reports reference fake block numbers and proof hashes |

### Solidity Contract Spec (from Blueprint)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract ComplianceRegistry is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant STAMPER_ROLE = keccak256("STAMPER_ROLE");

    struct ComplianceStamp {
        bytes32 proofHash;
        uint256 timestamp;
        bool compliant;
    }

    mapping(bytes32 => bytes) public rules;                    // ruleId => ruleData
    mapping(bytes32 => ComplianceStamp) public stamps;         // txHash => stamp
    mapping(address => bytes32[]) public enterpriseAuditTrail; // enterprise => txHashes

    event ComplianceStamped(bytes32 indexed txHash, bytes32 proofHash, uint256 blockNumber);
    event RuleUpdated(bytes32 indexed ruleId, bytes ruleData, address updatedBy);
    event AuditGenerated(bytes32 indexed auditId, bytes32 proofHash, uint256 totalTxns, uint256 compliantCount);

    function setComplianceRule(bytes32 ruleId, bytes calldata ruleData) external onlyRole(COMPLIANCE_ADMIN);
    function verifyAndStamp(bytes32 txHash, bytes32 proofHash) external onlyRole(STAMPER_ROLE);
    function isCompliant(bytes32 txHash) external view returns (bool);
    function getAuditTrail(address enterprise, uint256 from, uint256 to) external view returns (bytes32[] memory);
}
```

### Deployment Command (Hardhat)
```bash
npx hardhat run scripts/deploy-compliance.ts --network monad-testnet
```

### Hardhat Config for Monad
```typescript
// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    "monad-testnet": {
      url: "https://testnet-rpc.monad.xyz",
      chainId: 10143,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
    },
  },
};

export default config;
```

### What to Ask Monad AI Chat
> "How do I deploy a Solidity smart contract to Monad testnet using Hardhat? The contract uses OpenZeppelin AccessControl and is called ComplianceRegistry.sol. I need: (1) the full hardhat.config.ts with Monad testnet network config (RPC URL, chain ID 10143), (2) a deployment script that deploys and verifies the contract, (3) confirmation that OpenZeppelin v5.x works on Monad, and (4) any Monad-specific deployment considerations (gas price, gas limit, compiler settings). Does Monad testnet support contract verification via Etherscan-compatible APIs?"

---

## 5. Smart Contract Deployment — BudgetVault.sol

### What It Does
Manages USDC budgets for AI agents on-chain. Enterprises deposit stablecoins, allocate per-agent spending caps, and the contract enforces budget limits on every payment — rejecting transactions that exceed the agent's cap.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `mock-data.ts` | L52-141 | `agents[]` — `budgetAllocated` and `budgetUsed` are static numbers |
| `mock-data.ts` | L391-401 | `dashboardStats.totalBudget: 530000, budgetUsed: 370100` — hardcoded |
| `AgentManager.tsx` | L273-275 | "Allocate Budget" button — no-op |
| `Dashboard.tsx` | L118-120 | Budget utilization bar — reads static `dashboardStats` |

### Solidity Contract Spec (from Blueprint)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BudgetVault is Ownable {
    IERC20 public stablecoin;  // USDC on Monad

    struct AgentBudget {
        uint256 allocated;
        uint256 spent;
        bool active;
    }

    mapping(address => AgentBudget) public agentBudgets;
    uint256 public totalDeposited;
    uint256 public totalAllocated;

    event BudgetDeposited(address indexed enterprise, uint256 amount);
    event BudgetAllocated(address indexed agent, uint256 limit);
    event PaymentExecuted(address indexed agent, address indexed vendor, uint256 amount, uint256 remaining);
    event AgentPaused(address indexed agent);
    event AgentActivated(address indexed agent);

    function depositBudget(uint256 amount) external;
    function allocateAgentBudget(address agent, uint256 limit) external onlyOwner;
    function executeAgentPayment(address agent, address vendor, uint256 amount) external;
    function getAgentUtilization(address agent) external view returns (uint256 allocated, uint256 spent, uint256 remaining);
    function pauseAgent(address agent) external onlyOwner;
    function activateAgent(address agent) external onlyOwner;
}
```

### What to Ask Monad AI Chat
> "How do I deploy a BudgetVault.sol contract on Monad testnet that holds ERC-20 stablecoins (USDC) and enforces per-agent spending caps? I need: (1) the full Solidity contract with deposit, allocate, and executePayment functions, (2) ERC-20 approval flow for the vault to spend enterprise USDC, (3) deployment script, and (4) what ERC-20 stablecoin address to use on Monad testnet — is there an official USDC on Monad testnet, or do I deploy a MockUSDC? Also, how do I handle the decimal precision (USDC is 6 decimals)?"

---

## 6. Smart Contract Deployment — AffiliateSettler.sol

### What It Does
Handles three-party commerce: a buyer pays, the contract splits the payment between a merchant and an affiliate based on a registered commission rate, and a ZK proof verifies the split is correct.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AgentDemo.tsx` | L82-131 | `affiliateSteps[]` — Steps 4 & 5 simulate affiliate + merchant payments |
| `AgentDemo.tsx` | L99-106 | Step 3 ("ZK Commission Verification") — mock proof generation |

### Solidity Contract Spec (from Blueprint)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AffiliateSettler {
    IERC20 public stablecoin;

    struct AffiliateProgram {
        address merchant;
        address affiliate;
        uint256 commissionBps;  // basis points (e.g., 1500 = 15%)
        bool active;
    }

    mapping(bytes32 => AffiliateProgram) public programs;

    event ProgramRegistered(bytes32 indexed programId, address merchant, address affiliate, uint256 commissionBps);
    event PaymentSplit(bytes32 indexed programId, uint256 total, uint256 merchantAmount, uint256 affiliateAmount, bytes32 proofHash);

    function registerProgram(bytes32 id, address merchant, address affiliate, uint256 commissionBps) external;
    function processPayment(bytes32 programId, uint256 total) external;
    function verifyCommissionSplit(bytes calldata zkProof) external view returns (bool);
}
```

### What to Ask Monad AI Chat
> "How do I deploy an AffiliateSettler.sol contract on Monad testnet that splits ERC-20 payments between a merchant and affiliate? The contract should: (1) register affiliate programs with commission rates in basis points, (2) accept a buyer's payment and atomically split it into two transfers (merchant + affiliate), (3) accept a ZK proof hash that verifies the split is correct, and (4) emit events for the dashboard. Show me the full Solidity contract and deployment script for Monad testnet."

---

## 7. Smart Contract Deployment — MockUSDC.sol (Testnet Token)

### What It Does
Deploys a mock USDC ERC-20 token on Monad testnet for testing. This allows minting arbitrary amounts of "USDC" for demo purposes without needing real stablecoins.

### Where It Is in the Codebase (Currently Mocked)
- **Not yet deployed.** All USDC amounts are JavaScript numbers in `mock-data.ts`.

### Solidity Contract
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDC is ERC20, Ownable {
    constructor() ERC20("Mock USDC", "USDC") Ownable(msg.sender) {}

    function decimals() public pure override returns (uint8) { return 6; }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
```

### What to Ask Monad AI Chat
> "Is there an official USDC or test stablecoin deployed on Monad testnet that I can use? If not, how do I deploy a MockUSDC ERC-20 token with 6 decimals on Monad testnet? I need to mint tokens to multiple addresses for demo purposes. Show me the deployment script and the mint call."

---

## 8. Contract Interaction — `setComplianceRule()`

### What It Does
Writes a compliance rule to the on-chain ComplianceRegistry. Called when the CFO Admin creates or updates a rule in the Compliance Rules page.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `ComplianceRules.tsx` | L204-258 | "Add Rule" modal — submit just calls `setShowAddRule(false)`, no persistence |
| `ComplianceRules.tsx` | L32-36 | `toggleRule()` — toggles `enabled` in local React state only |

### Monad Implementation
```typescript
import { ethers } from "ethers";
import ComplianceRegistryABI from "./abis/ComplianceRegistry.json";

const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");
const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
const contract = new ethers.Contract(COMPLIANCE_REGISTRY_ADDRESS, ComplianceRegistryABI, wallet);

async function setRule(ruleId: string, ruleData: object) {
  const ruleIdBytes = ethers.id(ruleId);  // keccak256 hash
  const encodedData = ethers.toUtf8Bytes(JSON.stringify(ruleData));

  // Use Monad's sync send for instant receipt
  const tx = await contract.setComplianceRule(ruleIdBytes, encodedData);
  const receipt = await tx.wait();  // or use eth_sendTransactionSync

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}
```

### What to Ask Monad AI Chat
> "How do I call a Solidity function on a deployed contract on Monad testnet using ethers.js v6? Specifically, I'm calling `setComplianceRule(bytes32 ruleId, bytes ruleData)` on my ComplianceRegistry contract. I need: (1) how to encode the parameters (bytes32 and bytes), (2) how to sign and send the transaction, (3) how to use `eth_sendTransactionSync` instead of polling for the receipt, and (4) the expected gas cost. Does Monad have any gas price quirks I should know about (e.g., EIP-1559 base fee behavior)?"

---

## 9. Contract Interaction — `verifyAndStamp()`

### What It Does
Stamps a transaction as compliant by storing its ZK proof hash on-chain. This is called by the CompliAgent backend after a compliance check passes and Unlink generates the ZK proof. This is the **core on-chain operation** — it creates the immutable audit trail.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AgentDemo.tsx` | L187-203 | Steps 4 & 5 — mock proof hash and tx hash generated with `Math.random()` |
| `TransactionFeed.tsx` | L43-62 | Live feed mock transactions have random `proofHash` and `blockNumber` |
| `mock-data.ts` | L155-156 | `proofHash: "0xZK01...a3f2"` — static strings |

### Monad Implementation
```typescript
async function stampTransaction(txHash: string, proofHash: string) {
  const txHashBytes = ethers.zeroPadValue(ethers.toBeHex(txHash), 32);
  const proofHashBytes = ethers.zeroPadValue(ethers.toBeHex(proofHash), 32);

  const stampTx = await contract.verifyAndStamp(txHashBytes, proofHashBytes);
  const receipt = await stampTx.wait();

  // The ComplianceStamped event is emitted here
  const event = receipt.logs.find(
    (log: any) => log.fragment?.name === "ComplianceStamped"
  );

  return {
    stampTxHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    proofHash: proofHash,
    gasUsed: receipt.gasUsed.toString(),
  };
}
```

### What to Ask Monad AI Chat
> "How do I call `verifyAndStamp(bytes32 txHash, bytes32 proofHash)` on a Solidity contract deployed on Monad testnet, and immediately get the transaction receipt using `eth_sendTransactionSync`? I need the receipt to include the emitted `ComplianceStamped` event log. Show me how to parse the event from the receipt logs using ethers.js v6. Also, what's the expected gas cost for a storage write + event emission on Monad?"

---

## 10. Contract Interaction — `isCompliant()` (View Call)

### What It Does
Read-only query to check if a transaction has been stamped as compliant. This is a free call (no gas) used by the dashboard to display compliance badges in real-time.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `mock-data.ts` | L148-154 | `status: "compliant" | "rejected" | "pending"` — static strings |
| `TransactionFeed.tsx` | L17-30 | `ComplianceBadge` component reads `status` from mock data |

### Monad Implementation
```typescript
// View calls are free — no gas, no signing needed
async function checkCompliance(txHash: string): Promise<boolean> {
  const txHashBytes = ethers.zeroPadValue(ethers.toBeHex(txHash), 32);
  const isCompliant = await contract.isCompliant(txHashBytes);
  return isCompliant; // true/false
}
```

### What to Ask Monad AI Chat
> "How do I make a read-only view call to a Solidity contract on Monad testnet using ethers.js v6? I'm calling `isCompliant(bytes32 txHash) returns (bool)`. I need confirmation that view calls on Monad are free (no gas), and the expected latency for a view call on the public testnet RPC."

---

## 11. Contract Interaction — `getAuditTrail()` (View Call)

### What It Does
Queries the on-chain audit trail for an enterprise over a time range. Returns an array of transaction hashes that were compliance-stamped during that period. Used by the Audit Reports page.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AuditReports.tsx` | L120-197 | Report list — reads from static `auditReports[]` array |
| `mock-data.ts` | L340-374 | `auditReports[]` — 3 static reports with hardcoded stats |

### Monad Implementation
```typescript
async function getAuditTrail(
  enterpriseAddress: string,
  fromTimestamp: number,
  toTimestamp: number
): Promise<string[]> {
  const txHashes = await contract.getAuditTrail(
    enterpriseAddress,
    fromTimestamp,
    toTimestamp
  );
  return txHashes; // bytes32[]
}
```

### What to Ask Monad AI Chat
> "How do I query a Solidity contract's view function that returns a `bytes32[]` array on Monad testnet using ethers.js v6? The function is `getAuditTrail(address enterprise, uint256 from, uint256 to) returns (bytes32[])`. For large arrays (1,000+ entries), are there gas limits on view calls on Monad, or can I read arbitrarily large arrays? Should I use pagination instead?"

---

## 12. Contract Interaction — `depositBudget()`

### What It Does
Enterprise deposits USDC into the BudgetVault contract. This is the first step in the budget management flow — before any agent can spend, the enterprise must fund the vault.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `mock-data.ts` | L396 | `totalBudget: 530000` — static number, no on-chain deposit |
| `Dashboard.tsx` | L163-187 | Budget bar reads static `dashboardStats` values |

### Monad Implementation (Two-Step: Approve + Deposit)
```typescript
// Step 1: Approve the vault to spend USDC
const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
const approveTx = await usdc.approve(
  BUDGET_VAULT_ADDRESS,
  ethers.parseUnits("530000", 6)  // USDC has 6 decimals
);
await approveTx.wait();

// Step 2: Deposit into the vault
const vault = new ethers.Contract(BUDGET_VAULT_ADDRESS, BudgetVaultABI, wallet);
const depositTx = await vault.depositBudget(ethers.parseUnits("530000", 6));
const receipt = await depositTx.wait();
```

### What to Ask Monad AI Chat
> "How do I do an ERC-20 approve + deposit flow on Monad testnet with ethers.js v6? I need to: (1) approve a vault contract to spend my USDC, (2) call `depositBudget(uint256 amount)` which internally calls `transferFrom`. USDC has 6 decimals. Show me the full two-step flow with proper `parseUnits` and `eth_sendTransactionSync` for both transactions."

---

## 13. Contract Interaction — `allocateAgentBudget()`

### What It Does
Enterprise admin assigns a spending cap to a specific AI agent wallet. The agent can then spend up to this amount via `executeAgentPayment()`.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AgentManager.tsx` | L273-275 | "Allocate Budget" button — styled but no-op |
| `mock-data.ts` | L58 | `budgetAllocated: 50000` — static per agent |

### Monad Implementation
```typescript
async function allocateBudget(agentAddress: string, limitUSDC: number) {
  const amount = ethers.parseUnits(limitUSDC.toString(), 6);
  const tx = await vault.allocateAgentBudget(agentAddress, amount);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}
```

### What to Ask Monad AI Chat
> "How do I call `allocateAgentBudget(address agent, uint256 limit)` on a deployed contract on Monad testnet? The limit is in USDC (6 decimals). I want to allocate $50,000 to an agent. Show me the ethers.js v6 call with proper unit conversion, and how to confirm the allocation was successful by reading back the agent's budget."

---

## 14. Contract Interaction — `executeAgentPayment()`

### What It Does
The core payment execution. When an AI agent needs to pay a vendor (x402 flow), this function: (1) checks the agent's remaining budget, (2) rejects if over-budget, (3) transfers USDC from the vault to the vendor, (4) updates the agent's spent amount. This is the on-chain enforcement point for budget compliance.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AgentDemo.tsx` | L63-71 | Step 5 ("Monad Settlement") — `setTimeout(1000ms)` |
| `TransactionFeed.tsx` | L43-62 | Live transactions generate random `amount` and `status` |
| `mock-data.ts` | L148-150 | `amount: 245.00, status: "compliant"` — hardcoded |

### Monad Implementation
```typescript
async function executePayment(
  agentAddress: string,
  vendorAddress: string,
  amountUSDC: number
): Promise<{
  txHash: string;
  blockNumber: number;
  status: "compliant" | "rejected";
  gasUsed: string;
}> {
  const amount = ethers.parseUnits(amountUSDC.toString(), 6);

  try {
    const tx = await vault.executeAgentPayment(agentAddress, vendorAddress, amount);
    const receipt = await tx.wait();

    // Parse PaymentExecuted event
    const event = receipt.logs.find(
      (log: any) => log.fragment?.name === "PaymentExecuted"
    );

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      status: "compliant",
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (err: any) {
    // Contract reverts if over-budget or agent paused
    return {
      txHash: "",
      blockNumber: 0,
      status: "rejected",
      gasUsed: "0",
    };
  }
}
```

### What to Ask Monad AI Chat
> "How do I call `executeAgentPayment(address agent, address vendor, uint256 amount)` on a BudgetVault contract on Monad testnet, where the function internally checks if `agent.spent + amount <= agent.allocated` and reverts with a custom error if the budget is exceeded? I need to: (1) handle the revert gracefully in ethers.js v6, (2) parse the `PaymentExecuted` event on success, (3) use `eth_sendTransactionSync` for the fastest receipt. What does a Monad contract revert look like in ethers.js — do I get custom error data?"

---

## 15. Contract Interaction — `getAgentUtilization()` (View Call)

### What It Does
Read-only query returning an agent's budget allocation, amount spent, and remaining balance. Used by the Agent Manager table and the Dashboard budget bars.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AgentManager.tsx` | L133-134 | `utilization = (budgetUsed / budgetAllocated) * 100` — from static mock data |
| `Dashboard.tsx` | L278-292 | Agent budget mini-bars — from static `agents[]` |

### Monad Implementation
```typescript
async function getUtilization(agentAddress: string): Promise<{
  allocated: number;
  spent: number;
  remaining: number;
  utilizationPercent: number;
}> {
  const [allocated, spent, remaining] = await vault.getAgentUtilization(agentAddress);
  const alloc = Number(ethers.formatUnits(allocated, 6));
  const sp = Number(ethers.formatUnits(spent, 6));
  const rem = Number(ethers.formatUnits(remaining, 6));
  return {
    allocated: alloc,
    spent: sp,
    remaining: rem,
    utilizationPercent: alloc > 0 ? Math.round((sp / alloc) * 100) : 0,
  };
}
```

### What to Ask Monad AI Chat
> "How do I call a Solidity view function that returns multiple values `(uint256, uint256, uint256)` on Monad testnet using ethers.js v6? The function is `getAgentUtilization(address) returns (uint256 allocated, uint256 spent, uint256 remaining)`. All values are in USDC (6 decimals). Show me how to destructure the return values and format them."

---

## 16. Contract Interaction — `registerProgram()` (Affiliate)

### What It Does
Registers a new affiliate program on-chain with a merchant address, affiliate address, and commission rate in basis points (e.g., 1500 = 15%).

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AgentDemo.tsx` | L82-86 | Affiliate demo — merchant/affiliate identities are hardcoded in step descriptions |

### Monad Implementation
```typescript
async function registerAffiliateProgram(
  programId: string,
  merchantAddress: string,
  affiliateAddress: string,
  commissionPercent: number  // e.g., 15 for 15%
) {
  const idBytes = ethers.id(programId);
  const commissionBps = commissionPercent * 100; // 15% -> 1500 bps

  const tx = await affiliateContract.registerProgram(
    idBytes, merchantAddress, affiliateAddress, commissionBps
  );
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}
```

### What to Ask Monad AI Chat
> "How do I register an affiliate program on a Solidity contract on Monad testnet? The function signature is `registerProgram(bytes32 id, address merchant, address affiliate, uint256 commissionBps)`. I want to register a 15% commission program. Show me the full ethers.js v6 call with basis point conversion."

---

## 17. Contract Interaction — `processPayment()` (Affiliate Split)

### What It Does
Buyer calls this function with the total payment amount. The contract atomically splits the USDC: `commissionBps / 10000 * total` goes to the affiliate, the rest goes to the merchant. Both transfers happen in a single Monad transaction.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AgentDemo.tsx` | L108-130 | Steps 4 & 5 — two separate `setTimeout` calls simulate two shielded transfers |

### Monad Implementation
```typescript
async function processAffiliatePayment(programId: string, totalUSDC: number) {
  const idBytes = ethers.id(programId);
  const total = ethers.parseUnits(totalUSDC.toString(), 6);

  // Buyer must have approved the AffiliateSettler contract to spend their USDC
  const tx = await affiliateContract.processPayment(idBytes, total);
  const receipt = await tx.wait();

  // Parse PaymentSplit event for the exact amounts
  const event = receipt.logs.find(
    (log: any) => log.fragment?.name === "PaymentSplit"
  );

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    merchantAmount: ethers.formatUnits(event.args.merchantAmount, 6),
    affiliateAmount: ethers.formatUnits(event.args.affiliateAmount, 6),
    proofHash: event.args.proofHash,
  };
}
```

### What to Ask Monad AI Chat
> "How do I process a payment split on a Solidity contract on Monad testnet where a single transaction atomically sends USDC to two recipients (merchant and affiliate)? The contract has `processPayment(bytes32 programId, uint256 total)` which internally does two `transfer()` calls. Does Monad handle the two internal ERC-20 transfers atomically in one block? What happens if the second transfer fails — does the entire transaction revert? Show me the gas cost estimate for a double-transfer transaction."

---

## 18. Contract Interaction — `verifyCommissionSplit()` (ZK Verify)

### What It Does
On-chain verification hook that validates a ZK proof confirming the affiliate commission split is mathematically correct (`affiliate + merchant = total`). This is the on-chain counterpart to the Unlink ZK proof — the proof is generated off-chain by Unlink, and this function verifies it on-chain.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AgentDemo.tsx` | L99-106 | Step 3 ("ZK Commission Verification") — generates fake proof hash |

### Monad Implementation
```solidity
// In AffiliateSettler.sol:
function verifyCommissionSplit(bytes calldata zkProof) external view returns (bool) {
    // Option A: Simple hash verification (hackathon)
    // Store expected proof hash during processPayment, compare here
    
    // Option B: Full ZK verifier (production)
    // Deploy a Groth16/PLONK verifier contract on Monad
    // Call verifier.verifyProof(zkProof, publicInputs)
}
```

### What to Ask Monad AI Chat
> "Can I deploy a ZK proof verifier contract (Groth16 or PLONK) on Monad testnet? Monad is 100% EVM-compatible, so I expect Solidity-based verifiers work. What's the gas cost of on-chain ZK proof verification on Monad? For the hackathon, is it simpler to just store the proof hash on-chain and do off-chain verification, or is on-chain verification feasible with Monad's gas economics?"

---

## 19. Event Listening — `ComplianceStamped`

### What It Does
Subscribes to `ComplianceStamped(bytes32 txHash, bytes32 proofHash, uint256 blockNumber)` events emitted by the ComplianceRegistry contract. This drives the real-time transaction feed on the dashboard — every time a compliance stamp is recorded, the feed updates.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `TransactionFeed.tsx` | L40-66 | `setInterval` every 5s generates a random mock transaction |
| `Dashboard.tsx` | L111-116 | `setInterval` every 3s increments a fake transaction counter |

### Monad Implementation
```typescript
const contract = new ethers.Contract(
  COMPLIANCE_REGISTRY_ADDRESS,
  ComplianceRegistryABI,
  provider
);

// Real-time event subscription
contract.on("ComplianceStamped", (txHash, proofHash, blockNumber, event) => {
  const newTransaction: Transaction = {
    id: `tx-${Date.now()}`,
    txHash: txHash,
    proofHash: proofHash,
    blockNumber: Number(blockNumber),
    timestamp: new Date(),
    status: "compliant",
    shielded: true,  // determined by Unlink integration
    // Agent name, vendor, amount — fetched from backend or event args
  };

  setTransactions(prev => [newTransaction, ...prev].slice(0, 50));
  setLiveTxCount(prev => prev + 1);
});
```

### What to Ask Monad AI Chat
> "How do I listen for Solidity events emitted on Monad testnet in real-time using ethers.js v6? My contract emits `event ComplianceStamped(bytes32 indexed txHash, bytes32 proofHash, uint256 blockNumber)`. Does the Monad public testnet RPC support WebSocket event subscriptions, or do I need to use HTTP polling with `getLogs()`? With 400ms block times, what's the recommended approach for real-time event listening without exceeding the 25 req/sec rate limit? Should I use an indexer like Envio or Goldsky instead?"

---

## 20. Event Listening — `RuleUpdated`

### What It Does
Listens for `RuleUpdated(bytes32 ruleId, bytes ruleData, address updatedBy)` events to sync the Compliance Rules page when rules are changed on-chain (possibly by another admin or a batch update script).

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `ComplianceRules.tsx` | L26-27 | `const [rules, setRules] = useState(complianceRules)` — local state, no chain sync |

### Monad Implementation
```typescript
contract.on("RuleUpdated", (ruleId, ruleData, updatedBy) => {
  const decoded = JSON.parse(ethers.toUtf8String(ruleData));
  setRules(prev =>
    prev.map(r => r.id === ruleId ? { ...r, ...decoded, updatedBy } : r)
  );
  toast.success("Rule updated on-chain", { description: `By ${updatedBy}` });
});
```

### What to Ask Monad AI Chat
> "How do I listen for a `RuleUpdated` event on Monad testnet and decode the `bytes ruleData` parameter back into a JSON object using ethers.js v6? The data was originally encoded with `ethers.toUtf8Bytes(JSON.stringify(ruleData))`."

---

## 21. Event Listening — `AuditGenerated`

### What It Does
Fires when a new ZK audit report is generated and its proof hash is stored on-chain. Updates the Audit Reports page in real-time.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `AuditReports.tsx` | L22-25 | `handleGenerate()` — sets loading for 2.5s, doesn't create real report |

### Monad Implementation
```typescript
contract.on("AuditGenerated", (auditId, proofHash, totalTxns, compliantCount, event) => {
  const newReport: AuditReport = {
    id: auditId,
    proofHash: proofHash,
    totalTransactions: Number(totalTxns),
    compliantCount: Number(compliantCount),
    rejectedCount: Number(totalTxns) - Number(compliantCount),
    passRate: Number(compliantCount) / Number(totalTxns) * 100,
    blockNumber: event.log.blockNumber,
    generatedAt: new Date(),
    status: "verified",
  };
  setAuditReports(prev => [newReport, ...prev]);
});
```

### What to Ask Monad AI Chat
> "When I emit an event with multiple `uint256` parameters on Monad, how do I read them in ethers.js v6? My event is `AuditGenerated(bytes32 indexed auditId, bytes32 proofHash, uint256 totalTransactions, uint256 compliantCount, uint256 blockNumber)`. Show me how to parse all fields from the event object."

---

## 22. Event Listening — `BudgetDeposited` / `BudgetAllocated` / `PaymentExecuted`

### What It Does
Three events from the BudgetVault contract that drive real-time updates on the Dashboard (budget bar), Agent Manager (utilization), and Transaction Feed (new payments).

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `Dashboard.tsx` | L118-120 | Budget bar reads static `dashboardStats` |
| `AgentManager.tsx` | L133-134 | Utilization calculated from static `agent.budgetUsed` |

### Monad Implementation
```typescript
vault.on("BudgetDeposited", (enterprise, amount) => {
  setDashboardStats(prev => ({
    ...prev,
    totalBudget: prev.totalBudget + Number(ethers.formatUnits(amount, 6)),
  }));
});

vault.on("BudgetAllocated", (agent, limit) => {
  setAgents(prev =>
    prev.map(a => a.wallet === agent
      ? { ...a, budgetAllocated: Number(ethers.formatUnits(limit, 6)) }
      : a
    )
  );
});

vault.on("PaymentExecuted", (agent, vendor, amount, remaining) => {
  setAgents(prev =>
    prev.map(a => a.wallet === agent
      ? {
          ...a,
          budgetUsed: a.budgetAllocated - Number(ethers.formatUnits(remaining, 6)),
          lastTransaction: "just now",
        }
      : a
    )
  );
});
```

### What to Ask Monad AI Chat
> "I have a BudgetVault contract on Monad testnet that emits three events: `BudgetDeposited(address enterprise, uint256 amount)`, `BudgetAllocated(address agent, uint256 limit)`, and `PaymentExecuted(address agent, address vendor, uint256 amount, uint256 remaining)`. How do I subscribe to all three events simultaneously using ethers.js v6? Can I use a single provider connection for multiple event listeners on Monad?"

---

## 23. Historical Data Indexing (Envio / Goldsky / Subsquid)

### What It Does
Monad's blueprint specifically recommends using indexers instead of `getLogs()` for historical data queries. This is critical for the Audit Reports page (querying months of compliance stamps) and the Transaction Feed (loading historical transactions on page load).

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `TransactionFeed.tsx` | L37 | `const [txList, setTxList] = useState(transactions)` — loads 10 mock transactions |
| `AuditReports.tsx` | All | Reads from static `auditReports[]` — 3 hardcoded reports |
| `Dashboard.tsx` | L108 | `dashboardStats.totalTransactions: 14892` — static counter |

### Indexer Options for Monad

| Indexer | Approach | Monad Support |
|---------|----------|---------------|
| **Envio** | HyperIndex — fast, Rust-based, code-gen from ABI | Confirmed Monad support |
| **Goldsky** | Managed subgraph hosting + Mirror pipelines | Confirmed Monad support |
| **Subsquid** | Squid SDK — TypeScript-based indexer | Confirmed Monad support |

### Example: Envio HyperIndex Config
```yaml
# config.yaml (Envio)
name: compliagent-indexer
networks:
  - id: 10143  # Monad testnet
    rpc_config:
      url: "https://testnet-rpc.monad.xyz"
    contracts:
      - name: ComplianceRegistry
        address: "0x..."
        handler: src/handlers/compliance.ts
        events:
          - event: ComplianceStamped(bytes32 indexed txHash, bytes32 proofHash, uint256 blockNumber)
          - event: RuleUpdated(bytes32 indexed ruleId, bytes ruleData, address updatedBy)
          - event: AuditGenerated(bytes32 indexed auditId, bytes32 proofHash, uint256 totalTxns, uint256 compliantCount)
      - name: BudgetVault
        address: "0x..."
        handler: src/handlers/budget.ts
        events:
          - event: PaymentExecuted(address indexed agent, address indexed vendor, uint256 amount, uint256 remaining)
```

### What to Ask Monad AI Chat
> "What is the recommended way to index historical smart contract events on Monad testnet? The blueprint mentions Envio, Goldsky, and Subsquid. I have three contracts emitting 6+ event types. For my hackathon demo, which indexer is fastest to set up? I need: (1) historical event queries for loading the transaction feed on page load, (2) aggregate queries for the audit reports page (total compliant count over a date range), and (3) real-time updates as new events are emitted. Also, does Monad testnet support `eth_getLogs` with large block ranges, or will it timeout — is that why the blueprint says to use indexers?"

---

## 24. Monad Testnet Faucet — Getting Free Test Tokens

### What It Does
Gets free MON (Monad's native gas token) on the testnet for deploying contracts and sending transactions. Without gas tokens, nothing works.

### Where It Is in the Codebase (Currently Mocked)
- **Not yet needed.** All transactions are simulated in JavaScript. Once you deploy real contracts, you need gas.

### Faucet Process
```
1. Go to https://testnet.monad.xyz/ (or the faucet page)
2. Connect your wallet
3. Request testnet MON
4. Check balance: await provider.getBalance("0x...")
```

### What to Ask Monad AI Chat
> "How do I get testnet MON tokens from the Monad testnet faucet? I need enough gas to: (1) deploy 4 smart contracts (ComplianceRegistry, BudgetVault, AffiliateSettler, MockUSDC), (2) run ~100 demo transactions for my hackathon. How much MON does a typical contract deployment cost on Monad testnet? Is there a daily faucet limit?"

---

## 25. Wallet Management — Agent Wallet Creation (EOA)

### What It Does
Creates standard Ethereum EOA wallets for AI agents (before Unlink's burner abstraction is wired up). These are the raw wallets that will later be wrapped by Unlink's burner account system.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `mock-data.ts` | L55 | `wallet: "0x7a3B...4f2E"` — truncated static strings |
| `AgentManager.tsx` | L68-71 | "Deploy Agent" button — no wallet creation |

### Monad Implementation (ethers.js)
```typescript
import { ethers } from "ethers";

function createAgentWallet(): { address: string; privateKey: string } {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,          // "0x..."
    privateKey: wallet.privateKey,    // "0x..." — STORE SECURELY
  };
}

// Connect wallet to Monad
function connectWallet(privateKey: string): ethers.Wallet {
  const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");
  return new ethers.Wallet(privateKey, provider);
}
```

### What to Ask Monad AI Chat
> "How do I programmatically create Ethereum wallets and connect them to Monad testnet using ethers.js v6? I need to create ~8 agent wallets, fund them with testnet MON for gas, and use them to call smart contract functions. What's the best practice for managing multiple wallet private keys in a Node.js backend?"

---

## 26. Gas Estimation & Optimization on Monad

### What It Does
Estimates gas costs for all contract interactions and optimizes transaction parameters for Monad's EIP-1559 gas model. Monad's high TPS means gas is generally cheap, but estimation is still needed for accurate UX.

### Where It Is in the Codebase (Currently Mocked)
- **No gas handling.** All transactions are simulated.

### Monad Implementation
```typescript
// Estimate gas for a specific call
async function estimateGas(
  contract: ethers.Contract,
  method: string,
  args: any[]
): Promise<{ gasLimit: bigint; gasCost: string }> {
  const gasEstimate = await contract[method].estimateGas(...args);

  // Monad uses EIP-1559
  const feeData = await provider.getFeeData();
  const gasCost = gasEstimate * (feeData.maxFeePerGas || 0n);

  return {
    gasLimit: gasEstimate,
    gasCost: ethers.formatEther(gasCost) + " MON",
  };
}
```

### What to Ask Monad AI Chat
> "How does gas pricing work on Monad testnet? Does Monad use EIP-1559 with `maxFeePerGas` and `maxPriorityFeePerGas`? What are typical gas costs for: (1) a simple storage write (compliance stamp), (2) an ERC-20 transfer, (3) a contract deployment? Is there a Monad-specific gas estimation quirk I should know about? What's `baseFee` behavior on Monad compared to Ethereum?"

---

## 27. Transaction Hash → Block Explorer Link

### What It Does
Converts Monad transaction hashes into clickable links to the Monad block explorer. Used throughout the dashboard wherever a tx hash is displayed.

### Where It Is in the Codebase (Currently Mocked)

| File | Line(s) | What's Mocked |
|------|---------|---------------|
| `TransactionFeed.tsx` | L213-216 | Tx hash shown as plain text: `0x8f4a...2c1e` — no link |
| `Dashboard.tsx` | L233-234 | Tx hash shown as plain text in live feed — no link |
| `AgentDemo.tsx` | L417-429 | Result panel shows tx hash with copy button — no explorer link |
| `AuditReports.tsx` | L159-162 | Block number shown as plain text — no link |

### Implementation
```typescript
function getExplorerUrl(txHash: string): string {
  return `https://testnet.monadexplorer.com/tx/${txHash}`;
}

function getBlockUrl(blockNumber: number): string {
  return `https://testnet.monadexplorer.com/block/${blockNumber}`;
}

function getAddressUrl(address: string): string {
  return `https://testnet.monadexplorer.com/address/${address}`;
}

// In JSX:
<a
  href={getExplorerUrl(tx.txHash)}
  target="_blank"
  rel="noopener noreferrer"
  className="text-[12px] text-[#7C3AED] hover:underline"
  style={{ fontFamily: "'Roboto Mono', monospace" }}
>
  {tx.txHash}
  <ExternalLink className="w-3 h-3 inline ml-1" />
</a>
```

### What to Ask Monad AI Chat
> "What is the correct Monad testnet block explorer URL format? Is it `https://testnet.monadexplorer.com/tx/{hash}` or a different format? Does Monad testnet have a Blockscout or Etherscan-compatible explorer? I need URL patterns for transactions, blocks, and addresses."

---

## 28. Monad-Optimized Batch Compliance Stamping

### What It Does
Leverages Monad's 10,000 TPS to stamp multiple transactions as compliant in a single block. Instead of sending one `verifyAndStamp()` per transaction, batch multiple stamps into a single contract call or send them in rapid succession knowing Monad can handle the throughput.

### Where It Is in the Codebase (Currently Mocked)
- **Not yet implemented.** Current flow stamps one transaction at a time.

### Solidity Addition
```solidity
// Add to ComplianceRegistry.sol:
function batchVerifyAndStamp(
    bytes32[] calldata txHashes,
    bytes32[] calldata proofHashes
) external onlyRole(STAMPER_ROLE) {
    require(txHashes.length == proofHashes.length, "Length mismatch");
    for (uint256 i = 0; i < txHashes.length; i++) {
        stamps[txHashes[i]] = ComplianceStamp({
            proofHash: proofHashes[i],
            timestamp: block.timestamp,
            compliant: true
        });
        enterpriseAuditTrail[msg.sender].push(txHashes[i]);
        emit ComplianceStamped(txHashes[i], proofHashes[i], block.number);
    }
}
```

### Monad Implementation (ethers.js)
```typescript
async function batchStamp(
  stamps: Array<{ txHash: string; proofHash: string }>
) {
  const txHashes = stamps.map(s => ethers.zeroPadValue(ethers.toBeHex(s.txHash), 32));
  const proofHashes = stamps.map(s => ethers.zeroPadValue(ethers.toBeHex(s.proofHash), 32));

  const tx = await contract.batchVerifyAndStamp(txHashes, proofHashes);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    stampsProcessed: stamps.length,
    gasUsed: receipt.gasUsed.toString(),
    gasPerStamp: (receipt.gasUsed / BigInt(stamps.length)).toString(),
  };
}
```

### What to Ask Monad AI Chat
> "What is the maximum number of storage writes I can do in a single Monad transaction? I have a `batchVerifyAndStamp()` function that loops over an array and does a storage write + event emit for each entry. On Ethereum, gas limits cap this at ~30-50 iterations. What is Monad's block gas limit, and how many iterations can I fit in a single transaction? Is there a Monad-specific optimization for batch writes (e.g., parallel storage access)?"

---

## Quick Reference: All Monad Capabilities by Priority

| # | Capability | Type | Priority |
|---|-----------|------|----------|
| 1 | RPC Provider Connection | Infra | **P0 — Critical** |
| 2 | Live Block Subscription | Infra | **P0 — Critical** |
| 3 | `eth_sendTransactionSync` | Monad-Unique | **P0 — Critical** |
| 4 | Deploy ComplianceRegistry.sol | Contract | **P0 — Critical** |
| 5 | Deploy BudgetVault.sol | Contract | **P0 — Critical** |
| 6 | Deploy AffiliateSettler.sol | Contract | P1 |
| 7 | Deploy MockUSDC.sol | Contract | **P0 — Critical** |
| 8 | `setComplianceRule()` | Write Call | **P0 — Critical** |
| 9 | `verifyAndStamp()` | Write Call | **P0 — Critical** |
| 10 | `isCompliant()` | View Call | P1 |
| 11 | `getAuditTrail()` | View Call | P1 |
| 12 | `depositBudget()` | Write Call | **P0 — Critical** |
| 13 | `allocateAgentBudget()` | Write Call | **P0 — Critical** |
| 14 | `executeAgentPayment()` | Write Call | **P0 — Critical** |
| 15 | `getAgentUtilization()` | View Call | P1 |
| 16 | `registerProgram()` | Write Call | P1 |
| 17 | `processPayment()` (Affiliate) | Write Call | P1 |
| 18 | `verifyCommissionSplit()` | View Call | P2 |
| 19 | Event: `ComplianceStamped` | Listener | **P0 — Critical** |
| 20 | Event: `RuleUpdated` | Listener | P1 |
| 21 | Event: `AuditGenerated` | Listener | P1 |
| 22 | Events: Budget/Payment | Listener | P1 |
| 23 | Historical Data Indexing | Infra | P2 |
| 24 | Testnet Faucet (MON tokens) | Setup | **P0 — Critical** |
| 25 | Agent Wallet Creation (EOA) | Setup | **P0 — Critical** |
| 26 | Gas Estimation | Optimization | P1 |
| 27 | Explorer Links | UI | P1 |
| 28 | Batch Compliance Stamping | Optimization | P2 |

---

## Recommended Order of Implementation

### Phase 0: Testnet Setup (Do This First)
1. **#24** Get testnet MON from faucet
2. **#25** Create deployer wallet + 8 agent wallets
3. **#1** Establish RPC connection to Monad testnet

### Phase 1: Core Contract Deployment
4. **#7** Deploy MockUSDC.sol (mint test USDC to all wallets)
5. **#4** Deploy ComplianceRegistry.sol
6. **#5** Deploy BudgetVault.sol (pass MockUSDC address to constructor)

### Phase 2: Core Contract Interactions (x402 Flow End-to-End)
7. **#12** `depositBudget()` — fund the vault with enterprise USDC
8. **#13** `allocateAgentBudget()` — assign budgets to agent wallets
9. **#14** `executeAgentPayment()` — make a real agent payment
10. **#9** `verifyAndStamp()` — stamp the payment as compliant
11. **#3** Use `eth_sendTransactionSync` for all write calls (sub-second receipts)

### Phase 3: Dashboard Wiring
12. **#2** Live block number in sidebar
13. **#19** Listen for `ComplianceStamped` events → live transaction feed
14. **#22** Listen for budget events → real-time budget bars
15. **#15** `getAgentUtilization()` → agent manager budget display
16. **#10** `isCompliant()` → real compliance badge status
17. **#27** Add explorer links to all tx hashes

### Phase 4: Compliance Rules On-Chain
18. **#8** `setComplianceRule()` — write rules from the UI to the chain
19. **#20** Listen for `RuleUpdated` → sync rules from chain to UI

### Phase 5: Affiliate Flow
20. **#6** Deploy AffiliateSettler.sol
21. **#16** `registerProgram()` — create affiliate program on-chain
22. **#17** `processPayment()` — execute a real three-party split

### Phase 6: Audit & Optimization
23. **#11** `getAuditTrail()` — query historical compliance data
24. **#21** Listen for `AuditGenerated` → real-time audit reports
25. **#26** Gas estimation for all operations
26. **#28** Batch stamping for high-throughput scenarios
27. **#23** Set up Envio/Goldsky indexer for historical queries
28. **#18** `verifyCommissionSplit()` — on-chain ZK verification

---

## How to Use This Document with Monad AI Chat

1. Start with **Phase 0, Capability #24** (get testnet MON)
2. Copy the "What to Ask Monad AI Chat" prompt verbatim
3. Get the real implementation code back
4. Replace the corresponding mock in your codebase (the "Where It Is" table tells you exactly which file and line)
5. Move to the next capability
6. Repeat through all 28 capabilities

**Pro tips when asking Monad AI Chat:**
- Always say: "I'm using **ethers.js v6** (not v5) on **Monad testnet chain ID 10143**"
- Always ask: "Does this work with `eth_sendTransactionSync` for instant receipts?"
- Always ask: "What is the gas cost for this operation on Monad?"
- Always specify: "I'm deploying Solidity 0.8.20 with OpenZeppelin v5.x contracts"
- Always mention: "My public RPC rate limit is 25 req/sec — is there a Monad RPC provider with higher limits?"

---

## Cross-Reference: Monad ↔ Unlink Capabilities

Many capabilities require BOTH Monad AND Unlink working together. Here's how they map:

| Flow Step | Unlink Capability (from UNLINK_CAPABILITIES_MAP.md) | Monad Capability (this document) |
|-----------|-----------------------------------------------------|----------------------------------|
| Create agent wallet | #1 Burner wallet (Unlink) | #25 EOA creation (Monad) |
| Fund agent | #5 Shielded transfer (Unlink) | #12 + #13 depositBudget + allocate (Monad) |
| Agent pays vendor | #4 Shielded transfer (Unlink) | #14 executeAgentPayment (Monad) |
| Stamp compliance | #7 ZK proof generation (Unlink) | #9 verifyAndStamp (Monad) |
| Live feed | — | #19 ComplianceStamped event (Monad) |
| Audit report | #12 Selective disclosure (Unlink) | #11 getAuditTrail + #21 AuditGenerated (Monad) |
| Affiliate split | #6 + #11 Shielded split + ZK verify (Unlink) | #17 processPayment + #18 verifyCommissionSplit (Monad) |
| Block status | — | #1 + #2 RPC connection + live blocks (Monad) |
