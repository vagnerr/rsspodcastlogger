import * as db from '../db';
import { logError, logInfo } from '../utils/log';

/**
 * Generate a report of all episodes in the database can adjust what
 * is included based on the command line options
 *
 * @param feedId
 * @param dateFrom
 * @param dateTo
 */
export async function generateReport(options: any) {
  const eps = await db.searchEpisodes(
    {
      feedId: options.feed ? options.feed : undefined,
      dateFrom: options.from ? new Date(options.from) : undefined,
      dateTo: options.to ? new Date(options.to) : undefined,
      recorded: options.full ? undefined : false
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
      title: episode.title, // need to strip bad chars from this (eg ' or " )?




      // do we want to join this with the feed title?
      //link: episode.link,
      //guid: episode.guid,
      //pubDate: episode.pubDate,
      date: `${episode.pubDate.getUTCFullYear()}/${episode.pubDate.getUTCMonth() + 1}/${episode.pubDate.getUTCDate()}`,
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

function formatSecondsToHoursMinutes(totalSeconds: number): { hours: number; minutes: number; } {
  const hours = Math.floor(totalSeconds / 3600);
  const remainingSeconds = totalSeconds % 3600;

  // Round minutes up if there's any leftover seconds
  const minutes = Math.ceil(remainingSeconds / 60);

  return { hours, minutes };
}

