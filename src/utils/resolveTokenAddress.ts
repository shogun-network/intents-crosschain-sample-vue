import { SupportedChains } from "@shogun-sdk/one-shot";

export function resolveTokenAddress(address?: string, chainId?: number): string[] {
    if (!address || !chainId) return [];
  
    const lower = address.toLowerCase();
    const matched = SupportedChains.find(
      (chain) => chain.tokenAddress.toLowerCase() === lower && chain.id === chainId
    );
  
    return [matched ? matched.wrapped : address];
  }
  