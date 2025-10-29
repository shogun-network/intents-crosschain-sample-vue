# Developer Guide: Intents Cross-Chain Vue dApp

This document explains how the sample dApp wires the Shogun **One-Shot SDK** into a Vue 3 application. It walks through the full user journey—token discovery, quoting, and transaction execution—and documents each hook from `@shogun-sdk/one-shot/vue` so other developers can reuse the patterns.

---

## 1. High-level Architecture

- **Vue 3 + Vite shell** – `src/main.ts` bootstraps Vue, Pinia, Vue Query, and Wagmi for EVM wallets.  
- **AppKit (Reown)** – `src/App.vue` installs AppKit adapters for EVM (`wagmiAdapter`) and Solana (`solanaWeb3JsAdapter`) to get multi-namespace wallet UX.  
- **Shogun One-Shot SDK** – `provideOneShot` creates a configured SDK client, injected through Vue’s dependency system (`OneShotSymbol`). Every hook uses the same instance.  
- **State management** – `src/stores/swap.ts` keeps swap form state (chains, tokens, amount, recipient) so the UI and hooks share a single source of truth.  
- **Composables + Components** – `SwapInterface.vue` is the main workflow component. It consumes One-Shot hooks for balances, quotes, and execution, coordinates wallet adaptation, and updates the swap status modal.

Flow overview:

1. User connects wallets through AppKit.
2. `TokenSelector.vue` requests tokens via `useTokenList`.
3. `SwapInterface.vue` watches selected values, hydrates balances with `useBalances`, and requests a live quote via `useQuote`.
4. When the user confirms, `useExecuteTransaction` builds and submits the order, emitting stage updates that drive the status modal.

---

## 2. Bootstrapping the SDK

`src/main.ts:10` shows the minimum boilerplate to make One-Shot hooks available everywhere:

```ts
import { provideOneShot, OneShotSymbol } from '@shogun-sdk/one-shot/vue'

const sdk = provideOneShot({
  apiKey: import.meta.env.VITE_DEXTRA_KEY,
})

app.provide(OneShotSymbol, sdk)
```

Key points:

- `provideOneShot` returns a ready-to-use client with sensible defaults (internal HTTP client, caching, telemetry).  
- Injecting it with `OneShotSymbol` means any descendant component can call the Vue hooks without passing props manually.  
- The only required input is an API key; add RPC overrides or logging hooks here if needed.

---

## 3. Core Workflow (`SwapInterface.vue`)

All runtime interactions sit inside `src/components/SwapInterface.vue`. It combines One-Shot hooks with local state and wallet adapters.

### 3.1 Wallet and network context

- `useWalletAddress(srcChainId)` and `useWalletAddress(destChainId)` resolve the correct wallet namespace (EVM vs Solana) using `isEvmChain` under the hood.  
- `useAppKitNetwork()` exposes the actively connected network so the UI can prompt users to switch chains when necessary.  
- The `useAdoptedWallet` composable (`src/composables/useAdoptedWallet.ts`) wraps AppKit wallet providers with the helpers exposed by `@shogun-sdk/one-shot/wallet-adapter` (`adaptSolanaWallet`, `adaptViemWallet`). This produces the `wallet` object expected by `useExecuteTransaction`.

### 3.2 Token discovery with `useTokenList`

`TokenSelector.vue:124-188` demonstrates the hook:

```ts
const { tokens, loading, hasMore, loadTokens, resetTokens } = useTokenList()

loadTokens({ q: '', networkId: Number(props.chain.id), reset: true })
```

Use cases:

- Fetch paginated token lists for a given `networkId`.  
- Search by symbol / name / address with the `q` parameter.  
- Implement infinite scroll by calling `loadTokens()` without `reset` when `hasMore` is true.  
- Reset previous results when the user switches networks or search terms.

### 3.3 Multi-network balances with `useBalances`

`SwapInterface.vue:247-257` passes both EVM and Solana addresses:

```ts
const balancesParams = computed(() => ({
  addresses: {
    evm: accountAddress.value ?? undefined,
    svm: connectDestAccountAddress.value ?? undefined,
  },
}))

const { data: balances, refetch, loading } = useBalances(balancesParams)
```

Use cases:

- Fetch aggregate balances across namespaces in one call.  
- Tie re-fetching to wallet changes or transaction completion (`watch(accountAddress, refetch)`).  
- Combine with helper functions to present per-token balances (see `getTokenBalance` in `SwapInterface.vue:309-317`).

### 3.4 Live quoting with `useQuote`

`SwapInterface.vue:275-307` prepares sanitized parameters (`parseUnits` protects against invalid decimals) before calling the hook:

```ts
const params = computed(() => ({
  srcToken: swap.srcToken?.address ?? '',
  destToken: swap.destToken?.address ?? '',
  amount: amountParsed,
  srcChainId: swap.srcChain?.id ?? 1,
  destChainId: swap.destChain?.id ?? ChainId.SOLANA,
  senderAddress: accountAddress.value ?? undefined,
  recipient: swap.recipient ?? undefined,
  slippage: undefined,
}))

const quote = useQuote(params)
```

