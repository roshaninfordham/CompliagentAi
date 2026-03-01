const { setCors, MONAD_CONFIG } = require("../_lib/monad");

module.exports = function handler(req, res) {
    setCors(res);
    if (req.method === "OPTIONS") return res.status(200).end();

    return res.json({
        network: "monad-testnet",
        chainId: MONAD_CONFIG.chainId,
        explorer: MONAD_CONFIG.explorerUrl,
        contracts: MONAD_CONFIG.contracts,
    });
};
