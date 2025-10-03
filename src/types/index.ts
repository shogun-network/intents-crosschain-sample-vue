import type { TokenInfo } from '@shogun-sdk/intents-sdk'

export interface Chain {
  id: number
  name: string
  icon: string
}

// Minimal subset of CoinGecko response we care about
export interface CoinGeckoCoin {
  id: string
  symbol: string
  name: string
  image: string
  address: string
  decimals: number
}

export interface QuoteTypes {
  amountOut: bigint
  amountOutUsd: number
  amountInUsd: number
  minStablecoinsAmount: bigint
  inputToken: TokenInfo
  outputToken: TokenInfo
  amountIn: bigint
  pricePerInputToken: string | null
}
