<template>
  <UiCard class="w-full max-w-md mx-auto bg-card/50 backdrop-blur-sm border-border/50">
    <UiCardHeader class="pb-4">
      <div class="flex items-center justify-between">
        <UiCardTitle class="text-lg font-semibold">
          {{ swap.srcChain?.id === swap.destChain?.id ? 'Swap' : 'Cross-Chain Swap' }}
        </UiCardTitle>
      </div>
    </UiCardHeader>

    <UiCardContent class="space-y-4">
      <!-- FROM SECTION -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">From</span>
          <ChainSelector :selected-chain="swap.srcChain" :on-chain-select="swap.setSrcChain" />
        </div>

        <!-- From Token Input -->
        <div class="flex items-center gap-2 p-4 rounded-lg bg-secondary/50 border border-border/50">
          <div class="flex-1">
            <UiInput
              type="number"
              placeholder="0.0"
              v-model="fromAmount"
              class="border-0 bg-transparent text-2xl font-semibold p-0 h-auto focus-visible:ring-0"
            />
            <div class="text-sm text-muted-foreground mt-1">
              <span
                v-if="quote.isLoading.value"
                class="animate-pulse bg-muted rounded w-16 h-3 block"
              ></span>
              <!-- <span v-else>≈ {{ formatUSD(quote.data?.amountInUsd ?? '0.00') }}</span> -->
            </div>
          </div>
          <TokenSelector
            :chain="swap.srcChain"
            :selected-token="swap.srcToken"
            :on-token-select="swap.setSrcToken"
          />
        </div>

        <!-- Balance + Max -->
        <div class="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Balance:
            <template v-if="balanceLoading">
              <Skeleton class="h-3 w-16 rounded" />
            </template>
            <template v-else>
              {{
                formatNumberWithDecimalPlaces(
                  Number(getTokenBalance(swap.srcToken?.address, swap.srcChain?.id)),
                )
              }}
              {{ swap.srcToken?.symbol }}
            </template>
          </span>
          <UiButton
            variant="ghost"
            size="sm"
            class="h-auto p-0 text-xs text-primary"
            @click="setMaxAmount"
          >
            Max
          </UiButton>
        </div>
      </div>

      <!-- SWAP DIRECTION TOGGLE -->
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

      <!-- TO SECTION -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">To</span>
          <ChainSelector :selected-chain="swap.destChain" :on-chain-select="swap.setDestChain" />
        </div>

        <div class="flex items-center gap-2 p-4 rounded-lg bg-secondary/50 border border-border/50">
          <div class="flex-1">
            <UiInput
              type="number"
              placeholder="0.0"
              :value="formattedAmountOut"
              readonly
              class="border-0 bg-transparent text-2xl font-semibold p-0 h-auto focus-visible:ring-0"
            />
            <div class="text-sm text-muted-foreground mt-1">
              <span
                v-if="quote.isLoading.value"
                class="animate-pulse bg-muted rounded w-16 h-3 block"
              ></span>
              <!-- <span v-else>≈ {{ formatUSD(quote.data?.amountOutUsd ?? '0.00') }}</span> -->
            </div>
          </div>
          <TokenSelector
            :chain="swap.destChain"
            :selected-token="swap.destToken"
            :on-token-select="swap.setDestToken"
          />
        </div>

        <div class="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Balance:
            <template v-if="balanceLoading">
              <Skeleton class="h-3 w-16 rounded" />
            </template>
            <template v-else>
              {{
                formatNumberWithDecimalPlaces(
                  Number(getTokenBalance(swap.destToken?.address, swap.destChain?.id)),
                )
              }}
              {{ swap.destToken?.symbol }}
            </template>
          </span>
        </div>
      </div>

      <!-- RECIPIENT INPUT (cross-chain only) -->
      <div v-if="isConnected && swap.srcChain?.id !== swap.destChain?.id" class="space-y-2">
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
          Invalid {{ swap.destChain?.id === ChainId.SOLANA ? 'Solana' : 'EVM' }} address
        </p>
      </div>

      <!-- RATE INFO -->
      <div v-if="quote.data" class="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/30">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">Rate</span>
          <span
            v-if="quote.isLoading.value"
            class="animate-pulse bg-muted rounded w-24 h-3 block"
          ></span>
          <span v-else>
            1 {{ swap.srcToken?.symbol }} =
            {{
              formatNumberWithDecimalPlaces(
                Number(
                  formatUnits(BigInt(pricePerInputToken ?? '0'), swap.destToken?.decimals ?? 18),
                ),
              )
            }}
            {{ swap.destToken?.symbol }}
          </span>
        </div>
      </div>

      <!-- SWAP BUTTON -->
      <UiButton
        @click="handleSwapClick"
        class="w-full h-12 text-base font-semibold chain-gradient hover:opacity-90 transition-opacity"
        :disabled="!isConnected ? false : !fromAmount || !quote.data || !swap.isRecipientValid"
      >
        <template v-if="!isConnected">Connect Wallet</template>
        <template v-else-if="!fromAmount || !quote.data">Enter Amount</template>
        <template v-else-if="!swap.isRecipientValid">Invalid Recipient</template>
        <template v-else-if="needsNetworkSwitch">Switch Network</template>
        <template v-else-if="loading"><Loader2Icon class="animate-spin" /></template>
        <template v-else>Swap Tokens</template>
      </UiButton>

      <!-- FOOTNOTE -->
      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <Info class="w-3 h-3" />
        <span>Cross-chain swaps are powered by secure bridge protocols</span>
      </div>
    </UiCardContent>
  </UiCard>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useSwapStore } from '@/stores/swap'
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/vue'
import { useConfig } from '@wagmi/vue'
import { toast } from 'vue-sonner'
import { ArrowUpDown, Info, Loader2Icon } from 'lucide-vue-next'
import { Skeleton } from '@/components/ui/skeleton'
import { formatUnits, parseUnits } from 'viem'
import { ChainId } from '@shogun-sdk/one-shot'
import { formatNumberWithDecimalPlaces, normalizeChainId, denormalizeChainId } from '@/utils'
import { useAdoptedWallet } from '@/composables/useAdoptedWallet'
import { networks } from '@/config'

