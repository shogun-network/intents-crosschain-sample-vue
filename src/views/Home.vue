<template>
  <div>
    <Header />
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <SwapInterface />
      </div>
    </main>
    <Toaster />
  </div>
</template>

<script lang="ts" setup>
import Header from '@/components/AppHeader.vue'
import SwapInterface from '@/components/SwapInterface.vue'
import { useTokenStore } from '@/stores'
import { Toaster } from 'vue-sonner'
import { onMounted } from 'vue'
import 'vue-sonner/style.css'
const tokenStore = useTokenStore()

onMounted(() => {
  tokenStore.loadTokens()
})

defineOptions({
  name: 'HomePage',
})
</script>
