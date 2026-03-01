const express = require("express");
const router = express.Router();
const { getUnlink } = require("../unlink-service");
const { getProvider } = require("../monad-provider");
const { ethers } = require("ethers");

const MOCK_USDC = "0x18c945c79f85f994A10356Aa4945371Ec4cD75D4";
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

// POST /api/agents/create — Create a burner account for a new agent
router.post("/create", async (req, res) => {
  try {
    const { agentIndex } = req.body; // e.g., 0, 1, 2...
    const unlink = await getUnlink();

    // Get the burner address for this agent index (local derivation, no network)
    const { address } = await unlink.burner.addressOf(agentIndex);
    console.log(`Agent ${agentIndex} burner address: ${address}`);

    res.json({
      success: true,
      agentIndex,
      burnerAddress: address,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agents/:index/balance — Check agent's burner balance
// Uses our own Monad RPC (not the Unlink gateway) for balance lookups
router.get("/:index/balance", async (req, res) => {
  try {
    const unlink = await getUnlink();
    const agentIndex = parseInt(req.params.index);

    const { address } = await unlink.burner.addressOf(agentIndex);

    // Get native token balance (MON) via our Monad RPC
    const provider = getProvider();
    const nativeBalance = await provider.getBalance(address);

    // Get ERC-20 token balance (MockUSDC) via our Monad RPC
    const token = new ethers.Contract(MOCK_USDC, ERC20_ABI, provider);
    const tokenBalance = await token.balanceOf(address);

    res.json({
      agentIndex,
      burnerAddress: address,
      nativeBalance: ethers.formatEther(nativeBalance),
      tokenBalance: ethers.formatUnits(tokenBalance, 6), // USDC has 6 decimals
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
