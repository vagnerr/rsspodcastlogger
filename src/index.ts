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
        if (poddate > feedRecord.earliest) {
          // trim whitespace from title
          item.title = item.title.trim();
          logVerbose(`    ${item.title} -> ${item.link}`);
          logDebug(`      guid: ${item.guid} : duration: ${item.itunes.duration}`);
          logDebug(`      pubDate: ${item.pubDate} - isoData: ${item.isoDate}`);

          const EpisodeInsert = {
            feedId: feedRecord.id,
            title: item.title,
            link: item.link,
            guid: item.guid,
            pubDate: poddate,
            duration: item.itunes.duration,
            recorded: false
          };

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
    earliest: new Date(now.getTime() - 1000 * 60 * 60 * 24 * LOOKBACK_DAYS)
  }
  await db.saveFeed(FeedInsert);

  process.exit(0);
}