import UiCard from '@/components/ui/card/Card.vue'
import UiCardHeader from '@/components/ui/card/CardHeader.vue'
import UiCardContent from '@/components/ui/card/CardContent.vue'
import UiCardTitle from '@/components/ui/card/CardTitle.vue'
import UiButton from '@/components/ui/button/Button.vue'
import UiInput from '@/components/ui/input/Input.vue'
import TokenSelector from '@/components/TokenSelector.vue'
import ChainSelector from '@/components/ChainSelector.vue'
import { useWalletAddress } from '@/composables/useWalletAddress'
import { useSwapModal } from '@/composables/useSwapModal'

// ✅ Unified OneShot SDK hooks (no local composable)
import { useExecuteTransaction, useQuote, useBalances } from '@shogun-sdk/one-shot/vue'

/** 🔧 Hook setup */
const { execute, stage, message } = useExecuteTransaction()
const { openModal, closeModal } = useSwapModal()
const { open } = useAppKit()
const swap = useSwapStore()
const fromAmount = ref('')
const loading = ref(false)

const connectionData = useAppKitAccount()
const networkData = useAppKitNetwork()
const wagmiConfig = useConfig()

/** 🌐 Wallet state */
const isConnected = computed(() => connectionData.value.isConnected)
const srcChainId = computed(() => swap.srcChain?.id)
const destChainId = computed(() => swap.destChain?.id)
const { address: accountAddress } = useWalletAddress(srcChainId)
const { address: connectDestAccountAddress } = useWalletAddress(destChainId)
const {addresses} = useWalletAddress()

/** 🚨 Detect wrong network */
const needsNetworkSwitch = computed(() => {
  const id = swap.srcChain?.id
  return id && normalizeChainId(networkData.value.chainId as string) !== id
})

/** 🧮 Track balances using SDK */
const balancesParams = computed(() => ({
  addresses: {
    evm: addresses.value.EVM ?? undefined,
    svm: addresses.value.SVM ?? undefined,
  },
}))
const {
  data: balances,
  refetch: fetchBalances,
  loading: balanceLoading,
} = useBalances(balancesParams)

/** 🔁 Update swap store when amount changes */
watch(fromAmount, (val) => {
  swap.setAmount(Number(val) || 0)
})

/** 🔁 Auto-set recipient when destination wallet changes */
watch(connectDestAccountAddress, (addr) => {
  if (addr) swap.setRecipient(addr)
})

