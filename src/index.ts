

import Parser from "rss-parser";
const { program } = require('commander');

import * as db from './db';
import type { Feed, FeedInsert } from './db/schema';


const LOOKBACK_DAYS = 14;
// Settup options handling
program
  .name('Podcast RSS Logger')
  .description('A simple CLI tool to parse and log podcast RSS feeds')
  .option('-f, --feed <feedId>', 'Only process this Feed ID')
  .option('-l, --list', 'List all feeds')
  .option('-n, --new <feedUrl> [<topic>]', 'Add new feed url')
  .option('-t, --topic <feed topic>', 'Topic to record for feed (eg Securty, DevOps, etc)')
  .option('-d, --debug', 'Enable debug mode')
  .option('-v, --verbose', 'Enable verbose mode')
  .option('-h, --help', 'Display help information')

program.parse();
const options = program.opts();


if (options.help) {
  program.help();
}
if (options.debug) {
  console.log('Debug mode enabled');
}
if (options.verbose) {
  console.log('Verbose mode enabled');
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
  console.log(`Processing feed with ID: ${options.feed}`);
  const feedId = parseInt(options.feed);
  if (!isNaN(feedId)) {
    const feed = await db.getFeedById(feedId);
    if (feed) {
      feedInfo = [feed];
    }
    else {
      console.error(`Feed with ID ${feedId} not found`);
      process.exit(1);
    }
  } else {
    console.error(`Invalid feed ID: ${options.feed}`);
    program.help();
    process.exit(1);
  }
} else { // Default to all feeds
  console.log('Processing all feeds');
  feedInfo = await db.getAllFeeds();
}

const parser: Parser = new Parser({});


feedInfo.forEach((feedRecord) => {

  //console.log(feedRecord);
  (async () => {
    //const feed = await parser.parseURL('https://www.arresteddevops.com/episode/index.xml'); // Arrested DevOps
    //const feed = await parser.parseURL('https://feeds.simplecast.com/vUHP7wpf');   // Redhat command line heroes
    //const feed = await parser.parseURL('https://podcast.darknetdiaries.com');  // Darknet Diaries
    //const feed = await parser.parseURL('https://plusone.apache.org/feed/podcast');  // FeatherCast
    //const feed = await parser.parseURL('https://feeds.twit.tv/twig.xml');  // This Week in Google /IM
    //const feed = await parser.parseURL('https://feeds.twit.tv/twit.xml');  // This Week in Tech
    //const feed = await parser.parseURL('https://feeds.twit.tv/sn.xml');  // Security Now
    //const feed = await parser.parseURL('https://anchor.fm/s/f408358c/podcast/rss'); // ncsc cyber Series podcast
    //const feed = await parser.parseURL('http://risky.biz/feeds/risky-business/'); // Risky Business     duration is in seconds
    //const feed = await parser.parseURL('https://feeds.soundcloud.com/users/soundcloud:users:232096760/sounds.rss'); //IBM Securit: Security Intelligence Podcast
    //const feed = await parser.parseURL('https://feeds.simplecast.com/XA_851k3'); // The Stack Overflow Podcast    (older eps loose details)

    let feed;

    if (typeof feedRecord.link === 'string') {
      feed = await parser.parseURL(feedRecord.link);
    } else {
      console.error('Invalid feed link:', feedRecord.link);
      return;
    }

    console.log(feedRecord.title);
    const COUNT = 5;
    feed.items.slice(0,COUNT).forEach(item => {
      const poddate = new Date(item.isoDate);
      console.log(`  ${poddate} - ${feedRecord.earliest}`);
      if(poddate > feedRecord.earliest){
        // trim whitespace from title
        item.title = item.title.trim();
        console.log(`  ${item.title} -> ${item.link}`);
        console.log(`  guid: ${item.guid} : duration: ${item.itunes.duration}`);
        console.log(`  pubDate: ${item.pubDate} - isoData: ${item.isoDate}`);

        //console.log(item);
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
        db.saveEpisode(EpisodeInsert);

      } else {
        console.log("  skipping earlier item");
      }
    });
  }
  )();

});


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
