import { defineConfig } from 'vitepress'
import rulebookMarkdown from './theme/rulepage/markdown'

export default defineConfig({
  title: 'Agent Rulebook',
  description: 'Humanizing AI agents: rules from running a real agent org.',
  cleanUrls: true,
  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;700&family=Barlow+Condensed:wght@400;600&display=swap' }]
  ],
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
    sidebar: [
      {
        text: 'Rules',
        items: [
          { text: 'Avatars', link: '/rules/avatars' }
        ]
      },
      {
        text: 'Reference',
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
