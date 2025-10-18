# Shogun One-Shot Cross-Chain Vue dApp

> A Vue 3 + Vite demo that showcases cross-chain swaps powered by the [Shogun One-Shot SDK](https://www.shogun.xyz/) and multi-wallet orchestration through Reown AppKit.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Install](#install)
  - [Environment Variables](#environment-variables)
  - [Commands](#commands)
- [Project Structure](#project-structure)
- [How the App Works](#how-the-app-works)
- [Shogun One-Shot Integration](#shogun-one-shot-integration)
- [Wallet & Network Support](#wallet--network-support)
- [Extending the Demo](#extending-the-demo)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

---

## Overview

This project is a production-ready sample DApp that demonstrates how to:

- Embed the Shogun **One-Shot** SDK in a Vue 3 application.
- Deliver live swap quotes and balances across EVM and Solana networks.
- Execute cross-chain intents with lifecycle feedback (processing → initiated → success/error).
- Reuse a single wallet drawer (via Reown AppKit) to connect both EVM and Solana wallets.

Use it as a foundation for building or customizing your own swap experience. The [Developer Guide](./docs/DEVELOPER_GUIDE.md) dives deeper into hook-by-hook usage.

---

## Features

- Cross-chain and same-chain swaps with a unified UI.
- Token discovery with pagination and search per chain.
- Real-time balances and quote refresh driven by reactivity.
- Transaction progress modal with stage updates from the SDK.
- “Max” handling that respects decimals and safety buffers.
- Modular Vue composables for wallet adaptation and modal orchestration.

---

## Tech Stack

- **Framework:** Vue 3, Vite, TypeScript
- **State & Data:** Pinia, @tanstack/vue-query
- **Wallets:** Reown AppKit (Wagmi adapter for EVM, Solana adapter)
- **Blockchain SDKs:** `@shogun-sdk/one-shot`, `@wagmi/core`, `@solana/web3.js`
- **UI:** Tailwind CSS presets, Reka UI primitives, Lucide icons, Vue Sonner toasts
- **Tooling:** ESLint, Prettier, Vue TSC

---

## Getting Started

### Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`
- Git
- A package manager (`pnpm`, `npm`, or `bun`). Examples below use `pnpm`.
- Access to a Solana RPC endpoint for signing Solana transactions.

### Install

```bash
git clone https://github.com/your-org/intents-crosschain-sample-vue.git
cd intents-crosschain-sample-vue
pnpm install
```

### Environment Variables

Copy the sample env file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `VITE_PROJECT_ID` | Reown/AppKit project ID. Required for wallet connectors in production. (`src/config/index.ts:8`) |
| `VITE_SOLANA_RPC_URL` | HTTPS Solana RPC endpoint used to submit transactions. (`src/composables/useAdoptedWallet.ts:18`) |
| `VITE_DEXTRA_KEY` | API key for the Shogun One-Shot SDK. (`src/main.ts:17`) |

### Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start Vite with hot module reload at `http://localhost:5173`. |
| `pnpm build` | Type-check (`vue-tsc`) and build the production bundle. |
| `pnpm preview` | Preview the production build locally. |
| `pnpm type-check` | Run TypeScript diagnostics without building. |
| `pnpm lint` | Lint and auto-fix with ESLint. |
| `pnpm format` | Format source files under `src/` with Prettier. |

---

## Project Structure

```
src/
├─ App.vue                  # App shell + AppKit initialization
├─ main.ts                  # Vue bootstrap, One-Shot provider, global plugins
├─ components/
│  ├─ AppHeader.vue         # Wallet controls + connect buttons
│  ├─ SwapInterface.vue     # Core swap experience (quotes, balances, execution)
│  ├─ SwapStatusModal.vue   # Transaction stage feedback modal
│  ├─ TokenSelector.vue     # Token lookup powered by useTokenList
│  └─ ui/                   # Reusable UI primitives
├─ composables/
│  ├─ useAdoptedWallet.ts   # Wrap AppKit wallets for One-Shot execute() calls
│  ├─ useSwapModal.ts       # Shared modal state for execution stages
│  └─ useWalletAddress.ts   # Unified EVM/Solana address detection
├─ config/                  # AppKit network configuration
├─ stores/
│  └─ swap.ts               # Pinia store for swap form state
├─ utils/                   # Formatting, debounce, chain ID helpers
└─ views/
   └─ Home.vue              # Page layout rendering SwapInterface and modals
```

---

## How the App Works

1. **Wallet connection** – AppKit handles wallet discovery for EVM (`namespace: 'eip155'`) and Solana (`namespace: 'solana'`). The header reflects connection status for both.
2. **Token selection** – `TokenSelector.vue` uses `useTokenList()` from One-Shot to search and paginate tokens per chain.
3. **Input & balances** – The form stores selections in the Pinia store. `useBalances()` fetches balances for connected EVM and Solana accounts, enabling “Max” and validation.
4. **Live quoting** – A computed object of parameters feeds `useQuote()`, keeping the preview amounts updated as the user types or changes tokens.
5. **Execution** – On submit, the component adapts the connected wallet (`useAdoptedWallet`) and passes it with the active quote to `useExecuteTransaction()`. Stage updates drive `SwapStatusModal.vue`, while successful swaps trigger balance refetches.

Refer to the [Developer Guide](./docs/DEVELOPER_GUIDE.md) for a deeper, annotated walkthrough of this flow.

---

## Shogun One-Shot Integration

All One-Shot hooks are sourced from `@shogun-sdk/one-shot/vue` and share the SDK instance provided in `src/main.ts`.

- `provideOneShot` + `OneShotSymbol` configure dependency injection. (`src/main.ts:10-21`)
- `useTokenList` – Powers token search with infinite scroll. (`src/components/TokenSelector.vue:124-188`)
- `useBalances` – Aggregates balances for both EVM and Solana accounts. (`src/components/SwapInterface.vue:247-257`)
- `useQuote` – Returns the latest pricing payload for the current swap parameters. (`src/components/SwapInterface.vue:275-307`)
- `useExecuteTransaction` – Builds, signs, and submits the intent while emitting lifecycle events. (`src/components/SwapInterface.vue:221-377`)

See the [Developer Guide](./docs/DEVELOPER_GUIDE.md) for hook use cases, tips, and troubleshooting notes.

---

## Wallet & Network Support

- **EVM chains:** Configured via `src/config/index.ts`. Update `networks` to add or remove chains. The app normalizes chain IDs for One-Shot using helpers in `src/utils/normalizeChainId.ts`.
- **Solana:** Uses `@reown/appkit-adapter-solana` to surface Solana wallets. RPC traffic is routed to `VITE_SOLANA_RPC_URL`.
- **Wallet adaptation:** `useAdoptedWallet.ts` bridges AppKit providers into the format that One-Shot expects (either Viem WalletClient or Solana signer).
- **Network switching:** If the connected EVM chain mismatches the requested source chain, the user is prompted to switch before executing the swap.

---

## Extending the Demo

- **Add more chains** – Extend the `networks` array and provide matching icons under `public/images/{chainId}.svg`.
- **Custom slippage controls** – Pipe user-defined slippage into the params consumed by `useQuote()` and forward it to `execute()`.
- **Analytics & logging** – Watch the `stage` and `message` refs returned by `useExecuteTransaction()` to emit telemetry or user notifications.
- **Alternate UI** – The composables are framework-agnostic. You can port the logic to Nuxt, React (via Vue-like wrappers), or another component library while keeping the hooks intact.

---

## Troubleshooting

- **SDK calls fail with 401** – Ensure `VITE_DEXTRA_KEY` is valid and available in the runtime environment.
- **Token list empty** – Confirm the current chain ID matches a network supported by One-Shot and that `loadTokens` receives a numeric `networkId`.
- **Balances stuck loading** – Both EVM and Solana addresses are optional; verify at least one is connected before rendering balances.
- **Execution modal shows “error” immediately** – Check the browser console for the emitted `message` from `useExecuteTransaction`. Most failures stem from rejected wallet signatures or unsupported networks.
- **Solana transactions rejected** – Verify the connected wallet has SOL for fees and that your RPC endpoint allows the instructions being sent.

---

## Resources

- [Developer Guide](./docs/DEVELOPER_GUIDE.md) – In-depth explanation of the dApp flow and hook usage.
- [Reown AppKit Guides](https://docs.reown.com/appkit) – Wallet orchestration and adapter configuration.
- [Vite](https://vitejs.dev/), [Vue.js](https://vuejs.org/), [Vue Query](https://tanstack.com/query/latest/docs/framework/vue/overview) – Core framework resources.

