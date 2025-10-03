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
  getSuiOrderTransaction,
  generateSuiLimitOrderSecretData,
  getSuiSingleChainLimitOrderTransaction,
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
import { useSuiWallet } from './useSuiWallet'
import { SUI_GUARD_ADDRESS } from '@/config'

/**
 * useSubmitSwaps composable
 * ------------------------------------------------
 * Handles submitting swaps on different chains:
 * - EVM (Ethereum & compatible)
 * - Solana
 * - Sui
 *
 * Takes care of:
 *  - Approvals (for ERC20 tokens)
 *  - Building transactions
 *  - Signing transactions
 *  - Sending them to Auctioneer service
 */
export function useSubmitSwaps() {
  const isSubmitting = ref(false) // simple loading state
  const wagmiConfig = useConfig() // wagmi config for EVM
  const { signAndExecuteTransaction } = useSuiWallet() // sui signing
  const config = computed(() => wagmiConfig)

  // Solana provider (injected by AppKit)
  const solanaProvider = useAppKitProvider<Provider>('solana')
  const solanaSigner = computed(() => solanaProvider.walletProvider)

  /**
   * submitSwaps
   * -----------
   * @param chainId chain we are targeting (EVM/Solana/Sui)
   * @param isSingleChainSwap whether it’s a single-chain or cross-chain swap
   * @param accountAddress address of the user
   * @param order order payload (single-chain or cross-chain)
   * @param quote quote data (amounts, token info, etc.)
   */
  const submitSwaps = async (
    chainId: number,
    isSingleChainSwap: boolean,
    accountAddress: string,
    order: CrossChainOrder | SingleChainOrder,
    quote: QuoteTypes,
  ) => {
    try {
      isSubmitting.value = true

      // ************* EVM Flow *************
      if (isEVMChain(chainId)) {
        // Replace native token with wrapped version (e.g., ETH → WETH)
        const tokenInAddress = getNativeOrWrappedTokenAddress(
          quote.inputToken.chainId,
          quote.inputToken.address,
        )
        if (isNativeAddress(quote.inputToken.address)) {
          quote.inputToken.address = tokenInAddress
        }

        // Step 1: Check token allowance
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

        // Step 2: If insufficient allowance, approve first
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

        // Step 3: Build typed data for order signing
        toast.info(TOAST_MESSAGES.TX_STAGES.SWAP.START)
        const { orderTypedData, nonce } = isSingleChainSwap
          ? await getEVMSingleChainOrderTypedData(order as SingleChainOrder)
          : await getEVMCrossChainOrderTypedData(order as CrossChainOrder)

        // Step 4: Sign typed data
        const signer = await getWalletClient(config.value)
        if (!signer) throw new Error('No EVM signer available')
        const signature = await signer.signTypedData(serializeBigIntsToStrings(orderTypedData))

        // Step 5: Send to Auctioneer
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

      // ************* Solana Flow *************
      if (chainId === ChainID.Solana) {
        const solanaProvider = new Connection(import.meta.env.VITE_SOLANA_RPC_URL, 'confirmed')
        if (!solanaProvider) throw new Error('Solana provider missing')
        if (!solanaSigner.value) throw new Error('Solana wallet provider missing')

        if (isSingleChainSwap) {
          // Step 1: Build Solana transaction instructions
          const { txBytes, orderAddress, secretNumber } =
            await getSolanaSingleChainOrderInstructions(order as SingleChainOrder, {
              rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL,
            })

          const transactionBytes = Uint8Array.from(txBytes)
          const versionedTransaction = VersionedTransaction.deserialize(transactionBytes)

          // Step 2: Sign & send transaction
          const signedTransaction = await solanaSigner.value.signTransaction(versionedTransaction)
          const transactionHash = await solanaProvider.sendRawTransaction(
            signedTransaction.serialize(),
          )

          // Step 3: Send order to Auctioneer
          const response = await order.sendToAuctioneer({
            orderPubkey: orderAddress,
            secretNumber,
          })
          if (!response.success) throw new Error('Failed to send tx to Auctioneer')

          return { status: true, txHash: transactionHash, chainId }
        } else {
          // Cross-chain Solana flow
          const { txBytes, orderAddress } = await getSolanaCrossChainOrderInstructions(
            order as CrossChainOrder,
            { rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL },
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
          if (!response.success) throw new Error('Failed to send tx to Auctioneer')

          return { status: true, txHash: transactionHash, chainId }
        }
      }

      // ************* Sui Flow *************
      if (chainId === ChainID.Sui) {
        if (isSingleChainSwap) {
          // Step 1: Generate secret for market / limit order
          const { secretNumber, secretHash } = generateSuiLimitOrderSecretData(
            quote.inputToken.address,
            order.destinationAddress,
          )

          // Step 2: Build transaction
          const transaction = await getSuiSingleChainLimitOrderTransaction(
            order as SingleChainOrder,
            secretHash,
            SUI_GUARD_ADDRESS,
          )

          if (!transaction) throw new Error('Transaction failed')

          // Step 3: Sign & execute
          const signedTx = await signAndExecuteTransaction(transaction)

          // Step 4: Notify Auctioneer
          const suiResponse = await (order as SingleChainOrder).sendToAuctioneer({
            transactionHash: signedTx.digest,
            secretNumber,
          })
          if (!suiResponse.success) throw new Error('Intent submission failed.')

          return { status: true, txHash: suiResponse.data as string, chainId }
        } else {
          // Cross-chain Sui flow
          const transaction = await getSuiOrderTransaction(order as CrossChainOrder)
          if (!transaction) throw new Error('Transaction failed')

          const signedTx = await signAndExecuteTransaction(transaction)

          const suiResponse = await (order as CrossChainOrder).sendToAuctioneer({
            transactionHash: signedTx.digest,
          })
          if (!suiResponse.success) throw new Error('Intent submission failed.')

          return { status: true, txHash: suiResponse.data as string, chainId }
        }
      }

      throw new Error(`Unsupported chain: ${chainId}`)
    } catch (err) {
      console.log({ err })
      const message = err instanceof Error ? err.message : 'Swap failed'
      return { status: false, message }
    } finally {
      isSubmitting.value = false
    }
  }

  return { submitSwaps, isSubmitting }
}
