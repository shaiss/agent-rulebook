import { defineConfig, type HeadConfig } from 'vitepress'
import rulebookMarkdown from './theme/rulepage/markdown'

// Barlow and Barlow Condensed are self-hosted (theme/fonts.css, from
// @fontsource): no request leaves the site, and nothing holds back the first
// paint. The two faces nearly every first screen sets (body text, headings)
// are preloaded from their built, hashed URLs; the rest load when used, over
// metric-matched fallbacks.
const PRELOAD_FONTS = ['barlow-latin-400-normal', 'barlow-condensed-latin-600-normal']

// Before first paint: if this history entry left the landing's fleet open
// (history.state.ir.fleetOpen: theme/entry-state.ts, Home.vue), show it open,
// so Back after a full reload restores the page without a jump.
const restoreUi = `(()=>{try{var s=history.state;s&&s.ir&&s.ir.fleetOpen&&document.documentElement.classList.add('ir-fleet-open')}catch(e){}})()`

export default defineConfig({
  title: 'Agent Rulebook',
  description: 'Humanizing AI agents: rules from running a real agent org.',
  cleanUrls: true,
  head: [['script', { id: 'ir-restore-ui' }, restoreUi]],
  transformHead({ assets }) {
    const head: HeadConfig[] = []
    for (const name of PRELOAD_FONTS) {
      const href = assets.find((a) => a.split('/').pop()?.startsWith(`${name}.`) && a.endsWith('.woff2'))
      if (href) head.push(['link', { rel: 'preload', href, as: 'font', type: 'font/woff2', crossorigin: '' }])
    }
    return head
  },
  markdown: {
    config(md) {
      md.use(rulebookMarkdown)
    }
  },
  transformPageData(pageData) {
    if (pageData.relativePath === 'rules/avatars.md') {
      pageData.frontmatter.pageClass = 'ir-rulepage'
    }
  },
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Rules', link: '/rules/avatars' },
      { text: 'Ledger', link: '/ledger' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/shaiss/agent-rulebook' }
    ],
    // VitePress makes every group label a button; `collapsed: false` makes
    // those buttons work (open by default). Layout.vue gives them their state.
    sidebar: [
      {
        text: 'Rules',
        collapsed: false,
        items: [
          { text: 'Avatars', link: '/rules/avatars' }
        ]
      },
      {
        text: 'Reference',
        collapsed: false,
        items: [
          { text: 'Ledger', link: '/ledger' }
        ]
      }
    ],
    editLink: {
      pattern: 'https://github.com/shaiss/agent-rulebook/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  }
})
