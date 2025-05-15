import Parser from "rss-parser";
const { program } = require('commander');

import * as db from './db';
import type { Feed, FeedInsert } from './db/schema';
import { logInfo, logError, logDebug, logVerbose } from "./log";


const LOOKBACK_DAYS = 14;

// Settup options handling
program
  .name('Podcast RSS Logger')
  .description('A simple CLI tool to parse and log podcast RSS feeds (no arguments = run full feed update)')
  .option('-f, --feed <feedId>', 'Only process this Feed ID')
  .option('-c, --count <count>', 'Number of items to process (default all)', '0')
  .option('-l, --list', 'List all feeds')
  .option('-n, --new <feedUrl> [<topic>]', 'Add new feed url')
  .option('-t, --topic <feed topic>', 'Topic to record for feed (eg Securty, DevOps, etc)')
  .option('-b, --back <days>', 'go back <days> for earliest date to process (feed run or new feed add)', LOOKBACK_DAYS.toString())
  .option('-r, --report <file>', 'Report to save to file')
  .option('--from <date>', 'Earliest date to report (YYYYMMDD)')
  .option('--to <date>', 'Latest date to report (YYYYMMDD)')
  .option('--full', 'Full report (default is only unrecorded episodes)')
  .option('-d, --debug', 'Enable debug mode')
  .option('-v, --verbose', 'Enable verbose mode')
  .option('-h, --help', 'Display help information')

program.parse();
export const options = program.opts();


if (options.help) {
  program.help();
}
if (options.debug) {
  logInfo('Debug mode enabled');
}
if (options.verbose) {
  logInfo('Verbose mode enabled');
}

if (options.list) {
  await listFeeds();
}

if (options.new) {

  await addNewFeed(options.new, options.topic);
}

let lookbackDays = parseInt(options.back);
let earliestProcessDate = null;

if (isNaN(lookbackDays) || lookbackDays < 1) {
  lookbackDays = LOOKBACK_DAYS;
} else {
  // Prepare the earliest date to process for if the feed is running now
  // only do it if we had an explicit argument here as the dafault behaviour
  // is to limit based on the earliest date in the db record
  const now = new Date();
  earliestProcessDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * lookbackDays)
}


// Select feed(s) to process
let feedInfo: Feed[] = [];
if (options.feed) {
  logInfo(`Processing feed with ID: ${options.feed}`);
  const feedId = parseInt(options.feed);
  if (!isNaN(feedId)) {
    const feed = await db.getFeedById(feedId);
    if (feed) {
      feedInfo = [feed];
    }
    else {
      logError(`Feed with ID ${feedId} not found`);
      process.exit(1);
    }
  } else {
    logError(`Invalid feed ID: ${options.feed}`);
    program.help();
    process.exit(1);
  }
} else { // Default to all feeds
  logInfo('Processing all feeds');
  feedInfo = await db.getAllFeeds();
}


if (options.report) {
  await generateReport();
  process.exit(0);
}


// Default action is to process the feed data
await processFeeds();



/**
 * Process feeds and save episodes to the database
 */
async function processFeeds() {
  const parser: Parser = new Parser({});

  feedInfo.forEach((feedRecord) => {

    logDebug(feedRecord.toString());
    (async () => {
      let feed;

      if (typeof feedRecord.link === 'string') {
        feed = await parser.parseURL(feedRecord.link);
      } else {
        logError('Invalid feed link:', feedRecord.link);
        return;
      }

      logInfo(`\n${feedRecord.id} - ${feedRecord.title}`);

      let max_count = 0;
      if (options.count) {
        const count = parseInt(options.count);
        if (!isNaN(count) && count > 0) {
          max_count = count;
        } else {
          max_count = feed.items.length; // default to all items
        }
      }
      logInfo(`  Processing max ${max_count} items of ${feed.items.length} total`);
      let skipCount = 0;

      //feed.items.slice(0, max_count).forEach(async item => {
      const promises = feed.items.slice(0, max_count).map(async item => {
        const poddate = new Date(item.isoDate);
        logDebug(`  ${poddate} > ${feedRecord.earliest}?`);
        if (poddate > feedRecord.earliest ||
          (earliestProcessDate && poddate > earliestProcessDate)) {
          // trim whitespace from title
          item.title = item.title.trim();
          logVerbose(`    ${item.title} -> ${item.link}`);
          logDebug(`      guid: ${item.guid} : duration: ${item.itunes.duration}`);
          logDebug(`      pubDate: ${item.pubDate} - isoData: ${item.isoDate}`);

          const EpisodeInsert = buildEpisodeInsert(feedRecord, item);

          //console.log(EpisodeInsert);
          const success = await db.saveEpisode(EpisodeInsert);
          if (!success) {
            skipCount++;
          };

        } else {
          logDebug("  skipping earlier item");
          skipCount++;
        }
      });
      await Promise.all(promises); // wait for all the feeds data to complete
      logInfo(`  ${max_count - skipCount} items processed, ${skipCount} skipped`);
      // Update last check
      feedRecord.lastCheck = new Date();
      await db.updateFeedRecord(feedRecord);
    }
    )();

  });
}

