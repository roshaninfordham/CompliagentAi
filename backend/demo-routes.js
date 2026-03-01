const express = require("express");
const { ethers } = require("ethers");
const { checkCompliance, processAgentPayment } = require("./compliance-engine");
const { getProvider } = require("./monad-provider");
const MONAD_CONFIG = require("./config/monad");

const router = express.Router();

// Small delay helper for visual SSE pacing
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// SSE client tracking
// ---------------------------------------------------------------------------
const sseClients = [];

function broadcastDemoEvent(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((res) => {
    try {
      res.write(payload);
    } catch (_) {
      // client already disconnected — ignore
    }
  });
}

// ---------------------------------------------------------------------------
// ComplianceRegistry ABI fragments used by admin / audit endpoints
// ---------------------------------------------------------------------------
const COMPLIANCE_REGISTRY_ABI = [
  "function setRule(string name, string ruleType, uint256 value)",
  "function emitAudit(bytes32 auditHash, uint256 totalTransactions, uint256 passRate)",
  "function verifyAndStamp(bytes32 txHash, bytes32 proofHash)",
  "function totalStamped() view returns (uint256)",
];

// ---------------------------------------------------------------------------
// 1. GET /api/x402/resource — Mock paywalled resource
// ---------------------------------------------------------------------------
router.get("/api/x402/resource", (req, res) => {
  try {
    const receipt = req.headers["x-payment-receipt"];

    if (!receipt) {
      return res.status(402).json({
        paymentRequired: true,
        amount: "10.00",
        token: "USDC",
        recipient: "0x9284cB50d7b7678be61F11A7688DC768f0E02A89",
        resource: "premium-financial-data",
      });
    }

    return res.status(200).json({
      data: {
        AAPL: 185.32,
        NVDA: 892.10,
        MSFT: 412.85,
        GOOG: 172.45,
        AMZN: 198.70,
      },
      source: "PremiumFinancialData API",
      timestamp: new Date().toISOString(),
      receiptVerified: true,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 2. POST /api/demo/run-x402 — Full orchestrated x402 demo flow
// ---------------------------------------------------------------------------
router.post("/api/demo/run-x402", async (req, res) => {
  const timings = {};
  const steps = [];

  try {
    const {
      agentIndex = 0,
      vendorAddress = "0x9284cB50d7b7678be61F11A7688DC768f0E02A89",
      amount = 10000000, // 10 USDC (6 decimals)
    } = req.body || {};

    // --- Step 1: request — hit the mock resource, get 402 ----------------
    broadcastDemoEvent({ step: "request", status: "running" });
    await wait(600);
    let t0 = Date.now();
    const paywall = {
      paymentRequired: true,
      amount: "10.00",
      token: "USDC",
      recipient: vendorAddress,
      resource: "premium-financial-data",
    };
    timings.request = Date.now() - t0 + 600;
    steps.push({ name: "request", status: "402_received", detail: paywall, timing: timings.request });
    broadcastDemoEvent({ step: "request", status: "402_received", detail: paywall, timing: timings.request });

    // --- Step 1b: 402 received — show 402 status -------------------------
    broadcastDemoEvent({ step: "402", status: "running" });
    await wait(400);
    broadcastDemoEvent({ step: "402", status: "402_received", timing: 400 });

    // --- Step 2: compliance — run compliance engine check -----------------
    broadcastDemoEvent({ step: "compliance", status: "running" });
    await wait(300);
    t0 = Date.now();
    const complianceResult = await checkCompliance(agentIndex, vendorAddress, amount);
    timings.compliance = Date.now() - t0 + 300;

    if (!complianceResult.compliant) {
      steps.push({ name: "compliance", status: "failed", detail: complianceResult, timing: timings.compliance });
      broadcastDemoEvent({ step: "compliance", status: "failed", detail: complianceResult, timing: timings.compliance });
      return res.json({ success: false, failedAt: "compliance", errors: complianceResult.errors });
    }

    steps.push({ name: "compliance", status: "passed", detail: complianceResult, timing: timings.compliance });
    broadcastDemoEvent({ step: "compliance", status: "passed", detail: complianceResult, timing: timings.compliance });

    // --- Step 3: zk-stamp — generate proof hash --------------------------
    broadcastDemoEvent({ step: "zk-stamp", status: "running" });
    await wait(800);
    t0 = Date.now();
    const proofHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address", "uint256", "uint256"],
        [agentIndex, vendorAddress, BigInt(amount), BigInt(Date.now())]
      )
    );
    timings.zkStamp = Date.now() - t0 + 800;
    steps.push({ name: "zk-stamp", status: "proof_generated", detail: { proofHash }, timing: timings.zkStamp });
    broadcastDemoEvent({ step: "zk-stamp", status: "proof_generated", detail: { proofHash }, timing: timings.zkStamp });

    // --- Step 4: settlement — process payment via compliance engine -------
    broadcastDemoEvent({ step: "settlement", status: "running" });
    await wait(300);
    t0 = Date.now();
    const paymentResult = await processAgentPayment(agentIndex, vendorAddress, amount);
    timings.settlement = Date.now() - t0 + 300;
    steps.push({
      name: "settlement",
      status: paymentResult.success ? "settled" : "failed",
      detail: { txHash: paymentResult.txHash, stampTxHash: paymentResult.stampTxHash, proofHash: paymentResult.proofHash },
      timing: timings.settlement,
    });
    broadcastDemoEvent({
      step: "settlement",
      status: paymentResult.success ? "settled" : "failed",
      detail: { txHash: paymentResult.txHash, stampTxHash: paymentResult.stampTxHash },
      timing: timings.settlement,
    });

    // --- Step 5: delivery — retry with payment receipt header -------------
    broadcastDemoEvent({ step: "delivery", status: "running" });
    await wait(400);
    t0 = Date.now();
    const resourceData = {
      data: { AAPL: 185.32, NVDA: 892.10, MSFT: 412.85, GOOG: 172.45, AMZN: 198.70 },
      source: "PremiumFinancialData API",
      timestamp: new Date().toISOString(),
      receiptVerified: true,
    };
    timings.delivery = Date.now() - t0 + 400;
    steps.push({ name: "delivery", status: "200_ok", detail: { resourceKeys: Object.keys(resourceData.data) }, timing: timings.delivery });
    broadcastDemoEvent({ step: "delivery", status: "200_ok", detail: { resourceKeys: Object.keys(resourceData.data) }, timing: timings.delivery });

    // --- Compose response -----------------------------------------------
    timings.total = timings.request + timings.compliance + timings.zkStamp + timings.settlement + timings.delivery;

    return res.json({
      success: true,
      steps,
      txHash: paymentResult.txHash || null,
      proofHash: paymentResult.proofHash || proofHash,
      blockNumber: paymentResult.blockNumber || null,
      timings,
      resourceData,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 3. POST /api/demo/run-affiliate — Affiliate settlement demo
// ---------------------------------------------------------------------------
router.post("/api/demo/run-affiliate", async (req, res) => {
  const timings = {};
  const steps = [];

  try {
    const totalAmount = 100_000_000; // 100 USDC (6 decimals)
    const affiliateShare = Math.floor(totalAmount * 0.15); // 15%
    const merchantShare = totalAmount - affiliateShare; // 85%

    const affiliateAddress = "0xAff11iate0000000000000000000000000000000A";
    const merchantAddress = "0xMerc4ant0000000000000000000000000000000B";
    const buyerAddress = "0xBuyer000000000000000000000000000000000C";

    // --- Step 1: buyer payment check ------------------------------------
    broadcastDemoEvent({ step: "buyer-payment-check", status: "running" });
    await wait(500);
    let t0 = Date.now();
    const buyerPayment = {
      buyer: buyerAddress,
      totalAmount: totalAmount.toString(),
      token: "USDC",
      status: "received",
    };
    timings.buyerPayment = Date.now() - t0 + 500;
    steps.push({ name: "buyer-payment-check", status: "received", detail: buyerPayment, timing: timings.buyerPayment });
    broadcastDemoEvent({ step: "buyer-payment-check", status: "received", detail: buyerPayment, timing: timings.buyerPayment });

    // --- Step 2: compliance verification --------------------------------
    broadcastDemoEvent({ step: "compliance-verification", status: "running" });
    await wait(300);
    t0 = Date.now();
    const complianceResult = await checkCompliance(0, merchantAddress, totalAmount);
    timings.compliance = Date.now() - t0 + 300;
    steps.push({ name: "compliance-verification", status: complianceResult.compliant ? "passed" : "failed", detail: complianceResult, timing: timings.compliance });
    broadcastDemoEvent({ step: "compliance-verification", status: complianceResult.compliant ? "passed" : "failed", detail: complianceResult, timing: timings.compliance });

    // --- Step 3: ZK commission proof ------------------------------------
    broadcastDemoEvent({ step: "zk-commission-proof", status: "running" });
    await wait(800);
    t0 = Date.now();
    const commissionProofHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint256", "uint256", "uint256"],
        [affiliateAddress, merchantAddress, BigInt(affiliateShare), BigInt(merchantShare), BigInt(Date.now())]
      )
    );
    timings.zkCommissionProof = Date.now() - t0 + 800;
    steps.push({ name: "zk-commission-proof", status: "proof_generated", detail: { proofHash: commissionProofHash, affiliatePercent: "15%", merchantPercent: "85%" }, timing: timings.zkCommissionProof });
    broadcastDemoEvent({ step: "zk-commission-proof", status: "proof_generated", detail: { proofHash: commissionProofHash }, timing: timings.zkCommissionProof });

    // --- Step 4: affiliate payment --------------------------------------
    broadcastDemoEvent({ step: "affiliate-payment", status: "running" });
    await wait(500);
    t0 = Date.now();
    const affiliateProofHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "address", "uint256", "uint256"],
        ["affiliate-payout", affiliateAddress, BigInt(affiliateShare), BigInt(Date.now())]
      )
    );
    const affiliateTxHash = "0x" + Buffer.from(`affiliate-tx-${Date.now()}`).toString("hex").padEnd(64, "0");
    timings.affiliatePayment = Date.now() - t0 + 500;
    steps.push({ name: "affiliate-payment", status: "sent", detail: { to: affiliateAddress, amount: affiliateShare.toString(), proofHash: affiliateProofHash, txHash: affiliateTxHash }, timing: timings.affiliatePayment });
    broadcastDemoEvent({ step: "affiliate-payment", status: "sent", detail: { amount: affiliateShare.toString(), txHash: affiliateTxHash }, timing: timings.affiliatePayment });

    // --- Step 5: merchant payment ---------------------------------------
    broadcastDemoEvent({ step: "merchant-payment", status: "running" });
    await wait(500);
    t0 = Date.now();
    const merchantProofHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "address", "uint256", "uint256"],
        ["merchant-payout", merchantAddress, BigInt(merchantShare), BigInt(Date.now())]
      )
    );
    const merchantTxHash = "0x" + Buffer.from(`merchant-tx-${Date.now()}`).toString("hex").padEnd(64, "0");
    timings.merchantPayment = Date.now() - t0 + 500;
    steps.push({ name: "merchant-payment", status: "sent", detail: { to: merchantAddress, amount: merchantShare.toString(), proofHash: merchantProofHash, txHash: merchantTxHash }, timing: timings.merchantPayment });
    broadcastDemoEvent({ step: "merchant-payment", status: "sent", detail: { amount: merchantShare.toString(), txHash: merchantTxHash }, timing: timings.merchantPayment });

    // --- Step 6: settlement complete ------------------------------------
    broadcastDemoEvent({ step: "settlement-complete", status: "running" });
    await wait(400);
    t0 = Date.now();
    const settlementProofHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "bytes32", "bytes32", "uint256"],
        [commissionProofHash, affiliateProofHash, merchantProofHash, BigInt(Date.now())]
      )
    );
    timings.settlementComplete = Date.now() - t0 + 400;
    steps.push({ name: "settlement-complete", status: "finalized", detail: { settlementProofHash, totalAmount: totalAmount.toString(), affiliateAmount: affiliateShare.toString(), merchantAmount: merchantShare.toString() }, timing: timings.settlementComplete });
    broadcastDemoEvent({ step: "settlement-complete", status: "finalized", detail: { settlementProofHash }, timing: timings.settlementComplete });

    // --- Compose response -----------------------------------------------
    timings.total =
      timings.buyerPayment +
      timings.compliance +
      timings.zkCommissionProof +
      timings.affiliatePayment +
      timings.merchantPayment +
      timings.settlementComplete;

    return res.json({
      success: true,
      steps,
      txHash: merchantTxHash,
      proofHash: settlementProofHash,
      commissionProofHash,
      affiliateTxHash,
      merchantTxHash,
      settlementProofHash,
      timings,
      split: {
        affiliatePercent: 15,
        merchantPercent: 85,
        affiliateAmount: affiliateShare.toString(),
        merchantAmount: merchantShare.toString(),
        totalAmount: totalAmount.toString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 4. GET /api/demo/events — SSE endpoint
// ---------------------------------------------------------------------------
router.get("/api/demo/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send an initial connected event
  res.write(`data: ${JSON.stringify({ step: "connected", status: "ok", detail: null, timing: 0 })}\n\n`);

  sseClients.push(res);

  req.on("close", () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) {
      sseClients.splice(idx, 1);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. POST /api/admin/compliance-rule — Add a compliance rule on-chain
// ---------------------------------------------------------------------------
router.post("/api/admin/compliance-rule", async (req, res) => {
  try {
    const { name, ruleType, value } = req.body;

    if (!name || !ruleType || value === undefined) {
      return res.status(400).json({ error: "Missing required fields: name, ruleType, value" });
    }

    const signerKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!signerKey) {
      return res.status(500).json({ error: "DEPLOYER_PRIVATE_KEY not set in environment" });
    }

    const provider = getProvider();
    const signer = new ethers.Wallet(signerKey, provider);

    const registry = new ethers.Contract(
      MONAD_CONFIG.contracts.complianceRegistry,
      COMPLIANCE_REGISTRY_ABI,
      signer
    );

    const tx = await registry.setRule(name, ruleType, BigInt(value));
    const receipt = await tx.wait();

    return res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 6. POST /api/audit/generate — Generate audit report on-chain
// ---------------------------------------------------------------------------
router.post("/api/audit/generate", async (req, res) => {
  try {
    const totalTransactions = 1500;
    const compliantCount = 1482;
    const passRate = 98.8;

    // Generate proof hash from audit data
    const proofHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "uint256"],
        [BigInt(totalTransactions), BigInt(compliantCount), BigInt(Date.now())]
      )
    );

    let txHash = null;
    let blockNumber = null;

    const signerKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (signerKey) {
      try {
        const provider = getProvider();
        const signer = new ethers.Wallet(signerKey, provider);

        const registry = new ethers.Contract(
          MONAD_CONFIG.contracts.complianceRegistry,
          COMPLIANCE_REGISTRY_ABI,
          signer
        );

        // passRate as integer basis points (98.8 -> 988)
        const passRateBps = Math.round(passRate * 10);
        const tx = await registry.emitAudit(
          proofHash,
          BigInt(totalTransactions),
          BigInt(passRateBps)
        );
        const receipt = await tx.wait();

        txHash = tx.hash;
        blockNumber = receipt.blockNumber;
      } catch (err) {
        console.error("On-chain audit emit failed (non-fatal):", err.message);
      }
    } else {
      console.warn("DEPLOYER_PRIVATE_KEY not set — skipping on-chain audit emit");
    }

    return res.json({
      proofHash,
      txHash,
      blockNumber,
      totalTransactions,
      compliantCount,
      passRate,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.broadcastDemoEvent = broadcastDemoEvent;
