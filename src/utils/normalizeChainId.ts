import { solana } from '@reown/appkit/networks'
import { ChainID } from '@shogun-sdk/intents-sdk'

/**
 * Normalize chainId values across connectors and the Intents SDK.
 *
 * Why:
 * - The Reown connector returns a different chainId format for Solana
 *   (string id from @reown/appkit/networks).
 * - The Intents SDK expects the `ChainID.Solana`  value instead.
 *
 * This helper ensures that whenever Solana is selected, we convert the
 * Reown-provided chainId to the correct Intents SDK `ChainID.Solana`.
 * For all other chains, the chainId is returned as-is.
 */
export function normalizeChainId(chainId: string | number) {
  if (chainId === solana.id) {
    return ChainID.Solana
  }
  return Number(chainId)
}
export function denormalizeChainId(chainId: string | number) {
  if (chainId === ChainID.Solana) {
    return solana.id
  }
  return chainId
}
