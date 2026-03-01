const express = require("express");
const router = express.Router();
const { getUnlink } = require("../unlink-service");

// POST /api/payments/agent-pay — Agent pays vendor from burner account
router.post("/agent-pay", async (req, res) => {
  try {
    const { agentIndex, vendorAddress, calldata } = req.body;
    const unlink = await getUnlink();

    // unlink.burner.send() sends a transaction FROM the burner account
    // This is how the agent pays the vendor
    // `to` = vendor/contract address
    // `data` = encoded contract call (e.g., ERC-20 transfer or your BudgetVault)
    const { txHash } = await unlink.burner.send(agentIndex, {
      to: vendorAddress,
      data: calldata, // ABI-encoded function call
    });

    console.log(`Agent ${agentIndex} paid vendor. Tx: ${txHash}`);

    res.json({
      success: true,
      agentIndex,
      vendorAddress,
      txHash,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
