import { MONAD_CONFIG } from "../config/monad";

/**
 * Build a Monad testnet explorer URL for a transaction or address.
 */
export function getExplorerUrl(txHash: string): string {
  return `${MONAD_CONFIG.explorerUrl}/tx/${txHash}`;
}

export function getAddressExplorerUrl(address: string): string {
  return `${MONAD_CONFIG.explorerUrl}/address/${address}`;
}

export function getBlockExplorerUrl(blockNumber: number): string {
  return `${MONAD_CONFIG.explorerUrl}/block/${blockNumber}`;
}
