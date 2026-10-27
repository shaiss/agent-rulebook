import { readFileSync } from 'node:fs'
import { defineConfig, type HeadConfig } from 'vitepress'
import { parseRulebook } from './data/parse'
import rulebookMarkdown from './theme/rulepage/markdown'

// Barlow and Barlow Condensed are self-hosted (theme/fonts.css, from
// @fontsource): no request leaves the site, and nothing holds back the first
// paint. The two faces nearly every first screen sets (body text, headings)
// are preloaded from their built, hashed URLs; the rest load when used, over
// metric-matched fallbacks.
const PRELOAD_FONTS = ['barlow-latin-400-normal', 'barlow-condensed-latin-600-normal']

// Before first paint: if this history entry left the landing's fleet open
// (history.state.ir.fleetOpen: theme/entry-state.ts, Home.vue), show it open,
// so a reload, or Back after a full reload, restores the page without a jump.
// Not on a new visit (a link, a typed address), which restores nothing.
const restoreUi = `(()=>{try{var n=performance.getEntriesByType('navigation')[0],s=history.state;if(n&&n.type==='navigate')return;s&&s.ir&&s.ir.fleetOpen&&document.documentElement.classList.add('ir-fleet-open')}catch(e){}})()`

const RULE_PAGE_DESCRIPTION =
  "The avatar rules: how each agent's portrait, an AI-generated image of an invented person, is chosen, kept unlike every other face and balanced across the fleet."

/**
 * The 404 page without JavaScript: SiteNotFound.vue's markup and the page
 * foot Layout.vue puts after it (SiteFooter.vue, kind "nf": the 404 has no
 * page to edit, so only the date), kept in step with them by hand
 */
const notFoundFallback = (base: string, updated: string | null) => {
  const corners = '<i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>'
  const foot = updated
    ? `<div class="ir-pagefoot ir-pagefoot--nf"><footer class="ir-docfoot">
<p class="ir-docfoot-updated">Last updated <time class="ir-date" datetime="${updated}">${updated}</time></p>
</footer></div>`
    : ''
  return `<noscript><main class="ir-nf">
<div class="ir-nf-plate ir-frame">${corners}<span class="ir-label">Error</span>
<h1 class="ir-nf-title"><span class="ir-nf-code">404</span> <span class="ir-nf-text">Page not found</span></h1></div>
<p class="ir-nf-lede">Nothing in the rulebook lives at this address. The page may have moved, or the link may be mistyped.</p>
<nav class="ir-nf-actions" aria-label="Where to go instead">
<a class="ir-btn ir-btn-primary ir-frame" href="${base}">${corners}Home</a>
<a class="ir-btn ir-btn-secondary" href="${base}rules/avatars">Avatar rules</a>
<a class="ir-btn ir-btn-secondary" href="${base}ledger">Ledger</a>
</nav></main>
${foot}</noscript>`
}

/** The page foot's date, as SiteFooter.vue has it (data/rulebook.data.ts): the latest the rulebook mentions */
const updatedDate = () => parseRulebook(readFileSync(new URL('../rules/avatars.md', import.meta.url), 'utf8'), []).updatedDate

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
    // The rule page's markdown is synced from elsewhere and has no front
    // matter: its page class and its own description (search results, link
    // previews) are set here
    if (pageData.relativePath === 'rules/avatars.md') {
      pageData.frontmatter.pageClass = 'ir-rulepage'
      pageData.description = RULE_PAGE_DESCRIPTION
    }
  },
  // VitePress writes 404.html with an empty app root and draws the page in
  // the browser, so without JavaScript a mistyped address showed a blank
  // page. Beside the root (not in it: hydration doesn't see it), a noscript
  // copy of SiteNotFound.vue and its page foot: same classes, same words,
  // same three links, and the page's one contentinfo.
  transformHtml(html, _id, { page, siteData }) {
    if (page !== '404.md') return
    return html.replace('<div id="app"></div>', `<div id="app"></div>${notFoundFallback(siteData.base, updatedDate())}`)
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
