import './index.css'
import { createApp } from 'vue'
import { WagmiPlugin } from '@wagmi/vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { wagmiAdapter } from './config/index'
import { createPinia } from 'pinia'
import App from './App.vue'

// ✅ import OneShot helpers
import { provideOneShot, OneShotSymbol } from '@shogun-sdk/one-shot/vue'

const queryClient = new QueryClient()
const app = createApp(App)

//  Create SDK instance
const sdk = provideOneShot({
  apiKey: import.meta.env.VITE_DEXTRA_KEY,
})

//  Provide the instance to Vue’s DI system
app.provide(OneShotSymbol, sdk)

app
  .use(WagmiPlugin, { config: wagmiAdapter.wagmiConfig })
  .use(VueQueryPlugin, { queryClient })
  .use(createPinia())
  .mount('#app')
