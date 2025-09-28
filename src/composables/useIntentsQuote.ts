import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useSwapStore } from '@/stores/swap'
import { ChainID, QuoteProvider } from '@shogun-sdk/intents-sdk'
import { formatUnits, parseUnits } from 'viem'
import { normalizeChainId } from '@/utils'

// serialize so queryKey doesn’t contain BigInt
function serializeParams(
  params: {
    tokenIn: string
    tokenOut: string
    sourceChainId: ChainID
    destChainId: ChainID
    amount: bigint
  } | null,
) {
  if (!params) return null
  return {
    ...params,
    amount: params.amount.toString(),
  }
}

export function useIntentsQuote() {
  const swap = useSwapStore()
  const tokenIn = computed(() => swap.srcToken)
  const tokenOut = computed(() => swap.destToken)
  const inputAmount = computed(() => swap.amount)

  const hasTokensAndChains = computed(() => {
    const tIn = tokenIn.value
    const tOut = tokenOut.value
    return (
      !!tIn?.address && !!tOut?.address && tIn.decimals != null && !!tIn.chainId && !!tOut.chainId
    )
  })

  const quoteParams = computed(() => {
    if (!hasTokensAndChains.value || !inputAmount.value) return null
    const tIn = tokenIn.value!
    const tOut = tokenOut.value!
    return {
      tokenIn: tIn.address,
      tokenOut: tOut.address,
      sourceChainId: normalizeChainId(tIn.chainId) as ChainID,
      destChainId: normalizeChainId(tOut.chainId) as ChainID,
      amount: parseUnits(inputAmount.value.toString(), tIn.decimals),
    }
  })

  const basePriceParams = computed(() => {
    if (!hasTokensAndChains.value) return null
    const tIn = tokenIn.value!
    const tOut = tokenOut.value!
    return {
      tokenIn: tIn.address,
      tokenOut: tOut.address,
      sourceChainId: normalizeChainId(tIn.chainId) as ChainID,
      destChainId: normalizeChainId(tOut.chainId) as ChainID,
      amount: parseUnits('1', tIn.decimals),
    }
  })

  const {
    data: quoteData,
    error,
    isLoading,
  } = useQuery({
    queryKey: computed(() => ['getQuote', serializeParams(quoteParams.value)]),
    queryFn: () => QuoteProvider.getQuote(quoteParams.value!),
    enabled: computed(() => !!quoteParams.value),
    refetchOnWindowFocus: false,
  })

  const { data: basePriceData } = useQuery({
    queryKey: computed(() => ['getQuote-limit', serializeParams(basePriceParams.value)]),
    queryFn: () => QuoteProvider.getQuote(basePriceParams.value!),
    enabled: computed(() => !!basePriceParams.value),
    refetchOnWindowFocus: false,
  })

  const pricePerInputToken = computed(() => {
    if (!basePriceData.value?.estimatedAmountOut || !tokenOut.value?.decimals) return null
    return formatUnits(BigInt(basePriceData.value.estimatedAmountOut), tokenOut.value.decimals)
  })

  const result = computed(() => {
    if (!quoteParams.value || !quoteData.value) {
      return {
        data: null,
        error,
        isLoading: isLoading.value,
        pricePerInputToken: pricePerInputToken.value,
      }
    }

    const tIn = tokenIn.value!
    const tOut = tokenOut.value!
    const amountIn = parseUnits(inputAmount.value.toString(), tIn.decimals)

    return {
      data: {
        amountOut: quoteData.value.estimatedAmountOutReduced,
        amountOutUsd: quoteData.value.estimatedAmountOutUsdReduced,
        amountInUsd: quoteData.value.amountInUsd,
        minStablecoinsAmount: quoteData.value.estimatedAmountInAsMinStablecoinAmount,
        inputToken: tIn,
        outputToken: tOut,
        amountIn,
      },
      error,
      isLoading: isLoading.value,
      pricePerInputToken: pricePerInputToken.value,
    }
  })

  return result
}
