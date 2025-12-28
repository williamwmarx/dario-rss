export interface Entry {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: Date;
}

export interface FeedItem {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string; // ISO string
}

export interface Env {
  KV: KVNamespace;
}
