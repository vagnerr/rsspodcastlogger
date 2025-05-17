# RSS Podcast Logger

Use to periodically scan a collection of RSS feeds for podcasts. Any new podcasts found are recorded with their run-time. Can generate a json report
file of all saved episodes that have not been included in any previous report.



## Installation


```bash
# Install bun
sudo npm i -g bun

# Project dependencies
bun install

# Settup DB (local sql-lite)
touch local.db
bunx drizzle-kit push

# You can review the DB with
bunx drizzle-kit studio
```

## Using
Command line options...
```
Usage: Podcast RSS Logger [options]

A simple CLI tool to parse and log podcast RSS feeds (no arguments = run full feed update)

Options:
  -f, --feed <feedId>            Only process this Feed ID
  -c, --count <count>            Number of items to process (default all) (default: "0")
  -l, --list                     List all feeds
  -n, --new <feedUrl>            Add new feed url
  -t, --topic <feed topic>       Topic to record for feed (eg Securty, DevOps, etc)
  -b, --back <days>              go back <days> for earliest date to process (feed run or new feed add) (default: "14")
  -r, --report <file>            Report to save to file
  --from <date>                  Earliest date to report (YYYY-MM-DD)
  --to <date>                    Latest date to report (YYYY-MM-DD)
  --full                         Full report (default is only unrecorded episodes)
  -d, --debug                    Enable debug mode
  -v, --verbose                  Enable verbose mode
  -h, --help                     Display help information
```

There are 4 'modes'
* Setting up new feeds ( `--new` )
* Listing current feeds ( `--list` )
* Run a feed scan (default)
* Generate a report ( `--report` )

### Setting up Feeds
You first need to add feeds to scan the simplest example being
```bash
bun run src/index.ts -new <feed Url>
```
By default that will settup the feed to be scanned with a "no earlier than" 14 days in the past (some feeds have every podcast ever produced) you can override this with `--back <days>`. You can also set a topic `--topic <topic>`



### Listing Current Feeds
To see all the current feeds: `bun run src/index.ts --list` That will show the the added feeds along with last time they were scanned

### Running a Scan
The default behavoir with no arguments...

```bash
bun run src/index.ts
```
... is to scan every feed in the database. Finding any new episode that was not published before the original limit date (set when adding that feed) you can further filter what is scanned by
* Limiting to a single feed ( `--feed <feedId>`)
* Only processing the first C records of each feed (`--count <C>`)
* Only processing episodes in the last N days (`--back <N>`)
  * Note: This is combined with the earliest date set on the feed record so will only record episodes that are later than both limits


### Generating a report
You can generate a report with the following
```bash
bun run src/index.ts --report <fileName>
```
This will save a report to the given file including every episode that has been found since the last report was generated. To report on every record in the database add `--full`. You can also filter for date ranges with `--from yyyy-mm-dd` and `--to yyyy-mm-dd`


---

This project was created using `bun init` in bun v1.2.3. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
