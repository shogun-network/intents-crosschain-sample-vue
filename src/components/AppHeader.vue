<template>
  <header class="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <!-- Logo -->
        <div class="flex items-center gap-2">
          <img src="/images/logo.png" class="block w-12" alt="Shogun logo" />
        </div>

        <!-- Desktop Wallet Section -->
        <div class="hidden md:flex items-center gap-4">
          <!-- 🌐 Both wallets connected -->
          <template v-if="isEvmConnected && isSolConnected">
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">{{ shortEvmAddress }}</span>
              <UiButton variant="outline" size="sm" class="gap-2" @click="disconnectEvm">
                <Wallet class="w-4 h-4" /> EVM
              </UiButton>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">{{ shortSolAddress }}</span>
              <UiButton variant="outline" size="sm" class="gap-2" @click="disconnectSolana">
                <Wallet class="w-4 h-4" /> Solana
              </UiButton>
            </div>
          </template>

          <!-- 💫 Only EVM connected -->
          <template v-else-if="isEvmConnected && !isSolConnected">
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">{{ shortEvmAddress }}</span>
              <UiButton variant="outline" size="sm" class="gap-2" @click="disconnectEvm">
                <Wallet class="w-4 h-4" /> Disconnect
              </UiButton>
            </div>
            <UiButton class="gap-2" @click="connectSolana">
              <Wallet class="w-4 h-4" /> Connect Solana
            </UiButton>
          </template>

          <!-- ⚡ Only Solana connected -->
          <template v-else-if="isSolConnected && !isEvmConnected">
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">{{ shortSolAddress }}</span>
              <UiButton variant="outline" size="sm" class="gap-2" @click="disconnectSolana">
                <Wallet class="w-4 h-4" /> Disconnect
              </UiButton>
            </div>
            <UiButton class="gap-2" @click="connectEvm">
              <Wallet class="w-4 h-4" /> Connect EVM
            </UiButton>
          </template>

          <!-- ❌ No wallet connected -->
          <template v-else>
            <UiButton class="gap-2" @click="connectWallet">
              <Wallet class="w-4 h-4" /> Connect Wallet
            </UiButton>
          </template>
        </div>

     
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/vue'
import UiButton from './ui/button/Button.vue'
import { Wallet } from 'lucide-vue-next'
import { shortenAddress } from '@/utils'

/** Multiple wallet namespaces supported by AppKit */
const { open } = useAppKit()
const { disconnect } = useDisconnect()

// --- EVM Wallet ---
const evmAccount = useAppKitAccount({ namespace: 'eip155' })
const isEvmConnected = computed(() => evmAccount.value.isConnected)
const evmAddress = computed(() => evmAccount.value.address ?? '')
const shortEvmAddress = computed(() => shortenAddress(evmAddress.value))

// --- Solana Wallet ---
const solAccount = useAppKitAccount({ namespace: 'solana' })
const isSolConnected = computed(() => solAccount.value.isConnected)
const solAddress = computed(() => solAccount.value.address ?? '')
const shortSolAddress = computed(() => shortenAddress(solAddress.value))

/** Connect functions */
const connectWallet = () => open()
const connectEvm = () => open({ namespace: 'eip155' })
const connectSolana = () => open({ namespace: 'solana' })

/** Disconnect functions */
const disconnectEvm = async () => {
  try {
    await disconnect({ namespace: 'eip155' })
  } catch (err) {
    console.error('EVM disconnect failed:', err)
  }
}
const disconnectSolana = async () => {
  try {
    await disconnect({ namespace: 'solana' })
  } catch (err) {
    console.error('Solana disconnect failed:', err)
  }
}
</script>

<script lang="ts">
export default { name: 'AppHeader' }
</script>
