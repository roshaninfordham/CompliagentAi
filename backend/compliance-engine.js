const { getUnlink } = require("./unlink-service");
const { ethers } = require("ethers");
const { stampShieldedPayment } = require("./privacy-helpers");

// Your deployed contract addresses on Monad testnet
const COMPLIANCE_REGISTRY_ADDR = "0xC37a8f0ca860914BfAce8361Bf0621EAEa14863F";
const BUDGET_VAULT_ADDR = "0x56e8C1ED242396645376A92e6b7c6ECd2d871DD5";
const MOCK_USDC = "0x18c945c79f85f994A10356Aa4945371Ec4cD75D4";

// ABI fragments (add full ABIs after deploying)
const BUDGET_VAULT_ABI = [
  "function executeAgentPayment(address agent, address vendor, uint256 amount)",
  "function getAgentUtilization(address agent) view returns (uint256)",
];

const COMPLIANCE_REGISTRY_ABI = [
  "function verifyAndStamp(bytes32 txHash, bytes32 proofHash)",
  "function batchVerifyAndStamp(bytes32[] txHashes, bytes32[] proofHashes)",
  "function isCompliant(bytes32 txHash) view returns (bool)",
  "function getRule(uint256 ruleIndex) view returns (string name, string ruleType, uint256 value, bool enabled)",
  "function getRuleCount() view returns (uint256)",
  "function totalStamped() view returns (uint256)",
];

// In-memory compliance rules (in production, store in DB or on-chain)
const complianceRules = {
  vendorAllowlist: new Set(),
  maxTransactionAmount: BigInt(1000 * 1e6), // 1000 USDC
  agentBudgets: new Map(), // agentIndex -> budget limit
};

async function checkCompliance(agentIndex, vendorAddress, amount) {
  const errors = [];

  // Rule 1: Vendor allowlist
  if (
    complianceRules.vendorAllowlist.size > 0 &&
    !complianceRules.vendorAllowlist.has(vendorAddress.toLowerCase())
  ) {
    errors.push("VENDOR_NOT_ALLOWLISTED");
  }

  // Rule 2: Transaction amount limit
  if (BigInt(amount) > complianceRules.maxTransactionAmount) {
    errors.push("EXCEEDS_MAX_TRANSACTION");
  }

  // Rule 3: Agent budget check
  const budgetLimit = complianceRules.agentBudgets.get(agentIndex);
  if (budgetLimit !== undefined) {
    const unlink = await getUnlink();
    const { address } = await unlink.burner.addressOf(agentIndex);
    const currentBalance = await unlink.burner.getTokenBalance(address, MOCK_USDC);
    if (BigInt(amount) > currentBalance) {
      errors.push("INSUFFICIENT_AGENT_BUDGET");
    }
  }

  return {
    compliant: errors.length === 0,
    errors,
    timestamp: Date.now(),
  };
}

// The full flow: check compliance -> pay via burner -> stamp on-chain
async function processAgentPayment(agentIndex, vendorAddress, amount) {
  // Step 1: Compliance check
  const complianceResult = await checkCompliance(agentIndex, vendorAddress, amount);

  if (!complianceResult.compliant) {
    return {
      success: false,
      reason: "COMPLIANCE_FAILED",
      errors: complianceResult.errors,
    };
  }

  // Step 2: Build the ERC-20 transfer calldata
  const erc20Interface = new ethers.Interface([
    "function transfer(address to, uint256 amount) returns (bool)",
  ]);
  const calldata = erc20Interface.encodeFunctionData("transfer", [
    vendorAddress,
    BigInt(amount),
  ]);

  // Step 3: Execute payment from agent's burner account (PRIVATE!)
  const unlink = await getUnlink();
  const { txHash } = await unlink.burner.send(agentIndex, {
    to: MOCK_USDC,       // Send to the token contract
    data: calldata,      // With transfer(vendor, amount) encoded
  });

  // Step 4: Generate a compliance proof hash and stamp on-chain
  const proofHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "address", "uint256", "uint256"],
      [agentIndex, vendorAddress, BigInt(amount), BigInt(Date.now())]
    )
  );

  // Step 5: Stamp the compliance record on-chain via ComplianceRegistry
  let stampResult = null;
  const signerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (signerKey) {
    try {
      stampResult = await stampShieldedPayment(
        txHash,
        agentIndex,
        vendorAddress,
        amount,
        signerKey
      );
    } catch (err) {
      console.error("On-chain stamp failed (non-fatal):", err.message);
    }
  } else {
    console.warn("DEPLOYER_PRIVATE_KEY not set — skipping on-chain stamp");
  }

  return {
    success: true,
    txHash,
    proofHash: stampResult?.proofHash || proofHash,
    stampTxHash: stampResult?.stampTxHash || null,
    blockNumber: stampResult ? "stamped" : null,
    compliance: {
      checked: true,
      timestamp: complianceResult.timestamp,
      rules: ["VENDOR_ALLOWLIST", "MAX_AMOUNT", "BUDGET_CHECK"],
    },
  };
}

module.exports = {
  checkCompliance,
  processAgentPayment,
  complianceRules,
};
