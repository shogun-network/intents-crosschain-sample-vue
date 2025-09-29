import { computed, ref } from 'vue'

import type { QuoteTypes } from '@/types'
import type { CrossChainOrder, SingleChainOrder } from '@shogun-sdk/intents-sdk'
import type { Provider } from '@reown/appkit-adapter-solana'

import {
  ChainID,
  getEVMSingleChainOrderTypedData,
  getEVMCrossChainOrderTypedData,
  getSolanaSingleChainOrderInstructions,
  getSolanaCrossChainOrderInstructions,
  PERMIT2_ADDRESS,
} from '@shogun-sdk/intents-sdk'

import { erc20Abi, isEVMChain, isNativeAddress } from '@shogun-sdk/money-legos'

import { useConfig } from '@wagmi/vue'
import {
  getWalletClient,
  readContract,
  waitForTransactionReceipt,
  writeContract,
} from '@wagmi/vue/actions'

import { useAppKitProvider } from '@reown/appkit/vue'

import { Connection, VersionedTransaction } from '@solana/web3.js'

import { getNativeOrWrappedTokenAddress } from './useCreateOrder'
import { serializeBigIntsToStrings } from '@/utils'
import { TOAST_MESSAGES } from '@/config/constants'

import { toast } from 'vue-sonner'

export function useSubmitSwaps() {
  const isSubmitting = ref(false)
  const wagmiConfig = useConfig()
  const config = computed(() => wagmiConfig)
  const solanaProvider = useAppKitProvider<Provider>('solana')
  const solanaSigner = computed(() => solanaProvider.walletProvider)
  const submitSwaps = async (
    chainId: number,
    isSingleChainSwap: boolean,
    accountAddress: string,
    order: CrossChainOrder | SingleChainOrder,
    quote: QuoteTypes,
  ) => {
    try {
      isSubmitting.value = true
      if (isEVMChain(chainId)) {
        const tokenInAddress = getNativeOrWrappedTokenAddress(
          quote.inputToken.chainId,
          quote.inputToken.address,
        )

        if (isNativeAddress(quote.inputToken.address)) {
          quote.inputToken.address = tokenInAddress
        }

        toast.info(TOAST_MESSAGES.TX_STAGES.SWAP.START)
        const allowance = await readContract(config.value, {
          address: quote.inputToken.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [
            accountAddress as `0x${string}`,
            PERMIT2_ADDRESS[chainId as keyof typeof PERMIT2_ADDRESS] as `0x${string}`,
          ],
        })

        const inputAmount = quote.amountIn

        if (allowance < BigInt(inputAmount)) {
          toast.info(TOAST_MESSAGES.TX_STAGES.APPROVE.START)
          const hash = await writeContract(config.value, {
            address: quote.inputToken.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'approve',
            args: [
              PERMIT2_ADDRESS[chainId as keyof typeof PERMIT2_ADDRESS] as `0x${string}`,
              inputAmount,
            ],
            chainId: Number(quote.inputToken.chainId),
          })

          const tx = await waitForTransactionReceipt(config.value, {
            hash,
            chainId: Number(quote.inputToken.chainId),
          })
          if (tx.status === 'success') {
            toast.success('Approval transaction successful')
          }
        }
        toast.info(TOAST_MESSAGES.TX_STAGES.SWAP.START)

        const { orderTypedData, nonce } = isSingleChainSwap
          ? await getEVMSingleChainOrderTypedData(order as SingleChainOrder)
          : await getEVMCrossChainOrderTypedData(order as CrossChainOrder)

        const signer = await getWalletClient(config.value)
        if (!signer) throw new Error('No EVM signer available')

        const signature = await signer.signTypedData(serializeBigIntsToStrings(orderTypedData))

        const sendRequest = await order.sendToAuctioneer({
          signature,
          nonce: nonce.toString(),
        })

        if (!sendRequest.success) {
          throw new Error('Intent submission failed.')
        }

        const txHash = sendRequest.data as string
        return { status: true, txHash, chainId }
      }

      if (chainId === ChainID.Solana) {
        const solanaProvider = new Connection(import.meta.env.VITE_SOLANA_RPC_URL, 'confirmed')
        if (!solanaProvider) throw new Error('Solana provider missing')

        if (!solanaSigner.value) throw new Error('Solana wallet provider missing')

        if (isSingleChainSwap) {
          const { txBytes, orderAddress, secretNumber } =
            await getSolanaSingleChainOrderInstructions(order as SingleChainOrder, {
              rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL,
            })

          const transactionBytes = Uint8Array.from(txBytes)
          const versionedTransaction = VersionedTransaction.deserialize(transactionBytes)

          const signedTransaction = await solanaSigner.value.signTransaction(versionedTransaction)
          const transactionHash = await solanaProvider.sendRawTransaction(
            signedTransaction.serialize(),
          )

          const response = await order.sendToAuctioneer({
            orderPubkey: orderAddress,
            secretNumber,
          })
          if (!response.success) {
            throw new Error('Failed to send tx to Auctioneer')
          }

          return { status: true, txHash: transactionHash, chainId }
        } else {
          const { txBytes, orderAddress } = await getSolanaCrossChainOrderInstructions(
            order as CrossChainOrder,
            {
              rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL,
            },
          )

          const transactionBytes = Uint8Array.from(txBytes)
          const versionedTransaction = VersionedTransaction.deserialize(transactionBytes)

          const signedTransaction = await solanaSigner.value.signTransaction(versionedTransaction)
          const transactionHash = await solanaProvider.sendRawTransaction(
            signedTransaction.serialize(),
          )

          const response = await (order as CrossChainOrder).sendToAuctioneer({
            orderPubkey: orderAddress,
          })

          if (!response.success) {
            throw new Error('Failed to send tx to Auctioneer')
          }

          return { status: true, txHash: transactionHash, chainId }
        }
      }

      throw new Error(`Unsupported chain: ${chainId}`)
    } catch (err) {
      console.log({ err })
      const message = err instanceof Error ? err.message : '❌ Swap failed'
      return { status: false, message }
    } finally {
      isSubmitting.value = false
    }
  }

  return { submitSwaps, isSubmitting }
}
