/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import {
  getWallets,
  StandardConnect,
  StandardDisconnect,
  SUI_MAINNET_CHAIN,
  SuiSignAndExecuteTransaction,
  SuiSignPersonalMessage,
} from '@mysten/wallet-standard'
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { type Transaction } from '@mysten/sui/transactions'
import type { WalletAccount } from '@wallet-standard/core'
import type {
  SuiSignAndExecuteTransactionMethod,
  SuiSignAndExecuteTransactionVersion,
  SuiSignPersonalMessageMethod,
  SuiSignPersonalMessageVersion,
  Wallet,
} from '@mysten/wallet-standard'
import type { SignedPersonalMessage } from '@mysten/wallet-standard'

const currentWallet: Ref<Wallet | null> = ref(null)
const currentAccount: Ref<WalletAccount | null> = ref(null)
const wallets: Ref<Wallet[]> = ref([])

export const useSuiWallet = () => {
  const suiClient = new SuiClient({
    url: getFullnodeUrl('mainnet'),
  })

  const getAvailableWallets = (): Wallet[] => {
    const walletsApi = getWallets()
    const allWallets = walletsApi.get()

    // Filter for valid Sui wallets only
    const suiWallets = allWallets.filter(isValidSuiWallet)

    // Normalize them into consistent Wallet objects
    const standardizedWallets = suiWallets.map(standardizeWallet)

    wallets.value = standardizedWallets
    return wallets.value
  }

  const isValidSuiWallet = (wallet: Wallet): wallet is Wallet => {
    if (!wallet || typeof wallet !== 'object') return false
    if (!wallet.name || typeof wallet.name !== 'string') return false
    if (!Array.isArray(wallet.chains)) return false

    // Must support at least one Sui chain
    const hasSuiChain = wallet.chains.some((chain: string) => chain.startsWith('sui:'))
    if (!hasSuiChain) return false

    if (!wallet.features || !wallet.features['standard:connect']) return false

    return true
  }

  // Ensures icon/chains/features are always safe defaults
  const standardizeWallet = (wallet: Wallet): Wallet => {
    return {
      ...wallet,
      name: wallet.name.trim(),
      icon: wallet.icon ?? '',
      chains: wallet.chains ?? [],
      features: wallet.features ?? {},
    }
  }

  const connect = async (walletName: string): Promise<WalletAccount> => {
    const availableWallets = getAvailableWallets()
    const selectedWallet = availableWallets.find((w) => w.name === walletName)
    if (!selectedWallet) throw new Error(`Wallet "${walletName}" not found`)

    if (!selectedWallet.features['standard:connect']) {
      throw new Error(`Wallet "${walletName}" does not support connect`)
    }

    // @ts-expect-error
    const result = await selectedWallet.features['standard:connect'].connect()
    if (!result.accounts || result.accounts.length === 0) {
      throw new Error('No accounts returned')
    }

    currentWallet.value = selectedWallet
    currentAccount.value = result.accounts[0]

    //  persist connection
    localStorage.setItem(
      'sui-connection',
      JSON.stringify({
        walletName: selectedWallet.name,
        address: result.accounts[0].address,
      }),
    )

    return result.accounts[0]
  }

  const disconnect = async (): Promise<void> => {
    if (currentWallet.value?.features[StandardDisconnect]) {
      // @ts-expect-error
      await currentWallet.value.features[StandardDisconnect]?.disconnect()
    }
    currentWallet.value = null
    currentAccount.value = null

    //  clear persistence
    localStorage.removeItem('sui-connection')
  }

  const restoreConnection = async (): Promise<void> => {
    const saved = localStorage.getItem('sui-connection')
    if (!saved) return

    try {
      const { walletName } = JSON.parse(saved)
      const availableWallets = getAvailableWallets()
      const selectedWallet = availableWallets.find((w) => w.name === walletName)
      if (!selectedWallet) return

      // reconnect
      // @ts-expect-error
      const result = await selectedWallet.features[StandardConnect].connect()
      if (result.accounts && result.accounts.length > 0) {
        currentWallet.value = selectedWallet
        currentAccount.value = result.accounts[0]
      }
    } catch (err) {
      console.error('Failed to restore Sui wallet connection:', err)
    }
  }

  const signAndExecuteTransaction = async (transaction: Transaction) => {
    if (!currentWallet.value || !currentAccount.value) {
      throw new Error('No wallet/account connected')
    }

    const feature = currentWallet.value.features[SuiSignAndExecuteTransaction] as {
      version: SuiSignAndExecuteTransactionVersion
      signAndExecuteTransaction: SuiSignAndExecuteTransactionMethod
    }

    if (!feature) throw new Error('Wallet does not support signAndExecuteTransactionBlock')

    return feature.signAndExecuteTransaction({
      transaction: transaction,
      account: currentAccount.value,
      chain: SUI_MAINNET_CHAIN,
    })
  }

  const signMessage = async (message: string): Promise<SignedPersonalMessage> => {
    if (!currentWallet.value || !currentAccount.value) {
      throw new Error('No wallet/account connected')
    }

    const feature = currentWallet.value.features[SuiSignPersonalMessage] as {
      signPersonalMessage: SuiSignPersonalMessageMethod
      version: SuiSignPersonalMessageVersion
    }

    if (!feature) throw new Error('Wallet does not support signMessage')

    return feature.signPersonalMessage({
      message: new TextEncoder().encode(message),
      account: currentAccount.value,
    })
  }

  const isConnected: ComputedRef<boolean> = computed(() => !!currentAccount.value)

  return {
    currentWallet,
    currentAccount,
    wallets,
    isConnected,
    getAvailableWallets,
    connect,
    disconnect,
    restoreConnection,
    signAndExecuteTransaction,
    signMessage,
    suiClient,
  }
}
