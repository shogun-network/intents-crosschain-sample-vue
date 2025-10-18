<template>
  <Dialog :open="modal.isOpen" @update:open="onDialogToggle">
    <DialogContent
      class="max-w-sm text-center space-y-5 bg-[#0B0B0B] border border-border/30 rounded-xl"
    >
      <!-- Header -->
      <DialogHeader>
        <DialogTitle class="text-lg font-semibold text-white"> Transaction Status </DialogTitle>
      </DialogHeader>

      <!-- Step Tracker (hidden if error) -->
      <div v-if="modal.stage !== 'error'" class="flex items-center justify-between relative pt-2">
        <template v-for="(step, index) in steps" :key="step.key">
          <div class="flex flex-col items-center w-full relative">
            <!-- Step Circle -->
            <div
              class="w-8 h-8 z-50 rounded-full bg-background flex items-center justify-center border-2 transition-all"
              :class="{
                'border-primary bg-primary text-white': isActive(step.key),
                'border-zinc-700 text-zinc-400': !isActive(step.key),
              }"
            >
              <component
                :is="step.icon"
                class="w-4 h-4"
                :class="{
                  'animate-spin':
                    (modal.stage === 'processing' && step.key === 'processing') ||
                    (modal.stage === 'initiated' && step.key === 'initiated'),
                }"
              />
            </div>

            <!-- Step Label -->
            <span
              class="text-xs mt-2"
              :class="isActive(step.key) ? 'text-primary font-medium' : 'text-zinc-500'"
            >
              {{ step.label }}
            </span>

            <!-- Connector Line -->
            <div
              v-if="index < steps.length - 1"
              class="absolute top-4 right-[-50%] h-[2px] w-full transition-colors duration-300"
              :class="{
                'bg-primary': hasReachedNext(step.key),
                'bg-zinc-700': !hasReachedNext(step.key),
              }"
            ></div>
          </div>
        </template>
      </div>

      <!-- Dynamic Message -->
      <p
        class="text-sm text-muted-foreground px-4 min-h-[24px]"
        :class="{ 'text-red-400': modal.stage === 'error' }"
      >
        {{ modal.message || defaultMessage(modal.stage) }}
      </p>

      <!-- Stage Icon (error only) -->
      <div v-if="modal.stage === 'error'" class="flex justify-center py-2 text-red-500">
        <XCircleIcon class="w-10 h-10" />
      </div>

      <!-- Footer Buttons -->
      <DialogFooter>
        <UiButton
          v-if="modal.stage === 'success' || modal.stage === 'error'"
          class="w-full bg-[#E2B007] hover:bg-[#d19a00] text-black font-semibold"
          @click="closeModal"
        >
          Close
        </UiButton>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Loader2Icon, CheckCircle2Icon, XCircleIcon, ClockIcon } from 'lucide-vue-next'
import UiButton from '@/components/ui/button/Button.vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useSwapModal } from '@/composables/useSwapModal'

const { modal, closeModal } = useSwapModal()

/** Step definitions (order matters) */
const steps = [
  { key: 'processing', label: 'Processing', icon: ClockIcon },
  { key: 'initiated', label: 'Initiated', icon: Loader2Icon },
  { key: 'success', label: 'Success', icon: CheckCircle2Icon },
]

/** Determine if a step is active */
function isActive(stepKey: string) {
  const order = ['processing', 'initiated', 'success']
  const currentIndex = order.indexOf(modal.value.stage || '')
  const stepIndex = order.indexOf(stepKey)
  return stepIndex <= currentIndex
}

/** Determine if the next step should be connected */
function hasReachedNext(stepKey: string) {
  const order = ['processing', 'initiated', 'success']
  const currentIndex = order.indexOf(modal.value.stage || '')
  const stepIndex = order.indexOf(stepKey)
  return currentIndex > stepIndex
}

/** Default messages */
function defaultMessage(stage: string | null): string {
  switch (stage) {
    case 'processing':
      return 'Processing your transaction...'
    case 'initiated':
      return 'Transaction submitted, awaiting confirmation...'
    case 'success':
      return 'Transaction completed successfully!'
    case 'error':
      return 'Transaction failed. Please try again.'
    default:
      return ''
  }
}

/** Keep dialog synced with composable */
function onDialogToggle(value: boolean) {
  if (!value) closeModal()
}
</script>

<style scoped>
.transition-all {
  transition: all 0.3s ease;
}
</style>
