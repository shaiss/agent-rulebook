import { readFileSync } from 'node:fs'
import { defineLoader } from 'vitepress'
import { parseRulebook, type ManifestEntry, type Rulebook } from './parse'

declare const data: Rulebook
export { data }

export default defineLoader({
  watch: ['../../rules/avatars.md', './avatars.json'],
  load(files): Rulebook {
    const md = readFileSync(files.find((f) => f.endsWith('avatars.md'))!, 'utf8')
    const manifest: ManifestEntry[] = JSON.parse(readFileSync(files.find((f) => f.endsWith('avatars.json'))!, 'utf8'))
    return parseRulebook(md, manifest)
  }
})
