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
            <UiInput type="number" placeholder="0.0" v-model="fromAmount"
              class="border-0 bg-transparent text-2xl font-semibold p-0 h-auto focus-visible:ring-0" />
            <div class="text-sm text-muted-foreground mt-1">
              <span v-if="priceLoading" class="animate-pulse bg-muted rounded w-16 h-3 block"></span>
              <span v-else>≈ {{ formatUSD(fromAmountUsd) }}</span>
            </div>
          </div>
          <TokenSelector :chain="swap.srcChain" :selected-token="swap.srcToken" :on-token-select="swap.setSrcToken" />
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
          <UiButton variant="ghost" size="sm" class="h-auto p-0 text-xs text-primary" @click="setMaxAmount">
            Max
          </UiButton>
        </div>
      </div>

      <!-- SWAP DIRECTION TOGGLE -->
      <div class="flex justify-center">
        <UiButton variant="ghost" size="icon" @click="handleSwapTokens"
          class="rounded-full bg-secondary hover:bg-secondary/80 border border-border/50">
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
            <UiInput type="number" placeholder="0.0" :value="formattedAmountOut" readonly
              class="border-0 bg-transparent text-2xl font-semibold p-0 h-auto focus-visible:ring-0" />
            <div class="text-sm text-muted-foreground mt-1">
              <span v-if="priceLoading" class="animate-pulse bg-muted rounded w-16 h-3 block"></span>
              <span v-else>≈ {{ formatUSD(toAmountUsd) }}</span>
            </div>
          </div>
          <TokenSelector :chain="swap.destChain" :selected-token="swap.destToken"
            :on-token-select="swap.setDestToken" />
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
        <UiInput type="text" placeholder="Enter recipient address" v-model="swap.recipient" :class="[
          'w-full text-white',
          !swap.isRecipientValid ? 'border-red-500 focus-visible:ring-red-500' : '',
        ]" />
        <p v-if="!swap.isRecipientValid && swap.recipient" class="text-xs text-red-500">
          Invalid {{ swap.destChain?.id === ChainId.SOLANA ? 'Solana' : 'EVM' }} address
        </p>
      </div>

      <!-- RATE INFO -->
      <div v-if="quote.data.value" class="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/30">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">Rate</span>
          <span v-if="quote.loading.value" class="animate-pulse bg-muted rounded w-24 h-3 block"></span>
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
      <UiButton @click="handleSwapClick"
        class="w-full h-12 text-base font-semibold chain-gradient hover:opacity-90 transition-opacity"
        :disabled="!isConnected ? false : !fromAmount || !quote.data || !swap.isRecipientValid">
        <template v-if="!isConnected">Connect Wallet</template>
        <template v-else-if="!fromAmount || !quote.data">Enter Amount</template>
        <template v-else-if="!swap.isRecipientValid">Invalid Recipient</template>
        <template v-else-if="needsNetworkSwitch">Switch Network</template>
        <template v-else-if="loading">
          <Loader2Icon class="animate-spin" />
        </template>
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
import {
  formatNumberWithDecimalPlaces,
  normalizeChainId,
  denormalizeChainId,
  formatUSD,
} from '@/utils'
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

import {
  useExecuteTransaction,
  useQuote,
  useBalances,
  useTokensData,
} from '@shogun-sdk/one-shot/vue'
import { resolveTokenAddress } from '@/utils/resolveTokenAddress'

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
const { addresses } = useWalletAddress()

/** 🚨 Detect wrong network */
const needsNetworkSwitch = computed(() => {
  const id = swap.srcChain?.id
  return id && normalizeChainId(networkData.value.chainId as string) !== id
})

/** 🧮 Track balances */
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

/** 💰 Token price tracking */


const tokenAddresses = computed(() => {
  const addrs: string[] = []
  if (swap.srcToken?.address)
    addrs.push(resolveTokenAddress(swap.srcToken.address, swap.srcChain?.id)[0])
  if (swap.destToken?.address)
    addrs.push(resolveTokenAddress(swap.destToken.address, swap.destChain?.id)[0])
  return addrs
})

const { data: tokensData , loading: priceLoading} = useTokensData(tokenAddresses)

const srcTokenUSDPrice = computed(() => {
  const addr = resolveTokenAddress(swap.srcToken?.address, swap.srcToken?.chainId)[0]
  const item = tokensData.value.find((t) => t.address.toLowerCase() === addr?.toLowerCase())
  return item?.priceUSD ? Number(item.priceUSD) : 0
})

const destTokenUSDPrice = computed(() => {
  const addr = swap.destToken?.address
  const item = tokensData.value.find((t) => t.address.toLowerCase() === addr?.toLowerCase())
  return item?.priceUSD ? Number(item.priceUSD) : 0
})

