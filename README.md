# dario-rss

RSS feed for [darioamodei.com](https://www.darioamodei.com), updated every 15 minutes.

**Feed URL:** https://dario-rss.marx.sh/feed.xml

## What it monitors

- **Posts & Essays** — Internal content at `/post/*` and `/essay/*`, with accurate titles and publication dates extracted from each page
- **Op-eds** — External articles (NYT, WSJ, etc.)
- **Interviews** — YouTube videos and other external interviews

## Stack

- [Cloudflare Workers](https://workers.cloudflare.com/) — Serverless runtime
- [Cloudflare KV](https://developers.cloudflare.com/kv/) — State persistence for deduplication
- [linkedom](https://github.com/WebReflection/linkedom) — HTML parsing

## Development

```bash
npm install
npm run dev          # Local dev server
npm run deploy       # Deploy to Cloudflare
npm run typecheck    # Type check
```

## How it works

1. Cron triggers every 15 minutes
2. Fetches homepage, extracts all content links
3. For internal links, fetches each page to get title and date
4. For external links, parses year from homepage context
5. Compares against known entries in KV to find new items
6. Generates RSS 2.0 feed
