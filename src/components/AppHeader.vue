<template>
  <header class="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="flex items-center justify-center">
            <img src="/images/logo.png" class="block w-12" alt="shogun logo" />
          </div>
        </div>

        <div class="hidden md:flex items-center gap-4">
          <div v-if="isConnected" class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground">
              {{ shortAddress }}
            </span>
            <UiButton variant="outline" class="gap-2" @click="handleDisconnect">
              <Wallet class="w-4 h-4" />
              Disconnect
            </UiButton>
          </div>
          <UiButton v-else class="gap-2" @click="openAppKit">
            <Wallet class="w-4 h-4" />
            Connect Wallet
          </UiButton>
        </div>

        <UiButton variant="ghost" size="icon" class="md:hidden">
          <Menu class="w-5 h-5" />
        </UiButton>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/vue'
import UiButton from './ui/button/Button.vue'
import { Wallet, Menu } from 'lucide-vue-next'

const { disconnect } = useDisconnect()
const { open } = useAppKit()
const accountInfo = useAppKitAccount()

const isConnected = computed(() => accountInfo.value.isConnected)
const address = computed(() => accountInfo.value.address)

const openAppKit = () => open()
const handleDisconnect = async () => {
  try {
    await disconnect()
  } catch (error) {
    console.error('Error during disconnect:', error)
  }
}
const shortAddress = computed(() => {
  if (!address.value) return ''
  return `${address.value.slice(0, 6)}...${address.value.slice(-4)}`
})
</script>

<script lang="ts">
export default {
  name: 'AppHeader',
}
</script>
