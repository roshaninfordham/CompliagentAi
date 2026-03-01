const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const provider = new hre.ethers.JsonRpcProvider(
    process.env.MONAD_TESTNET_RPC || "https://testnet-rpc.monad.xyz"
  );
  const deployer = new hre.ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  console.log("Phase 4 setup with:", deployer.address);

  const COMPLIANCE_REGISTRY = "0x12070164676F455730935987b41Cc8fB8e7E777f";
  const USDC_ADDRESS = "0x18c945c79f85f994A10356Aa4945371Ec4cD75D4";

  const registryABI = [
    "function setRule(string name, string ruleType, uint256 value, bool enabled)",
    "function getRuleCount() view returns (uint256)",
    "function getRule(uint256 ruleIndex) view returns (string name, string ruleType, uint256 value, bool enabled)",
    "function batchVerifyAndStamp(bytes32[] txHashes, bytes32[] proofHashes)",
    "function isCompliant(bytes32 txHash) view returns (bool)",
    "function totalStamped() view returns (uint256)",
  ];

  const registry = new hre.ethers.Contract(COMPLIANCE_REGISTRY, registryABI, deployer);

  // ── 1. Set Compliance Rules ─────────────────────────────────────
  console.log("\n═══ Setting Compliance Rules ═══");

  const rules = [
    { name: "Max Transaction",  ruleType: "budget_cap",        value: hre.ethers.parseUnits("10000", 6), enabled: true },
    { name: "Vendor Allowlist",  ruleType: "vendor_allowlist",  value: 1n,  enabled: true },
    { name: "AML Threshold",    ruleType: "aml_threshold",     value: hre.ethers.parseUnits("50000", 6), enabled: true },
    { name: "Rate Limit",       ruleType: "rate_limit",        value: 100n, enabled: true },  // max 100 tx/hour
    { name: "KYC Required",     ruleType: "kyc_check",         value: 1n,   enabled: false }, // disabled by default
  ];

  for (const rule of rules) {
    const tx = await registry.setRule(rule.name, rule.ruleType, rule.value, rule.enabled);
    await tx.wait();
    console.log(`  ✓ Rule "${rule.name}" (${rule.ruleType}) = ${rule.value}, enabled: ${rule.enabled}`);
  }

  const ruleCount = await registry.getRuleCount();
  console.log(`  Total rules on-chain: ${ruleCount}`);

  // ── 2. Batch Stamping Demo ──────────────────────────────────────
  console.log("\n═══ Batch Stamping Demo ═══");

  const batchSize = 5;
  const txHashes = [];
  const proofHashes = [];

  for (let i = 0; i < batchSize; i++) {
    const txHash = hre.ethers.keccak256(
      hre.ethers.solidityPacked(["string", "uint256"], [`batch-tx-${i}`, BigInt(Date.now() + i)])
    );
    const proofHash = hre.ethers.keccak256(
      hre.ethers.solidityPacked(["bytes32", "uint256"], [txHash, BigInt(Date.now())])
    );
    txHashes.push(txHash);
    proofHashes.push(proofHash);
  }

  console.log(`  Stamping ${batchSize} transactions in one call...`);
  const batchTx = await registry.batchVerifyAndStamp(txHashes, proofHashes);
  const batchReceipt = await batchTx.wait();
  console.log(`  ✓ Batch stamped! Tx: ${batchTx.hash}`);
  console.log(`  Gas used: ${batchReceipt.gasUsed.toString()}`);

  // Verify all are compliant
  for (let i = 0; i < batchSize; i++) {
    const compliant = await registry.isCompliant(txHashes[i]);
    console.log(`    tx[${i}]: ${txHashes[i].slice(0, 18)}... → compliant: ${compliant}`);
  }

  const totalStamped = await registry.totalStamped();
  console.log(`  Total stamped on-chain: ${totalStamped}`);

  console.log("\n✅ Phase 4 compliance rules & batch stamping complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
