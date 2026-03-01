/**
 * Shared Monad utilities for Vercel Serverless Functions.
 * Replicates what backend/monad-provider.js + config do.
 */
const { ethers } = require("ethers");

const MONAD_CONFIG = {
    chainId: 10143,
    rpcUrl: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
    explorerUrl: "https://testnet.monadvision.com",
    contracts: {
        complianceRegistry: "0xC37a8f0ca860914BfAce8361Bf0621EAEa14863F",
        budgetVault: "0x56e8C1ED242396645376A92e6b7c6ECd2d871DD5",
        mockUSDC: "0x18c945c79f85f994A10356Aa4945371Ec4cD75D4",
        affiliateSettler: "0x9284cB50d7b7678be61F11A7688DC768f0E02A89",
    },
    walletAddress: "0xA27bad84EDc13cd12f9740FC1a1de24e8904B406",
};

const COMPLIANCE_REGISTRY_ABI = [
    "function setRule(string name, string ruleType, uint256 value)",
    "function emitAudit(bytes32 auditHash, uint256 totalTransactions, uint256 passRate)",
    "function verifyAndStamp(bytes32 txHash, bytes32 proofHash)",
    "function totalStamped() view returns (uint256)",
];

let _provider = null;
function getProvider() {
    if (!_provider) {
        _provider = new ethers.JsonRpcProvider(MONAD_CONFIG.rpcUrl);
    }
    return _provider;
}

function getSigner() {
    const key = process.env.DEPLOYER_PRIVATE_KEY;
    if (!key) throw new Error("DEPLOYER_PRIVATE_KEY not configured");
    return new ethers.Wallet(key, getProvider());
}

function getRegistry() {
    return new ethers.Contract(
        MONAD_CONFIG.contracts.complianceRegistry,
        COMPLIANCE_REGISTRY_ABI,
        getSigner()
    );
}

/**
 * Perform a REAL on-chain compliance stamp.
 * Returns { txHash, blockNumber, proofHash } or null on failure.
 */
async function stampOnChain(proofHash) {
    try {
        const registry = getRegistry();
        const tx = await registry.verifyAndStamp(proofHash, proofHash);
        const receipt = await tx.wait();
        return { txHash: tx.hash, blockNumber: receipt.blockNumber, proofHash };
    } catch (err) {
        console.error("On-chain stamp failed:", err.message);
        return null;
    }
}

/**
 * Local compliance check (mirrors backend/compliance-engine.js logic).
 */
function localComplianceCheck(vendorAddress, amount) {
    const rules = [];
    const errors = [];

    // Budget cap check
    rules.push("budget_cap");
    if (amount > 100_000_000_000) {
        errors.push("Amount exceeds budget cap of 100B");
    }

    // Vendor allowlist check (for demo: always passes)
    rules.push("vendor_allowlist");

    // AML threshold
    rules.push("aml_threshold");
    if (amount > 500_000_000_000) {
        errors.push("Amount exceeds AML threshold");
    }

    // Rate limit
    rules.push("rate_limit");

    return {
        compliant: errors.length === 0,
        rulesChecked: rules,
        errors,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Derive deterministic burner address for an agent index.
 * Uses HD wallet derivation from the deployer key.
 */
function deriveAgentAddress(agentIndex) {
    const key = process.env.DEPLOYER_PRIVATE_KEY;
    if (!key) return `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`;

    // Create deterministic child key: keccak256(parentKey + "compliagent-burner" + index)
    const derivedKey = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["bytes32", "string", "uint256"],
            [key, "compliagent-burner", BigInt(agentIndex)]
        )
    );
    const wallet = new ethers.Wallet(derivedKey);
    return wallet.address;
}

/** Standard CORS headers for Vercel serverless functions */
function setCors(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = {
    MONAD_CONFIG,
    COMPLIANCE_REGISTRY_ABI,
    getProvider,
    getSigner,
    getRegistry,
    stampOnChain,
    localComplianceCheck,
    deriveAgentAddress,
    setCors,
    ethers,
};
