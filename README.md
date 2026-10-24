# Agent Rulebook

A working draft of a rulebook for humanizing AI agents, drawn from running a real agent org. Docs are built with VitePress.

## Local development

```bash
npm install
npm run docs:dev
```

Build and preview:

```bash
npm run docs:build
npm run docs:preview
```

## Access

Preview deployments stay behind Vercel Authentication (Deployment Protection). Production stays behind it until the owner-approved go-public step; after that, production is intentionally public because this is a public docs site. Protection is set in the Vercel project settings, not in `vercel.json`.

## Publishing

The owner-approved go-public step (opening production) and attaching a custom domain require owner approval.

## Content checks

CI (`content-check`) fails the build if published docs leak internals (paths, emails, phones, cloud IDs, tokens/keys, image metadata, unknown binaries, symlinks, or private terms). Private terms are supplied only as salted SHA-256 hashes in the required `CONTENT_CHECK_EXTRA_TERMS` repo secret (`scripts/content-check/hash-terms.mjs` builds that value). Sync PRs are content-only and are never auto-merged.
