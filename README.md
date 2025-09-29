# Shogun Intents SDK – Vue Integration

This walkthrough focuses exclusively on the Shogun Intents SDK.

## 1. Environment & Dependencies

1. Install dependencies (`bun install`, `npm install`, or `pnpm install`).
2. Provide environment variables consumed by the SDK helpers:
   - `VITE_PROJECT_ID` – Reown/AppKit project identifier for wallet connectivity.
   - `VITE_SOLANA_RPC_URL` – Solana RPC endpoint (only required for Solana intents).
3. Import the utilities used throughout this guide:

```ts
import { QuoteProvider, ChainID } from '@shogun-sdk/intents-sdk'
import {
  getEVMSingleChainOrderTypedData,
  getEVMCrossChainOrderTypedData,
  getSolanaSingleChainOrderInstructions,
  getSolanaCrossChainOrderInstructions,
  SingleChainOrder,
  CrossChainOrder,
  PERMIT2_ADDRESS,
} from '@shogun-sdk/intents-sdk'
import { CHAIN_CONFIGS, isEVMChain, isNativeAddress, erc20Abi } from '@shogun-sdk/money-legos'
import { normalizeChainId } from '@/utils'
import { parseUnits } from 'viem'
```

_Note: replace `@/utils` paths if you are not inside this repo._

## 2. Acquire Input Data

Every intent submission needs:

- Source wallet address (EVM or Solana).
- Destination (recipient) address for cross-chain swaps.
- Token metadata (address, decimals, chain id) for input/output tokens.
- Human-readable amount the user wants to swap.

Normalize chain identifiers so the SDK receives `ChainID`-compatible values:

```ts
const sourceChainId = normalizeChainId(inputToken.chainId) as ChainID
const destChainId = normalizeChainId(outputToken.chainId) as ChainID
const amountIn = parseUnits(amount.toString(), inputToken.decimals)
```

## 3. Request a Quote

Use `QuoteProvider.getQuote` to obtain recommended amounts and slippage boundaries.

```ts
const quoteResponse = await QuoteProvider.getQuote({
  tokenIn: inputToken.address,
  tokenOut: outputToken.address,
  sourceChainId,
  destChainId,
  amount: amountIn,
})

const quote = {
  amountIn,
  amountOut: quoteResponse.estimatedAmountOutReduced,
  minStablecoinsAmount: quoteResponse.estimatedAmountInAsMinStablecoinAmount,
  inputToken,
  outputToken,
}

const isSingleChain = sourceChainId === destChainId
```

## 4. Create an Order

### Single-Chain

```ts
const evmChainId = sourceChainId as ChainID

const order = await SingleChainOrder.create({
  user: accountAddress,
  chainId: evmChainId,
  tokenIn: inputToken.address,
  tokenOut: outputToken.address,
  amountIn,
  amountOutMin: quote.amountOut,
  destinationAddress: accountAddress,
  deadline: Math.floor(Date.now() / 1000) + 3600,
})
```

### Cross-Chain

Wrap native assets (ETH, MATIC, etc.) before creating the order. The Intents SDK expects ERC-20 wrappers like WETH.

```ts
function resolveTokenAddress(chainId: number | string, address: string) {
  if (isEVMChain(Number(chainId)) && isNativeAddress(address)) {
    const chain = CHAIN_CONFIGS.find((c) => c.id === chainId)
    if (!chain?.wrapped) throw new Error(`Missing wrapped token for chain ${chainId}`)
    return chain.wrapped
  }
  return address
}

const sourceTokenAddress = resolveTokenAddress(inputToken.chainId, inputToken.address)

const order = await CrossChainOrder.create({
  user: accountAddress,
  sourceChainId,
  sourceTokenAddress,
  sourceTokenAmount: amountIn,
  destinationChainId: destChainId,
  destinationTokenAddress: outputToken.address,
  destinationAddress: recipientAddress,
  deadline: Math.floor(Date.now() / 1000) + 3600,
  destinationTokenMinAmount: quote.amountOut,
  minStablecoinAmount: quote.minStablecoinsAmount,
})
```

## 5. Authorize Token Movement (EVM Only)

Permit2 must be approved to transfer the input token amount. Use Wagmi actions or your preferred EVM library.

```ts
import { readContract, writeContract, waitForTransactionReceipt } from '@wagmi/vue/actions'

const spender = PERMIT2_ADDRESS[sourceChainId as keyof typeof PERMIT2_ADDRESS]
if (!spender) throw new Error('Permit2 address missing for chain')

const allowance = await readContract(config, {
  address: sourceTokenAddress as `0x${string}`,
  abi: erc20Abi,
  functionName: 'allowance',
  args: [accountAddress as `0x${string}`, spender],
})

if (allowance < amountIn) {
  const hash = await writeContract(config, {
    address: sourceTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, amountIn],
    chainId: Number(sourceChainId),
  })

  await waitForTransactionReceipt(config, { hash, chainId: Number(sourceChainId) })
}
```

## 6. Sign the Intent Payload

### EVM

```ts
import { getWalletClient } from '@wagmi/vue/actions'
import { serializeBigIntsToStrings } from '@/utils'

const { orderTypedData, nonce } = isSingleChain
  ? await getEVMSingleChainOrderTypedData(order as SingleChainOrder)
  : await getEVMCrossChainOrderTypedData(order as CrossChainOrder)

const signer = await getWalletClient(config)
const signature = await signer.signTypedData(serializeBigIntsToStrings(orderTypedData))
```

### Solana

```ts
import { Connection, VersionedTransaction } from '@solana/web3.js'

const connection = new Connection(import.meta.env.VITE_SOLANA_RPC_URL, 'confirmed')
const provider = appKitProvider.value.walletProvider // Supplies signTransaction

const instructionFn = isSingleChain
  ? getSolanaSingleChainOrderInstructions
  : getSolanaCrossChainOrderInstructions

const instructionPayload = await instructionFn(order, {
  rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL,
})

const txBytes = Uint8Array.from(instructionPayload.txBytes)
const versioned = VersionedTransaction.deserialize(txBytes)
const signedTx = await provider.signTransaction(versioned)
```

## 7. Submit to the Auctioneer

### EVM

```ts
const submission = await order.sendToAuctioneer({
  signature,
  nonce: nonce.toString(),
})

if (!submission.success) throw new Error('Auctioneer rejected intent')

const txHash = submission.data as string
```

### Solana

```ts
const txHash = await connection.sendRawTransaction(signedTx.serialize())

const submission = await order.sendToAuctioneer(
  isSingleChain
    ? {
        orderPubkey: instructionPayload.orderAddress,
        secretNumber: instructionPayload.secretNumber,
      }
    : { orderPubkey: instructionPayload.orderAddress },
)

if (!submission.success) throw new Error('Auctioneer rejected intent')
```

## Documentation

[Shogun Intents SDK: Submitting Same-Chain and Cross-Chain Orders](https://github.com/shogun-network/intents-crosschain-sample-vue/blob/main/shogun-sdk-orders.md)

[Shogun Intents SDK Demo App – Same-Chain and Cross-Chain Swap Walkthrough](https://github.com/shogun-network/intents-crosschain-sample-vue/blob/main/demo-app.md)

With these steps you have a clean, UI-agnostic recipe for moving from user intent to a submitted auctioneer payload on both EVM and Solana using the Shogun Intents SDK.
