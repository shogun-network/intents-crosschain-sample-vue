
import type { Provider } from '@reown/appkit-adapter-solana'
import { useAppKitProvider } from '@reown/appkit/vue'
import { adaptSolanaWallet, adaptViemWallet } from '@shogun-sdk/one-shot/wallet-adapter'
import { computed } from 'vue'
import { getWalletClient, type Config } from '@wagmi/core'
import { ChainId , isEvmChain} from '@shogun-sdk/one-shot/vue'
export async function useAdoptedWallet(
  accountAddress: string,
  srcChainId: number,
  wagmiConfig: Config,
) {
  const solanaProvider = useAppKitProvider<Provider>('solana')
  const solanaSigner = computed(() => solanaProvider.walletProvider)

  if (srcChainId === ChainId.SOLANA) {
    const sendTx = solanaSigner.value?.signAllTransactions?.bind(solanaSigner.value)
    if (!sendTx) throw new Error('Solana wallet provider not connected.')

    return adaptSolanaWallet(
      accountAddress,
      srcChainId,
      import.meta.env.VITE_SOLANA_RPC_URL,
      sendTx,
    )
  }

  if (isEvmChain(srcChainId)) {
    const walletClient = await getWalletClient(wagmiConfig)
    if (!walletClient) throw new Error('EVM wallet not connected.')

    // Patch: Shogun expects the WalletClient from its own viem version, but wagmi may return a different version.
    // This re-creates a WalletClient object using the required viem version, copying key fields.
    // See https://github.com/wevm/wagmi/issues/4134

    //  Ignore type differences for cross-version compatibility
    return adaptViemWallet(walletClient)
  }

  throw new Error(`Unsupported chain ID: ${srcChainId}`)
}
