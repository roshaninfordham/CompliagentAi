/**
 * Rate-limited JSON-RPC provider wrapper for Monad public RPC.
 * Respects the 25 req/sec rate limit with a sliding-window token bucket.
 */

const MAX_RPS = 25;
const WINDOW_MS = 1000;

let tokens = MAX_RPS;
let lastRefill = Date.now();
const queue = [];

function refillTokens() {
  const now = Date.now();
  const elapsed = now - lastRefill;
  if (elapsed >= WINDOW_MS) {
    tokens = MAX_RPS;
    lastRefill = now;
  }
}

function processQueue() {
  refillTokens();
  while (queue.length > 0 && tokens > 0) {
    tokens--;
    const { resolve } = queue.shift();
    resolve();
  }
  if (queue.length > 0) {
    setTimeout(processQueue, WINDOW_MS - (Date.now() - lastRefill));
  }
}

/**
 * Acquire a rate-limit token before making an RPC call.
 * Resolves immediately if under limit, otherwise queues.
 */
function acquireToken() {
  refillTokens();
  if (tokens > 0) {
    tokens--;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    queue.push({ resolve });
    if (queue.length === 1) {
      setTimeout(processQueue, WINDOW_MS - (Date.now() - lastRefill));
    }
  });
}

/**
 * Wrap an ethers provider's send method with rate limiting.
 * Usage:
 *   const provider = new ethers.JsonRpcProvider(rpcUrl);
 *   wrapProviderWithRateLimit(provider);
 */
function wrapProviderWithRateLimit(provider) {
  const originalSend = provider.send.bind(provider);
  provider.send = async function (method, params) {
    await acquireToken();
    return originalSend(method, params);
  };
  return provider;
}

module.exports = {
  acquireToken,
  wrapProviderWithRateLimit,
  MAX_RPS,
};
