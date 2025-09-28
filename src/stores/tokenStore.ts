import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Token } from '@/types'
import { fetchTokens } from '@/config/tokens'

export const useTokenStore = defineStore('tokens', () => {
  const tokens = ref<Token[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadTokens() {
    loading.value = true
    error.value = null
    try {
      if (tokens.value.length > 0) return // already in store
      tokens.value = await fetchTokens()
    } catch (err) {
      console.error('Failed to fetch tokens', err)
      error.value = 'Failed to load tokens'
    } finally {
      loading.value = false
    }
  }

  function setTokens(list: Token[]) {
    tokens.value = list
  }

  return {
    tokens,
    loading,
    error,
    loadTokens,
    setTokens,
  }
})
