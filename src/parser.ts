import { parseHTML } from "linkedom";
import type { Entry } from "./types";

const HOMEPAGE_URL = "https://www.darioamodei.com";

interface RawLink {
  href: string;
  title: string;
  context: string; // surrounding text for extracting metadata
}

export async function fetchAllEntries(): Promise<Entry[]> {
  const html = await fetchPage(HOMEPAGE_URL);
  if (!html) return [];

  const links = parseHomepage(html);
  const entries: Entry[] = [];

  for (const link of links) {
    const entry = await processLink(link);
    if (entry) entries.push(entry);
  }

  return entries;
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Fetch failed for ${url}: ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.error(`Fetch error for ${url}: ${err}`);
    return null;
  }
}

export function parseHomepage(html: string): RawLink[] {
  const { document } = parseHTML(html);
  const links: RawLink[] = [];
  const seen = new Set<string>();

  // Find all links in the main content
  const allLinks = document.querySelectorAll("a");

  for (const a of allLinks) {
    const href = a.getAttribute("href") || "";
    const title = a.textContent?.trim() || "";

    if (!href || !title) continue;

    // Skip navigation, social, and other non-content links
    if (isNavLink(href, title)) continue;

    // Get surrounding context for metadata extraction
    const parent = a.parentElement;
    const context = parent?.textContent?.trim() || "";

    // Dedupe by href
    if (seen.has(href)) continue;
    seen.add(href);

    links.push({ href, title, context });
  }

  return links;
}

function isNavLink(href: string, title: string): boolean {
  const lowerHref = href.toLowerCase();
  const lowerTitle = title.toLowerCase();

  // Skip anchors and nav links
  if (href.startsWith("#")) return true;
  if (href === "/" || href === HOMEPAGE_URL) return true;

  // Skip social/external non-content links
  if (lowerHref.includes("twitter.com") || lowerHref.includes("x.com")) return true;
  if (lowerHref.includes("linkedin.com")) return true;
  if (lowerHref.includes("scholar.google")) return true;
  if (lowerHref.includes("anthropic.com")) return true;

  // Skip if title is just the author name or navigation
  if (lowerTitle === "dario amodei") return true;
  if (lowerTitle === "anthropic") return true;

  return false;
}

async function processLink(link: RawLink): Promise<Entry | null> {
  const isInternal = link.href.startsWith("/post/") || link.href.startsWith("/essay/");

  if (isInternal) {
    return await processInternalLink(link);
  } else {
    return processExternalLink(link);
  }
}

async function processInternalLink(link: RawLink): Promise<Entry | null> {
  const fullUrl = `${HOMEPAGE_URL}${link.href}`;
  const html = await fetchPage(fullUrl);
  if (!html) return null;

  const { document } = parseHTML(html);

  // Extract title from h1.post-title (avoid header h1)
  const postTitle = document.querySelector("h1.post-title");
  const title = postTitle?.textContent?.trim() || link.title;

  // Extract date from .post-date element
  const postDate = document.querySelector(".post-date");
  const dateText = postDate?.textContent?.trim() || extractDateFromPage(document);
  const pubDate = parseDateText(dateText);

  // Extract description from first paragraph
  const description = extractDescription(document);

  return {
    id: link.href,
    title,
    link: fullUrl,
    description,
    pubDate,
  };
}

function processExternalLink(link: RawLink): Entry | null {
  // Extract year from context like "(NYT, 2025)" or "(2024)"
  const yearMatch = link.context.match(/\((?:[^,]+,\s*)?(\d{4})\)/);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  const pubDate = new Date(year, 0, 1); // Jan 1 of that year

  // Extract publication from context for description
  const pubMatch = link.context.match(/\(([^,)]+)(?:,\s*\d{4})?\)/);
  const publication = pubMatch ? pubMatch[1].trim() : "";

  const description = publication
    ? `Published in ${publication}`
    : link.context.slice(0, 200);

  return {
    id: link.href,
    title: link.title,
    link: link.href,
    description,
    pubDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDateFromPage(document: any): string {
  // Look for date patterns in the page
  // Common locations: near h1, in a time element, or in specific classes

  // Try time element first
  const timeEl = document.querySelector("time");
  if (timeEl) {
    const datetime = timeEl.getAttribute("datetime");
    if (datetime) return datetime;
    const text = timeEl.textContent?.trim();
    if (text) return text;
  }

  // Look for text that looks like "Month Year" near the title
  const body = document.body?.textContent || "";
  const monthYearMatch = body.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/
  );

  if (monthYearMatch) {
    return `${monthYearMatch[1]} ${monthYearMatch[2]}`;
  }

  return "";
}

function parseDateText(text: string): Date {
  if (!text) return new Date();

  // Try ISO date
  const isoDate = new Date(text);
  if (!isNaN(isoDate.getTime())) return isoDate;

  // Try "Month Year" format
  const months: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3,
    may: 4, june: 5, july: 6, august: 7,
    september: 8, october: 9, november: 10, december: 11,
  };

  const match = text.match(/([A-Za-z]+)\s+(\d{4})/);
  if (match) {
    const monthNum = months[match[1].toLowerCase()];
    if (monthNum !== undefined) {
      return new Date(parseInt(match[2]), monthNum, 1);
    }
  }

  return new Date();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDescription(document: any): string {
  // Try meta description first
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    const content = metaDesc.getAttribute("content");
    if (content) return content.slice(0, 500);
  }

  // Try first paragraph after h1
  const h1 = document.querySelector("h1");
  if (h1) {
    let sibling = h1.nextElementSibling;
    while (sibling) {
      if (sibling.tagName === "P") {
        const text = sibling.textContent?.trim();
        if (text && text.length > 20) return text.slice(0, 500);
      }
      sibling = sibling.nextElementSibling;
    }
  }

  // Fallback: first paragraph
  const p = document.querySelector("p");
  if (p) {
    return p.textContent?.trim().slice(0, 500) || "";
  }

  return "";
}
