# Shogun Intents SDK Demo App – Same-Chain and Cross-Chain Swap Walkthrough

This project is a Vue 3 + Vite demo that wires the Shogun Intents SDK into a unified swap UI. It covers both single-chain intents (source and destination on the same network) and cross-chain intents (bridging value to a different chain). Use this guide as a blueprint for integrating the SDK in other frontends.

## 1. Prerequisites and Environment

- Install dependencies with `bun install`.
- Copy `.env.example` to `.env.local` and set:
  - `VITE_PROJECT_ID`: Reown AppKit project identifier (a localhost-safe fallback is included, but production apps must supply their own).
  - `VITE_SOLANA_RPC_URL`: HTTPS RPC endpoint for Solana transactions (e.g. a Helius, Triton, or QuickNode URL).
- The app boots AppKit in `src/App.vue` and Wagmi/Solana adapters in `src/main.ts`. Keep those initializations when reusing the logic.

## 2. High-Level Flow

1. **Collect swap intent** (source/dest chain + token + amount) via Pinia store (`src/components/SwapInterface.vue`).
2. **Fetch a quote** using `QuoteProvider.getQuote` (`src/composables/useIntentsQuote.ts`).
3. **Create an order** with `SingleChainOrder.create` or `CrossChainOrder.create` (`src/composables/useCreateOrder.ts`).
4. **Submit the order** to the auctioneer and, when needed, broadcast the chain transaction (`src/composables/useSubmitSwaps.ts`).

The same composables can be invoked programmatically if you prefer not to use the provided UI.

## 3. Getting Quotes (`useIntentsQuote`)

File: `src/composables/useIntentsQuote.ts`

- Normalizes chain IDs so that Reown’s identifiers map to the Intents SDK enums (`normalizeChainId`).
- Converts user-entered amounts into units with `parseUnits`.
- Calls `QuoteProvider.getQuote` for both the live amount and a base "1 token" quote to show price per token.
- Returns a reactive object containing:
  - `amountOut`/`amountOutUsd`
  - `minStablecoinsAmount` (used when building cross-chain orders)
  - `pricePerInputToken`

**Tip:** Only request quotes when all inputs are present (address, decimals, chain ID) to avoid needless network calls.

## 4. Creating Orders (`useCreateOrder`)

File: `src/composables/useCreateOrder.ts`

### Same-Chain Orders

- If `inputToken.chainId === outputToken.chainId`, `SingleChainOrder.create` is used.
- Parameters stored in the quote are passed directly: user address, token addresses, `amountIn`, `amountOutMin`, and a 1-hour deadline.

### Cross-Chain Orders

- Requires a `recipientAddress` and Wagmi `config` (for wrapping native assets on EVM chains).
- Native tokens must be wrapped because the SDK expects ERC-20 style tokens. `getNativeOrWrappedTokenAddress` resolves wrapped addresses from `CHAIN_CONFIGS` (Money Legos).
- When a native asset is used, the code deposits into the wrapped token contract using `writeContract` + `waitForTransactionReceipt` before creating the `CrossChainOrder`.
- `CrossChainOrder.create` receives source/destination chain IDs, token addresses, `destinationTokenMinAmount`, and `minStablecoinAmount` from the quote.

## 5. Submitting Orders (`useSubmitSwaps`)

File: `src/composables/useSubmitSwaps.ts`

### EVM Submission

1. Resolve native input tokens to their wrapped address (same helper as above).
2. Check ERC-20 allowance against the chain-specific Permit2 contract (`PERMIT2_ADDRESS`). If insufficient, send an approval transaction before continuing.
3. Build typed data using either `getEVMSingleChainOrderTypedData` or `getEVMCrossChainOrderTypedData` based on the swap type.
4. Use Wagmi’s `getWalletClient` to sign the typed data (`signer.signTypedData`). `serializeBigIntsToStrings` ensures the payload is signer-friendly.
5. Call `order.sendToAuctioneer({ signature, nonce })`. On success, the auctioneer response contains the transaction hash to display in the UI.

### Solana Submission

1. Instantiate a `Connection` using `VITE_SOLANA_RPC_URL` and obtain the AppKit Solana signer.
2. Request instructions:
   - `getSolanaSingleChainOrderInstructions` for single-chain swaps.
   - `getSolanaCrossChainOrderInstructions` for cross-chain swaps.
3. Deserialize the returned `txBytes` into a `VersionedTransaction`, sign it with the wallet, and broadcast it via `sendRawTransaction`.
4. Notify the auctioneer with `order.sendToAuctioneer` (providing `orderPubkey` and `secretNumber` when required). A successful response confirms the intent is live.

### Error Handling

- Both flows return a `{ status, txHash?, chainId?, message? }` object so the caller can surface toast notifications.
- Errors bubble up as `Error` instances; callers should wrap invocations in try/catch and display message overrides where appropriate.

## 6. Chain and Token Utilities

- `normalizeChainId` / `denormalizeChainId` (`src/utils/normalizeChainId.ts`) translate between AppKit IDs and `ChainID` enums, especially for Solana.
- Token metadata is loaded via `useTokenStore` (`src/stores/tokenStore.ts`), which currently returns a hard-coded list (`src/config/tokens.ts`). Replace `fetchTokens` with your own API integration when needed.

## 7. Wiring into a UI (`SwapInterface.vue`)

File: `src/components/SwapInterface.vue`

- Reactively ties together the store, quote composable, and submission helpers.
- Handles network switching through AppKit (`useAppKitNetwork`). If the active wallet is not on the selected source chain, it prompts the user to switch before submitting.
- Validates recipients: same-chain swaps reuse the sender; cross-chain swaps validate Solana `PublicKey` or EVM checksummed addresses (`isAddress`).

Use this component as a reference or extract the relevant pieces into your framework of choice.

## 8. Adapting the Flow Elsewhere

When moving this logic to another codebase:

1. Initialize Wagmi/AppKit and Pinia (or your state library) so `useIntentsQuote`, `createOrder`, and `useSubmitSwaps` have the same dependencies available.
2. Provide an equivalent token catalog and ensure wrapped token addresses exist in `CHAIN_CONFIGS` for every EVM network you support.
3. Pass signer instances appropriate for your environment (e.g., server-side services would need custodial signing instead of Wagmi/AppKit hooks).
4. Keep environment secrets out of the bundle; proxy quote/order creation if you need to hide API keys.

With these pieces in place you can replicate the same-chain and cross-chain intent submission flows across applications using the Shogun Intents SDK.