async function listFeeds() {
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

/**
 * Add new RSS feed to database to be logged.
 *
 * @param feedUrl Url of rss feed to be added
 */
async function addNewFeed(feedUrl : string, feedTopic: string) {
  console.log(`Adding new feed for url ${feedUrl} (Topic: ${feedTopic})`);
  const parser: Parser = new Parser({});
  const feed = await parser.parseURL(feedUrl);

  console.log(feed.title)
  console.log(feed.description)

  const now = new Date();

  const FeedInsert = {
    title: feed.title,
    topic: feedTopic,
    link: feedUrl,
    earliest: new Date(now.getTime() - 1000 * 60 * 60 * 24 * lookbackDays)
  }
  await db.saveFeed(FeedInsert);

  process.exit(0);
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
function getDurationAsSeconds(item: any) {
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



/**
 * Build the episode to insert based on the feed record and the item
 * using the feeditems override data if it exists
 * @param feedRecord
 * @param item
 */
function buildEpisodeInsert(feedRecord: Feed, item: any) {

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
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}
async function generateReport() {
  const eps = await db.searchEpisodes(
    {
      feedId: options.feed?options.feed:undefined,
      dateFrom: options.from?new Date(options.from):undefined,
      dateTo: options.to?new Date(options.to):undefined,
      recorded: options.full?undefined:false
    }
  );

  const fileName = options.report;
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(process.cwd(), fileName);

  // Check if the file already exists
  if (fs.existsSync(filePath)) {
    // For now reject the file if it exists
    logError(`File ${filePath} already exists. Please delete it or choose a different name.`);
    process.exit(1);
  }


  let saveData = [];
  for (let index = 0; index < eps.length; index++) {
    const episode = eps[index];
    const { hours, minutes } = formatSecondsToHoursMinutes(episode.duration);


    // TODO: have the data extracted by a configureable interchangable format
    saveData.push({
      //id: episode.id,
      //feedId: episode.feedId,
      title: episode.title,   // need to strip bad chars from this (eg ' or " )?
                              // do we want to join this with the feed title?
      //link: episode.link,
      //guid: episode.guid,
      //pubDate: episode.pubDate,
      date: `${episode.pubDate.getUTCFullYear()}/${episode.pubDate.getUTCMonth()+1}/${episode.pubDate.getUTCDate()}`,
      //duration: episode.duration,
      hours: hours,
      minutes: minutes,
      // recorded: episode.recorded,
      // feedId: episode.feedId,
      // feedTitle: episode.feedTitle,
      subject: episode.feedTopic || '',
    });

    // TODO: should really hold these till after the file is written
    // Update the episode record to mark it as recorded
    await db.updateEpisodeRecord({
                                  ...episode,
                                  recorded: true
                                });

  }

  if (saveData.length === 0) {
    logInfo('No unrecorded episodes found');
    process.exit(0);
  }
  // Write the data to the file
  const fileData = JSON.stringify(saveData, null, 2);
  fs.writeFileSync(filePath, fileData, 'utf8');
  logInfo(`Report saved to ${filePath}`);
  logInfo(`Total episodes: ${saveData.length}`);

  const { hours, minutes } = formatSecondsToHoursMinutes(
    eps.reduce((acc, episode) => acc + episode.duration, 0)
  );
  logInfo(`Total duration: ${hours} hours, ${minutes} minutes`);

}


/**
 * Format seconds to hours and minutes
 * @param totalSeconds Total seconds to format
 * @returns Object with hours and minutes (rounded up to nearest minute)
 */
function formatSecondsToHoursMinutes(totalSeconds: number): { hours: number; minutes: number } {
  const hours = Math.floor(totalSeconds / 3600);
  const remainingSeconds = totalSeconds % 3600;

  // Round minutes up if there's any leftover seconds
  const minutes = Math.ceil(remainingSeconds / 60);

  return { hours, minutes };
}