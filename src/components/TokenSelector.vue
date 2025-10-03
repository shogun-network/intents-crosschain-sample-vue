<template>
  <!-- Button that opens the token selector dialog -->
  <UiButton variant="ghost" class="gap-2 h-auto p-2 hover:bg-secondary/50" @click="open = true">
    <!-- Show selected token image + chain icon if a token is already selected -->
    <div v-if="selectedToken" class="relative">
      <!-- Token logo -->
      <img
        :src="selectedToken?.image ?? ''"
        :alt="selectedToken?.name ?? 'Token'"
        class="w-6 h-6 rounded-full border border-border/30"
      />
      <!-- Small chain icon overlay (example: Ethereum, Solana, etc.) -->
      <img
        :src="`/images/${selectedToken?.chainId}.svg`"
        alt="chain"
        class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-background"
      />
    </div>

    <!-- Token symbol + name -->
    <div class="text-left">
      <div class="font-semibold">
        {{ selectedToken?.symbol ?? 'Select a token' }}
      </div>
      <div class="text-xs text-muted-foreground hidden sm:block">
        {{ selectedToken?.name ?? '' }}
      </div>
    </div>

    <!-- Down arrow icon -->
    <ChevronDown class="w-4 h-4" />
  </UiButton>

  <!-- Dialog that pops up when user clicks the button -->
  <UiDialog v-model:open="open">
    <UiDialogContent class="sm:max-w-md">
      <UiDialogHeader>
        <UiDialogTitle>Select Token</UiDialogTitle>
      </UiDialogHeader>

      <div class="space-y-4">
        <!-- 🔎 Search box for filtering tokens -->
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"
          />
          <UiInput
            placeholder="Search tokens..."
            v-model="search"
            @input="onSearch"
            class="pl-10 text-white ring-0 focus-visible:ring-0"
          />
        </div>

        <!-- Token list with scroll + states -->
        <div
          class="space-y-1 max-h-80 overflow-y-auto custom-scrollbar"
          ref="scrollContainer"
          @scroll="onScroll"
        >
          <!-- Render token list -->
          <UiButton
            v-for="token in tokenStore.tokens"
            :key="token.address"
            variant="ghost"
            class="w-full justify-start gap-3 h-auto p-3 hover:bg-secondary/50"
            @click="handleTokenSelect(token)"
          >
            <!-- Token image + chain overlay -->
            <div class="relative">
              <img
                :src="token.image"
                :alt="token.name"
                class="w-8 h-8 rounded-full border border-border/30"
              />
              <img
                :src="`/images/${token.chainId}.svg`"
                alt="chain"
                class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-background"
              />
            </div>

            <!-- Token details -->
            <div class="text-left truncate">
              <div class="font-semibold">{{ token.symbol }}</div>
              <div class="text-sm text-muted-foreground">{{ token.name }}</div>
              <div class="text-xs text-muted-foreground font-mono truncate">
                <!-- Example: 0x1234...abcd -->
                {{ shortenAddress(token.address) }}
              </div>
            </div>
          </UiButton>

          <!-- State: Loading tokens -->
          <div v-if="tokenStore.loading" class="text-center py-2 text-xs text-muted-foreground">
            Loading...
          </div>

          <!-- State: No results found (user typed something, but nothing matched) -->
          <div
            v-else-if="!tokenStore.loading && tokenStore.tokens.length === 0 && search"
            class="text-center py-2 text-xs text-destructive"
          >
            Not found — please check chain & address again.
            <!-- Example: If you search "banana" on Ethereum, no token found -->
          </div>

          <!-- State: End of pagination (all tokens are loaded) -->
          <div
            v-else-if="!tokenStore.hasMore && tokenStore.tokens.length > 0"
            class="text-center py-2 text-xs text-muted-foreground"
          >
            End of results
          </div>
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>

<script setup lang="ts">
/**
 * Script setup (Composition API style)
 *
 * This component lets users pick a token from a paginated, searchable list.
 * - Uses Pinia store `tokenStore` for fetching/searching tokens
 * - Handles search (debounced for performance)
 * - Supports infinite scroll
 * - Shows nice states: Loading / Empty / End of results
 */

import { ref, onMounted, watch } from 'vue'
import UiButton from '@/components/ui/button/Button.vue'
import UiDialog from '@/components/ui/dialog/Dialog.vue'
import UiDialogContent from '@/components/ui/dialog/DialogContent.vue'
import UiDialogHeader from '@/components/ui/dialog/DialogHeader.vue'
import UiDialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import UiInput from '@/components/ui/input/Input.vue'
import { ChevronDown, Search } from 'lucide-vue-next'
import { useTokenStore } from '@/stores/tokenStore'
import type { Chain } from '@/types'
import type { TokenInfo } from '@shogun-sdk/intents-sdk'
import { shortenAddress } from '@/utils'
import { debounce } from '@/utils/debounce'

/** Props: the parent passes selected token + chain info */
const props = defineProps<{
  selectedToken: TokenInfo | null
  onTokenSelect: (token: TokenInfo) => void
  chain: Chain | null
}>()

/** Local state */
const open = ref(false) // dialog open/close
const search = ref('') // search input
const scrollContainer = ref<HTMLElement | null>(null) // scrollable container

/** Pinia store: token management */
const tokenStore = useTokenStore()

// Initial load: when component mounts, fetch tokens for current chain
onMounted(() => {
  if (props.chain?.id) {
    tokenStore.resetTokens()
    tokenStore.loadTokens({ q: '', networkId: Number(props.chain.id) })
  }
})

// Watch for chain changes → refetch tokens
watch(
  () => props.chain?.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      tokenStore.resetTokens()
      tokenStore.loadTokens({ q: search.value, networkId: Number(newId) })
    }
  },
)

// Debounced search → avoids too many API calls while typing
const debouncedSearch = debounce(() => {
  tokenStore.resetTokens()
  tokenStore.loadTokens({ q: search.value, networkId: Number(props.chain?.id) })
}, 400)

// Called whenever user types in the search box
function onSearch() {
  debouncedSearch()
}

// When a token is selected, notify parent + close dialog
function handleTokenSelect(token: TokenInfo) {
  props.onTokenSelect(token)
  open.value = false
  search.value = ''
}

// Infinite scroll handler → loads more tokens when user scrolls near bottom
function onScroll(e: Event) {
  const el = e.target as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10 && tokenStore.hasMore) {
    tokenStore.loadTokens({ q: search.value, networkId: Number(props.chain?.id) })
  }
}
</script>

<style scoped>
/* Thin scrollbar (looks modern) */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: var(--muted-foreground) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--muted-foreground);
  border-radius: 4px;
}
</style>
