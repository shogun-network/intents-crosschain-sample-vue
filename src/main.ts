import './index.css'

import { createApp } from 'vue'
import { WagmiPlugin } from '@wagmi/vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { wagmiAdapter } from './config/index'
import App from './App.vue'
import { createPinia } from 'pinia'

const queryClient = new QueryClient()

createApp(App)
  .use(WagmiPlugin, { config: wagmiAdapter.wagmiConfig })
  .use(VueQueryPlugin, { queryClient })
  .use(createPinia())
  .mount('#app')
