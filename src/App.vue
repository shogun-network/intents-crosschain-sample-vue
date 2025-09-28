<template>
  <HomePage />
</template>

<script lang="ts">
import { createAppKit } from '@reown/appkit/vue'
import { solanaWeb3JsAdapter, wagmiAdapter, networks, projectId } from './config/index'

import HomePage from './views/Home.vue'

// Initialize AppKit
createAppKit({
  adapters: [wagmiAdapter, solanaWeb3JsAdapter],
  networks,
  projectId,
  themeMode: 'light',
  features: {
    analytics: true,
    socials: false,
    swaps: false,
    email: false,
  },
  metadata: {
    name: 'AppKit Vue Example',
    description: 'AppKit Vue Example',
    url: 'https://reown.com/appkit',
    icons: ['https://avatars.githubusercontent.com/u/179229932?s=200&v=4'],
  },
  themeVariables: {
    '--w3m-accent': '#000000',
  },
})

export default {
  name: 'App',
  components: {
    HomePage,
  },
}
</script>
