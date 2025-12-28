# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Local dev server with --test-scheduled flag
npm run deploy       # Deploy to Cloudflare Workers
npm run typecheck    # TypeScript type checking
```

To trigger a scheduled run locally:
```bash
curl "http://127.0.0.1:8787/__scheduled?cron=*%2F15+*+*+*+*"
```

## Architecture

Cloudflare Worker that monitors darioamodei.com every 15 minutes and generates an RSS feed.

**Data flow:**
1. `index.ts` — Cron handler calls `fetchAllEntries()`, diffs against KV state, updates feed
2. `parser.ts` — Fetches homepage, extracts links, fetches each internal page for title/date
3. `diff.ts` — KV operations: tracks known entry IDs (max 1000) and feed items (max 100)
4. `rss.ts` — Generates RSS 2.0 XML from feed items

**Entry types:**
- Internal (`/post/*`, `/essay/*`) — Fetches page, extracts `h1.post-title` and `.post-date`
- External (NYT, WSJ, YouTube) — Parses year from homepage context like `(NYT, 2025)`

**KV keys:** `known_entries` (JSON array of IDs), `feed_items` (JSON array of FeedItem objects)
