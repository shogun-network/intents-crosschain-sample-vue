import type { CoinGeckoCoin } from '@/types'
import type { Token } from '@/types'
import { BASE_USDC, BONK_TOKENS } from './constants'
import { ChainID } from '@shogun-sdk/intents-sdk'

// Map CoinGecko response -> Token
export function mapCoinGeckoTokens(data: CoinGeckoCoin[] | CoinGeckoCoin[][]): Token[] {
  // Handle nested arrays (e.g. [[{...}]])
  const flat: CoinGeckoCoin[] = Array.isArray(data[0])
    ? (data as CoinGeckoCoin[][]).flat()
    : (data as CoinGeckoCoin[])

  return flat.map((coin) => ({
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    icon: coin.image,
    chainId: ChainID.Solana,
    address: coin.address,
    decimals: coin.decimals,
  }))
}

export async function fetchTokens(): Promise<Token[]> {
  const cgTokens = mapCoinGeckoTokens(BONK_TOKENS)
  return [BASE_USDC, ...cgTokens]
}
