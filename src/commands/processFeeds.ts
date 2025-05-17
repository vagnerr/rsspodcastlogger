import Parser from "rss-parser";
import * as db from "../db";
import { logDebug, logError, logInfo, logVerbose } from "../utils/log";
import type { Feed } from "../db/schema";

/**
 * Process feeds and save episodes to the database
 */
export async function processFeeds( feedInfo: Feed[], maxCount: number | undefined, earliestProcessDate: Date | undefined) {
  const parser: Parser = new Parser({});
  let newEpisesodesCount = 0;

  const feedPromises: Promise<void>[] = [];
  feedInfo.forEach((feedRecord) => {

    logDebug(feedRecord.toString());
    feedPromises.push((async () => {
      let feed;

      if (typeof feedRecord.link === 'string') {
        feed = await parser.parseURL(feedRecord.link);
      } else {
        logError(`Invalid feed link: ${feedRecord.link}`);
        return;
      }

      logInfo(`\n${feedRecord.id} - ${feedRecord.title}`);

      if (!maxCount || maxCount <= 0) {
        maxCount = feed.items.length; // default to all items
      }

      logInfo(`  Processing max ${maxCount} items of ${feed.items.length} total`);
      let skipCount = 0;


      const promises = feed.items.slice(0, maxCount).map(async (item) => {
        const poddate = new Date(item.isoDate);
        logDebug(`  ${poddate} > ${feedRecord.earliest}?`);
        if (poddate > feedRecord.earliest ||
          (earliestProcessDate && poddate > earliestProcessDate)) {
          // trim whitespace from title
          item.title = item.title?.trim();
          logVerbose(`    ${item.title} -> ${item.link}`);
          logDebug(`      guid: ${item.guid} : duration: ${item.itunes.duration}`);
          logDebug(`      pubDate: ${item.pubDate} - isoData: ${item.isoDate}`);

          const EpisodeInsert = buildEpisodeInsert(feedRecord, item);

          //console.log(EpisodeInsert);
          const success = await db.saveEpisode(EpisodeInsert);
          if (success) {
            newEpisesodesCount++;
          } else {
            skipCount++;
          };

        } else {
          logDebug("  skipping earlier item");
          skipCount++;
        }
      });
      await Promise.all(promises); // wait for all the feeds data to complete
      logInfo(`  ${maxCount - skipCount} items processed, ${skipCount} skipped`);
      // Update last check
      feedRecord.lastCheck = new Date();
      await db.updateFeedRecord(feedRecord);
    }
    )());

  });
  logInfo(`\nWaiting for all feeds to complete...`);
  await Promise.all(feedPromises); // wait for all the feeds data to complete
  logInfo(`\n${newEpisesodesCount} new episodes added to the database`);
  logInfo(`\nDone!`);
  process.exit(0);
}


/**
 * Build the episode to insert based on the feed record and the item
 * using the feeditems override data if it exists
 * @param feedRecord
 * @param item
 */
export function buildEpisodeInsert(feedRecord: Feed, item: any) {

  // create base record
  let episodeToInsert = {
    feedId: feedRecord.id,
    title: item.title,
    link: item.link,
    guid: item.guid,
    pubDate: new Date(item.isoDate), // recalulating it rather than pass in
    duration: getDurationAsSeconds(item),
    recorded: false
  };

  // apply any overrides from the feed record
  if (feedRecord.dataOverride) {
    const overrides = JSON.parse(feedRecord.dataOverride);
    for (const key in overrides) {
      const value = overrides[key];
      if (key in episodeToInsert) {
        episodeToInsert[key] = getNestedValue(item, value);
      } else {
        logError(`Invalid override key: ${key}`);
      }
    }
  }

  logDebug(episodeToInsert);
  return episodeToInsert;
}


/**
 * Given JSON object and a path (e.g. "enclosure.url") walk the object
 * and return the value at that path
 * @param obj
 * @param path
 * @returns
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}


/**
 * Durations can be found in item.itunes.duration or item.enclosure.length
 * itunes:
 *    Some feeds have a duration in H:MM:SS format, others are just seconds
 *    (e.g. 1:23:45 or 12345) return a consistent duration in seconds
 *    not all feeds have this field
 * enclosure:
 *    enclosure.duration seems to be in milliseconds
 *
 * @param duration
 */
export function getDurationAsSeconds(item: any) {
  if (item.itunes.duration) {
    if (typeof item.itunes.duration === 'string') {
      const parts = item.itunes.duration.split(':');
      if (parts.length === 3) {
        // H:MM:SS format
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
      } else if (parts.length === 2) {
        // MM:SS format (hopefully :-) may be HH:MM) only time will tell
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      } else {
        // Just seconds
        return parseInt(item.itunes.duration);
      }
    }
  } else if (typeof item.enclosure.length === 'string') {
    // Just seconds
    return Math.floor(parseInt(item.enclosure.length) / 1000);
  } else {
    logError("cannot find duration");
    logInfo(item);
    return 0;
  }
}

