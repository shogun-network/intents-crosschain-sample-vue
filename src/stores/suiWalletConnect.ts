import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSuiWallet } from '@/composables/useSuiWallet'

export const useSuiWalletConnectStore = defineStore('walletConnect', () => {
  const isOpen = ref(false)
  const walletApi = useSuiWallet()
  const availableWallets = walletApi.getAvailableWallets()
  const address = computed(() => walletApi.currentAccount.value?.address ?? null)

  function openDialog() {
    isOpen.value = true
  }
  function closeDialog() {
    isOpen.value = false
  }

  async function connectWallet(name: string) {
    await walletApi.connect(name)
    closeDialog()
  }

  async function disconnectWallet() {
    await walletApi.disconnect()
  }

  return {
    // state
    isOpen,
    address,
    currentWallet: walletApi.currentWallet,
    wallets: availableWallets,
    isConnected: walletApi.isConnected,

    // actions
    openDialog,
    closeDialog,
    connectWallet,
    disconnectWallet,
  }
})
