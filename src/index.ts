const { program } = require('commander');

import * as db from './db';
import type { Feed } from './db/schema';
import { logInfo, logError } from "./utils/log";

import { listFeeds,processFeeds,addNewFeed,generateReport } from './commands';

const LOOKBACK_DAYS = 14;

// Settup options handling
program
  .name('Podcast RSS Logger')
  .description('A simple CLI tool to parse and log podcast RSS feeds (no arguments = run full feed update)')
  .option('-f, --feed <feedId>', 'Only process this Feed ID')
  .option('-c, --count <count>', 'Number of items to process (default all)', '0')
  .option('-l, --list', 'List all feeds')
  .option('-n, --new <feedUrl>', 'Add new feed url')
  .option('-t, --topic <feed topic>', 'Topic to record for feed (eg Securty, DevOps, etc)')
  .option('-b, --back <days>', 'go back <days> for earliest date to process (feed run or new feed add)', LOOKBACK_DAYS.toString())
  .option('-r, --report <file>', 'Report to save to file')
  .option('--from <date>', 'Earliest date to report (YYYY-MM-DD)')
  .option('--to <date>', 'Latest date to report (YYYY-MM-DD)')
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


let lookbackDays = parseInt(options.back);
let earliestProcessDate:Date|undefined = undefined;

if (isNaN(lookbackDays) || lookbackDays < 1) {
  lookbackDays = LOOKBACK_DAYS;
} else {
  // Prepare the earliest date to process for if the feed is running now
  // only do it if we had an explicit argument here as the dafault behaviour
  // is to limit based on the earliest date in the db record
  const now = new Date();
  earliestProcessDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * lookbackDays)
}


if (options.new) {

  await addNewFeed(options.new, options.topic, lookbackDays);
}



// Select feed(s) to process
export let feedInfo: Feed[] = [];
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
  await generateReport(options);
  process.exit(0);
}


// Default action is to process the feed data
await processFeeds(feedInfo, options.count, earliestProcessDate);




