<template>
  <UiCard class="w-full max-w-md mx-auto bg-card/50 backdrop-blur-sm border-border/50">
    <UiCardHeader class="pb-4">
      <div class="flex items-center justify-between">
        <UiCardTitle class="text-lg font-semibold text-balance">
          {{ swap.srcChain?.id === swap.destChain?.id ? 'Swap' : 'Cross-Chain Swap' }}
        </UiCardTitle>
      </div>
    </UiCardHeader>

    <UiCardContent class="space-y-4">
      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">From</span>
          <ChainSelector :selected-chain="swap.srcChain" :on-chain-select="swap.setSrcChain" />
        </div>

        <div class="relative">
          <div
            class="flex items-center gap-2 p-4 rounded-lg bg-secondary/50 border border-border/50"
          >
            <div class="flex-1">
              <UiInput
                type="number"
                placeholder="0.0"
                v-model="fromAmount"
                class="border-0 bg-transparent text-2xl font-semibold p-0 h-auto focus-visible:ring-0"
              />
              <div class="text-sm text-muted-foreground mt-1">
                <span
                  v-if="quote.isLoading"
                  class="animate-pulse bg-muted rounded w-16 h-3 block"
                ></span>
                <span v-else>≈ {{ formatUSD(quote.data?.amountInUsd ?? '0.00') }}</span>
              </div>
            </div>
            <TokenSelector
              :chain="swap.srcChain"
              :selected-token="swap.srcToken"
              :on-token-select="swap.setSrcToken"
            />
          </div>
        </div>

        <div class="flex items-center justify-between text-xs text-muted-foreground">
          <span>Balance: 0.0 {{ swap.srcToken?.symbol }}</span>
          <UiButton
            variant="ghost"
            size="sm"
            class="h-auto p-0 text-xs text-primary"
            @click="fromAmount = '100'"
          >
            Max
          </UiButton>
        </div>
      </div>

      <div class="flex justify-center">
        <UiButton
          variant="ghost"
          size="icon"
          @click="handleSwapTokens"
          class="rounded-full bg-secondary hover:bg-secondary/80 border border-border/50"
        >
          <ArrowUpDown class="w-4 h-4" />
        </UiButton>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">To</span>
          <ChainSelector :selected-chain="swap.destChain" :on-chain-select="swap.setDestChain" />
        </div>

        <div class="relative">
          <div
            class="flex items-center gap-2 p-4 rounded-lg bg-secondary/50 border border-border/50"
          >
            <div class="flex-1">
              <UiInput
                type="number"
                placeholder="0.0"
                :value="formatNumberWithDecimalPlaces(Number(formattedAmountOut))"
                readonly
                class="border-0 bg-transparent text-2xl font-semibold p-0 h-auto focus-visible:ring-0"
              />
              <div class="text-sm text-muted-foreground mt-1">
                <span
                  v-if="quote.isLoading"
                  class="animate-pulse bg-muted rounded w-16 h-3 block"
                ></span>
                <span v-else>≈ {{ formatUSD(quote.data?.amountOutUsd ?? '0.00') }}</span>
              </div>
            </div>
            <TokenSelector
              :chain="swap.destChain"
              :selected-token="swap.destToken"
              :on-token-select="swap.setDestToken"
            />
          </div>
        </div>

        <div class="flex items-center justify-between text-xs text-muted-foreground">
          <span>Balance: 0.0 {{ swap.destToken?.symbol }}</span>
        </div>
      </div>

      <div v-if="swap.srcChain?.id !== swap.destChain?.id" class="space-y-2">
        <label class="text-sm text-muted-foreground">Recipient</label>
        <UiInput
          type="text"
          placeholder="Enter recipient address"
          v-model="swap.recipient"
          :class="[
            'w-full text-white',
            !swap.isRecipientValid ? 'border-red-500 focus-visible:ring-red-500' : '',
          ]"
        />
        <p v-if="!swap.isRecipientValid && swap.recipient" class="text-xs text-red-500">
          Invalid {{ swap.destChain?.id === ChainID.Solana ? 'Solana' : 'EVM' }} address
        </p>
      </div>

      <div v-if="quote.data" class="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/30">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">Rate</span>
          <span v-if="quote.isLoading" class="animate-pulse bg-muted rounded w-24 h-3 block"></span>
          <span v-else>
            1 {{ swap.srcToken?.symbol }} =
            {{ formatNumberWithDecimalPlaces(Number(pricePerInputToken ?? '0.00')) }}
            {{ swap.destToken?.symbol }}
          </span>
        </div>
      </div>

      <UiButton
        @click="handleSwapClick"
        class="w-full h-12 text-base font-semibold chain-gradient hover:opacity-90 transition-opacity"
        :disabled="!isConnected ? false : !fromAmount || !quote.data || !swap.isRecipientValid"
      >
        <template v-if="!isConnected">Connect Wallet</template>
        <template v-else-if="!fromAmount || !quote.data">Enter Amount</template>
        <template v-else-if="!swap.isRecipientValid">Invalid Recipient</template>
        <template v-else-if="needsNetworkSwitch">Switch Network</template>
        <template v-else-if="isSubmitting || loading">
          <Loader2Icon class="animate-spin" />
        </template>
        <template v-else> Swap Tokens </template>
      </UiButton>

      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <Info class="w-3 h-3" />
        <span>Cross-chain swaps are powered by secure bridge protocols</span>
      </div>
    </UiCardContent>
  </UiCard>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useSwapStore } from '@/stores/swap'
