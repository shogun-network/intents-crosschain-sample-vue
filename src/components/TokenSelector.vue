<template>
  <UiButton variant="ghost" class="gap-2 h-auto p-2 hover:bg-secondary/50" @click="open = true">
    <img
      v-if="selectedToken"
      :src="selectedToken?.icon ?? ''"
      :alt="selectedToken?.name ?? 'Token'"
      class="w-4 h-4"
    />
    <div class="text-left">
      <div class="font-semibold">{{ selectedToken?.symbol ?? 'Select a token' }}</div>
      <div class="text-xs text-muted-foreground hidden sm:block">
        {{ selectedToken?.name ?? '' }}
      </div>
    </div>
    <ChevronDown class="w-4 h-4" />
  </UiButton>

  <UiDialog v-model:open="open">
    <UiDialogContent class="sm:max-w-md">
      <UiDialogHeader>
        <UiDialogTitle>Select Token</UiDialogTitle>
      </UiDialogHeader>

      <div class="space-y-4">
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"
          />
          <UiInput placeholder="Search tokens..." v-model="search" class="pl-10" />
        </div>

        <!-- Token list with infinite scroll -->
        <div class="space-y-1 max-h-80 overflow-y-auto" @scroll="onScroll" ref="scrollContainer">
          <UiButton
            v-for="token in visibleTokens"
            :key="token.symbol"
            variant="ghost"
            class="w-full justify-start gap-3 h-auto p-3 hover:bg-secondary/50"
            @click="handleTokenSelect(token)"
          >
            <img
              :src="token.icon"
              :alt="token.name"
              class="w-8 h-8 rounded-full border border-border/30"
            />
            <div class="text-left">
              <div class="font-semibold">{{ token.symbol }}</div>

              <div class="text-sm text-muted-foreground">{{ token.name }}</div>
            </div>
          </UiButton>

          <div v-if="loadingMore" class="text-center py-2 text-xs text-muted-foreground">
            Loading more...
          </div>
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import UiButton from '@/components/ui/button/Button.vue'
import UiDialog from '@/components/ui/dialog/Dialog.vue'
import UiDialogContent from '@/components/ui/dialog/DialogContent.vue'
import UiDialogHeader from '@/components/ui/dialog/DialogHeader.vue'
import UiDialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import UiInput from '@/components/ui/input/Input.vue'
import { ChevronDown, Search } from 'lucide-vue-next'
import { useTokenStore } from '@/stores/tokenStore'

import type { Chain, Token } from '@/types'

const props = defineProps<{
  selectedToken: Token | null
  onTokenSelect: (token: Token) => void
  chain: Chain | null
}>()

const open = ref(false)
const search = ref('')
const scrollContainer = ref<HTMLElement | null>(null)
const pageSize = 20
const visibleCount = ref(pageSize)
const loadingMore = ref(false)

const tokenStore = useTokenStore()

onMounted(() => {
  if (tokenStore.tokens.length === 0) {
    tokenStore.loadTokens()
  }
})

const filteredTokens = computed(() =>
  tokenStore.tokens.filter((token) => {
    const matchesSearch =
      token.symbol.toLowerCase().includes(search.value.toLowerCase()) ||
      token.name.toLowerCase().includes(search.value.toLowerCase())

    const matchesChain = props.chain?.id ? token.chainId === props.chain.id : true

    return matchesSearch && matchesChain
  }),
)

const visibleTokens = computed(() => filteredTokens.value.slice(0, visibleCount.value))

function handleTokenSelect(token: Token) {
  props.onTokenSelect(token)
  open.value = false
  search.value = ''
}

function onScroll(e: Event) {
  const el = e.target as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10 && !loadingMore.value) {
    loadingMore.value = true
    setTimeout(() => {
      visibleCount.value += pageSize
      loadingMore.value = false
    }, 300)
  }
}
</script>
