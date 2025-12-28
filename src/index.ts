import type { Env, FeedItem } from "./types";
import { fetchAllEntries } from "./parser";
import {
  getKnownEntryIds,
  getFeedItems,
  findNewEntries,
  entriesToFeedItems,
  saveState,
  isFirstRun,
} from "./diff";
import { generateRss } from "./rss";

export default {
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(updateFeed(env));
  },

  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/feed.xml") {
      const feedItems = await getFeedItems(env.KV);
      const rss = generateRss(feedItems);
      return new Response(rss, {
        headers: {
          "Content-Type": "application/rss+xml; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

async function updateFeed(env: Env): Promise<void> {
  const entries = await fetchAllEntries();
  const knownIds = await getKnownEntryIds(env.KV);
  const existingFeed = await getFeedItems(env.KV);

  let newItems: FeedItem[];
  let allIds: string[];

  if (isFirstRun(knownIds)) {
    // First run: seed all entries as "known", add all to feed
    allIds = entries.map((e) => e.id);
    newItems = entriesToFeedItems(entries);
    console.log(`First run: seeded ${allIds.length} entries`);
  } else {
    // Normal run: find new entries and add to feed
    const newEntries = findNewEntries(entries, knownIds);
    newItems = entriesToFeedItems(newEntries);
    allIds = [...knownIds, ...newEntries.map((e) => e.id)];

    if (newEntries.length > 0) {
      console.log(`Found ${newEntries.length} new entries`);
    }
  }

  // Prepend new items to existing feed
  const updatedFeed = [...newItems, ...existingFeed];
  await saveState(env.KV, allIds, updatedFeed);
}
