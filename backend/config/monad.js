// Monad Testnet Configuration
const MONAD_CONFIG = {
  chainId: 10143,
  rpcUrl: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
  wsUrl: process.env.MONAD_WS_URL || "wss://monad-testnet.blockvision.org/v1/3ALilKEpxGmrGJcdsIzhU83Az66",
  explorerUrl: "https://testnet.monadexplorer.com",
  blockTime: 400,   // ~400ms
  finality: 800,    // ~800ms
  walletAddress: "0xA27bad84EDc13cd12f9740FC1a1de24e8904B406",
  contracts: {
    complianceRegistry: "0xC37a8f0ca860914BfAce8361Bf0621EAEa14863F",
    budgetVault: "0x56e8C1ED242396645376A92e6b7c6ECd2d871DD5",
    mockUSDC: "0x18c945c79f85f994A10356Aa4945371Ec4cD75D4",
    affiliateSettler: "0x9284cB50d7b7678be61F11A7688DC768f0E02A89",
  },
};

module.exports = MONAD_CONFIG;
