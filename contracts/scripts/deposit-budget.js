const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Depositing budget with account:", deployer.address);

  const USDC_ADDRESS = "0x18c945c79f85f994A10356Aa4945371Ec4cD75D4";
  const BUDGET_VAULT_ADDRESS = "0x56e8C1ED242396645376A92e6b7c6ECd2d871DD5";
  const DEPOSIT_AMOUNT = hre.ethers.parseUnits("100000", 6); // 100,000 USDC

  const ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
  ];

  const BudgetVaultABI = [
    "function depositBudget(uint256 amount)",
    "function getAvailableBudget() view returns (uint256)",
  ];

  const usdc = new hre.ethers.Contract(USDC_ADDRESS, ERC20_ABI, deployer);
  const vault = new hre.ethers.Contract(BUDGET_VAULT_ADDRESS, BudgetVaultABI, deployer);

  // Check USDC balance first
  const balance = await usdc.balanceOf(deployer.address);
  console.log("USDC balance:", hre.ethers.formatUnits(balance, 6), "USDC");

  // 1. Approve BudgetVault to spend USDC
  console.log("\n1) Approving BudgetVault to spend 100,000 USDC...");
  const approveTx = await usdc.approve(BUDGET_VAULT_ADDRESS, DEPOSIT_AMOUNT);
  await approveTx.wait();
  console.log("   Approved. Tx:", approveTx.hash);

  // Verify allowance
  const allowance = await usdc.allowance(deployer.address, BUDGET_VAULT_ADDRESS);
  console.log("   Allowance:", hre.ethers.formatUnits(allowance, 6), "USDC");

  // 2. Deposit into the vault
  console.log("\n2) Depositing 100,000 USDC into BudgetVault...");
  const depositTx = await vault.depositBudget(DEPOSIT_AMOUNT);
  await depositTx.wait();
  console.log("   Deposited. Tx:", depositTx.hash);

  // Verify vault budget
  const available = await vault.getAvailableBudget();
  console.log("   Available budget in vault:", hre.ethers.formatUnits(available, 6), "USDC");

  console.log("\n✅ Budget deposit complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
