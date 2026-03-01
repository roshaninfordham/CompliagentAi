const { setCors, ethers, getRegistry } = require("../_lib/monad");

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const { name, ruleType, value } = req.body || {};

        if (!name || !ruleType || value === undefined) {
            return res.status(400).json({ error: "Missing required fields: name, ruleType, value" });
        }

        const registry = getRegistry();
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
};
