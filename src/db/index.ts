import { createClient } from '@libsql/client';
import * as schema from './schema';
import { drizzle } from 'drizzle-orm/libsql';
import { eq, gte, lte, and} from 'drizzle-orm';
import { logInfo, logError, logDebug, logVerbose, logWarning } from "../log";

const client = createClient({
  url: process.env.DB_URL || 'file:./local.db',
  authToken: process.env.DB_TOKEN
});
const db = drizzle(client, { schema });


export async function getFeedById(id: number): Promise<schema.Feed | undefined> {
  const feed = await db.select().from(schema.feedTable).where(eq(schema.feedTable.id, id)).get();
  return feed;
}
export async function getFeedByUrl(url: string): Promise<schema.Feed | undefined> {
  const feed = await db.select().from(schema.feedTable).where(eq(schema.feedTable.link, url)).get();
  return feed;
}

export async function getAllFeeds(): Promise<schema.Feed[]> {
  const feeds = await db.select().from(schema.feedTable).all();
  return feeds;
}


 type EpisodeFilters = {
  feedId?: number;
  dateFrom?: Date;
  dateTo?: Date;
  recorded?: boolean;
}

type EpisodeData = {
  id: number;
  title: string;
  link: string;
  guid: string;
  pubDate: Date;
  duration: number;
  recorded: boolean;
  feedId: number;
  feedTitle: string;
  feedTopic: string;
}
/**
 * Search for episode in the db using the conditions given
 *
 * @param conditions
 *  @param conditions.feedId - feed ID to search for (defaults to all feeds)
 *  @param conditions.fromDate - start date to search from
 *  @param conditions.toDate - end date to search to
 *  @param conditions.all - if true, return all episodes not just the ones that have not been recorded
 * @returns
 */
export async function searchEpisodes(filters : EpisodeFilters): Promise<EpisodeData[]> {
  const conditions = []

  if (filters.feedId !== undefined) {
    conditions.push(eq(schema.episodeTable.feedId, filters.feedId));
  }

  if (filters.recorded !== undefined) {
    conditions.push(eq(schema.episodeTable.recorded, filters.recorded));
  }

  if (filters.dateFrom) {
    conditions.push(gte(schema.episodeTable.pubDate, filters.dateFrom));
  }

  if (filters.dateTo) {
    conditions.push(lte(schema.episodeTable.pubDate, filters.dateTo));
  }

  //console.log(conditions);

  const episodes = await db
    .select({
      id: schema.episodeTable.id,
      title: schema.episodeTable.title,
      link: schema.episodeTable.link,
      guid: schema.episodeTable.guid,
      pubDate: schema.episodeTable.pubDate,
      duration: schema.episodeTable.duration,
      recorded: schema.episodeTable.recorded,
      feedId: schema.feedTable.id,
      feedTitle: schema.feedTable.title,
      feedTopic: schema.feedTable.topic
    })
    .from(schema.episodeTable)
    .innerJoin(schema.feedTable, eq(schema.episodeTable.feedId, schema.feedTable.id))
    .where(and(...conditions));

  return episodes;
}

// Save episode to the database but only if it doesn't already exist
// (check by guid)
export async function saveEpisode(episode: schema.EpisodeInsert): Promise<boolean> {
  // Check if the episode already exists
  const existingEpisode = await db
    .select()
    .from(schema.episodeTable)
    .where(eq(schema.episodeTable.guid, episode.guid))
    .get();
  if (existingEpisode) {
    logDebug(`    Episode with guid ${episode.guid} already exists. Skipping insert.`);
    return false;
  }
  // Insert the episode if it doesn't exist
  const result = await db.insert(schema.episodeTable).values(episode).returning().get();
  if (result) {
    logVerbose(`    Inserted episode: ${result.title}`);
    return true;
  } else {
    logError('    Failed to insert episode');
    return false;
  }
}

/**
 * Save new feed to database but only if the feed does not already exist
 * (keyed on the given URL)
 *
 * @param feed
 * @returns true if new feed saved, false it was a duplicate or insert failed
 */
export async function saveFeed(feed: schema.FeedInsert): Promise<boolean>{
  const oldfeed = await getFeedByUrl(feed.link);
  if (oldfeed){
    // already have feed
    logWarning(`Feed already exists ID: ${oldfeed.id}`);
    return false
  }
  const result = await db.insert(schema.feedTable).values(feed).returning().get();
  if(result){
    logInfo(`New Feed added ID: ${result.id}`);
    return true;
  } else {
    logError("Feed insert failed");
    return false;
  }
}


/**
 * Update existing feed record (eg to set last update)
 * @param feed
 */
export async function updateFeedRecord(feed: schema.FeedInsert): Promise<boolean>{
  const result = await db.update(schema.feedTable).set(feed)
    .where(eq(schema.feedTable.id, feed.id))
    .returning().get();
  if(result){
    logDebug(`Feed Updated: ${result.id}`);
    return true;
  } else {
    logError("Feed update failed");
    return false;
  }
}