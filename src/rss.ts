import type { FeedItem } from "./types";

const FEED_TITLE = "Dario Amodei";
const FEED_LINK = "https://www.darioamodei.com";
const FEED_DESCRIPTION = "Posts and essays by Dario Amodei";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatRfc822(isoDate: string): string {
  return new Date(isoDate).toUTCString();
}

export function generateRss(items: FeedItem[]): string {
  const now = new Date().toUTCString();

  const itemsXml = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${formatRfc822(item.pubDate)}</pubDate>
      <guid isPermaLink="false">${escapeXml(item.id)}</guid>
    </item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${escapeXml(FEED_LINK)}</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="https://dario-rss.marx.sh/feed.xml" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>`;
}
