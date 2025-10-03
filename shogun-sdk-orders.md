# Shogun Intents SDK: Submitting Same-Chain and Cross-Chain Orders

This guide focuses exclusively on the APIs exposed by `@shogun-sdk/intents-sdk` that are required to originate and submit swap intents. It omits app-specific wiring (state management, UI) so you can reuse the snippets in other environments.

## 1. Core Concepts
- **Quotes**: Returned by `QuoteProvider.getQuote`. Quoted data supplies token amounts, minimum stablecoin thresholds, and deadline context for order construction.
- **Orders**: Created with `SingleChainOrder.create` when source and destination chains match, or `CrossChainOrder.create` when bridging to a different chain.
- **Auctioneer Submission**: Every order exposes `sendToAuctioneer`, which is called after the user signs the intent or broadcasts the Solana transaction.

## 2. Obtaining a Quote
```ts
import { QuoteProvider, ChainID } from '@shogun-sdk/intents-sdk'

const quote = await QuoteProvider.getQuote({
  tokenIn: '0xTokenIn',
  tokenOut: '0xTokenOut',
  sourceChainId: ChainID.Base,
  destChainId: ChainID.Base,
  amount: BigInt('1000000'), // smallest units
})
```
`quote` contains:
- `estimatedAmountOutReduced`: BigInt amount to receive (after decimals removed)
- `estimatedAmountOutUsdReduced`: USD estimation
- `estimatedAmountInAsMinStablecoinAmount`: amount used for cross-chain minimums
- `amountInUsd`: USD value of the input

Preserve these values—they feed directly into order builders.

## 3. Building a Single-Chain Order
```ts
import { SingleChainOrder, ChainID } from '@shogun-sdk/intents-sdk'

const singleChainOrder = await SingleChainOrder.create({
  user: '0xUser',
  chainId: ChainID.Base,
  tokenIn: '0xTokenIn',
  amountIn: quote.amountIn,
  tokenOut: '0xTokenOut',
  destinationAddress: '0xUser', // same-chain recipient
  deadline: Math.floor(Date.now() / 1000) + 3600,
  amountOutMin: quote.estimatedAmountOutReduced,
})
```
Key points:
- `destinationAddress` is typically the sending user on single-chain swaps.
- `amountOutMin` enforces the quoted minimum output.
- The SDK handles nonce creation internally; you surface it when signing.

## 4. Building a Cross-Chain Order
```ts
import { CrossChainOrder, ChainID } from '@shogun-sdk/intents-sdk'

const crossChainOrder = await CrossChainOrder.create({
  user: '0xUser',
  sourceChainId: ChainID.Base,
  sourceTokenAddress: '0xTokenInOrWrapped',
  sourceTokenAmount: quote.amountIn,
  destinationChainId: ChainID.Solana,
  destinationTokenAddress: 'DestinationMintOrAddress',
  destinationAddress: 'RecipientAddress',
  deadline: Math.floor(Date.now() / 1000) + 3600,
  destinationTokenMinAmount: quote.estimatedAmountOutReduced,
  minStablecoinAmount: quote.estimatedAmountInAsMinStablecoinAmount,
})
```
Considerations:
- Wrap native tokens before building the order—the SDK expects ERC-20 style addresses.
- `destinationTokenAddress` uses the final chain’s address format (Solana mint or EVM token address).
- `minStablecoinAmount` protects against bridge volatility and comes directly from the quote response.

## 5. Submitting EVM Orders
### 5.1 Prepare Typed Data
```ts
import {
  getEVMSingleChainOrderTypedData,
  getEVMCrossChainOrderTypedData,
} from '@shogun-sdk/intents-sdk'

const { orderTypedData, nonce } = await getEVMSingleChainOrderTypedData(singleChainOrder)
// or
const { orderTypedData, nonce } = await getEVMCrossChainOrderTypedData(crossChainOrder)
```
### 5.2 Sign
Serialize BigInts to strings before calling your signer:
```ts
import { serializeBigIntsToStrings } from '@/utils/serializeBigIntsToStrings' // any equivalent helper

const signature = await signer.signTypedData(serializeBigIntsToStrings(orderTypedData))
```
### 5.3 Send to Auctioneer
```ts
const submitResponse = await singleChainOrder.sendToAuctioneer({
  signature,
  nonce: nonce.toString(),
})

if (!submitResponse.success) throw new Error('Intent submission failed')
const txHash = submitResponse.data
```
The returned `txHash` references the Permit2 transfer that the auctioneer will settle.

