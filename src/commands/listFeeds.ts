import { options } from "..";
import * as db from "../db";

/**
 * List all feeds in the database along with the last check date
 */
export async function listFeeds() {
  console.log('Listing all feeds');
  const feeds = await db.getAllFeeds();

  feeds.forEach((feed) => {
    if (options.verbose) {
      console.log(`${feed.id}: ${feed.title} - ${feed.link} - ${feed.earliest} - ${feed.lastCheck}`);
    }
    else {
      console.log(`${feed.id}: ${feed.title} - ${feed.link} - Last Check: ${feed.lastCheck}`);
    }
  });

  process.exit(0);
}