/** 💵 Real-time USD equivalents */
const fromAmountUsd = computed(() => {
  const val = parseFloat(fromAmount.value || '0')
  return val && srcTokenUSDPrice.value ? val * srcTokenUSDPrice.value : 0
})

const toAmountUsd = computed(() => {
  const out = quote.data.value?.outputAmount
  if (!out?.value || !destTokenUSDPrice.value) return 0
  const val = Number(formatUnits(BigInt(out.value), out.decimals))
  return val * destTokenUSDPrice.value
})

/** 🔁 Amount watchers, recipients, etc. */
watch(fromAmount, (val) => swap.setAmount(Number(val) || 0))
watch(connectDestAccountAddress, (addr) => addr && swap.setRecipient(addr))

onMounted(() => {
  if (accountAddress.value) fetchBalances()
})
watch(accountAddress, () => fetchBalances())

/** ⚡ Quote params */
const params = computed(() => {
  const decimals = swap.srcToken?.decimals ?? 18
  let amountParsed = '0'
  try {
    amountParsed = parseUnits(String(swap.amount || '0'), decimals).toString()
  } catch { }
  return {
    srcToken: swap.srcToken?.address ?? '',
    destToken: swap.destToken?.address ?? '',
    amount: amountParsed,
    srcChainId: Number(swap.srcChain?.id ?? 1),
    destChainId: Number(swap.destChain?.id ?? ChainId.SOLANA),
    senderAddress: accountAddress.value ?? '',
    recipient: swap.recipient ?? '',
    slippage: undefined,
  }
})

/** 💬 Live quote */
const quote = useQuote(params)
const formattedAmountOut = computed(() => {
  const out = quote.data.value?.outputAmount
  return out ? formatUnits(BigInt(out.value), out.decimals) : ''
})
const pricePerInputToken = computed(() => quote.data.value?.pricePerInputToken ?? '')

/** 🔍 Get token balance helper */
function getTokenBalance(address?: string, chainId?: number): string {
  if (!address || !chainId || !balances.value?.results?.length) return '0'
  const token = balances.value.results.find(
    (b) => b.address.toLowerCase() === address.toLowerCase() && b.chainId === chainId,
  )
  return token ? formatUnits(BigInt(token.balance ?? 0n), token.decimals) : '0'
}

/** ⚡ Set max amount */
function setMaxAmount() {
  if (!swap.srcToken?.address || !swap.srcChain?.id) return
  const bal = getTokenBalance(swap.srcToken.address, swap.srcChain.id)
  if (!bal || Number(bal) <= 0) return
  const max = Number(bal) * 0.9999
  fromAmount.value = max.toFixed(swap.srcToken.decimals ?? 6)
  swap.setAmount(max)
}

/** 🔁 Swap tokens */
function handleSwapTokens() {
  if (!swap.srcToken || !swap.destToken || !swap.srcChain || !swap.destChain) return
    ;[swap.srcToken, swap.destToken] = [swap.destToken, swap.srcToken]
    ;[swap.srcChain, swap.destChain] = [swap.destChain, swap.srcChain]
}

/** 🚀 Execute swap */
async function handleSwapClick() {
  try {
    loading.value = true
    if (!isConnected.value) return open()
    if (!fromAmount.value || !quote.data.value) return

    if (needsNetworkSwitch.value) {
      const target = networks.find((n) => n.id === denormalizeChainId(swap.srcChain?.id as number))
      if (target) {
        await networkData.value.switchNetwork(target)
        toast.success(`Switched network to ${swap.srcChain?.name}`)
      }
      return
    }

    const wallet = await useAdoptedWallet(accountAddress.value!, srcChainId.value!, wagmiConfig)
    const order = await execute({ quote: quote.data.value, wallet , options: {
      maxAttempts: 10,       // how many times to retry sending
      retryDelayMs: 1500,   // delay (in ms) between retries
    }})
    if (order?.status) toast.success('🎉 Order executed successfully!', { duration: 4000 })
  } finally {
    loading.value = false
  }
}

/** 🎬 Stage watcher */
watch([stage, message], ([s, msg]) => {
  if (!s) return
  if (s === 'processing') openModal('processing', msg ?? '')
  else if (s === 'initiated') openModal('initiated', msg ?? '')
  else if (s === 'success') {
    openModal('success', msg ?? '')
    fetchBalances()
    setTimeout(closeModal, 3000)
  } else if (s === 'error') {
    openModal('error', msg || 'An error occurred while processing your swap.')
  }
})
</script>
