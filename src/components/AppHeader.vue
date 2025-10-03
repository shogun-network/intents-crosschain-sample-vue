<template>
  <header class="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <!-- Logo -->
        <div class="flex items-center gap-2">
          <div class="flex items-center justify-center">
            <img src="/images/logo.png" class="block w-12" alt="shogun logo" />
          </div>
        </div>

        <!-- Wallet section (desktop only) -->
        <div class="hidden md:flex items-center gap-4">
          <!-- If user is connected, show address + disconnect button -->
          <div v-if="isConnected" class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground">
              {{ shortAddress }}
            </span>
            <UiButton variant="outline" class="gap-2" @click="handleDisconnect">
              <Wallet class="w-4 h-4" />
              Disconnect
            </UiButton>
          </div>

          <!-- If user is not connected, show connect button -->
          <UiButton v-else class="gap-2" @click="openWalletModal">
            <Wallet class="w-4 h-4" />
            Connect Wallet
          </UiButton>
        </div>

        <!-- Mobile menu toggle -->
        <UiButton variant="ghost" size="icon" class="md:hidden">
          <Menu class="w-5 h-5" />
        </UiButton>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/vue'
import UiButton from './ui/button/Button.vue'
import { Wallet, Menu } from 'lucide-vue-next'
import { useSuiWalletConnectStore, useSwapStore } from '@/stores'
import { useSuiWallet } from '@/composables/useSuiWallet'
import { ChainID } from '@shogun-sdk/intents-sdk'

/**
 * AppKit handles EVM/Solana wallets (MetaMask, Phantom, etc.)
 */
const { disconnect } = useDisconnect()
const { open } = useAppKit()
const accountInfo = useAppKitAccount()
const isAppKitConnected = computed(() => accountInfo.value.isConnected)
const appKitAddress = computed(() => accountInfo.value.address)

/**
 * Swap store gives us the currently selected chain (EVM, Solana, Sui, etc.)
 * Using storeToRefs ensures srcChain stays reactive when updated.
 */
const swapStore = useSwapStore()
const { srcChain } = storeToRefs(swapStore)
const srcChainId = computed(() => srcChain.value?.id)

/**
 * Sui wallet composable manages native Sui wallets (e.g. Suiet, Ethos)
 */
const {
  currentAccount,
  isConnected: isSuiConnected,
  restoreConnection: restoreSuiConnection,
  disconnect: disconnectSui,
} = useSuiWallet()
const { openDialog: openSuiDialog } = useSuiWalletConnectStore()

/**
 * Effective "isConnected" flag:
 * - If current chain is Sui, use Sui wallet connection
 * - Otherwise, use AppKit connection
 */
const isConnected = computed(() => {
  if (srcChainId.value === ChainID.Sui) {
    return isSuiConnected.value
  }
  return isAppKitConnected.value
})

/**
 * Effective address:
 * - If current chain is Sui, use the Sui account address
 * - Otherwise, use the AppKit account address
 */
const address = computed(() => {
  if (srcChainId.value === ChainID.Sui) {
    return currentAccount.value?.address ?? ''
  }
  return appKitAddress.value ?? ''
})

/**
 * Shortened address for UI display (0x1234...abcd)
 */
const shortAddress = computed(() => {
  if (!address.value) return ''
  return `${address.value.slice(0, 6)}...${address.value.slice(-4)}`
})

/**
 * Opens the correct wallet connect modal based on chain:
 * - Sui → open native Sui dialog
 * - Others → open AppKit modal
 */
const openWalletModal = () => {
  if (srcChainId.value === ChainID.Sui) {
    openSuiDialog()
  } else {
    open()
  }
}

/**
 * Disconnect handler:
 * - Calls the correct disconnect function depending on chain
 */
const handleDisconnect = async () => {
  try {
    if (srcChainId.value === ChainID.Sui) {
      await disconnectSui()
    } else {
      await disconnect()
    }
  } catch (error) {
    console.error('Error during disconnect:', error)
  }
}

/**
 * On mount, restore Sui connection if user was previously connected
 */
onMounted(() => {
  restoreSuiConnection()
})
</script>

<script lang="ts">
export default {
  name: 'AppHeader',
}
</script>
