export interface Chain {
  id: string | number
  name: string
  icon: string
}
export interface Token {
  symbol: string
  name: string
  icon: string
  chainId: string | number
  address: string
  decimals: number
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
  inputToken: Token
  outputToken: Token
  amountIn: bigint
  pricePerInputToken: string | null
}
