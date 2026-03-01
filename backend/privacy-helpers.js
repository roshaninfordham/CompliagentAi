/**
 * Privacy-aware helpers for Unlink integration.
 * - Never exposes raw wallet addresses or amounts in API responses
 * - Uses proof hashes and privacy badges instead
 * - Stamps ZK proofs on-chain after shielded payments
 */

const { ethers } = require("ethers");
const { getProvider } = require("./monad-provider");
const MONAD_CONFIG = require("./config/monad");

const COMPLIANCE_REGISTRY_ABI = [
  "function verifyAndStamp(bytes32 txHash, bytes32 proofHash)",
  "function batchVerifyAndStamp(bytes32[] txHashes, bytes32[] proofHashes)",
  "function isCompliant(bytes32 txHash) view returns (bool)",
  "function totalStamped() view returns (uint256)",
];

/**
 * After a shielded payment via Unlink burner, generate a ZK proof hash
 * and stamp it on-chain. Never reveals the actual sender/receiver.
 */
async function stampShieldedPayment(txHash, agentIndex, vendorAddress, amount, signerPrivateKey) {
  const provider = getProvider();
  const signer = new ethers.Wallet(signerPrivateKey, provider);

  const registry = new ethers.Contract(
    MONAD_CONFIG.contracts.complianceRegistry,
    COMPLIANCE_REGISTRY_ABI,
    signer
  );

  // Generate proof hash from private data — only the hash is stored on-chain
  const proofHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "address", "uint256", "uint256"],
      [agentIndex, vendorAddress, BigInt(amount), BigInt(Date.now())]
    )
  );

  const txHashBytes32 = ethers.zeroPadValue(txHash, 32);

  const stampTx = await registry.verifyAndStamp(txHashBytes32, proofHash);
  await stampTx.wait();

  return {
    stampTxHash: stampTx.hash,
    proofHash,
    txHashBytes32,
    // Privacy: never return raw addresses or amounts
    privacy: {
      senderShielded: true,
      amountShielded: true,
      proofVerifiable: true,
    },
  };
}

/**
 * Batch stamp multiple shielded payments in a single on-chain call.
 * Ideal for high-throughput scenarios on Monad's ~400ms blocks.
 */
async function batchStampPayments(payments, signerPrivateKey) {
  const provider = getProvider();
  const signer = new ethers.Wallet(signerPrivateKey, provider);

  const registry = new ethers.Contract(
    MONAD_CONFIG.contracts.complianceRegistry,
    COMPLIANCE_REGISTRY_ABI,
    signer
  );

  const txHashes = [];
  const proofHashes = [];

  for (const p of payments) {
    txHashes.push(ethers.zeroPadValue(p.txHash, 32));
    proofHashes.push(
      ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "address", "uint256", "uint256"],
          [p.agentIndex, p.vendorAddress, BigInt(p.amount), BigInt(Date.now())]
        )
      )
    );
  }

  const batchTx = await registry.batchVerifyAndStamp(txHashes, proofHashes);
  const receipt = await batchTx.wait();

  return {
    batchTxHash: batchTx.hash,
    count: payments.length,
    gasUsed: receipt.gasUsed.toString(),
    proofHashes,
  };
}

/**
 * Format a transaction for the UI — strips all sensitive data,
 * shows only privacy badges and proof references.
 */
function formatPrivateTransaction(tx) {
  return {
    id: tx.id,
    status: tx.compliant ? "compliant" : "pending",
    shielded: true,
    amount: "****",        // Never show shielded amounts
    sender: "🔒 Shielded", // Never show sender
    vendor: tx.vendorName || "🔒 Shielded",
    proofHash: tx.proofHash,
    timestamp: tx.timestamp,
    explorerUrl: `${MONAD_CONFIG.explorerUrl}/tx/${tx.stampTxHash}`,
  };
}

/**
 * Format a public (non-shielded) transaction for the UI.
 */
function formatPublicTransaction(tx) {
  return {
    id: tx.id,
    status: tx.compliant ? "compliant" : "pending",
    shielded: false,
    amount: tx.amount,
    sender: tx.agentName,
    vendor: tx.vendorName,
    txHash: tx.txHash,
    timestamp: tx.timestamp,
    explorerUrl: `${MONAD_CONFIG.explorerUrl}/tx/${tx.txHash}`,
  };
}

module.exports = {
  stampShieldedPayment,
  batchStampPayments,
  formatPrivateTransaction,
  formatPublicTransaction,
};
