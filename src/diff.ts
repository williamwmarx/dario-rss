import type { Entry, FeedItem } from "./types";

const KNOWN_ENTRIES_KEY = "known_entries";
const FEED_ITEMS_KEY = "feed_items";
const MAX_FEED_ITEMS = 100;
const MAX_KNOWN_IDS = 1000;

export async function getKnownEntryIds(kv: KVNamespace): Promise<Set<string>> {
  const json = await kv.get(KNOWN_ENTRIES_KEY);
  if (!json) return new Set();
  return new Set(JSON.parse(json) as string[]);
}

export async function getFeedItems(kv: KVNamespace): Promise<FeedItem[]> {
  const json = await kv.get(FEED_ITEMS_KEY);
  if (!json) return [];
  return JSON.parse(json) as FeedItem[];
}

export function findNewEntries(entries: Entry[], knownIds: Set<string>): Entry[] {
  return entries.filter((e) => !knownIds.has(e.id));
}

export function entriesToFeedItems(entries: Entry[]): FeedItem[] {
  return entries.map((e) => ({
    id: e.id,
    title: e.title,
    link: e.link,
    description: e.description,
    pubDate: e.pubDate.toISOString(),
  }));
}

export async function saveState(
  kv: KVNamespace,
  allEntryIds: string[],
  feedItems: FeedItem[]
): Promise<void> {
  // Limit to prevent unbounded growth
  const trimmedIds = allEntryIds.slice(-MAX_KNOWN_IDS);
  const trimmedFeed = feedItems.slice(0, MAX_FEED_ITEMS);

  await Promise.all([
    kv.put(KNOWN_ENTRIES_KEY, JSON.stringify(trimmedIds)),
    kv.put(FEED_ITEMS_KEY, JSON.stringify(trimmedFeed)),
  ]);
}

export function isFirstRun(knownIds: Set<string>): boolean {
  return knownIds.size === 0;
}
