<template>
  <UiButton variant="ghost" size="sm" class="gap-1 h-auto p-1 text-xs" @click="open = true">
    <img v-if="selectedChain" :src="selectedChain.icon" :alt="selectedChain.name" class="w-4 h-4" />
    <span class="hidden sm:inline">
      {{ selectedChain ? selectedChain.name : '' }}
    </span>
    <ChevronDown class="w-5 h-5" />
  </UiButton>

  <UiDialog v-model:open="open">
    <UiDialogContent class="sm:max-w-sm">
      <UiDialogHeader>
        <UiDialogTitle>Select Network</UiDialogTitle>
      </UiDialogHeader>

      <div class="grid grid-cols-2 gap-2">
        <UiButton
          v-for="chain in SUPPORTED_CHAINS"
          :key="chain.id"
          variant="ghost"
          class="flex flex-col gap-2 h-auto p-4 hover:bg-secondary/50"
          @click="handleChainSelect(chain)"
        >
          <img :src="chain.icon" :alt="chain.name" class="w-6 h-6" />
          <span class="text-sm font-medium">{{ chain.name }}</span>
        </UiButton>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import UiButton from '@/components/ui/button/Button.vue'
import UiDialog from '@/components/ui/dialog/Dialog.vue'
import UiDialogContent from '@/components/ui/dialog/DialogContent.vue'
import UiDialogHeader from '@/components/ui/dialog/DialogHeader.vue'
import UiDialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import { ChevronDown } from 'lucide-vue-next'
import { SUPPORTED_CHAINS } from '@/config'
import type { Chain } from '@/types'

const props = defineProps<{
  selectedChain: Chain | null
  onChainSelect: (chain: Chain) => void
}>()

const open = ref(false)

function handleChainSelect(chain: Chain) {
  props.onChainSelect(chain)
  open.value = false
}
</script>
