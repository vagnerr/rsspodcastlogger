

import { sys } from 'typescript';
import * as db from './db';
import Parser from "rss-parser";
import type { Feed } from './db/schema';

console.log(process.argv.slice(2));

const feedId = parseInt(process.argv[2], 10);
const parser: Parser = new Parser({});

let feedInfo: Feed[] = [];

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
  feedInfo = await db.getAllFeeds();
}


//sys.exit(0);


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
