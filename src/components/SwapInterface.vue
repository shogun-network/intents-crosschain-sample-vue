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
import { useSwapStore } from '@/stores/swap'
import UiCard from '@/components/ui/card/Card.vue'
import UiCardContent from '@/components/ui/card/CardContent.vue'
import UiCardHeader from '@/components/ui/card/CardHeader.vue'
import UiCardTitle from '@/components/ui/card/CardTitle.vue'
import UiButton from '@/components/ui/button/Button.vue'
import UiInput from '@/components/ui/input/Input.vue'
import TokenSelector from '@/components/TokenSelector.vue'
import ChainSelector from '@/components/ChainSelector.vue'
import { ArrowUpDown, Info, Loader2Icon } from 'lucide-vue-next'
import { useIntentsQuote } from '@/composables/useIntentsQuote'
import { formatUnits } from 'viem'
import {
  denormalizeChainId,
  formatNumberWithDecimalPlaces,
  formatUSD,
  normalizeChainId,
} from '@/utils'
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/vue'
import { networks } from '@/config'
import { createOrder } from '@/composables/useCreateOrder'
import { ChainID } from '@shogun-sdk/intents-sdk'
import { useConfig } from '@wagmi/vue'
import { toast } from 'vue-sonner'
import { useSubmitSwaps } from '@/composables/useSubmitSwaps'

const networkData = useAppKitNetwork()
const connectionData = useAppKitAccount()
const isConnected = computed(() => connectionData.value.isConnected)
const { open } = useAppKit()
const loading = ref(false)
const swap = useSwapStore()
const quote = useIntentsQuote()
const fromAmount = ref('')
const evmConfig = useConfig()
const { submitSwaps, isSubmitting } = useSubmitSwaps()
const needsNetworkSwitch = computed(() => {
  const srcChainId = swap.srcChain?.id
  return !!srcChainId && normalizeChainId(networkData.value.chainId as string) !== srcChainId
})

watch(fromAmount, (val) => {
  swap.setAmount(val ? Number(val) : 0)
})

const formattedAmountOut = computed(() => {
  if (!quote.value.data?.amountOut || !swap.destToken?.decimals) return ''
  return formatUnits(quote.value.data.amountOut, swap.destToken.decimals)
})

const pricePerInputToken = computed(() => quote.value.pricePerInputToken)

function handleSwapTokens() {
  // Both sides must be populated before swapping selections.
  if (!swap.srcToken || !swap.destToken || !swap.srcChain || !swap.destChain) {
    return
  }
  const tempToken = swap.srcToken
  swap.setSrcToken(swap.destToken!)
  swap.setDestToken(tempToken!)

  const tempChain = swap.srcChain
  swap.setSrcChain(swap.destChain!)
  swap.setDestChain(tempChain!)
}

async function handleSwapClick() {
  try {
    loading.value = true
    if (!isConnected.value) {
      open()
      return
    }

    if (!fromAmount.value || !quote.value.data) return

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

    try {
      const order = await createOrder({
        quote: {
          ...quote.value.data,
          pricePerInputToken: quote.value.pricePerInputToken,
        },
        accountAddress: connectionData.value.address as string,
        recipientAddress: swap.recipient,
        config: evmConfig,
      })

      if (!order) {
        throw Error('❌ Order not generated')
      }

      const isSingleChainSwap =
        quote.value.data.inputToken.chainId === quote.value.data.outputToken.chainId

      const result = await submitSwaps(
        quote.value.data.inputToken.chainId as number,
        isSingleChainSwap,
        connectionData.value.address as string,
        order,
        {
          ...quote.value.data,
          pricePerInputToken: quote.value.pricePerInputToken,
        },
      )

      if (result.status) {
        toast.success(`Order created successfully!\nTx Hash: ${result.txHash}`)
      } else {
        toast.error(result.message ?? 'Order submission failed.')
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `${err.message}`
          : 'An unexpected error occurred while creating the order.',
      )
    }
  } finally {
    loading.value = false
  }
}
</script>
