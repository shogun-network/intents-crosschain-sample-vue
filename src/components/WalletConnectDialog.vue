<template>
  <Dialog :open="store.isOpen" @update:open="store.isOpen = $event">
    <!-- Overlay -->
    <DialogOverlay class="fixed inset-0 bg-black/50 backdrop-blur-sm" />

    <!-- Modal content -->
    <DialogContent
      class="fixed top-1/2 left-1/2 w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-5 shadow-2xl"
    >
      <DialogHeader class="text-center">
        <DialogTitle class="text-lg font-semibold">Connect Wallet</DialogTitle>
        <DialogDescription class="text-sm text-muted-foreground">
          Select a wallet to connect with Sui
        </DialogDescription>
      </DialogHeader>

      <!-- Wallet list -->
      <div class="space-y-2 mt-4">
        <button
          v-for="wallet in store.wallets"
          :key="wallet.id"
          @click="store.connectWallet(wallet.name)"
          class="flex items-center gap-3 w-full px-4 py-2 border rounded-lg hover:bg-accent transition text-left"
        >
          <!-- Wallet Icon -->
          <img v-if="wallet.icon" :src="wallet.icon" alt="wallet icon" class="w-6 h-6 rounded-md" />
          <div class="flex-1">
            <span class="block font-medium text-sm">{{ wallet.name }}</span>
            <span class="text-xs text-muted-foreground">Click to connect</span>
          </div>
        </button>
      </div>

      <!-- Footer -->
      <DialogFooter class="mt-5">
        <button
          @click="store.closeDialog"
          class="w-full px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm"
        >
          Cancel
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { useSuiWalletConnectStore } from '@/stores'
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

const store = useSuiWalletConnectStore()
</script>