import { useSuiWalletConnectStore } from '@/stores'
import { useSuiWallet } from '@/composables/useSuiWallet'
import { useIntentsQuote } from '@/composables/useIntentsQuote'
import { useSubmitSwaps } from '@/composables/useSubmitSwaps'
import { createOrder } from '@/composables/useCreateOrder'

import UiCard from '@/components/ui/card/Card.vue'
import UiCardContent from '@/components/ui/card/CardContent.vue'
import UiCardHeader from '@/components/ui/card/CardHeader.vue'
import UiCardTitle from '@/components/ui/card/CardTitle.vue'
import UiButton from '@/components/ui/button/Button.vue'
import UiInput from '@/components/ui/input/Input.vue'
import TokenSelector from '@/components/TokenSelector.vue'
import ChainSelector from '@/components/ChainSelector.vue'
import { ArrowUpDown, Info, Loader2Icon } from 'lucide-vue-next'

import { formatUnits } from 'viem'
import {
  denormalizeChainId,
  formatNumberWithDecimalPlaces,
  formatUSD,
  normalizeChainId,
} from '@/utils'

/**
 * Wallet SDKs (EVM/Solana/etc.)
 */
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/vue'
import { networks } from '@/config'
import { ChainID } from '@shogun-sdk/intents-sdk'
import { useConfig } from '@wagmi/vue'
import { toast } from 'vue-sonner'

// Network + wallet state from AppKit (used for EVM/Solana chains)
const networkData = useAppKitNetwork()
const connectionData = useAppKitAccount()
const { open } = useAppKit()

// Reactive loading state for the swap button
const loading = ref(false)

// Our global swap store (source/dest chain, tokens, amount, recipient, etc.)
const swap = useSwapStore()

// Fetches quotes (expected output amount, USD values, etc.)
const quote = useIntentsQuote()

// User input amount (for "from" token)
const fromAmount = ref('')

// Wagmi config (used for EVM transactions)
const evmConfig = useConfig()

// Submit logic for sending the actual swap transaction
const { submitSwaps, isSubmitting } = useSubmitSwaps()

// Make `srcChain` reactive (so UI updates when it changes)
const { srcChain } = storeToRefs(swap)
const srcChainId = computed(() => srcChain.value?.id)

/* Wallet handling (AppKit vs Sui) */

// Sui wallet integration
const { currentAccount: suiAccount, isConnected: isSuiConnected } = useSuiWallet()
const { openDialog: openSuiDialog } = useSuiWalletConnectStore()

// Watch the input amount and update the store (as number)
watch(fromAmount, (val) => {
  swap.setAmount(val ? Number(val) : 0)
})

/**
 * Opens the correct wallet modal depending on selected chain:
 * - If Sui → open Sui connector modal
 * - Else (EVM/Solana/etc.) → open AppKit modal
 */
