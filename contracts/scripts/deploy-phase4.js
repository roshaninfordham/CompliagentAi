const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const provider = new hre.ethers.JsonRpcProvider(
    process.env.MONAD_TESTNET_RPC || "https://testnet-rpc.monad.xyz"
  );
  const deployer = new hre.ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  console.log("Deploying Phase 4 contracts with:", deployer.address);

  const USDC_ADDRESS = "0x18c945c79f85f994A10356Aa4945371Ec4cD75D4";

  // ── 1. Re-deploy ComplianceRegistry (with batchVerifyAndStamp) ──
  console.log("\n1) Deploying upgraded ComplianceRegistry...");
  const ComplianceRegistry = await hre.ethers.getContractFactory("ComplianceRegistry", deployer);
  const complianceRegistry = await ComplianceRegistry.deploy();
  await complianceRegistry.waitForDeployment();
  const registryAddress = await complianceRegistry.getAddress();
  console.log("   ComplianceRegistry V2 deployed to:", registryAddress);

  // ── 2. Deploy AffiliateSettler ──────────────────────────────────
  console.log("\n2) Deploying AffiliateSettler...");
  const AffiliateSettler = await hre.ethers.getContractFactory("AffiliateSettler", deployer);
  const affiliateSettler = await AffiliateSettler.deploy(USDC_ADDRESS);
  await affiliateSettler.waitForDeployment();
  const settlerAddress = await affiliateSettler.getAddress();
  console.log("   AffiliateSettler deployed to:", settlerAddress);

  // ── 3. Register a demo affiliate program ────────────────────────
  console.log("\n3) Registering demo affiliate program...");
  // Use Agent Theta as the affiliate
  const AFFILIATE_ADDRESS = "0x5a4d612c15B80d641a4b6599195Ca032CeB98215";
  const tx = await affiliateSettler.registerProgram("Demo Referral", AFFILIATE_ADDRESS, 500); // 5%
  await tx.wait();
  console.log("   Registered 'Demo Referral' — 5% commission to Agent Theta");

  // ── Summary ─────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════════════");
  console.log("  PHASE 4 DEPLOYMENT COMPLETE");
  console.log("════════════════════════════════════════════════");
  console.log("  ComplianceRegistry V2: ", registryAddress);
  console.log("  AffiliateSettler:      ", settlerAddress);
  console.log("════════════════════════════════════════════════\n");

  // Save addresses
  const fs = require("fs");
  const existing = JSON.parse(fs.readFileSync("deployed-addresses.json", "utf8"));
  existing.contracts.ComplianceRegistry = registryAddress;
  existing.contracts.AffiliateSettler = settlerAddress;
  existing.phase4DeployedAt = new Date().toISOString();
  fs.writeFileSync("deployed-addresses.json", JSON.stringify(existing, null, 2));
  console.log("   Updated deployed-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
