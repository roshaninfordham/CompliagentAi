const express = require("express");
const router = express.Router();
const { getUnlink } = require("../unlink-service");

const MOCK_USDC = "0x18c945c79f85f994A10356Aa4945371Ec4cD75D4";

// POST /api/funding/fund-agent — Move tokens to agent burner (Directly for Demo)
router.post("/fund-agent", async (req, res) => {
  try {
    const { agentIndex, amount } = req.body;
    const unlink = await getUnlink();

    const { address: burnerAddress } = await unlink.burner.addressOf(agentIndex);

    // Instead of using unlink pool which requires a subsidized relayer that throws 0x275d9a88,
    // we bypass it for the demo by funding the burner directly from the enterprise master wallet.
    const { ethers } = require("ethers");
    const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");
    const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

    const ERC20_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];
    const usdc = new ethers.Contract(MOCK_USDC, ERC20_ABI, deployer);

    // 1. Transfer Mock USDC
    const transferTx = await usdc.transfer(burnerAddress, BigInt(amount));
    await transferTx.wait();

    // 2. Transfer MON for gas
    const monTx = await deployer.sendTransaction({
      to: burnerAddress,
      value: ethers.parseEther("0.05")
    });
    await monTx.wait();

    const result = {
      txHash: transferTx.hash,
      gasTxHash: monTx.hash
    };

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      success: true,
      agentIndex,
      fundedAmount: amount,
      result
    }, (key, value) => typeof value === 'bigint' ? value.toString() : value));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funding/sweep-back — Return unused funds from agent back to private pool
router.post("/sweep-back", async (req, res) => {
  try {
    const { agentIndex, amount } = req.body;
    const unlink = await getUnlink();

    // Sweep full balance if no amount specified
    const sweepParams = { token: MOCK_USDC };
    if (amount) {
      sweepParams.amount = BigInt(amount);
    }

    const { txHash } = await unlink.burner.sweepToPool(agentIndex, sweepParams);

    res.json({
      success: true,
      agentIndex,
      txHash,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