const openWalletModal = () => {
  if (srcChainId.value === ChainID.Sui) {
    openSuiDialog()
  } else {
    open()
  }
}

/**
 * Checks if user is connected:
 * - If Sui chain → rely on Sui wallet state
 * - Else → rely on AppKit wallet state
 */
const isConnected = computed(() => {
  if (srcChainId.value === ChainID.Sui) {
    return isSuiConnected.value
  }
  return connectionData.value.isConnected
})

/**
 * Returns the correct user account address depending on chain type
 */
const accountAddress = computed(() => {
  if (srcChainId.value === ChainID.Sui) {
    return suiAccount.value?.address
  }
  return connectionData.value.address
})

/**
 * Whether user needs to switch network in their wallet
 * (only applies to EVM chains)
 */
const needsNetworkSwitch = computed(() => {
  const srcChainId = swap.srcChain?.id
  if (srcChainId === ChainID.Sui) return false
  return !!srcChainId && normalizeChainId(networkData.value.chainId as string) !== srcChainId
})

/* Quote + Output formatting */

// Format destination amount with proper decimals
const formattedAmountOut = computed(() => {
  if (!quote.value.data?.amountOut || !swap.destToken?.decimals) return ''
  return formatUnits(quote.value.data.amountOut, swap.destToken.decimals)
})

// Display price per token (rate info)
const pricePerInputToken = computed(() => quote.value.pricePerInputToken)

/* UI Actions */

/**
 * Swaps source and destination (both chain + token)
 */
function handleSwapTokens() {
  if (!swap.srcToken || !swap.destToken || !swap.srcChain || !swap.destChain) {
    return
  }

  // Swap tokens
  const tempToken = swap.srcToken
  swap.setSrcToken(swap.destToken!)
  swap.setDestToken(tempToken!)

  // Swap chains
  const tempChain = swap.srcChain
  swap.setSrcChain(swap.destChain!)
  swap.setDestChain(tempChain!)
}

/**
 * Main Swap Button Action:
 * - If not connected → ask user to connect wallet
 * - If needs network switch → prompt wallet to switch
 * - Else → create order & submit transaction
 */
async function handleSwapClick() {
  try {
    loading.value = true

    // If no wallet connected → open modal
    if (!isConnected.value) {
      openWalletModal()
      return
    }

    // If no input or quote data → block swap
    if (!fromAmount.value || !quote.value.data) return

    // Handle EVM network mismatch
    if (needsNetworkSwitch.value) {
      try {
        const prepareNetwork = networks.find(
          (n) => n.id === denormalizeChainId(swap.srcChain?.id as string),
        )
        if (!prepareNetwork) return
        await networkData.value.switchNetwork(prepareNetwork)
        toast.success(`Switched network to ${swap.srcChain?.name}`)
      } catch {
        toast.error('Failed to switch network. Please try again.')
      }
      return
    }

    // Try to build an order and send transaction
    try {
      // Step 1: Build the order payload
      const order = await createOrder({
        quote: {
          ...quote.value.data,
          pricePerInputToken: quote.value.pricePerInputToken,
        },
        accountAddress: accountAddress.value as string,
        recipientAddress: swap.recipient,
        config: evmConfig,
      })

      if (!order) throw Error('Order not generated')

      // Step 2: Determine if this is a same-chain swap
      const isSingleChainSwap =
        quote.value.data.inputToken.chainId === quote.value.data.outputToken.chainId

      // Step 3: Submit swap via submitSwaps()
      const result = await submitSwaps(
        quote.value.data.inputToken.chainId as number,
        isSingleChainSwap,
        accountAddress.value as string,
        order,
        {
          ...quote.value.data,
          pricePerInputToken: quote.value.pricePerInputToken,
        },
      )

      // Step 4: Show success/failure notification
      if (result.status) {
        toast.success(`Order created!\nTx Hash: ${result.txHash}`)
      } else {
        toast.error(result.message ?? 'Order submission failed.')
      }
    } catch (err) {
      // Catch unexpected errors
      toast.error(
        err instanceof Error
          ? `${err.message}`
          : 'An unexpected error occurred while creating the order.',
      )
    }
  } finally {
    // Always clear loading spinner
    loading.value = false
  }
}
</script>
