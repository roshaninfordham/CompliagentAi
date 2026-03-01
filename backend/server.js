require("dotenv").config();
const express = require("express");
const cors = require("cors");
const agentRoutes = require("./routes/agents");
const fundingRoutes = require("./routes/funding");
const paymentRoutes = require("./routes/payments");
const { processAgentPayment, complianceRules } = require("./compliance-engine");
const { checkConnection, getBalance, getBlockNumber } = require("./monad-provider");
const { stampShieldedPayment, batchStampPayments, formatPrivateTransaction, formatPublicTransaction } = require("./privacy-helpers");
const MONAD_CONFIG = require("./config/monad");
const demoRoutes = require("./demo-routes");

const app = express();
app.use(cors());
app.use(express.json());

// Mount routes
app.use("/api/agents", agentRoutes);
app.use("/api/funding", fundingRoutes);
app.use("/api/payments", paymentRoutes);
app.use(demoRoutes);

// The main compliance endpoint — this is what your x402 agent calls
app.post("/api/compliance/process", async (req, res) => {
  try {
    const { agentIndex, vendorAddress, amount } = req.body;
    const result = await processAgentPayment(agentIndex, vendorAddress, amount);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: add vendor to allowlist
app.post("/api/admin/allowlist", (req, res) => {
  const { vendorAddress } = req.body;
  complianceRules.vendorAllowlist.add(vendorAddress.toLowerCase());
  res.json({ success: true, allowlist: [...complianceRules.vendorAllowlist] });
});

// Admin: set agent budget
app.post("/api/admin/budget", (req, res) => {
  const { agentIndex, limit } = req.body;
  complianceRules.agentBudgets.set(agentIndex, BigInt(limit));
  res.json({ success: true });
});

// Monad Testnet: connection health & status
app.get("/api/monad/status", async (req, res) => {
  try {
    const status = await checkConnection();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Monad Testnet: get wallet balance
app.get("/api/monad/balance/:address", async (req, res) => {
  try {
    const balance = await getBalance(req.params.address);
    res.json({ address: req.params.address, balance, unit: "MON" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Monad Testnet: current block number
app.get("/api/monad/block", async (req, res) => {
  try {
    const blockNumber = await getBlockNumber();
    res.json({ blockNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Privacy: stamp a shielded payment on-chain
app.post("/api/privacy/stamp", async (req, res) => {
  try {
    const { txHash, agentIndex, vendorAddress, amount } = req.body;
    // In production, signer key comes from secure vault — not req body
    const signerKey = process.env.DEPLOYER_PRIVATE_KEY;
    const result = await stampShieldedPayment(txHash, agentIndex, vendorAddress, amount, signerKey);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Privacy: batch stamp shielded payments
app.post("/api/privacy/batch-stamp", async (req, res) => {
  try {
    const { payments } = req.body; // array of { txHash, agentIndex, vendorAddress, amount }
    const signerKey = process.env.DEPLOYER_PRIVATE_KEY;
    const result = await batchStampPayments(payments, signerKey);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Privacy: format transaction for UI (strips sensitive data)
app.post("/api/privacy/format", (req, res) => {
  const { transaction, shielded } = req.body;
  const formatted = shielded
    ? formatPrivateTransaction(transaction)
    : formatPublicTransaction(transaction);
  res.json(formatted);
});

// Contracts info (for frontend discovery)
app.get("/api/contracts", (req, res) => {
  res.json({
    network: "monad-testnet",
    chainId: MONAD_CONFIG.chainId,
    explorer: MONAD_CONFIG.explorerUrl,
    contracts: MONAD_CONFIG.contracts,
  });
});

async function start() {
  // Unlink SDK uses lazy init — loads on first privacy/burner route call
  // This keeps the server from blocking if the SDK gateway is slow
  // Verify Monad connection at startup
  const monadStatus = await checkConnection();
  console.log(`Monad Testnet: ${monadStatus.connected ? "connected" : "DISCONNECTED"} | Chain ${monadStatus.chainId} | Block #${monadStatus.blockNumber} | ${monadStatus.latency}ms`);
  const walletBalance = await getBalance(MONAD_CONFIG.walletAddress);
  console.log(`Wallet ${MONAD_CONFIG.walletAddress}: ${walletBalance} MON`);
  app.listen(3001, () => console.log("CompliAgent backend running on :3001"));
}

start();
