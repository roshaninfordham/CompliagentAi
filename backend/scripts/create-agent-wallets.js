const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Number of agent wallets to create
const NUM_AGENTS = 8;

const wallets = [];

for (let i = 0; i < NUM_AGENTS; i++) {
  const wallet = ethers.Wallet.createRandom();
  wallets.push({
    agentIndex: i,
    name: [
      "Alpha Data Scout",
      "Beta Market Analyzer",
      "Gamma Compute Buyer",
      "Delta Feed Collector",
      "Epsilon API Hunter",
      "Zeta Geo Intel",
      "Eta Research Bot",
      "Theta Price Oracle",
    ][i],
    address: wallet.address,
    privateKey: wallet.privateKey,
  });
  console.log(`Agent ${i} (${wallets[i].name}): ${wallet.address}`);
}

// Save to file (KEEP THIS SECURE — never commit to git!)
const outputPath = path.join(__dirname, "agent-wallets.json");
fs.writeFileSync(outputPath, JSON.stringify(wallets, null, 2));
console.log(`\n✅ ${NUM_AGENTS} agent wallets saved to ${outputPath}`);
console.log("\n⚠️  IMPORTANT: Add agent-wallets.json to .gitignore!");
console.log("\n📋 Fund these addresses with MON from your MetaMask:");
wallets.forEach((w) => {
  console.log(`   ${w.name}: ${w.address}`);
});
