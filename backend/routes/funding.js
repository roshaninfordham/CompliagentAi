const express = require("express");
const router = express.Router();
const { getUnlink } = require("../unlink-service");

const MOCK_USDC = "0x18c945c79f85f994A10356Aa4945371Ec4cD75D4";

// POST /api/funding/fund-agent — Move tokens from private pool to agent burner
router.post("/fund-agent", async (req, res) => {
  try {
    const { agentIndex, amount } = req.body;
    const unlink = await getUnlink();

    // This withdraws from the private pool into the burner account
    // The on-chain observer sees tokens appearing at the burner address
    // but CANNOT trace them back to the enterprise's deposit
    const result = await unlink.burner.fund(agentIndex, {
      token: MOCK_USDC,
      amount: BigInt(amount), // amount in smallest unit (e.g., 1000000 for 1 USDC with 6 decimals)
    });

    res.json({
      success: true,
      agentIndex,
      fundedAmount: amount,
      result,
    });
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
