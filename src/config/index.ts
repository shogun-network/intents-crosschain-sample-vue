import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import { base, solana, type AppKitNetwork } from '@reown/appkit/networks'
import type { Chain } from '@/types'
import { normalizeChainId } from '@/utils'
import { ChainID, PROD_CROSS_CHAIN_GUARD_ADDRESSES } from '@shogun-sdk/intents-sdk'

export const projectId = import.meta.env.VITE_PROJECT_ID || 'b56e18d47c72ab683b10814fe9495694' // this is a public projectId only to use on localhost
if (!projectId) {
  throw new Error('VITE_PROJECT_ID is not set')
}

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [base, solana]

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
})

export const solanaWeb3JsAdapter = new SolanaAdapter()

export const SUPPORTED_CHAINS: Chain[] = [
  // Map existing networks
  ...networks.map((n) => ({
    id: normalizeChainId(n.id),
    name: n.name,
    icon: `/images/${n.id}.svg`, // assumes you have svg in /public/images/
  })),

  {
    id: ChainID.Sui,
    name: 'Sui',
    icon: `/images/${ChainID.Sui}.svg`,
  },
]

export const SUI_GUARD_ADDRESS = PROD_CROSS_CHAIN_GUARD_ADDRESSES[ChainID.Sui]
