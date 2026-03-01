const { setCors, getProvider, MONAD_CONFIG } = require("../_lib/monad");

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === "OPTIONS") return res.status(200).end();

    try {
        const provider = getProvider();
        const start = Date.now();
        const [network, blockNumber] = await Promise.all([
            provider.getNetwork(),
            provider.getBlockNumber(),
        ]);

        return res.json({
            connected: true,
            chainId: Number(network.chainId),
            blockNumber,
            latency: Date.now() - start,
        });
    } catch (err) {
        return res.json({ connected: false, chainId: 0, blockNumber: 0, latency: -1, error: err.message });
    }
};
