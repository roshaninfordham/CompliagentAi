const { setCors, deriveAgentAddress } = require("../_lib/monad");

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const { agentIndex } = req.body || {};
        const idx = agentIndex ?? 0;

        // Derive a deterministic burner address for this agent
        const burnerAddress = deriveAgentAddress(idx);
        console.log(`Agent ${idx} burner address: ${burnerAddress}`);

        return res.json({
            success: true,
            agentIndex: idx,
            burnerAddress,
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
