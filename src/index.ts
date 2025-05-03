console.log("Hello via Bun!");

import Parser from "rss-parser";



const parser: Parser = new Parser({});

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
  const feed = await parser.parseURL('https://feeds.simplecast.com/XA_851k3'); // The Stack Overflow Podcast    (older eps loose details)

  console.log(feed.title);
  const COUNT = 5;
  feed.items.slice(0,COUNT).forEach(item => {

    // trim whitespace from title
    item.title = item.title.trim();
    console.log(`${item.title} -> ${item.link}`);
    console.log(`guid: ${item.guid} : duration: ${item.itunes.duration}`);
    console.log(`pubDate: ${item.pubDate} - isoData: ${item.isoDate}`);

    //console.log(item);
  });
}
)();

