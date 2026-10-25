import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Agent Rulebook',
  description: 'Humanizing AI agents: rules from running a real agent org.',
  cleanUrls: true,
  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;700&family=Barlow+Condensed:wght@400;600&display=swap' }]
  ],
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Rules', link: '/rules/avatars' },
      { text: 'Ledger', link: '/rules/avatars#ledger-live-portraits' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/shaiss/agent-rulebook' }
    ],
    sidebar: [
      {
        text: 'Rules',
        items: [
          { text: 'Avatars', link: '/rules/avatars' }
        ]
      }
    ]
  }
})
