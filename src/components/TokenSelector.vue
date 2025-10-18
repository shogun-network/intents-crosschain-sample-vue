<template>
  <!-- Button that opens the token selector dialog -->
  <UiButton variant="ghost" class="gap-2 h-auto p-2 hover:bg-secondary/50" @click="open = true">
    <div v-if="selectedToken" class="relative">
      <img
        :src="selectedToken?.image ?? ''"
        :alt="selectedToken?.name ?? 'Token'"
        class="w-6 h-6 rounded-full border border-border/30"
      />
      <img
        :src="`/images/${selectedToken?.chainId}.svg`"
        alt="chain"
        class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-background"
      />
    </div>

    <div class="text-left">
      <div class="font-semibold">
        {{ selectedToken?.symbol ?? 'Select a token' }}
      </div>
      <div class="text-xs text-muted-foreground hidden sm:block">
        {{ selectedToken?.name ?? '' }}
      </div>
    </div>

    <ChevronDown class="w-4 h-4" />
  </UiButton>

  <!-- Token selector dialog -->
  <UiDialog v-model:open="open">
    <UiDialogContent class="sm:max-w-md">
      <UiDialogHeader>
        <UiDialogTitle>Select Token</UiDialogTitle>
      </UiDialogHeader>

      <div class="space-y-4">
        <!-- Search input -->
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

        <!-- Token list -->
        <div
          class="space-y-1 max-h-80 overflow-y-auto custom-scrollbar"
          ref="scrollContainer"
          @scroll="onScroll"
        >
          <UiButton
            v-for="token in tokens"
            :key="token.address"
            variant="ghost"
            class="w-full justify-start gap-3 h-auto p-3 hover:bg-secondary/50"
            @click="handleTokenSelect(token)"
          >
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

            <div class="text-left truncate">
              <div class="font-semibold">{{ token.symbol }}</div>
              <div class="text-sm text-muted-foreground">{{ token.name }}</div>
              <div class="text-xs text-muted-foreground font-mono truncate">
                {{ shortenAddress(token.address) }}
              </div>
            </div>
          </UiButton>

          <!-- Loading -->
          <div v-if="loading" class="text-center py-2 text-xs text-muted-foreground">
            Loading...
          </div>

          <!-- No results -->
          <div
            v-else-if="!loading && tokens.length === 0 && search"
            class="text-center py-2 text-xs text-destructive"
          >
            Not found — please check chain & address again.
          </div>

          <!-- End of results -->
          <div
            v-else-if="!hasMore && tokens.length > 0"
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
import { ref, onMounted, watch } from 'vue'
import UiButton from '@/components/ui/button/Button.vue'
import UiDialog from '@/components/ui/dialog/Dialog.vue'
import UiDialogContent from '@/components/ui/dialog/DialogContent.vue'
import UiDialogHeader from '@/components/ui/dialog/DialogHeader.vue'
import UiDialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import UiInput from '@/components/ui/input/Input.vue'
import { ChevronDown, Search } from 'lucide-vue-next'
import type { Chain } from '@/types'
import { shortenAddress } from '@/utils'
import { debounce } from '@/utils/debounce'
import type { TokenInfo } from '@shogun-sdk/one-shot'
import { useTokenList } from '@shogun-sdk/one-shot/vue'


/** Props */
const props = defineProps<{
  selectedToken: TokenInfo | null
  onTokenSelect: (token: TokenInfo) => void
  chain: Chain | null
}>()

/** Local state */
const open = ref(false)
const search = ref('')
const scrollContainer = ref<HTMLElement | null>(null)

/** Use the composable hook (instead of Pinia) */
const {
  tokens,
  loading,
  hasMore,
  loadTokens,
  resetTokens,
} = useTokenList()

/** Load on mount */
onMounted(() => {
  if (props.chain?.id) {
    loadTokens({ q: '', networkId: Number(props.chain.id), reset: true })
  }
})

/** Watch chain changes */
watch(
  () => props.chain?.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      resetTokens()
      loadTokens({ q: search.value, networkId: Number(newId), reset: true })
    }
  },
)

/** Debounced search */
const debouncedSearch = debounce(() => {
  resetTokens()
  loadTokens({ q: search.value, networkId: Number(props.chain?.id), reset: true })
}, 400)

function onSearch() {
  debouncedSearch()
}

/** Select token */
function handleTokenSelect(token: TokenInfo) {
  props.onTokenSelect(token)
  open.value = false
  search.value = ''
}

/** Infinite scroll */
function onScroll(e: Event) {
  const el = e.target as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10 && hasMore.value && !loading.value) {
    loadTokens({ q: search.value, networkId: Number(props.chain?.id) })
  }
}
</script>

<style scoped>
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
