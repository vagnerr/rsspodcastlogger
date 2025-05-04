import { createClient } from '@libsql/client';
import * as schema from './schema';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';


const client = createClient({
  url: process.env.DB_URL || 'file:./local.db',
  authToken: process.env.DB_TOKEN
});
const db = drizzle(client, { schema });


export async function getFeedById(id: number): Promise<schema.Feed | undefined> {
  const feed = await db.select().from(schema.feedTable).where(eq(schema.feedTable.id, id)).get();
  return feed;
}

export async function getAllFeeds(): Promise<schema.Feed[]> {
  const feeds = await db.select().from(schema.feedTable).all();
  return feeds;
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
    console.log(`Episode with guid ${episode.guid} already exists. Skipping insert.`);
    return false;
  }
  // Insert the episode if it doesn't exist
  const result = await db.insert(schema.episodeTable).values(episode).returning().get();
  if (result) {
    console.log(`Inserted episode: ${result.title}`);
    return true;
  } else {
    console.error('Failed to insert episode');
    return false;
  }
}