## 6. Submitting Solana Orders
### 6.1 Fetch Transaction Instructions
```ts
import {
  getSolanaSingleChainOrderInstructions,
  getSolanaCrossChainOrderInstructions,
} from '@shogun-sdk/intents-sdk'

const { txBytes, orderAddress, secretNumber } =
  await getSolanaSingleChainOrderInstructions(singleChainOrder, { rpcUrl })

// Cross-chain version omits secretNumber
const { txBytes, orderAddress } =
  await getSolanaCrossChainOrderInstructions(crossChainOrder, { rpcUrl })
```
### 6.2 Sign & Broadcast
```ts
import { Connection, VersionedTransaction } from '@solana/web3.js'

const connection = new Connection(rpcUrl, 'confirmed')
const transaction = VersionedTransaction.deserialize(Uint8Array.from(txBytes))
const signed = await solanaSigner.signTransaction(transaction)
const txHash = await connection.sendRawTransaction(signed.serialize())
```
### 6.3 Notify the Auctioneer
```ts
const response = await singleChainOrder.sendToAuctioneer({
  orderPubkey: orderAddress,
  secretNumber, // only for single-chain
})

if (!response.success) throw new Error('Failed to notify auctioneer')
```
The auctioneer response confirms that the intent is now active; retain `txHash` to show progress to the user.

## 7. Submitting Sui Orders
### 7.1 Generate Secrets (single-chain)
Sui same-chain limit orders require a per-order secret. The SDK helper returns both the hash (used when building the transaction) and the number you later share with the auctioneer.
```ts
import { generateSuiLimitOrderSecretData } from '@shogun-sdk/intents-sdk'

const { secretNumber, secretHash } = generateSuiLimitOrderSecretData(
  singleChainOrder.tokenIn,
  singleChainOrder.destinationAddress,
)
```

### 7.2 Build the Transaction
- **Single-chain:** Call `getSuiSingleChainLimitOrderTransaction` and pass the previously derived `secretHash` along with the guard address for your deployment (see `PROD_CROSS_CHAIN_GUARD_ADDRESSES[ChainID.Sui]` or your env).
- **Cross-chain:** Use `getSuiOrderTransaction` directly; no secret hash is needed.

```ts
import {
  getSuiOrderTransaction,
  getSuiSingleChainLimitOrderTransaction,
  PROD_CROSS_CHAIN_GUARD_ADDRESSES,
  ChainID,
} from '@shogun-sdk/intents-sdk'

const guardAddress = PROD_CROSS_CHAIN_GUARD_ADDRESSES[ChainID.Sui]

const singleChainTx = await getSuiSingleChainLimitOrderTransaction(
  singleChainOrder,
  secretHash,
  guardAddress,
)

const crossChainTx = await getSuiOrderTransaction(crossChainOrder)
```

Both helpers resolve to a `Transaction` from `@mysten/sui/transactions` that can be signed through any wallet implementing the Sui Wallet Standard.

### 7.3 Sign & Execute
```ts
const executionResult = await wallet.signAndExecuteTransaction({
  transaction: singleChainTx,
})

const digest = executionResult.digest
```

For cross-chain orders, replace `singleChainTx` with `crossChainTx` in the call above.

### 7.4 Notify the Auctioneer
```ts
const response = await singleChainOrder.sendToAuctioneer({
  transactionHash: digest,
  secretNumber, // omit when submitting cross-chain orders
})

if (!response.success) throw new Error('Failed to notify auctioneer')
const intentId = response.data
```

## 8. Error Handling
- All `sendToAuctioneer` methods resolve to `{ success: boolean; data?: unknown; error?: string }`.
- Wrap calls in `try/catch` and surface `error` or thrown messages to the UI/logging system.

## 9. Putting It Together
1. Request a quote.
2. Build the appropriate order type (single or cross-chain).
3. For EVM, generate typed data, collect a user signature, and send to the auctioneer.
4. For Solana, request instructions, sign the transaction bytes, broadcast, then notify the auctioneer.
5. For Sui, derive secrets when needed, execute the transaction through a Sui wallet, and forward the digest to the auctioneer.

These primitives are all provided by `@shogun-sdk/intents-sdk`; any additional wallet tooling (Wagmi, AppKit, custom custodial signers) can be swapped in as long as they supply signatures and RPC submissions at the indicated moments.
