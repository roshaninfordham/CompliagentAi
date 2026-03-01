const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "MON");

  // ── 1. Deploy MockUSDC ──────────────────────────────────────────
  console.log("\n1) Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("   MockUSDC deployed to:", mockUSDCAddress);

  // ── 2. Deploy ComplianceRegistry ────────────────────────────────
  console.log("\n2) Deploying ComplianceRegistry...");
  const ComplianceRegistry = await hre.ethers.getContractFactory("ComplianceRegistry");
  const complianceRegistry = await ComplianceRegistry.deploy();
  await complianceRegistry.waitForDeployment();
  const complianceRegistryAddress = await complianceRegistry.getAddress();
  console.log("   ComplianceRegistry deployed to:", complianceRegistryAddress);

  // ── 3. Deploy BudgetVault (needs MockUSDC address) ──────────────
  console.log("\n3) Deploying BudgetVault...");
  const BudgetVault = await hre.ethers.getContractFactory("BudgetVault");
  const budgetVault = await BudgetVault.deploy(mockUSDCAddress);
  await budgetVault.waitForDeployment();
  const budgetVaultAddress = await budgetVault.getAddress();
  console.log("   BudgetVault deployed to:", budgetVaultAddress);

  // ── Summary ─────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE — Monad Testnet");
  console.log("════════════════════════════════════════════════");
  console.log("  MockUSDC:            ", mockUSDCAddress);
  console.log("  ComplianceRegistry:  ", complianceRegistryAddress);
  console.log("  BudgetVault:         ", budgetVaultAddress);
  console.log("  Deployer (owner):    ", deployer.address);
  console.log("════════════════════════════════════════════════\n");

  // ── 4. Mint initial MockUSDC supply ─────────────────────────────
  console.log("4) Minting initial MockUSDC supply...");

  // Mint 1,000,000 USDC to deployer (enterprise treasury)
  const mintAmount = hre.ethers.parseUnits("1000000", 6);
  const mintTx = await mockUSDC.mint(deployer.address, mintAmount);
  await mintTx.wait();
  console.log("   Minted 1,000,000 USDC to deployer (enterprise treasury)");

  // Mint 10,000 USDC to each agent wallet
  const agentWallets = [
    { name: "Alpha",   address: "0xDC90f54bA3dE43B0ede7ac0393Ca35A0cDDFA5b7" },
    { name: "Beta",    address: "0x5DeF13Ff7252487d0955435854Bfdcd63191B4A2" },
    { name: "Gamma",   address: "0xE8F40A830D076690C19f19ACFa2e1F73De7E50A1" },
    { name: "Delta",   address: "0x5dE1a10614e48Ec8b9E937A739bF8ab407b664aC" },
    { name: "Epsilon", address: "0xcd6AB19144A3Bb747747E626b11154400E1D7da0" },
    { name: "Zeta",    address: "0x4bA41b188848bf6bdf4D7090Fad2c39F5aF3dC06" },
    { name: "Eta",     address: "0x15185004047F6F20dD4C9931c6AA0A506b3aAb65" },
    { name: "Theta",   address: "0x5a4d612c15B80d641a4b6599195Ca032CeB98215" },
  ];

  const agentMintAmount = hre.ethers.parseUnits("10000", 6);
  for (const agent of agentWallets) {
    const tx = await mockUSDC.mint(agent.address, agentMintAmount);
    await tx.wait();
    console.log(`   Minted 10,000 USDC to Agent ${agent.name} (${agent.address})`);
  }

  // ── 5. Save deployed addresses to JSON ──────────────────────────
  const fs = require("fs");
  const deployedAddresses = {
    network: "monad-testnet",
    chainId: 10143,
    deployer: deployer.address,
    contracts: {
      MockUSDC: mockUSDCAddress,
      ComplianceRegistry: complianceRegistryAddress,
      BudgetVault: budgetVaultAddress,
    },
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    "deployed-addresses.json",
    JSON.stringify(deployedAddresses, null, 2)
  );
  console.log("\n   Addresses saved to deployed-addresses.json");
  console.log("\n✅ All done! Update your backend config with these addresses.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
