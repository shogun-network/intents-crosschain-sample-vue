import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getTokenList, type TokenSearchResponse, type TokenInfo } from '@shogun-sdk/intents-sdk'

/**
 * Token Store (Pinia)
 *
 * This store manages token search results from the Shogun Token Search API.
 *
 * Features:
 * - Keeps track of tokens for the current search
 * - Supports infinite scroll (pagination)
 * - Handles loading + error states
 * - Can reset between searches / chains
 *
 * Example flow:
 * 1. User opens token list → `loadTokens({ q: '', networkId: 7565164 })`
 * 2. User scrolls down → `loadTokens()` fetches the next page
 * 3. User switches chain → `resetTokens()` → new query with new networkId
 */
export const useTokenStore = defineStore('tokens', () => {
  /** Current token results shown in UI */
  const tokens = ref<TokenInfo[]>([])

  /** Loading state (true while fetching) */
  const loading = ref(false)

  /** Error message if API fails */
  const error = ref<string | null>(null)

  /** Do we still have more pages to fetch? */
  const hasMore = ref(true)

  /** Current page number (starts at 1) */
  const page = ref(1)

  /** Remember the last query (search phrase + networkId) */
  const lastQuery = ref<{ q?: string; networkId?: number }>({})

  /**
   * Load tokens from API
   *
   * @param params
   * - q: optional search phrase ("usdc", "0x123...")
   * - networkId: chain ID (e.g. 7565164 = Solana)
   * - reset: true if starting a new search (clears previous tokens)
   *
   * Example:
   * ```ts
   * // First load
   * tokenStore.loadTokens({ q: 'usdc', networkId: 7565164, reset: true })
   *
   * // Scroll for next page
   * tokenStore.loadTokens({ q: 'usdc', networkId: 7565164 })
   * ```
   */
  async function loadTokens(params: { q?: string; networkId?: number; reset?: boolean }) {
    try {
      // If reset → clear old results and reset pagination
      if (params.reset) {
        tokens.value = []
        page.value = 1
        hasMore.value = true
      }

      // Stop if no more pages or already loading
      if (!hasMore.value || loading.value) return

      loading.value = true
      error.value = null

      // Call SDK → Shogun Token Search API
      const res: TokenSearchResponse = await getTokenList({
        q: params.q,
        networkId: params.networkId,
        page: page.value,
        limit: 20, // always fetch 20 per page
      })

      // Check if this is the last page
      if (res.results.length === 0 || tokens.value.length + res.results.length >= res.count) {
        hasMore.value = false
      }

      // Merge new results into existing list
      tokens.value = [...tokens.value, ...res.results]

      // Save the query (useful if we need to refetch later)
      lastQuery.value = { q: params.q, networkId: params.networkId }

      // Move to next page
      page.value++
    } catch (err) {
      console.error('Failed to fetch tokens', err)
      error.value = 'Failed to load tokens'
    } finally {
      loading.value = false
    }
  }

  /**
   * Reset tokens completely
   *
   * Example:
   * ```ts
   * tokenStore.resetTokens()
   * tokenStore.loadTokens({ q: '', networkId: 7565164 })
   * ```
   */
  function resetTokens() {
    tokens.value = []
    page.value = 1
    hasMore.value = true
  }

  return {
    tokens,
    loading,
    error,
    hasMore,
    page,
    lastQuery,
    loadTokens,
    resetTokens,
  }
})
