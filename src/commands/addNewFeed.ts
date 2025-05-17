import Parser from "rss-parser";
import * as db from "../db";

/**
 * Add new RSS feed to database to be logged.
 *
 * @param feedUrl Url of rss feed to be added
 */
export async function addNewFeed(feedUrl: string, feedTopic: string, lookbackDays: number) {
  console.log(`Adding new feed for url ${feedUrl} (Topic: ${feedTopic})`);
  const parser: Parser = new Parser({});
  const feed = await parser.parseURL(feedUrl);

  console.log(feed.title);
  console.log(feed.description);

  const now = new Date();

  const FeedInsert = {
    title: feed.title,
    topic: feedTopic,
    link: feedUrl,
    earliest: new Date(now.getTime() - 1000 * 60 * 60 * 24 * lookbackDays)
  };
  await db.saveFeed(FeedInsert);

  process.exit(0);
}
