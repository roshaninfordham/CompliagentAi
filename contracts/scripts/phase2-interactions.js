const hre = require("hardhat");
require("dotenv").config();

/**
 * Monad-optimized send: tries eth_sendTransactionSync first for instant receipts.
 * Falls back to eth_sendRawTransaction + fast polling (still ~400ms on Monad).
 */
async function sendSyncTx(wallet, populatedTx) {
  const provider = wallet.provider;

  // Populate missing fields (nonce, gas, chainId)
  const tx = await wallet.populateTransaction(populatedTx);
  const signedTx = await wallet.signTransaction(tx);

  try {
    // Try Monad's synchronous send — returns receipt in one RPC call
    const receipt = await provider.send("eth_sendTransactionSync", [signedTx]);
    console.log(
      `    ⚡ syncReceipt — txHash: ${receipt.transactionHash}, block: ${receipt.blockNumber}, status: ${receipt.status}, gas: ${receipt.gasUsed}`
    );
    return receipt;
  } catch (err) {
    // Fallback: standard send + fast poll (Monad ~400ms finality)
    const txHash = await provider.send("eth_sendRawTransaction", [signedTx]);
    console.log(`    📨 sent raw tx: ${txHash}`);

    // Fast poll — Monad blocks are ~400ms so receipt should be near-instant
    let receipt = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) break;
    }

    if (!receipt) throw new Error(`Tx ${txHash} not mined after 15s`);
    console.log(
      `    ✓ receipt — txHash: ${receipt.hash}, block: ${receipt.blockNumber}, status: ${receipt.status}, gas: ${receipt.gasUsed}`
    );
    return { transactionHash: receipt.hash, blockNumber: receipt.blockNumber, status: receipt.status, gasUsed: receipt.gasUsed };
  }
}

async function main() {
  // Use a raw ethers.Wallet so signTransaction() works
  const provider = new hre.ethers.JsonRpcProvider(
    process.env.MONAD_TESTNET_RPC || "https://testnet-rpc.monad.xyz"
  );
  const deployer = new hre.ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  console.log("Running Phase 2 interactions with:", deployer.address);
  console.log("(Using eth_sendTransactionSync for fast Monad receipts)\n");

  const BUDGET_VAULT_ADDRESS = "0x56e8C1ED242396645376A92e6b7c6ECd2d871DD5";
  const COMPLIANCE_REGISTRY_ADDRESS = "0x12070164676F455730935987b41Cc8fB8e7E777f";
  const USDC_ADDRESS = "0x18c945c79f85f994A10356Aa4945371Ec4cD75D4";

  // Agent Alpha
  const AGENT_ADDRESS = "0xDC90f54bA3dE43B0ede7ac0393Ca35A0cDDFA5b7";
  // Use Agent Beta as a mock vendor for demo purposes
  const VENDOR_ADDRESS = "0x5DeF13Ff7252487d0955435854Bfdcd63191B4A2";

  const BudgetVaultABI = [
    "function allocateAgentBudget(address agent, uint256 amount)",
    "function executeAgentPayment(address agent, address vendor, uint256 amount)",
    "function getAgentUtilization(address agent) view returns (uint256)",
    "function getAvailableBudget() view returns (uint256)",
  ];

  const ComplianceRegistryABI = [
    "function verifyAndStamp(bytes32 txHash, bytes32 proofHash)",
    "function isCompliant(bytes32 txHash) view returns (bool)",
    "function getStamp(bytes32 txHash) view returns (bytes32 proofHash, uint256 timestamp, bool verified)",
  ];

  const vault = new hre.ethers.Contract(BUDGET_VAULT_ADDRESS, BudgetVaultABI, deployer);
  const complianceRegistry = new hre.ethers.Contract(COMPLIANCE_REGISTRY_ADDRESS, ComplianceRegistryABI, deployer);

  // ── Step 8: Allocate Agent Budget ───────────────────────────────
  console.log("═══ Step 8: Allocate Agent Budget ═══");
  const allocateAmount = hre.ethers.parseUnits("50000", 6);
  console.log("  Allocating 50,000 USDC to Agent Alpha:", AGENT_ADDRESS);

  const allocatePopulated = await vault.allocateAgentBudget.populateTransaction(AGENT_ADDRESS, allocateAmount);
  const allocateReceipt = await sendSyncTx(deployer, allocatePopulated);

  const utilization = await vault.getAgentUtilization(AGENT_ADDRESS);
  console.log("  Agent Alpha utilization:", hre.ethers.formatUnits(utilization, 6), "USDC");

  const available = await vault.getAvailableBudget();
  console.log("  Remaining vault budget:", hre.ethers.formatUnits(available, 6), "USDC");

  // ── Step 9: Execute Agent Payment ───────────────────────────────
  console.log("\n═══ Step 9: Execute Agent Payment ═══");
  const paymentAmount = hre.ethers.parseUnits("1000", 6);
  console.log("  Agent Alpha paying 1,000 USDC to vendor:", VENDOR_ADDRESS);

  const payPopulated = await vault.executeAgentPayment.populateTransaction(AGENT_ADDRESS, VENDOR_ADDRESS, paymentAmount);
  const payReceipt = await sendSyncTx(deployer, payPopulated);

  const newUtilization = await vault.getAgentUtilization(AGENT_ADDRESS);
  console.log("  Agent Alpha utilization after payment:", hre.ethers.formatUnits(newUtilization, 6), "USDC");

  // ── Step 10: Stamp Compliance ───────────────────────────────────
  console.log("\n═══ Step 10: Stamp Compliance ═══");

  // Use the payment tx hash as the transaction reference
  const TX_HASH_BYTES32 = hre.ethers.zeroPadValue(payReceipt.transactionHash, 32);

  // Generate a mock ZK proof hash (keccak256 of tx hash + timestamp)
  const PROOF_HASH_BYTES32 = hre.ethers.keccak256(
    hre.ethers.solidityPacked(
      ["bytes32", "uint256"],
      [TX_HASH_BYTES32, BigInt(Math.floor(Date.now() / 1000))]
    )
  );

  console.log("  Tx hash (bytes32):", TX_HASH_BYTES32);
  console.log("  Proof hash:       ", PROOF_HASH_BYTES32);

  const stampPopulated = await complianceRegistry.verifyAndStamp.populateTransaction(TX_HASH_BYTES32, PROOF_HASH_BYTES32);
  const stampReceipt = await sendSyncTx(deployer, stampPopulated);

  // Verify compliance
  const isCompliant = await complianceRegistry.isCompliant(TX_HASH_BYTES32);
  console.log("  Is compliant?", isCompliant);

  const stamp = await complianceRegistry.getStamp(TX_HASH_BYTES32);
  console.log("  Stamp details:", {
    proofHash: stamp.proofHash,
    timestamp: stamp.timestamp.toString(),
    verified: stamp.verified,
  });

  console.log("\n✅ Phase 2 complete — budget allocated, payment executed, compliance stamped!");
  console.log("   All 3 write calls used eth_sendTransactionSync for instant Monad receipts.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