Use cases:

- Derive quotes reactively; the hook re-fetches whenever `params` changes.  
- Access `quote.data.value` for amount breakdowns (`outputAmount`, `pricePerInputToken`, USD valuations).  
- Show skeleton loaders by checking `quote.isLoading.value`.  
- Surface errors via `quote.error.value` (e.g., invalid pair).

### 3.5 Executing transactions with `useExecuteTransaction`

`SwapInterface.vue:221-377` orchestrates the final step:

```ts
const { execute, stage, message } = useExecuteTransaction()

const order = await execute({
  quote: quote.data.value,
  wallet: adaptedWallet,
})
```

Use cases:

- `execute({ quote, wallet })` handles both single-chain and cross-chain orders. The hook inspects the quote, builds the right order object, requests approvals if required, and submits the transaction.  
- `stage` and `message` stream lifecycle updates (`processing`, `initiated`, `success`, `error`). The component watches these signals to drive `SwapStatusModal` and refetch balances.  
- The hook resolves with an order status payload—use it to fire success toasts or analytics events.

Error handling tips:

- When `execute` throws (e.g., wallet rejection), catch and present the `message` emitted in the `error` stage.  
- For unsupported networks, ensure `useAdoptedWallet` throws early so `execute` is never called with an invalid signer.

---

## 4. End-to-End Transaction Timeline

1. **Initial state** – `useSwapStore` sets default Solana source/destination (`swap.ts:7-65`).  
2. **Token selection** – User opens the selector; `useTokenList` fetches tokens for the active chain.  
3. **Input amount** – `fromAmount` updates `swap.amount`; `useQuote` reacts and returns fresh pricing.  
4. **Balance checks** – `useBalances` exposes per-token balances for Max buttons and validation.  
5. **Pre-flight checks** – Component verifies wallet connections, prompts for network switch when the connected chain mismatches the desired source network.  
6. **Wallet adaptation** – `useAdoptedWallet` wraps AppKit’s provider into a One-Shot compatible signer.  
7. **Execution** – `useExecuteTransaction` prepares and dispatches on-chain actions, emitting stage updates.  
8. **Post-success** – Balances refetch, modal closes, and the store stays ready for the next swap.

---

## 5. Hook Reference Cheat Sheet

| Hook | Location | Primary Output | Typical Call Site | Notes |
| --- | --- | --- | --- | --- |
| `provideOneShot` | `src/main.ts:10-21` | SDK client instance | App bootstrap | Call once; supply API key and optional overrides. |
| `useTokenList` | `src/components/TokenSelector.vue:124-188` | `tokens`, `loadTokens`, pagination flags | Token selector modal | Debounce searches; pass `reset` to flush previous results. |
| `useBalances` | `src/components/SwapInterface.vue:247-257` | `data`, `refetch`, `loading` | Swap form | Accepts both EVM (`evm`) and Solana (`svm`) addresses; refetch after swaps. |
| `useQuote` | `src/components/SwapInterface.vue:275-307` | `data`, `isLoading`, `error` | Swap form | Provide normalized chain IDs and parsed amount strings. |
| `useExecuteTransaction` | `src/components/SwapInterface.vue:221-377` | `execute`, `stage`, `message` | Swap confirmation | Listens for staged events to drive UX (modals, toasts, refetches). |

---

## 6. Extending the Demo

- **Add networks** – Update `src/config/index.ts` with new AppKit networks, extend `SUPPORTED_CHAINS`, and ensure your RPC providers are configured. One-Shot hooks automatically respect the new IDs.  
- **Custom slippage** – Pass a `slippage` value (BPS) into the `useQuote` params computed. Pipe the same value into `execute` via the quote response.  
- **Advanced routing** – Inspect `quote.data.value.routes` (when available) to display path previews or pick alternates before calling `execute`.  
- **Analytics** – Watch `stage` from `useExecuteTransaction` to emit telemetry for each lifecycle event.  
- **Testing** – Mock One-Shot hooks using Vue’s `provide`/`inject` to supply deterministic results. For end-to-end runs, configure AppKit with wallet connectors in your test harness and rely on `stage` assertions.

---

## 7. Troubleshooting

- **No tokens listed** – Confirm `networkId` matches the normalized chain ID that One-Shot expects and that `resetTokens()` runs before a new search.  
- **Quotes stuck loading** – Verify both `srcToken` and `destToken` addresses exist and `amountParsed` is a stringified integer (use `parseUnits`).  
- **Execution failures** – Check the `stage` watcher logs in `SwapInterface.vue` and ensure `useAdoptedWallet` returns the right namespace adapter. Most failures stem from locked wallets or insufficient allowances; `useExecuteTransaction` surfaces those in `message.value`.

---

With these building blocks you can adapt the demo into your own dApp: swap out the UI while keeping the One-Shot hook boundaries intact, or fork the composables into other frameworks (Nuxt, React via similar hooks). The hooks encapsulate the hardest pieces—quote math, wallet orchestration, and transaction staging—so you can focus on delivering product-specific polish.
