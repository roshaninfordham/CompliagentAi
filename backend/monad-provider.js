const { ethers } = require("ethers");
const MONAD_CONFIG = require("./config/monad");
const { wrapProviderWithRateLimit } = require("./rate-limiter");

let provider = null;

function getProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(MONAD_CONFIG.rpcUrl);
    // Wrap with rate limiter (25 req/sec for Monad public RPC)
    wrapProviderWithRateLimit(provider);
  }
  return provider;
}

async function checkConnection() {
  const p = getProvider();
  const start = Date.now();
  try {
    const [network, blockNumber] = await Promise.all([
      p.getNetwork(),
      p.getBlockNumber(),
    ]);
    return {
      connected: true,
      chainId: Number(network.chainId),
      blockNumber,
      latency: Date.now() - start,
    };
  } catch (err) {
    return { connected: false, chainId: 0, blockNumber: 0, latency: -1, error: err.message };
  }
}

async function getBalance(address) {
  const p = getProvider();
  const balance = await p.getBalance(address);
  return ethers.formatEther(balance);
}

async function getBlockNumber() {
  const p = getProvider();
  return await p.getBlockNumber();
}

module.exports = { getProvider, checkConnection, getBalance, getBlockNumber };
