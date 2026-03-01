const { setCors, deriveAgentAddress, getProvider, ethers } = require("../_lib/monad");

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const { agentIndex, amount } = req.body || {};
        const idx = agentIndex ?? 0;
        const burnerAddress = deriveAgentAddress(idx);

        const key = process.env.DEPLOYER_PRIVATE_KEY;
        if (!key) {
            return res.status(500).json({ error: "DEPLOYER_PRIVATE_KEY not configured" });
        }

        const provider = getProvider();
        const deployer = new ethers.Wallet(key, provider);

        const MOCK_USDC = "0x18c945c79f85f994A10356Aa4945371Ec4cD75D4";
        const ERC20_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];
        const usdc = new ethers.Contract(MOCK_USDC, ERC20_ABI, deployer);

        // 1. Transfer Mock USDC
        const transferTx = await usdc.transfer(burnerAddress, BigInt(amount || 10000000));
        await transferTx.wait();

        // 2. Transfer MON for gas
        const monTx = await deployer.sendTransaction({
            to: burnerAddress,
            value: ethers.parseEther("0.05"),
        });
        await monTx.wait();

        return res.json({
            success: true,
            agentIndex: idx,
            fundedAmount: amount || 10000000,
            result: {
                txHash: transferTx.hash,
                gasTxHash: monTx.hash,
            },
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
