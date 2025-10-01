import type { QuoteTypes } from '@/types'
import { ChainID, CrossChainOrder, SingleChainOrder } from '@shogun-sdk/intents-sdk'
import { CHAIN_CONFIGS, isEVMChain, isNativeAddress } from '@shogun-sdk/money-legos'
import { writeContract, waitForTransactionReceipt } from '@wagmi/vue/actions'
import { WETH_ABI } from '@/config/constants'
import type { Config } from '@wagmi/vue'

// Create order helper for single-chain or cross-chain swaps
export async function createOrder({
  quote,
  accountAddress,
  recipientAddress,
  config,
}: {
  quote: QuoteTypes
  accountAddress: string
  recipientAddress?: string
  config?: Config
}): Promise<SingleChainOrder | CrossChainOrder | undefined> {
  const isSingleChain = quote.inputToken.chainId === quote.outputToken.chainId
  const deadline = Math.floor(Date.now() / 1000) + 3600
  if (!config) {
    throw new Error('config is required for cross-chain orders')
  }
  // Intents SDK does not support raw native tokens (ETH, MATIC, etc.)
  // We normalize them to wrapped versions (WETH, WMATIC, etc.)
  const resolvedInputTokenAddress = getNativeOrWrappedTokenAddress(
    quote.inputToken.chainId,
    quote.inputToken.address,
  )

  // If input token is a native token, wrap it into WETH (or equivalent)
  const shouldWrapNativeToken =
    isEVMChain(Number(quote.inputToken.chainId)) && isNativeAddress(quote.inputToken.address)

  if (shouldWrapNativeToken) {
    const txHash = await writeContract(config, {
      address: resolvedInputTokenAddress as `0x${string}`,
      abi: WETH_ABI,
      functionName: 'deposit',
      args: [],
      value: quote.amountIn,
    })

    await waitForTransactionReceipt(config, {
      hash: txHash,
      chainId: Number(quote.inputToken.chainId),
      confirmations: 1,
    })
  }
  if (isSingleChain) {
    return SingleChainOrder.create({
      user: accountAddress,
      chainId: quote.inputToken.chainId as ChainID,
      tokenIn: quote.inputToken.address,
      amountIn: quote.amountIn,
      tokenOut: quote.outputToken.address,
      destinationAddress: accountAddress,
      deadline,
      amountOutMin: quote.amountOut,
    })
  }

  //  Cross-chain swap
  if (!recipientAddress) {
    throw new Error('Recipient address is required for cross-chain orders')
  }

  return CrossChainOrder.create({
    user: accountAddress,
    sourceChainId: quote.inputToken.chainId as ChainID,
    sourceTokenAddress: resolvedInputTokenAddress,
    sourceTokenAmount: quote.amountIn,
    destinationChainId: quote.outputToken.chainId as ChainID,
    destinationTokenAddress: quote.outputToken.address,
    destinationAddress: recipientAddress,
    deadline,
    destinationTokenMinAmount: quote.amountOut,
    minStablecoinAmount: quote.minStablecoinsAmount,
  })
}

// For EVM native assets (ETH), Intents SDK expects wrapped tokens (WETH)
export const getNativeOrWrappedTokenAddress = (chainId: number | string, address: string) => {
  if (isEVMChain(Number(chainId)) && isNativeAddress(address)) {
    const config = CHAIN_CONFIGS.find((c) => c.id === chainId)
    if (!config || !config.wrapped) {
      throw new Error(`Wrapped token address not found for chainId: ${chainId}`)
    }
    return config.wrapped as string
  }
  return address
}
