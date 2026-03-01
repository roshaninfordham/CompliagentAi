import { useUnlink } from "@unlink-xyz/react";

export function useCompliAgent() {
  const {
    // State
    ready,
    busy,
    walletExists,
    activeAccount,
    balances,
    status,
    error,

    // Wallet actions
    createWallet,
    importWallet,
    createAccount,

    // Transfer actions for the CFO dashboard
    deposit,            // Move tokens INTO private pool
    send,               // Private transfer to another Unlink address
    withdraw,           // Move tokens OUT of private pool to public address

    // Monitoring
    pendingDeposits,
    pendingSends,
    pendingWithdrawals,
    refresh,

    // Tx tracking
    getTxStatus,
    waitForConfirmation,
  } = useUnlink();

  // Initialize wallet for first-time enterprise setup
  async function initializeEnterprise() {
    if (!walletExists) {
      const { mnemonic } = await createWallet();
      // IMPORTANT: Show this to the CFO to back up securely
      // This mnemonic controls the entire private pool
      return { mnemonic, isNew: true };
    }
    if (!activeAccount) {
      await createAccount();
    }
    return { isNew: false };
  }

  // Deposit enterprise funds into the private pool
  // The CFO calls this from the dashboard
  // `token` = ERC-20 contract address (your MockUSDC)
  // `amount` in smallest unit (bigint)
  async function depositToPool(token, amount) {
    const result = await deposit([{ token, amount }]);
    return result;
  }

  // Private transfer to another Unlink address
  // Used for inter-enterprise private settlement
  async function privateSend(token, recipientUnlinkAddress, amount) {
    const result = await send([{
      token,
      recipient: recipientUnlinkAddress, // "unlink1..." format
      amount,
    }]);
    return result;
  }

  // Withdraw from private pool to a public address
  async function withdrawToPublic(token, publicAddress, amount) {
    const result = await withdraw([{ token, recipient: publicAddress, amount }]);
    return result;
  }

  return {
    ready,
    busy,
    walletExists,
    activeAccount,
    balances,
    status,
    error,
    pendingDeposits,
    pendingSends,
    pendingWithdrawals,
    initializeEnterprise,
    depositToPool,
    privateSend,
    withdrawToPublic,
    refresh,
    getTxStatus,
    waitForConfirmation,
  };
}
