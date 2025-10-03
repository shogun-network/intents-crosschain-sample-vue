import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { networks } from '@/config'
import { solana } from '@reown/appkit/networks'
import type { Chain, Token } from '@/types'
import { isAddress as isEvmAddress } from 'viem'
import { PublicKey } from '@solana/web3.js'
import { normalizeChainId } from '@/utils'
import { ChainID } from '@shogun-sdk/intents-sdk'
import { isValidSuiAddress } from '@mysten/sui/utils'

export const useSwapStore = defineStore('swap', () => {
  const solanaNetwork = networks.find((n) => n.id === solana.id)
  const defaultChain: Chain | null = solanaNetwork
    ? {
        id: normalizeChainId(solanaNetwork.id),
        name: solanaNetwork.name,
        icon: `/images/${solanaNetwork.id}.svg`,
      }
    : null

  const srcChain = ref<Chain | null>(defaultChain)
  const destChain = ref<Chain | null>(defaultChain)
  const srcToken = ref<Token | null>(null)
  const destToken = ref<Token | null>(null)
  const amount = ref<number>(0)
  const recipient = ref<string>('')

  function setSrcChain(chain: Chain) {
    srcChain.value = chain
  }

  function setDestChain(chain: Chain) {
    destChain.value = chain
  }

  function setSrcToken(token: Token) {
    srcToken.value = token
  }

  function setDestToken(token: Token) {
    destToken.value = token
  }

  function setAmount(value: number) {
    amount.value = value
  }

  function setRecipient(value: string) {
    recipient.value = value
  }

  function resetSwap() {
    srcChain.value = defaultChain
    destChain.value = defaultChain
    srcToken.value = null
    destToken.value = null
    amount.value = 0
    recipient.value = ''
  }

  const isRecipientValid = computed(() => {
    if (!destChain.value) return false

    // same-chain swap → recipient must be sender (skip validation here)
    if (srcChain.value?.id === destChain.value?.id) {
      return true
    }

    // Solana validation
    if (destChain.value.id === ChainID.Solana) {
      try {
        new PublicKey(recipient.value)
        return true
      } catch {
        return false
      }
    }

    // Sui validation
    if (destChain.value.id === ChainID.Sui) {
      return isValidSuiAddress(recipient.value)
    }

    // EVM validation
    return isEvmAddress(recipient.value as `0x${string}`)
  })

  const isReady = computed(() => {
    return (
      !!srcChain.value &&
      !!destChain.value &&
      !!srcToken.value &&
      !!destToken.value &&
      amount.value > 0 &&
      isRecipientValid.value
    )
  })

  return {
    srcChain,
    destChain,
    srcToken,
    destToken,
    amount,
    recipient,
    setSrcChain,
    setDestChain,
    setSrcToken,
    setDestToken,
    setAmount,
    setRecipient,
    resetSwap,
    isRecipientValid,
    isReady,
  }
})