/** 🔁 Fetch balances on connect/change */
onMounted(() => {
  if (accountAddress.value) fetchBalances()
})
watch(accountAddress, () => fetchBalances())

/** ⚡️ Quote params */
const params = computed(() => {
  const decimals = swap.srcToken?.decimals ?? 18
  let amountParsed = '0'

  try {
    amountParsed = String(parseUnits(String(swap.amount) || '0', decimals))
  } catch {
    amountParsed = '0'
  }

  return {
    srcToken: swap.srcToken?.address ?? '',
    destToken: swap.destToken?.address ?? '',
    amount: amountParsed,
    srcChainId: swap.srcChain?.id ?? 1,
    destChainId: swap.destChain?.id ?? ChainId.SOLANA,
    senderAddress: accountAddress.value ?? undefined,
    recipient: swap.recipient ?? undefined,
    slippage: undefined,
  }
})

/** 💬 Live quote */
const quote = useQuote(params)
const formattedAmountOut = computed(() => {
  if (!quote.data.value?.outputAmount) return ''
  return formatUnits(
    BigInt(quote.data.value.outputAmount.value),
    quote.data.value.outputAmount.decimals,
  )
})
const pricePerInputToken = computed(() => quote.data.value?.pricePerInputToken)

/** 🔍 Get specific token balance */
function getTokenBalance(address?: string, chainId?: number): string {
  if (!address || !chainId || !balances.value?.results?.length) return '0'
  const token =balances.value?.results?.find(
    (b) => b.address.toLowerCase() === address.toLowerCase() && b.chainId === chainId,
  )
  if (!token) return '0'
  return formatUnits(BigInt(token.balance ?? 0n), token.decimals)
}

/** ⚡ Set max amount */
function setMaxAmount() {
  // Ensure a valid source token and chain
  if (!swap.srcToken?.address || !swap.srcChain?.id) return

  // Retrieve balance for the current token on the selected chain
  const bal = getTokenBalance(swap.srcToken.address, swap.srcChain.id)
  if (!bal || Number(bal) <= 0) return

  // Convert to number and apply a 0.01% safety buffer
  const maxAmount = Number(bal) * (1 - 0.0001) // 0.01% less than total balance

  // Update reactive amount fields
  fromAmount.value = maxAmount.toFixed(swap.srcToken.decimals ?? 6)
  swap.setAmount(maxAmount)
}

/** 🔁 Swap tokens + chains */
function handleSwapTokens() {
  if (!swap.srcToken || !swap.destToken || !swap.srcChain || !swap.destChain) return
  ;[swap.srcToken, swap.destToken] = [swap.destToken, swap.srcToken]
  ;[swap.srcChain, swap.destChain] = [swap.destChain, swap.srcChain]
}

/** 🚀 Handle Swap Click */
async function handleSwapClick() {
  try {
    loading.value = true
    if (!isConnected.value) return open()
    if (!fromAmount.value || !quote.data.value) return

    if (needsNetworkSwitch.value) {
      const target = networks.find((n) => n.id === denormalizeChainId(swap.srcChain?.id as number))
      if (!target) return
      try {
        await networkData.value.switchNetwork(target)
        toast.success(`Switched network to ${swap.srcChain?.name}`)
      } catch {
        toast.error('Failed to switch network. Please try again.')
      }
      return
    }

    const adaptedWallet = await useAdoptedWallet(
      accountAddress.value!,
      srcChainId.value!,
      wagmiConfig,
    )

    const order = await execute({
      quote: quote.data.value,
      wallet: adaptedWallet,
    })

    if (order?.status) toast.success('🎉 Order executed successfully!', { duration: 4000 })
  } finally {
    loading.value = false
  }
}

/** 🎬 Stage watcher for modals */
watch([stage, message], ([newStage, newMessage]) => {
  if (!newStage) return

  console.groupCollapsed(`🧭 Transaction Stage: ${newStage}`)
  console.log('Stage:', newStage)
  console.log('Message:', message.value)
  console.groupEnd()

  if (newStage === 'processing') {
    openModal('processing', newMessage ?? '')
  } else if (newStage === 'initiated') {
    openModal('initiated', newMessage ?? '')
  } else if (newStage === 'success') {
    openModal('success', newMessage ?? '')
    fetchBalances()
    setTimeout(closeModal, 3000)
  } else if (newStage === 'error') {
    openModal('error', newMessage || 'An error occurred while processing your swap.')
  }
})
</script>
