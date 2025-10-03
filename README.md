# Shogun Intents SDK Vue Demo

A Vue 3 + Vite sample application that showcases how to build same-chain and cross-chain swaps with the [Shogun Intents SDK](https://www.shogun.xyz/) across EVM, Solana, and Sui. It brings together Reown AppKit for wallet orchestration, Pinia for state, and a set of reusable composables that beginners can lift into their own frontends.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [How the Intents Flow Works](#how-the-intents-flow-works)
  - [1. Collect the Intent](#1-collect-the-intent)
  - [2. Price the Swap](#2-price-the-swap)
  - [3. Build the Order](#3-build-the-order)
  - [4. Submit to the Auctioneer](#4-submit-to-the-auctioneer)
- [Wallet Connectivity](#wallet-connectivity)
- [Token Catalog & Chain Metadata](#token-catalog--chain-metadata)
- [Extending the Demo](#extending-the-demo)
- [Troubleshooting](#troubleshooting)
- [Further Reading](#further-reading)

## Features

- Unified swap interface that covers EVM, Solana, and Sui flows.
- Same-chain and cross-chain order creation with the Shogun Intents SDK.
- Permit2-aware approvals for EVM, Solana instruction builders, and Sui transaction helpers.
- AppKit-powered wallet management with a custom Sui wallet bridge.
- Pinia state management, Vue Query data fetching, Tailwind styling, and reusable UI components.

## Tech Stack

- **Framework:** [Vue 3](https://vuejs.org/) + [Vite 7](https://vitejs.dev/)
- **State:** [Pinia](https://pinia.vuejs.org/) stores for swap state and tokens
- **Data Fetching:** [@tanstack/vue-query](https://tanstack.com/query/latest)
- **Wallets:** [Reown AppKit](https://reown.com/appkit) adapters for Wagmi (EVM) & Solana, plus a custom Sui wallet composable
- **Shogun Tooling:** `@shogun-sdk/intents-sdk` and `@shogun-sdk/money-legos`
- **UI:** Tailwind CSS 4, Reka UI primitives, and Lucide icons

## Prerequisites

- **Node.js:** `^20.19.0` or `>=22.12.0` (see `package.json` engines)
- **Package manager:** npm, pnpm, or bun. A `bun.lock` is tracked, but any modern manager works.
- **Git:** for cloning and version control
- **RPC access:** A Solana RPC URL (Helius, Triton, QuickNode, etc.) for signing and broadcasting Solana transactions.

## Setup

1. **Clone and install dependencies**

   ```bash
   git clone https://github.com/your-org/intents-bounk.git
   cd intents-bounk
   # pick one
   bun install
   # or
   npm install
   # or
   pnpm install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Populate the variables:
   - `VITE_PROJECT_ID` – Required Reown/AppKit project ID. The repo ships with a localhost-safe default (see `src/config/index.ts`), but production apps must use their own.
   - `VITE_SOLANA_RPC_URL` – HTTPS endpoint for Solana transactions.

3. **Run the development server**
   ```bash
   npm run dev
   ```
   Vite serves the app at [http://localhost:5173](http://localhost:5173) by default.

## Available Scripts

| Command              | Description                                                                           |
| -------------------- | ------------------------------------------------------------------------------------- |
| `npm run dev`        | Start the Vite dev server with HMR.                                                   |
| `npm run build`      | Type-check and build the production bundle (runs `vue-tsc --build` and `vite build`). |
| `npm run preview`    | Preview the built app locally.                                                        |
| `npm run type-check` | Run TypeScript diagnostics with `vue-tsc`.                                            |
| `npm run lint`       | Lint and auto-fix using ESLint.                                                       |
| `npm run format`     | Format files under `src/` with Prettier.                                              |

## Project Structure

```
src/
├─ App.vue                  # AppKit bootstrap + root view
├─ main.ts                  # Creates Vue app, installs Wagmi, Vue Query, Pinia
├─ components/              # UI widgets (swap form, headers, dialogs)
├─ composables/             # Intents SDK helpers (quotes, orders, submissions, Sui wallet)
├─ config/                  # Network, token, and constant definitions
├─ stores/                  # Pinia stores for swap state, tokens, Sui wallet dialog
├─ utils/                   # Chain ID normalization, formatting, BigInt serialization
├─ views/                   # Route-level views (Home swaps UI)
└─ types/                   # Shared TypeScript interfaces
```

Key entry points:

- `src/components/SwapInterface.vue` drives the end-to-end swap experience.
- `src/composables/useIntentsQuote.ts` wraps `QuoteProvider.getQuote` calls.
- `src/composables/useCreateOrder.ts` constructs same-chain or cross-chain orders.
- `src/composables/useSubmitSwaps.ts` handles approvals, signing, and auctioneer submissions for EVM, Solana, and Sui.
- `src/composables/useSuiWallet.ts` provides a wallet-standard compatible bridge for Sui wallets.

## How the Intents Flow Works

The demo breaks an intent submission down into four stages. Each stage is encapsulated in its own composable so you can reuse them elsewhere.

### 1. Collect the Intent

File: `src/stores/swap.ts`

- Stores the source/destination chains, tokens, amount, and optional recipient.
- Validates the recipient format per chain (EVM checksum, Solana `PublicKey`, Sui address).
- Exposes `isReady` so the UI can gate downstream calls until inputs are valid.

### 2. Price the Swap

File: `src/composables/useIntentsQuote.ts`

- Normalizes chain IDs (AppKit ⟷ Intents SDK) with `normalizeChainId`.
- Uses Vue Query to call `QuoteProvider.getQuote` for both the user-entered amount and a "1 token" reference quote.
- Surfaces `amountOut`, USD estimates, and `minStablecoinsAmount` (used in cross-chain orders).

### 3. Build the Order

File: `src/composables/useCreateOrder.ts`

- Wraps native EVM tokens into their ERC-20 equivalents (via `CHAIN_CONFIGS` and a WETH `deposit`).
- Chooses between `SingleChainOrder.create` and `CrossChainOrder.create` based on the selected networks.
- Provides friendly errors when required parameters (like a recipient for cross-chain swaps) are missing.

### 4. Submit to the Auctioneer

File: `src/composables/useSubmitSwaps.ts`

- **EVM:**
  1. Resolves native tokens to wrapped addresses.
  2. Checks allowances against `PERMIT2_ADDRESS`; submits approvals when needed.
  3. Builds typed data (`getEVMSingleChainOrderTypedData` / `getEVMCrossChainOrderTypedData`) and signs with Wagmi.
  4. Calls `order.sendToAuctioneer({ signature, nonce })` and surfaces the resulting hash.
- **Solana:**
  1. Creates a `Connection` using `VITE_SOLANA_RPC_URL`.
  2. Requests instructions (`getSolanaSingleChainOrderInstructions` or `getSolanaCrossChainOrderInstructions`).
  3. Deserializes, signs, and broadcasts the `VersionedTransaction` via the connected wallet.
  4. Notifies the auctioneer with `orderPubkey` (and `secretNumber` for same-chain).
- **Sui:**
  1. Generates per-order secrets for orders when required.
  2. Builds transactions with `getSuiSingleChainLimitOrderTransaction` or `getSuiOrderTransaction`.
  3. Signs and executes the transaction through the Sui wallet composable.
  4. Sends the digest to the auctioneer.

Each branch returns a `{ status, txHash?, message? }` object so the UI can show success and error toasts.

## Wallet Connectivity

- **EVM + Solana:** Powered by Reown AppKit (`src/App.vue`, `src/main.ts`). `useAppKitNetwork` ensures the user is on the correct source chain before submitting.
- **Sui:** Managed via `useSuiWallet.ts`, which enumerates wallets through `@mysten/wallet-standard`, restores previous connections, and exposes signing helpers for messages and transactions. The `useSuiWalletConnectStore` drives the connect/disconnect dialog UI.

## Token Catalog & Chain Metadata

- Chains are configured in `src/config/index.ts`, which ships with Base, Solana, and Sui (`SUPPORTED_CHAINS`).
- Tokens load from `src/config/constants.ts` and `src/config/tokens.ts`. Replace `fetchTokens` with your own API or static list when moving to production.
- Adding new chains usually requires:
  - Extending `SUPPORTED_CHAINS` with the chain ID, name, and icon.
  - Supplying wrapped token addresses in `CHAIN_CONFIGS` (from `@shogun-sdk/money-legos`).
  - Providing wallet connectivity through AppKit or a custom adapter.

## Extending the Demo

1. **Add more networks:** Update `networks` in `src/config/index.ts` and ensure AppKit supports them.
2. **Persist quotes or orders server-side:** Extract the composables into API routes or serverless functions.
3. **Customize the UI:** The swap interface is self-contained; you can replace components while reusing the composables.
4. **Integrate analytics and monitoring:** Hook into the returned status objects to log swap lifecycle events.

## Troubleshooting

- **Wallets not showing up?** Confirm your browser has the desired wallet extensions installed. Sui wallets must implement `@mysten/wallet-standard`.
- **Solana submissions fail:** Double-check `VITE_SOLANA_RPC_URL` and ensure the connected wallet has sufficient SOL for fees.
- **Wrapped token errors:** Make sure the chain you selected has a `wrapped` token address in `CHAIN_CONFIGS`.
- **Permit2 approval loops:** Some tokens require setting allowance to `0` before increasing it. Modify the approval flow if you hit this edge case.

## Further Reading

- [Shogun Intents SDK – Same-Chain & Cross-Chain Orders](./shogun-sdk-orders.md)
- [Demo App Walkthrough](./demo-app.md)
- [Reown AppKit Documentation](https://docs.reown.com/appkit)
- [Mysten Wallet Standard](https://docs.sui.io/build/wallet-standard)
