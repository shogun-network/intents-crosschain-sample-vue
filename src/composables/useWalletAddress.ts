import { computed, type Ref } from 'vue'
import { useAppKitAccount } from '@reown/appkit/vue'
import { isEvmChain } from '@shogun-sdk/one-shot'

/**
 * useWalletAddress — Unified EVM / Solana wallet composable.
 *
 * Accepts a reactive chainId (Ref or ComputedRef) and automatically returns
 * the corresponding connected wallet address (EVM or Solana).
 *
 * @param chainIdRef - A Ref<number | undefined> representing the chainId.
 *
 * @returns {
 *   address: ComputedRef<string | null>,
 *   isEvm: ComputedRef<boolean>,
 *   isConnected: ComputedRef<boolean>,
 *   namespace: ComputedRef<'eip155' | 'solana'>
 * }
 *
 * Example:
 * ```ts
 * const srcChainId = computed(() => swap.srcChain?.id)
 * const { address: accountAddress } = useWalletAddress(srcChainId)
 *
 * const destChainId = computed(() => swap.destChain?.id)
 * const { address: destAccountAddress } = useWalletAddress(destChainId)
 * ```
 */
export function useWalletAddress(chainIdRef?: Ref<number | undefined>) {
  // Determine whether current chain is EVM or Solana
  const isEvm = computed(() => {
    const id = chainIdRef?.value
    // If chainId missing → assume EVM by default
    if (!id) return true
    try {
      return isEvmChain(id)
    } catch {
      return true
    }
  })

  const namespace = computed(() => (isEvm.value ? 'eip155' : 'solana'))

  // Get reactive accounts from AppKit
  const evmAccount = useAppKitAccount({ namespace: 'eip155' })
  const solAccount = useAppKitAccount({ namespace: 'solana' })

  // Computed wallet address based on chain type
  const address = computed(() =>
    isEvm.value ? evmAccount.value.address ?? null : solAccount.value.address ?? null,
  )

  // Computed connection state
  const isConnected = computed(() =>
    isEvm.value ? evmAccount.value.isConnected : solAccount.value.isConnected,
  )

  const addresses = computed(() => {
    return {
      EVM: evmAccount.value.address,
      SVM: solAccount.value.address,
    }
  })

  return {
    address,
    isEvm,
    isConnected,
    namespace,
    addresses
  }
}
