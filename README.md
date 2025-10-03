# Shogun Intents SDK Vue Demo

## Table of Contents

- [Why this repo](#why-this-repo)
- [Quick start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Install and configure](#install-and-configure)
  - [Daily commands](#daily-commands)
- [Project map](#project-map)
- [Intents SDK building blocks](#intents-sdk-building-blocks)
  - [1. Discover tokens with getTokenList](#1-discover-tokens-with-gettokenlist)
  - [2. Price the swap with QuoteProvider.getQuote](#2-price-the-swap-with-quoteprovidergetquote)
  - [3. Build orders](#3-build-orders)
  - [4. Submit to the auctioneer](#4-submit-to-the-auctioneer)
- [End-to-end use cases](#end-to-end-use-cases)
  - [Same-chain swap](#same-chain-swap)
  - [Cross-chain swap](#cross-chain-swap)
- [Working with the Vue app](#working-with-the-vue-app)
- [Extending the demo](#extending-the-demo)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

## Why this repo

- Shows real-world usage of `@shogun-sdk/intents-sdk` in a Vue 3 + Vite codebase.
- Demonstrates the full swap lifecycle: discover tokens, fetch quotes, create orders, submit intents.
- Highlights the new `getTokenList` API so you can build ergonomic token selectors with pagination.
- Acts as a starter template you can fork, customize, and deploy for AppKit-enabled dApps.

## Quick start

### Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`.
- A package manager (`bun`, `npm`, or `pnpm`). The repo tracks a `bun.lock`.
- Git for cloning, plus a Solana RPC endpoint if you intend to sign Solana transactions locally.

### Install and configure

```bash
git clone https://github.com/your-org/intents-bounk.git
cd intents-bounk

# choose any package manager you prefer
bun install
# or
npm install
# or
pnpm install
```

Duplicate the sample env file and fill the values that apply to you:

```bash
cp .env.example .env.local
```

Required keys:

- `VITE_PROJECT_ID` – Reown/AppKit project ID. A local-safe fallback lives in `src/config/index.ts`, but production deployments must use your own ID.
- `VITE_SOLANA_RPC_URL` – HTTPS RPC endpoint for Solana instructions and transaction submission.

### Daily commands

| Command              | Action                                                    |
| -------------------- | --------------------------------------------------------- |
| `npm run dev`        | Start Vite with HMR at `http://localhost:5173`.           |
| `npm run build`      | Type-check (`vue-tsc`) and produce the production bundle. |
| `npm run preview`    | Serve the built assets locally.                           |
| `npm run type-check` | Run TypeScript diagnostics without building.              |
| `npm run lint`       | Lint & auto-fix with ESLint.                              |
| `npm run format`     | Format source files under `src/` with Prettier.           |

## Project map

```
src/
├─ App.vue                  # AppKit bootstrap + routing shell
├─ main.ts                  # Vue entrypoint, installs Wagmi, Vue Query, Pinia
├─ components/
│  ├─ SwapInterface.vue     # User flow for quote → order → submission
│  ├─ TokenSelector.vue     # Token list modal powered by getTokenList
│  └─ ui/…                  # Small UI primitives
├─ composables/
│  ├─ useIntentsQuote.ts    # Wraps QuoteProvider.getQuote
│  ├─ useCreateOrder.ts     # Normalizes tokens and creates SDK orders
│  └─ useSubmitSwaps.ts     # Sends orders on EVM, Solana, or Sui
├─ config/                  # Chain + token metadata, constants
├─ stores/
│  ├─ swap.ts               # Swap form state
│  └─ tokenStore.ts         # Pagination + caching around getTokenList
├─ types/                   # Shared TypeScript contracts
└─ utils/                   # Helpers (chain ID normalization, BigInt serialization)
```

## Intents SDK building blocks

The demo keeps each SDK touchpoint isolated so you can reuse or swap in your own UI easily.

### 1. Discover tokens with getTokenList

`getTokenList` is the newest addition to the Intents SDK. It lets you query Shogun’s token catalog by symbol, name, or address while respecting chain boundaries and pagination. The Pinia store in `src/stores/tokenStore.ts` powers the token selector.

```ts
import { ChainID, getTokenList, type TokenSearchResponse } from '@shogun-sdk/intents-sdk'

const response: TokenSearchResponse = await getTokenList({
  q: 'usdc', // optional search string or address
  networkId: ChainID.Base, // required chain identifier
  page: 1, // defaults to 1
  limit: 20, // defaults to 50; we keep it at 20 for UI perf
})

console.log(response.results) // Array<TokenInfo>
console.log(response.count) // total matches (for pagination)
```

Implementation highlights (`src/stores/tokenStore.ts`):

- Tracks `tokens`, `page`, and `hasMore` so infinite scrolling is trivial.
- Accepts `{ q, networkId, reset }` parameters and merges results safely.
- Caches the last query, enabling quick refreshes without refetch wiring.

To adapt this to your own app, replace the UI inside `TokenSelector.vue` and keep the store logic, or wire `getTokenList` directly into your framework of choice.

### 2. Price the swap with QuoteProvider.getQuote

`QuoteProvider.getQuote` returns the swap math for a given pair, amount, and chain routing combination.

```ts
import { QuoteProvider, ChainID } from '@shogun-sdk/intents-sdk'

const quote = await QuoteProvider.getQuote({
  tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  tokenOut: '0x4200000000000000000000000000000000000006', // WETH on Base
  sourceChainId: ChainID.Base,
  destChainId: ChainID.Base,
  amount: 1_000_000n, // 1 USDC (6 decimals)
})
```

In `src/composables/useIntentsQuote.ts` we:

- Derive params from the swap store and normalize chain IDs (AppKit ↔ SDK).
- Fetch two quotes: the user’s amount and a “1 token” reference for per-token pricing.
- Expose shape `{ amountOut, amountOutUsd, minStablecoinsAmount, pricePerInputToken }` for the UI.

### 3. Build orders

Once you have a quote, the next decision is whether you’re staying on the same chain or bridging.

```ts
import { SingleChainOrder, CrossChainOrder, ChainID } from '@shogun-sdk/intents-sdk'

const order = await SingleChainOrder.create({
  user: accountAddress,
  chainId: ChainID.Base,
  tokenIn: quote.inputToken.address,
  amountIn: quote.amountIn,
  tokenOut: quote.outputToken.address,
  destinationAddress: accountAddress,
  amountOutMin: quote.amountOut,
  deadline: Math.floor(Date.now() / 1000) + 3600,
})
```

Cross-chain creation adds destination chain metadata plus a minimum stablecoin guard:

```ts
const order = await CrossChainOrder.create({
  user: accountAddress,
  sourceChainId: quote.inputToken.chainId as ChainID,
  sourceTokenAddress: quote.inputToken.address,
  sourceTokenAmount: quote.amountIn,
  destinationChainId: quote.outputToken.chainId as ChainID,
  destinationTokenAddress: quote.outputToken.address,
  destinationAddress: recipientAddress,
  destinationTokenMinAmount: quote.amountOut,
  minStablecoinAmount: quote.minStablecoinsAmount,
  deadline,
})
```

See `src/composables/useCreateOrder.ts` for production-ready handling:

- Wraps EVM native assets (ETH, MATIC…) into their ERC-20 equivalents using `CHAIN_CONFIGS`.
- Enforces recipient presence on cross-chain orders.
- Delegates to Wagmi’s `writeContract` + `waitForTransactionReceipt` to wrap native tokens when required.

### 4. Submit to the auctioneer

With an order in hand, you still need to sign and broadcast chain-specific payloads. `src/composables/useSubmitSwaps.ts` centralizes this flow:

- **EVM**
  - Replace native addresses with wrapped addresses.
  - Check and set ERC-20 allowance against `PERMIT2_ADDRESS`.
  - Build EIP-712 typed data via `getEVMSingleChainOrderTypedData` or `getEVMCrossChainOrderTypedData`.
  - Sign with Wagmi’s `signTypedData` and call `order.sendToAuctioneer({ signature, nonce })`.
- **Solana**
  - Build versioned transactions with `getSolanaSingleChainOrderInstructions` or `getSolanaCrossChainOrderInstructions`.
  - Sign using AppKit’s injected wallet provider and broadcast through `@solana/web3.js`.
  - Notify the Auctioneer with `orderPubkey` (and `secretNumber` for single-chain).
- **Sui**
  - For same-chain swaps, generate secrets with `generateSuiLimitOrderSecretData` and build transactions via `getSuiSingleChainLimitOrderTransaction`.
  - For cross-chain, call `getSuiOrderTransaction`.
  - Sign + execute using the wallet-standard bridge exposed by `useSuiWallet()`.
  - Send transaction digests to the Auctioneer.

Each branch returns `{ status, txHash?, message? }`, making it easy to display toast updates.

## End-to-end use cases

### Same-chain swap

1. User selects tokens on the same chain (e.g., Base USDC → Base WETH). `TokenSelector.vue` calls `tokenStore.loadTokens({ networkId, q })` to populate the modal.
2. `useIntentsQuote` fetches real-time pricing via `QuoteProvider.getQuote`.
3. `createOrder` detects identical chain IDs and triggers `SingleChainOrder.create`.
4. `useSubmitSwaps`:
   - Ensures ERC-20 approvals through Permit2.

- Signs the EIP-712 payload.
- Sends the signed intent to the Auctioneer and returns the resulting hash.

### Cross-chain swap

1. User selects different source/destination chains (e.g., Base USDC → Solana USDC). Token search automatically scopes to the relevant chain each time the selector opens.
2. Quotes are fetched with mismatched `sourceChainId` / `destChainId`.
3. `createOrder` switches to `CrossChainOrder.create` and requires a recipient address.
4. Submission branches to the destination network:
   - Solana: build instructions, sign with the wallet, broadcast, then notify the Auctioneer.
   - Sui: generate secret data, sign, submit, and forward the digest.
   - EVM destination: similar to same-chain but with cross-chain typed data helpers.

## Working with the Vue app

Key UI integration points:

- `src/components/SwapInterface.vue` orchestrates the entire user journey and composes the composables above.
- `src/components/TokenSelector.vue` renders the token modal, consuming the token store and exposing callbacks when users scroll or select an entry.
- `src/stores/tokenStore.ts` is your template for paginated token lists. Swap it out with your own styling or plug it into a different framework.
- `src/stores/swap.ts` keeps the canonical swap state (tokens, chains, amounts) and exposes derived flags (`isReady`).
- `src/utils/index.ts` includes helpers like `normalizeChainId` and BigInt serialization that keep the SDK APIs happy across browsers.

## Extending the demo

- Add more chains: update `SUPPORTED_CHAINS` inside `src/config/index.ts`, provide wrapped token info in `CHAIN_CONFIGS`, and ensure AppKit can connect to the network.
- Persist orders server-side: move the composable logic into backend handlers to cache quotes or pre-sign payloads.
- Swap in your component library: the composables expose plain functions, so you can port them to React, Svelte, or any existing Vue design system.
- Integrate analytics: listen to the `{ status, txHash }` object returned from `submitSwaps` to log swap lifecycle events or trigger notifications.

## Troubleshooting

- **Wallet list is empty:** Confirm the relevant browser extensions are installed. Sui wallets must support `@mysten/wallet-standard`.
- **Solana submissions fail:** Ensure `VITE_SOLANA_RPC_URL` points to a healthy endpoint and that the wallet has enough SOL to cover fees.
- **Allowance loops on EVM:** Some ERC-20 tokens require resetting allowance to `0` before increasing it. Adjust the approval flow if you encounter this edge case.
- **Wrapped token missing:** Extend `CHAIN_CONFIGS` with the correct wrapped token address when enabling a new EVM chain.

## Resources

- [`shogun-sdk-orders.md`](./shogun-sdk-orders.md) – deeper dive into order helpers & chain specifics.
- [`demo-app.md`](./demo-app.md) – walkthrough of the Vue layers in this repo.
- [Shogun Intents SDK docs](https://www.shogun.xyz/) – official guides and API references.
- [Reown AppKit docs](https://docs.reown.com/appkit) – wallet orchestration reference.
- [Mysten Wallet Standard](https://docs.sui.io/build/wallet-standard) – details on Sui wallet integration.
