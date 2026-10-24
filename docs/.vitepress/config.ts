import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Agent Rulebook',
  description: 'Humanizing AI agents: rules from running a real agent org.',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Rules', link: '/rules/avatars' }
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
