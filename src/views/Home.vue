<template>
  <div>
    <Header />
    <main class="container mx-auto px-4 py-8">
      <div class="max-w-md mx-auto">
        <SwapInterface />
      </div>
    </main>
    <Toaster />
    <SwapStatusModal />
  </div>
</template>

<script setup lang="ts">
import Header from '@/components/AppHeader.vue'
import SwapInterface from '@/components/SwapInterface.vue'
import SwapStatusModal from '@/components/SwapStatusModal.vue'
import { Toaster } from 'vue-sonner'

import 'vue-sonner/style.css'

defineOptions({
  name: 'HomePage',
})
</script>
