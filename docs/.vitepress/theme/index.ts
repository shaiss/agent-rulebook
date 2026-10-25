import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import Layout from './Layout.vue'
import Home from './Home.vue'
import Portrait from './Portrait.vue'
import { registerRulePage } from './rulepage/register'
import { registerLedger } from './ledger/register'
import './style.css'
import './portrait.css'
import './rulepage/rulepage.css'
import './ledger/ledger.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('Home', Home)
    app.component('Portrait', Portrait)
    registerRulePage(app)
    registerLedger(app)
  }
} satisfies Theme
